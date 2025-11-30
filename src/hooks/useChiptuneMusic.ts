import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface TrackNote {
  freq: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  rest?: boolean;
}

const BASE_BEAT = 0.28; // seconds per step (~134 BPM)

const melodyFrequencies: number[] = [
  659.25, 493.88, 523.25, 587.33,
  523.25, 493.88, 440.0,   440.0,
  392.0,  440.0,  493.88, 523.25,
  493.88, 440.0,  392.0,  392.0,
  329.63, 369.99, 392.0,  440.0,
  392.0,  369.99, 329.63, 329.63,
  293.66, 329.63, 369.99, 392.0,
  369.99, 329.63, 293.66, 293.66,
];

const bassFrequencies: number[] = [
  130.81, 0,      130.81, 0,
  146.83, 0,      123.47, 0,
  146.83, 0,      164.81, 0,
  174.61, 0,      146.83, 0,
  110.0,  0,      123.47, 0,
  130.81, 0,      98.0,   0,
  146.83, 0,      164.81, 0,
  174.61, 0,      146.83, 0,
];

const arpFrequencies: number[] = [
  523.25, 659.25, 784.0,  659.25,
  523.25, 659.25, 784.0,  659.25,
  587.33, 739.99, 880.0,  739.99,
  587.33, 739.99, 880.0,  739.99,
  493.88, 659.25, 783.99, 659.25,
  493.88, 659.25, 783.99, 659.25,
  440.0,  587.33, 698.46, 587.33,
  440.0,  587.33, 698.46, 587.33,
];

const toTrack = (frequencies: number[], duration: number, type: OscillatorType, volume: number): TrackNote[] =>
  frequencies.map((freq) => ({
    freq,
    duration,
    type,
    volume,
    rest: freq === 0,
  }));

const melodyTrack = toTrack(melodyFrequencies, BASE_BEAT, 'square', 0.8);
const bassTrack = toTrack(bassFrequencies, BASE_BEAT, 'triangle', 0.45);
const arpTrack = toTrack(arpFrequencies.flatMap((freq) => [freq, freq]), BASE_BEAT / 2, 'square', 0.35);

const tracks = [melodyTrack, bassTrack, arpTrack];

const trackDuration = (track: TrackNote[]) => track.reduce((total, note) => total + note.duration, 0);
const LOOP_DURATION = Math.max(...tracks.map(trackDuration));

const AUDIO_AVAILABLE = typeof window !== 'undefined' && (typeof window.AudioContext !== 'undefined' || typeof (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext !== 'undefined');

function scheduleTrack(ctx: AudioContext, masterGain: GainNode, track: TrackNote[], startTime: number, tempo: number) {
  let cursor = startTime;
  const tempoSafe = Math.max(0.5, tempo);

  track.forEach((note) => {
    const effectiveDuration = Math.max(0.04, note.duration / tempoSafe);

    if (!note.rest && note.freq > 0) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = note.type ?? 'square';
      oscillator.frequency.value = note.freq;

      gainNode.gain.value = 0.0001;
      gainNode.gain.setValueAtTime(0.0001, cursor);
      const attack = Math.min(0.02, effectiveDuration * 0.35);
      const maxVolume = note.volume ?? 0.6;

      gainNode.gain.exponentialRampToValueAtTime(maxVolume, cursor + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, cursor + effectiveDuration);

      oscillator.connect(gainNode);
      gainNode.connect(masterGain);

      oscillator.start(cursor);
      oscillator.stop(cursor + effectiveDuration + 0.02);
    }

    cursor += effectiveDuration;
  });
}

export function useChiptuneMusic(initialVolume = 0.18, tempoMultiplier = 1) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(initialVolume);

  const audioSupported = AUDIO_AVAILABLE;

  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const loopTimerRef = useRef<number>();
  const isPlayingRef = useRef(false);
  const tempoRef = useRef(Math.max(0.5, tempoMultiplier));

  const createContext = useCallback(() => {
    if (!audioSupported || typeof window === 'undefined') return null;
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;

    const ctx = new AudioCtor({ latencyHint: 'interactive' });
    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(ctx.destination);

    ctxRef.current = ctx;
    gainRef.current = gainNode;
    return ctx;
  }, [audioSupported, volume]);

  const clearLoop = useCallback(() => {
    if (loopTimerRef.current) {
      window.clearTimeout(loopTimerRef.current);
      loopTimerRef.current = undefined;
    }
  }, []);

  const stop = useCallback(() => {
    clearLoop();
    isPlayingRef.current = false;
    setIsPlaying(false);

    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    gainRef.current = null;
  }, [clearLoop]);

  const scheduleLoop = useCallback(() => {
    const ctx = ctxRef.current;
    const master = gainRef.current;
    if (!ctx || !master) return;

    const tempo = Math.max(0.5, tempoRef.current);
    const startTime = ctx.currentTime + 0.05;
    tracks.forEach((track) => scheduleTrack(ctx, master, track, startTime, tempo));

    const scaledLoopDuration = LOOP_DURATION / tempo;
    const loopMs = Math.max(200, (scaledLoopDuration - 0.05) * 1000);
    loopTimerRef.current = window.setTimeout(() => {
      if (isPlayingRef.current) {
        scheduleLoop();
      }
    }, loopMs);
  }, []);

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
    scheduleLoop();
  }, [audioSupported, createContext, scheduleLoop]);

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
    const ctx = ctxRef.current;
    const master = gainRef.current;
    if (ctx && master) {
      master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
    }
  }, [volume]);

  useEffect(() => () => {
    stop();
  }, [stop]);

  useEffect(() => {
    tempoRef.current = Math.max(0.5, tempoMultiplier);
    if (isPlayingRef.current) {
      clearLoop();
      scheduleLoop();
    }
  }, [tempoMultiplier, clearLoop, scheduleLoop]);

  return useMemo(() => ({
    isSupported: audioSupported,
    isPlaying,
    volume,
    setVolume,
    play,
    stop,
    toggle,
  }), [audioSupported, isPlaying, play, stop, toggle, volume, setVolume]);
}
