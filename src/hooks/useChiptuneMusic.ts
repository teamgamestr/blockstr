import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface TrackFilter {
  type: BiquadFilterType;
  frequency: number;
  Q?: number;
}

interface TrackNote {
  freq: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  rest?: boolean;
  detune?: number;
  filter?: TrackFilter;
}

const NOTE = {
  D2: 73.42,
  E2: 82.41,
  F2: 87.31,
  G2: 98.0,
  A2: 110.0,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
} as const;

const BASE_BEAT = 0.25; // seconds per step (~144 BPM)
const LOOP_DURATION = 16 * BASE_BEAT; // 4 seconds per loop across all layers

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

const createTrack = (
  frequencies: (number | null)[],
  duration: number,
  options: Partial<Omit<TrackNote, 'freq' | 'duration'>> = {},
): TrackNote[] =>
  frequencies.map((freq) => ({
    freq: freq ?? 0,
    duration,
    type: options.type ?? 'square',
    volume: options.volume ?? 0.5,
    rest: !freq || freq <= 0,
    detune: options.detune,
    filter: options.filter,
  }));

const humanizeTrack = (
  base: TrackNote[],
  {
    detuneRange = 4,
    volumeJitter = 0.1,
    filterJitter = 0.05,
    dropout = 0,
  }: {
    detuneRange?: number;
    volumeJitter?: number;
    filterJitter?: number;
    dropout?: number;
  } = {},
): TrackNote[] =>
  base.map((note) => {
    if (note.rest) return note;

    if (dropout > 0 && Math.random() < dropout) {
      return { ...note, rest: true, volume: 0 };
    }

    const detuneOffset = (Math.random() - 0.5) * detuneRange;
    const volumeScale = 1 + (Math.random() - 0.5) * volumeJitter;
    const filter = note.filter
      ? {
          ...note.filter,
          frequency: note.filter.frequency * (1 + (Math.random() - 0.5) * filterJitter),
        }
      : undefined;

    return {
      ...note,
      detune: (note.detune ?? 0) + detuneOffset,
      volume: Math.max(0, (note.volume ?? 0.5) * volumeScale),
      filter,
    };
  });

const pickPattern = <T,>(patterns: T[]): T => patterns[Math.floor(Math.random() * patterns.length)];

const neonLeadPatterns = [
  [NOTE.A4, NOTE.C5, NOTE.E5, NOTE.D5, NOTE.C5, NOTE.A4, NOTE.G4, NOTE.E4, NOTE.A4, NOTE.C5, NOTE.G4, NOTE.D5, NOTE.F4, NOTE.E4, NOTE.D4, NOTE.C4],
  [NOTE.E5, NOTE.D5, NOTE.C5, NOTE.A4, NOTE.G4, NOTE.A4, NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A5, NOTE.F5, NOTE.E5, NOTE.D5, NOTE.C5, NOTE.B4],
  [NOTE.A4, NOTE.A4, NOTE.C5, NOTE.E5, NOTE.D5, NOTE.B4, NOTE.C5, NOTE.G4, NOTE.A4, NOTE.D5, NOTE.C5, NOTE.A4, NOTE.G4, NOTE.F4, NOTE.E4, NOTE.D4],
];

const pulseArpPatterns = [
  [NOTE.A4, NOTE.E5, NOTE.C5, NOTE.G4, NOTE.A4, NOTE.E5, NOTE.C5, NOTE.G4, NOTE.B3, NOTE.F4, NOTE.D5, NOTE.A4, NOTE.B3, NOTE.F4, NOTE.D5, NOTE.A4],
  [NOTE.C4, NOTE.G4, NOTE.E5, NOTE.B4, NOTE.C4, NOTE.G4, NOTE.E5, NOTE.B4, NOTE.A3, NOTE.E4, NOTE.C5, NOTE.G4, NOTE.A3, NOTE.E4, NOTE.C5, NOTE.G4],
];

const bassPatterns = [
  [NOTE.A2, null, NOTE.E2, null, NOTE.C3, null, NOTE.E2, null, NOTE.F2, null, NOTE.C3, null, NOTE.G2, null, NOTE.D2, null],
  [NOTE.D2, null, NOTE.A2, null, NOTE.F2, null, NOTE.A2, null, NOTE.C3, null, NOTE.G2, null, NOTE.E2, null, NOTE.B2, null],
];

const padPatterns = [
  [NOTE.A3, NOTE.A3, NOTE.E3, NOTE.E3, NOTE.D3, NOTE.D3, NOTE.G3, NOTE.G3],
  [NOTE.C3, NOTE.C3, NOTE.G3, NOTE.G3, NOTE.F3, NOTE.F3, NOTE.A3, NOTE.A3],
];

const percPatterns = [
  [2300, null, 2100, null, 2500, null, 2300, null, 2600, 2000, 2700, 2100, 2400, 0, 0, 0],
  [2200, null, 0, null, 2400, null, 2300, null, 2200, null, 2500, 1800, 2600, null, 2400, null],
];

const buildNeonLead = () =>
  humanizeTrack(
    createTrack(pickPattern(neonLeadPatterns), BASE_BEAT, {
      type: 'sawtooth',
      volume: randomBetween(0.55, 0.65),
      filter: { type: 'bandpass', frequency: randomBetween(1800, 2300), Q: randomBetween(1.1, 1.5) },
    }),
    {
      detuneRange: 8,
      volumeJitter: 0.2,
      filterJitter: 0.15,
      dropout: 0.05,
    },
  );

const buildPulseArp = () =>
  humanizeTrack(
    createTrack(pickPattern(pulseArpPatterns), BASE_BEAT / 2, {
      type: 'square',
      volume: randomBetween(0.32, 0.4),
      detune: randomBetween(4, 8),
      filter: { type: 'highpass', frequency: randomBetween(1300, 1800), Q: randomBetween(0.9, 1.3) },
    }),
    {
      detuneRange: 10,
      volumeJitter: 0.25,
      filterJitter: 0.2,
      dropout: 0.08,
    },
  );

const buildSubBass = () =>
  humanizeTrack(
    createTrack(pickPattern(bassPatterns), BASE_BEAT, {
      type: 'triangle',
      volume: randomBetween(0.38, 0.46),
      filter: { type: 'lowpass', frequency: randomBetween(260, 360), Q: randomBetween(0.6, 0.85) },
    }),
    {
      detuneRange: 3,
      volumeJitter: 0.1,
      filterJitter: 0.1,
    },
  );

const buildTronPad = () =>
  humanizeTrack(
    createTrack(pickPattern(padPatterns), BASE_BEAT * 2, {
      type: 'sine',
      volume: randomBetween(0.18, 0.24),
      detune: randomBetween(-12, -6),
      filter: { type: 'lowpass', frequency: randomBetween(500, 650), Q: randomBetween(0.5, 0.7) },
    }),
    {
      detuneRange: 4,
      volumeJitter: 0.05,
      filterJitter: 0.1,
    },
  );

const buildGlitchPerc = () =>
  humanizeTrack(
    createTrack(pickPattern(percPatterns), BASE_BEAT / 2, {
      type: 'square',
      volume: randomBetween(0.18, 0.25),
      filter: { type: 'highpass', frequency: randomBetween(1800, 2300), Q: randomBetween(0.7, 1) },
    }),
    {
      detuneRange: 20,
      volumeJitter: 0.4,
      filterJitter: 0.3,
      dropout: 0.15,
    },
  );

const trackFactories = [buildNeonLead, buildPulseArp, buildSubBass, buildTronPad, buildGlitchPerc];

const AUDIO_AVAILABLE =
  typeof window !== 'undefined' &&
  (typeof window.AudioContext !== 'undefined' ||
    typeof (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext !== 'undefined');

function scheduleTrack(
  ctx: AudioContext,
  masterGain: GainNode,
  track: TrackNote[],
  startTime: number,
  tempo: number,
) {
  let cursor = startTime;
  const tempoSafe = Math.max(0.5, tempo);

  track.forEach((note) => {
    const effectiveDuration = Math.max(0.04, note.duration / tempoSafe);

    if (!note.rest && note.freq > 0) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filterConfig = note.filter;
      const filterNode = filterConfig ? ctx.createBiquadFilter() : null;

      oscillator.type = note.type ?? 'square';
      oscillator.frequency.value = note.freq;
      if (note.detune) {
        oscillator.detune.value = note.detune;
      }

      const peakVolume = note.volume ?? 0.5;
      const attack = Math.min(0.02, effectiveDuration * 0.3);
      const releaseStart = cursor + Math.max(attack + 0.01, effectiveDuration - 0.02);

      gainNode.gain.setValueAtTime(0.0001, cursor);
      gainNode.gain.linearRampToValueAtTime(peakVolume, cursor + attack);
      gainNode.gain.linearRampToValueAtTime(0.0001, releaseStart);

      if (filterNode && filterConfig) {
        filterNode.type = filterConfig.type;
        filterNode.frequency.value = filterConfig.frequency;
        filterNode.Q.value = filterConfig.Q ?? 0.7;
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
      } else {
        oscillator.connect(gainNode);
      }
      gainNode.connect(masterGain);

      oscillator.start(cursor);
      oscillator.stop(cursor + effectiveDuration + 0.05);
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
  const fadeTimerRef = useRef<number>();
  const isPlayingRef = useRef(false);
  const tempoTargetRef = useRef(Math.max(0.5, tempoMultiplier));
  const tempoCurrentRef = useRef(Math.max(0.5, tempoMultiplier));

  const smoothTempo = useCallback(() => {
    const target = tempoTargetRef.current;
    const current = tempoCurrentRef.current;
    const next = current + (target - current) * 0.35;
    tempoCurrentRef.current = Math.max(0.5, next);
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
    (forceImmediate = false) => {
      const ctx = ctxRef.current;
      const master = gainRef.current;
      if (!ctx || !master) return;

      const tempo = smoothTempo();
      const startTime = ctx.currentTime + (forceImmediate ? 0.02 : 0.05);
      const activeTracks = trackFactories.map((factory) => factory());
      activeTracks.forEach((track) => scheduleTrack(ctx, master, track, startTime, tempo));

      const loopSeconds = LOOP_DURATION / tempo;
      const loopMs = Math.max(200, (loopSeconds - 0.05) * 1000);
      loopTimerRef.current = window.setTimeout(() => {
        if (isPlayingRef.current) {
          scheduleLoop();
        }
      }, loopMs);
    },
    [smoothTempo],
  );

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
    scheduleLoop(true);
    fadeMaster(volume, 0.4);
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

  useEffect(() => {
    tempoTargetRef.current = Math.max(0.5, tempoMultiplier);
    if (isPlayingRef.current) {
      fadeMaster(0.0005, 0.08);
      clearLoop();
      scheduleLoop(true);
      clearFadeTimer();
      fadeTimerRef.current = window.setTimeout(() => {
        fadeMaster(volume, 0.35);
      }, 90);
    }
  }, [tempoMultiplier, fadeMaster, scheduleLoop, clearLoop, clearFadeTimer, volume]);

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
