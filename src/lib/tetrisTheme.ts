/**
 * Korobeiniki — the 19th-century Russian folk song that the Tetris soundtrack is
 * built on. The melody is public domain; the chiptune arrangement around it (bass
 * bounce, off-beat pulse pedal, drum grid) belongs to this project.
 *
 * Timing: four bars of 4/4 at 80 BPM, on a 32nd-note grid, so one step is
 * 60 / (80 * 8) = 0.09375s and the loop is 128 steps (12 seconds).
 */

export type VoiceName = 'lead' | 'harmony' | 'bass';

export interface VoiceSpec {
  waveform: OscillatorType;
  /** Peak gain before the master volume is applied. */
  gain: number;
  /** Attack/release in seconds. */
  attack: number;
  release: number;
  detune?: number;
  filter?: { type: BiquadFilterType; frequency: number; Q: number };
}

export const VOICES: Record<VoiceName, VoiceSpec> = {
  /** Pulse 1: the melody, square wave with a gentle low-pass. */
  lead: {
    waveform: 'square',
    gain: 0.6,
    attack: 0.004,
    release: 0.03,
    filter: { type: 'lowpass', frequency: 5200, Q: 0.7 },
  },
  /** Pulse 2: chord tones pedalling on the off-beats. */
  harmony: {
    waveform: 'square',
    gain: 0.26,
    attack: 0.004,
    release: 0.02,
    detune: 6,
    filter: { type: 'highpass', frequency: 200, Q: 0.7 },
  },
  /** Triangle: the octave-bouncing bass. */
  bass: {
    waveform: 'triangle',
    gain: 0.5,
    attack: 0.005,
    release: 0.04,
    filter: { type: 'lowpass', frequency: 900, Q: 0.6 },
  },
};

export type DrumName = 'kick' | 'snare' | 'hat';

export interface DrumSpec {
  gain: number;
  /** Decay in seconds. */
  decay: number;
  /** Noise-band filter; pitch sweeps are kick-only. */
  filter?: { type: BiquadFilterType; frequency: number; Q: number };
  /** Kick pitch sweep in Hz. */
  sweep?: { from: number; to: number };
}

export const DRUMS: Record<DrumName, DrumSpec> = {
  kick: { gain: 0.55, decay: 0.11, sweep: { from: 150, to: 45 } },
  snare: { gain: 0.3, decay: 0.13, filter: { type: 'bandpass', frequency: 1800, Q: 0.9 } },
  hat: { gain: 0.14, decay: 0.045, filter: { type: 'highpass', frequency: 6500, Q: 0.7 } },
};

export interface ThemeNote {
  voice: VoiceName;
  freq: number;
  /** Start, in steps from the top of the loop. */
  step: number;
  /** Length, in steps. */
  steps: number;
}

export interface ThemeDrum {
  drum: DrumName;
  step: number;
}

export interface ThemePass {
  notes: ThemeNote[];
  drums: ThemeDrum[];
  steps: number;
}

export const THEME_BPM = 80;
/** Grid resolution: 32nd notes. */
export const STEPS_PER_BEAT = 8;
/** Four bars of 4/4. */
export const STEPS_PER_LOOP = 128;
export const STEP_SECONDS = 60 / (THEME_BPM * STEPS_PER_BEAT);

const SEMITONES: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

/** Frequency of a scientific pitch name, e.g. 'G#4' or 'E5'. */
export function noteToFrequency(name: string): number {
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!match) throw new Error(`Unrecognised pitch name: ${name}`);

  const [, letter, accidental, octave] = match;
  const offset = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  const midi = (Number(octave) + 1) * 12 + SEMITONES[letter] + offset;
  return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * The tune, as [start step, pitch, length in steps]. Bars 1-2 are the opening
 * phrase, bars 3-4 answer it — and phrase two comes in on the second 16th of bar
 * three, which is what gives the theme its lurch.
 */
const LEAD_MELODY: [number, string, number][] = [
  [0, 'E5', 2], [4, 'B4', 2], [6, 'C5', 2], [8, 'D5', 2], [10, 'E5', 1], [11, 'D5', 1],
  [12, 'C5', 2], [14, 'B4', 2], [16, 'A4', 2], [20, 'A4', 2], [22, 'C5', 2], [24, 'E5', 2],
  [28, 'D5', 2], [30, 'C5', 2], [32, 'B4', 2], [38, 'C5', 2], [40, 'D5', 2], [44, 'E5', 2],
  [48, 'C5', 2], [52, 'A4', 2], [56, 'A4', 8],
  [66, 'D5', 2], [70, 'F5', 2], [72, 'A5', 2], [76, 'G5', 2], [78, 'F5', 2], [80, 'E5', 2],
  [86, 'C5', 2], [88, 'E5', 2], [90, 'F5', 1], [91, 'E5', 1], [92, 'D5', 2], [94, 'C5', 2],
  [96, 'B4', 2], [102, 'C5', 2], [104, 'D5', 2], [106, 'G#4', 2], [108, 'E5', 2], [110, 'G#4', 2],
  [112, 'C5', 2], [116, 'A4', 12],
];

interface Chord {
  /** Root and its octave, bounced in eighths under the tune. */
  bass: [string, string];
  /** Two chord tones (root/fifth voicing) the pulses pedal on the off-beats. */
  pedal: [string, string];
}

const CHORDS = {
  E: { bass: ['E2', 'E3'], pedal: ['B3', 'E4'] },
  Am: { bass: ['A2', 'A3'], pedal: ['C4', 'E4'] },
  Dm: { bass: ['D2', 'D3'], pedal: ['A3', 'D4'] },
  C: { bass: ['C2', 'C3'], pedal: ['G3', 'C4'] },
} satisfies Record<string, Chord>;

export type ChordName = keyof typeof CHORDS;

/** Two beats of each chord: E Am | E Am | Dm C | E Am. */
const PROGRESSION: { step: number; chord: ChordName }[] = [
  { step: 0, chord: 'E' },
  { step: 16, chord: 'Am' },
  { step: 32, chord: 'E' },
  { step: 48, chord: 'Am' },
  { step: 64, chord: 'Dm' },
  { step: 80, chord: 'C' },
  { step: 96, chord: 'E' },
  { step: 112, chord: 'Am' },
];

/**
 * One lap of the theme. Pass 1 lifts the melody an octave and doubles the hats so
 * a long game does not sit on the same four bars forever.
 */
export function buildThemePass(variation = 0): ThemePass {
  const octaveUp = variation % 2 === 1;
  const notes: ThemeNote[] = [];

  LEAD_MELODY.forEach(([step, pitch, steps]) => {
    const freq = noteToFrequency(pitch) * (octaveUp ? 2 : 1);
    notes.push({ voice: 'lead', freq, step, steps });
  });

  PROGRESSION.forEach(({ step: barStep, chord }) => {
    const { bass, pedal } = CHORDS[chord];

    for (let i = 0; i < 4; i += 1) {
      const offset = i * 4;
      notes.push({
        voice: 'bass',
        freq: noteToFrequency(bass[i % 2]),
        step: barStep + offset,
        steps: 3,
      });
      notes.push({
        voice: 'harmony',
        freq: noteToFrequency(pedal[i % 2]),
        step: barStep + offset + 2,
        steps: 1,
      });
    }
  });

  const drums: ThemeDrum[] = [];
  const hats = octaveUp ? [4, 8, 12, 20, 24, 28] : [4, 12, 20, 28];

  for (let bar = 0; bar < STEPS_PER_LOOP; bar += 32) {
    drums.push({ drum: 'kick', step: bar }, { drum: 'kick', step: bar + 16 });
    drums.push({ drum: 'snare', step: bar + 8 }, { drum: 'snare', step: bar + 24 });
    hats.forEach((offset) => drums.push({ drum: 'hat', step: bar + offset }));
  }

  return { notes, drums, steps: STEPS_PER_LOOP };
}

/** Both laps, built once at module load and reused by the audio scheduler. */
export const THEME_PASSES: ThemePass[] = [buildThemePass(0), buildThemePass(1)];
