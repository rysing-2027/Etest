import { useEffect, useRef } from 'react';
import { getAnalyser } from '../audioAnalyser';

const WAVE_LAYERS = [
  { r: 80, g: 130, b: 220, alpha: 0.14, speed: 0.8,  waveLen: 180, amp: 38, base: 0.30 },
  { r: 100, g: 150, b: 235, alpha: 0.10, speed: 1.2,  waveLen: 140, amp: 30, base: 0.48 },
  { r: 120, g: 170, b: 245, alpha: 0.07, speed: 0.5, waveLen: 220, amp: 22, base: 0.62 },
  { r: 140, g: 185, b: 250, alpha: 0.05, speed: 1.5,  waveLen: 100, amp: 16, base: 0.78 },
];

export default function AudioWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const smoothAvgRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      timeRef.current += 0.016;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const analyser = getAnalyser();
      let freqData: Uint8Array<ArrayBuffer> | null = null;
      let avg = 0;

      if (analyser) {
        freqData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqData);
        for (let i = 0; i < freqData.length; i++) avg += freqData[i];
        avg = avg / freqData.length / 255;
      }

      // Smooth the average for gentle transitions
      smoothAvgRef.current += (avg - smoothAvgRef.current) * 0.08;
      const sAvg = smoothAvgRef.current;

        for (const layer of WAVE_LAYERS) {
        ctx.beginPath();

        // Calculate continuous wave position for seamless scrolling
        const wavePos = timeRef.current * layer.speed * 30;
        // Extend drawing range to ensure seamless looping
        const extend = layer.waveLen * 1.5;

        const segments = 80;
        const segW = (w + extend * 2) / segments;

        for (let i = 0; i <= segments; i++) {
          const x = i * segW - extend;
          // Add wavePos to create scrolling effect - sine handles large values via periodicity
          const xPos = x + wavePos;
          const ratio = i / segments;

          // Frequency-driven displacement
          let freqDisp = 0;
          if (freqData) {
            const fi = Math.floor(ratio * (freqData.length * 0.7));
            freqDisp = (freqData[fi] / 255) * layer.amp * 1.2;
          }

          // Base sine wave (ambient motion even when silent)
          // sin() automatically handles periodicity for large xPos values
          const ambient = Math.sin((xPos / layer.waveLen) * Math.PI * 2) * layer.amp * 0.15;
          const ambient2 = Math.sin((xPos / (layer.waveLen * 0.6)) * Math.PI * 2) * layer.amp * 0.08;

          // Blend: when audio plays, frequency data dominates; when silent, gentle ambient
          const audioWave = Math.sin((xPos / layer.waveLen) * Math.PI * 2) * freqDisp;
          const displacement = audioWave * sAvg + (ambient + ambient2) * (1 - sAvg * 0.5);

          const y = h * layer.base - displacement;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevX = (i - 1) * segW;
            ctx.quadraticCurveTo(prevX + segW * 0.5, y, x, y);
          }
        }

        ctx.lineTo(w + extend, h);
        ctx.lineTo(-extend, h);
        ctx.closePath();

        // Gradient fill: more opaque at bottom
        const grad = ctx.createLinearGradient(0, h * layer.base - layer.amp, 0, h);
        const { r, g, b, alpha } = layer;
        grad.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.3})`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.8})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},${alpha})`);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed bottom-0 left-0 w-full pointer-events-none"
      style={{ height: '160px', zIndex: 0 }}
    />
  );
}
