let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
const sourceMap = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

function ensureContext() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;
    analyser.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return analyser!;
}

export function getAnalyser(): AnalyserNode | null {
  return analyser;
}

export function connectAudio(el: HTMLAudioElement): void {
  ensureContext();
  if (sourceMap.has(el)) return;
  const source = audioCtx!.createMediaElementSource(el);
  source.connect(analyser!);
  sourceMap.set(el, source);
}
