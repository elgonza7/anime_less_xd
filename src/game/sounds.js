// sonidos generados con Web Audio API (osciladores), no archivos de audio.
// asi evitamos cualquier lio de derechos de autor con SFX "de anime" reales
// y el bundle no pesa un solo byte extra.

let ctx = null;
let muted = false;

function getContext() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, startOffset, duration, { type = "sine", peakGain = 0.2 } = {}) {
  const audio = getContext();
  if (!audio || muted) return;

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const start = audio.currentTime + startOffset;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peakGain, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function setMuted(value) {
  muted = value;
}

export function playCorrect() {
  tone(660, 0, 0.12, { type: "triangle", peakGain: 0.18 });
  tone(990, 0.08, 0.18, { type: "triangle", peakGain: 0.18 });
}

export function playWrong() {
  tone(220, 0, 0.2, { type: "sawtooth", peakGain: 0.12 });
}

export function playCategoryComplete() {
  [523, 659, 784].forEach((freq, i) => tone(freq, i * 0.1, 0.22, { type: "triangle", peakGain: 0.16 }));
}

export function playFinale() {
  [523, 659, 784, 1047].forEach((freq, i) => tone(freq, i * 0.12, 0.35, { type: "triangle", peakGain: 0.18 }));
}
