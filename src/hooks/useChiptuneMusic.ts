import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DRUMS,
  STEP_SECONDS,
  THEME_PASSES,
  VOICES,
  type ThemeDrum,
  type ThemeNote,
} from '@/lib/tetrisTheme';

const AUDIO_AVAILABLE =
  typeof window !== 'undefined' &&
  (typeof window.AudioContext !== 'undefined' ||
    typeof (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext !== 'undefined');

/** How far ahead of the clock a pass is queued, in seconds. */
const SCHEDULE_AHEAD = 0.15;

/**
 * The theme moves in 16th-note runs, so it takes a gentler speed-up than the old
 * four-second loop did: the game's level multiplier reaches 2.4 at the top end,
 * and that maps onto ~1.7x here.
 */
const tempoFactorFrom = (multiplier: number) =>
  Math.min(1.7, 1 + (Math.max(0.5, multiplier) - 1) * 0.5);

/** White noise, reused by every snare and hat hit. */
function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * 0.5));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function scheduleNote(
  ctx: AudioContext,
  master: GainNode,
  note: ThemeNote,
  startTime: number,
  stepSeconds: number,
) {
  const spec = VOICES[note.voice];
  const duration = Math.max(0.03, note.steps * stepSeconds);

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = spec.waveform;
  oscillator.frequency.value = note.freq;
  if (spec.detune) {
    oscillator.detune.value = spec.detune + (Math.random() - 0.5) * 4;
  }

  const peak = spec.gain * (0.94 + Math.random() * 0.12);
  const attack = Math.min(spec.attack, duration * 0.3);
  const release = Math.min(spec.release, duration * 0.5);
  const releaseStart = Math.max(startTime + attack, startTime + duration - release);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(peak, startTime + attack);
  gainNode.gain.setValueAtTime(peak, releaseStart);
  gainNode.gain.linearRampToValueAtTime(0.0001, startTime + duration);

  let tail: AudioNode = oscillator;
  if (spec.filter) {
    const filterNode = ctx.createBiquadFilter();
    filterNode.type = spec.filter.type;
    filterNode.frequency.value = spec.filter.frequency;
    filterNode.Q.value = spec.filter.Q;
    tail.connect(filterNode);
    tail = filterNode;
  }
  tail.connect(gainNode);
  gainNode.connect(master);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

function scheduleDrum(
  ctx: AudioContext,
  master: GainNode,
  hit: ThemeDrum,
  startTime: number,
  noiseBuffer: AudioBuffer,
) {
  const spec = DRUMS[hit.drum];
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(spec.gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0005, startTime + spec.decay);
  gainNode.connect(master);

  if (spec.sweep) {
    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(spec.sweep.from, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(spec.sweep.to, startTime + spec.decay);
    oscillator.connect(gainNode);
    oscillator.start(startTime);
    oscillator.stop(startTime + spec.decay + 0.02);
    return;
  }

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;

  if (spec.filter) {
    const filterNode = ctx.createBiquadFilter();
    filterNode.type = spec.filter.type;
    filterNode.frequency.value = spec.filter.frequency;
    filterNode.Q.value = spec.filter.Q;
    source.connect(filterNode);
    filterNode.connect(gainNode);
  } else {
    source.connect(gainNode);
  }

  source.start(startTime);
  source.stop(startTime + spec.decay + 0.02);
}

export function useChiptuneMusic(initialVolume = 0.18, tempoMultiplier = 1) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(initialVolume);

  const audioSupported = AUDIO_AVAILABLE;

  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const loopTimerRef = useRef<number>();
  const fadeTimerRef = useRef<number>();
  const isPlayingRef = useRef(false);
  const passIndexRef = useRef(0);
  const tempoTargetRef = useRef(tempoFactorFrom(tempoMultiplier));
  const tempoCurrentRef = useRef(tempoFactorFrom(tempoMultiplier));
  const scheduleLoopRef = useRef<(startAt?: number) => void>(() => {});

  const smoothTempo = useCallback(() => {
    const target = tempoTargetRef.current;
    const current = tempoCurrentRef.current;
    tempoCurrentRef.current = Math.max(0.5, current + (target - current) * 0.35);
    return tempoCurrentRef.current;
  }, []);

  const fadeMaster = useCallback((nextValue: number, duration = 0.2) => {
    const ctx = ctxRef.current;
    const master = gainRef.current;
    if (!ctx || !master) return;

    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(Math.max(0.0001, nextValue), ctx.currentTime, duration / 5);
  }, []);

  const clearLoop = useCallback(() => {
    if (loopTimerRef.current) {
      window.clearTimeout(loopTimerRef.current);
      loopTimerRef.current = undefined;
    }
  }, []);

  const clearFadeTimer = useCallback(() => {
    if (fadeTimerRef.current) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = undefined;
    }
  }, []);

  const stop = useCallback(() => {
    clearLoop();
    clearFadeTimer();
    isPlayingRef.current = false;
    setIsPlaying(false);
    fadeMaster(0.0001, 0.1);

    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    gainRef.current = null;
    noiseBufferRef.current = null;
  }, [clearLoop, clearFadeTimer, fadeMaster]);

  const createContext = useCallback(() => {
    if (!audioSupported || typeof window === 'undefined') return null;
    const AudioCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;

    const ctx = new AudioCtor({ latencyHint: 'interactive' });
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.0001;
    gainNode.connect(ctx.destination);

    ctxRef.current = ctx;
    gainRef.current = gainNode;
    return ctx;
  }, [audioSupported]);

  const scheduleLoop = useCallback(
    (startAt?: number) => {
      const ctx = ctxRef.current;
      const master = gainRef.current;
      if (!ctx || !master) return;

      const tempo = smoothTempo();
      const stepSeconds = STEP_SECONDS / tempo;
      const pass = THEME_PASSES[passIndexRef.current % THEME_PASSES.length];
      passIndexRef.current += 1;

      let noise = noiseBufferRef.current;
      if (!noise) {
        noise = createNoiseBuffer(ctx);
        noiseBufferRef.current = noise;
      }

      const start = startAt ?? ctx.currentTime + 0.06;
      pass.notes.forEach((note) => {
        scheduleNote(ctx, master, note, start + note.step * stepSeconds, stepSeconds);
      });
      pass.drums.forEach((hit) => {
        scheduleDrum(ctx, master, hit, start + hit.step * stepSeconds, noise as AudioBuffer);
      });

      const nextStart = start + pass.steps * stepSeconds;
      const delayMs = Math.max(80, (nextStart - ctx.currentTime - SCHEDULE_AHEAD) * 1000);

      loopTimerRef.current = window.setTimeout(() => {
        if (isPlayingRef.current) {
          scheduleLoopRef.current(nextStart);
        }
      }, delayMs);
    },
    [smoothTempo],
  );

  useEffect(() => {
    scheduleLoopRef.current = scheduleLoop;
  }, [scheduleLoop]);

  const play = useCallback(async () => {
    if (!audioSupported) return;
    if (isPlayingRef.current) return;

    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = createContext();
    }

    const master = gainRef.current;
    if (!ctx || !master) return;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (error) {
        console.error('[Chiptune] Failed to resume AudioContext', error);
        return;
      }
    }

    isPlayingRef.current = true;
    setIsPlaying(true);
    passIndexRef.current = 0;
    tempoCurrentRef.current = tempoTargetRef.current;
    scheduleLoop(ctx.currentTime + 0.2);
    fadeMaster(volume, 0.18);
  }, [audioSupported, createContext, scheduleLoop, fadeMaster, volume]);

  const toggle = useCallback(async () => {
    if (isPlayingRef.current) {
      stop();
    } else {
      await play();
    }
  }, [play, stop]);

  const setVolume = useCallback((nextVolume: number) => {
    const clamped = Math.max(0, Math.min(1, nextVolume));
    setVolumeState(clamped);
  }, []);

  useEffect(() => {
    fadeMaster(volume, 0.25);
  }, [fadeMaster, volume]);

  useEffect(() => () => {
    clearFadeTimer();
    stop();
  }, [stop, clearFadeTimer]);

  // A difficulty bump retunes the tempo for the next lap rather than cutting the
  // current one short, so the theme speeds up between passes instead of glitching.
  useEffect(() => {
    tempoTargetRef.current = tempoFactorFrom(tempoMultiplier);
  }, [tempoMultiplier]);

  return useMemo(
    () => ({
      isSupported: audioSupported,
      isPlaying,
      volume,
      setVolume,
      play,
      stop,
      toggle,
    }),
    [audioSupported, isPlaying, play, stop, toggle, volume, setVolume],
  );
}
