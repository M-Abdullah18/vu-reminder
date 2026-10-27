/**
 * Web Audio API synthesizer for pleasant academic reminder alerts.
 * Features:
 * - Off by default
 * - Never loops
 * - Smooth exponential decay
 * - User volume control
 * - Respects autoplay restrictions
 */

let audioCtx: AudioContext | null = null;
let lastPlayedAt = 0;
const MIN_PLAY_INTERVAL_MS = 15000; // Throttle to prevent repeated sounds within 15 seconds

export function playReminderChime(volume: number = 0.5): boolean {
  if (volume <= 0) return false;

  const now = Date.now();
  if (now - lastPlayedAt < MIN_PLAY_INTERVAL_MS) {
    return false; // Throttled to avoid annoying user
  }
  lastPlayedAt = now;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return false;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const t = audioCtx.currentTime;
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.001, t);
    // Smooth fade in
    gainNode.gain.linearRampToValueAtTime(Math.min(volume, 1) * 0.4, t + 0.04);
    // Smooth exponential decay
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    gainNode.connect(audioCtx.destination);

    // Primary tone (D5 - 587.33 Hz)
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, t);
    osc1.frequency.exponentialRampToValueAtTime(880, t + 0.2); // Glide up to A5
    osc1.connect(gainNode);

    // Harmonizing chime overtone (A5 - 880 Hz)
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, t + 0.08);
    osc2.connect(gainNode);

    osc1.start(t);
    osc2.start(t + 0.08);

    osc1.stop(t + 1.25);
    osc2.stop(t + 1.25);

    return true;
  } catch (err) {
    console.warn('Audio alert not permitted or not supported:', err);
    return false;
  }
}
