import { useRef, useState, useEffect } from 'react';
import { connectAudio } from '../audioAnalyser';

interface Props {
  src: string | null;
  label: string;
  onPlayCountChange?: (count: number) => void;
  playCount?: number;
  large?: boolean;
  autoPlay?: boolean;
}

export default function AudioPlayer({ src, label, onPlayCountChange, playCount = 0, large = false, autoPlay = false }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [count, setCount] = useState(playCount);

  useEffect(() => { setCount(playCount); }, [playCount]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      setPlaying(true);
      const newCount = count + 1;
      setCount(newCount);
      onPlayCountChange?.(newCount);
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onTimeUpdate = () => setCurrent(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [count, onPlayCountChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
    setCurrent(0);
    setDuration(0);

    if (autoPlay && src) {
      const onCanPlay = () => {
        connectAudio(audio);
        audio.play().catch(() => {});
        audio.removeEventListener('canplay', onCanPlay);
      };
      audio.addEventListener('canplay', onCanPlay);
      return () => audio.removeEventListener('canplay', onCanPlay);
    }
  }, [src, autoPlay]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (!playing) {
      connectAudio(audio);
      audio.play();
    } else {
      audio.pause();
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(e.target.value);
    setCurrent(audio.currentTime);
  };

  const fmt = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!src) {
    return (
      <div className="text-center text-gray-300 text-[13px] py-3">
        {label}: 暂无音频
      </div>
    );
  }

  const btnSize = large ? 'w-14 h-14' : 'w-10 h-10';
  const iconSize = large ? 18 : 14;

  return (
    <div>
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className={`${btnSize} flex items-center justify-center ${playing ? 'bg-blue-500' : 'bg-blue-600'} hover:bg-blue-500 text-white rounded-full transition shrink-0 cursor-pointer shadow-sm`}
        >
          {playing ? (
            <svg width={iconSize} height={iconSize} viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="4" height="12" rx="1" />
              <rect x="8" y="1" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width={iconSize} height={iconSize} viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 1.5v11l9-5.5z" />
            </svg>
          )}
        </button>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={seek}
            className="flex-1 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer"
          />
          <span className="text-[11px] text-gray-400 tabular-nums whitespace-nowrap">
            {fmt(currentTime)}/{fmt(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
