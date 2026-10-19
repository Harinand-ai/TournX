/**
 * TournX Synthesized Retro Arcade Audio Engine
 * Pure Web Audio API — Zero External Assets or Copyright Audio
 * 
 * Safely handles browser/Android autoplay policies and persists user preferences.
 */

const AUDIO_STORAGE_KEY = 'ftm_arcade_sound_enabled';

export function isArcadeAudioEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(AUDIO_STORAGE_KEY);
    // Enabled by default on first visit, or follows user setting
    return val !== 'false';
  } catch {
    return false;
  }
}

export function setArcadeAudioEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {}
}

/**
 * Synthesizes an energetic, short 8-bit arcade boot chime.
 * Fast ascending arpeggio with square & triangle harmonics, ending in a resonant power bell.
 */
export function playArcadeBootChime(): void {
  if (!isArcadeAudioEnabled() || typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Arpeggio notes (C4, E4, G4, B4, C5, E5)
    const notes = [261.63, 329.63, 392.0, 493.88, 523.25, 659.25];
    const noteDuration = 0.055;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * noteDuration);

      const startTime = now + idx * noteDuration;
      const endTime = startTime + noteDuration * 1.5;

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, endTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(endTime);
    });

    // Final Power Chime & Low Sub-thump on logo lock (around 0.45s)
    const powerStartTime = now + 0.38;
    const powerOsc = ctx.createOscillator();
    const powerGain = ctx.createGain();

    powerOsc.type = 'triangle';
    powerOsc.frequency.setValueAtTime(1046.5, powerStartTime); // C6
    powerOsc.frequency.exponentialRampToValueAtTime(523.25, powerStartTime + 0.4);

    powerGain.gain.setValueAtTime(0.001, powerStartTime);
    powerGain.gain.exponentialRampToValueAtTime(0.18, powerStartTime + 0.02);
    powerGain.gain.exponentialRampToValueAtTime(0.0001, powerStartTime + 0.55);

    powerOsc.connect(powerGain);
    powerGain.connect(ctx.destination);

    powerOsc.start(powerStartTime);
    powerOsc.stop(powerStartTime + 0.6);

  } catch {
    // Autoplay prevented by browser security policy; safely continue silent
  }
}
