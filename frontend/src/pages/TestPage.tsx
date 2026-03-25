import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import AudioPlayer from '../components/AudioPlayer';
import AudioWave from '../components/AudioWave';

interface SentenceData {
  sentence_id: number;
  sid: string;
  sentence_index: number;
  total: number;
  source_text: string;
  source_audio: string | null;
  source_audio_duration: number;
  left_translation_text: string;
  left_recognition_text: string;
  left_audio: string | null;
  right_translation_text: string;
  right_recognition_text: string;
  right_audio: string | null;
  engine_left: string;
  engine_right: string;
  existing_rating: number | null;
  existing_left_play_count: number;
  existing_right_play_count: number;
}

const RATING_OPTIONS = [
  { value: -2, label: 'A 更好', short: 'A++' },
  { value: -1, label: 'A 好一点', short: 'A+' },
  { value: 0,  label: '差不多', short: '=' },
  { value: 1,  label: 'B 好一点', short: 'B+' },
  { value: 2,  label: 'B 更好', short: 'B++' },
];

export default function TestPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const nav = useNavigate();
  const [sentence, setSentence] = useState<SentenceData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [rating, setRating] = useState<number | null>(null);
  const [leftPlayCount, setLeftPlayCount] = useState(0);
  const [rightPlayCount, setRightPlayCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  const loadSentence = useCallback(async (idx: number) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/test/sentence?session_id=${sessionId}&index=${idx}`);
      setSentence(data);
      setRating(data.existing_rating);
      setLeftPlayCount(data.existing_left_play_count || 0);
      setRightPlayCount(data.existing_right_play_count || 0);
      startTimeRef.current = Date.now();
    } catch (err: any) {
      if (err.response?.status === 404) {
        alert('句子不存在');
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const cached = localStorage.getItem(`test_progress_${sessionId}`);
    const startIdx = cached ? parseInt(cached, 10) : 1;
    setCurrentIndex(startIdx);
    loadSentence(startIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const loadAndTrack = useCallback((idx: number) => {
    loadSentence(idx);
    localStorage.setItem(`test_progress_${sessionId}`, String(idx));
  }, [loadSentence, sessionId]);

  const handleNext = async () => {
    if (rating === null) {
      alert('请先选择评分');
      return;
    }
    if (!sentence) return;
    setSubmitting(true);
    const duration = (Date.now() - startTimeRef.current) / 1000;
    try {
      await api.post(`/test/rate?session_id=${sessionId}`, {
        sentence_id: sentence.sentence_id,
        sentence_index: sentence.sentence_index,
        user_rating: rating,
        left_play_count: leftPlayCount,
        right_play_count: rightPlayCount,
        duration_seconds: Math.round(duration),
      });

      if (currentIndex >= sentence.total) {
        const { data } = await api.post(`/test/complete?session_id=${sessionId}`);
        localStorage.removeItem(`test_progress_${sessionId}`);
        nav('/complete', { state: { total_score: data.total_score, count: data.count, language_pair: data.language_pair } });
      } else {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        setRating(null);
        setLeftPlayCount(0);
        setRightPlayCount(0);
        loadAndTrack(nextIdx);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePause = async () => {
    try {
      await api.post(`/test/pause?session_id=${sessionId}`, { current_index: currentIndex });
      nav('/select');
    } catch {
      nav('/select');
    }
  };

  if (loading && !sentence) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
        <div className="text-gray-400 text-sm">加载中...</div>
      </div>
    );
  }

  if (!sentence) return null;

  const pct = Math.round((currentIndex / sentence.total) * 100);

  return (
    <div className="min-h-screen bg-[#f8f9fb] py-3 px-3 sm:py-5 sm:px-4 pb-24 relative">
      <AudioWave />
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header - 移动端优化 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-sm sm:text-[13px] font-medium text-gray-700">
              {currentIndex}<span className="text-gray-400">/{sentence.total}</span>
            </span>
            <span className="text-[10px] sm:text-[11px] text-gray-400 font-mono hidden sm:inline">ID: {sentence.sid}</span>
            <div className="flex-1 sm:w-48 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] sm:text-[12px] text-gray-400">{pct}%</span>
          </div>
          <button
            onClick={handlePause}
            className="self-end sm:self-auto px-3 py-1.5 text-[12px] sm:text-[13px] text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            暂停保存
          </button>
        </div>

        {/* Source audio + text - 移动端垂直布局 */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-5 mb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="flex-1">
              <div className="text-[10px] sm:text-[11px] text-gray-400 uppercase tracking-wider mb-1.5 sm:mb-2">原始音频</div>
              <AudioPlayer src={sentence.source_audio} label="原始" autoPlay />
            </div>
            <div className="hidden sm:block w-px h-12 bg-gray-100 self-center" />
            <div className="flex-1">
              <div className="text-[10px] sm:text-[11px] text-gray-400 mb-1.5 sm:mb-2">原文</div>
              <p className="text-[13px] sm:text-[14px] text-gray-800 leading-relaxed">{sentence.source_text}</p>
            </div>
          </div>
        </div>

        {/* A/B Engine cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 mb-3">
          {/* Engine A */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500 text-white text-[10px] sm:text-[11px] font-semibold flex items-center justify-center">A</span>
                <span className="text-[12px] sm:text-[13px] font-medium text-gray-600">引擎 A</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-gray-400">播放 {leftPlayCount} 次</span>
            </div>

            {/* Text info - compact, above audio */}
            <div className="mb-2 sm:mb-3 space-y-1 sm:space-y-1.5">
              <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-gray-50 rounded-lg">
                <span className="text-[10px] sm:text-[11px] text-gray-400">识别</span>
                <p className="text-[12px] sm:text-[13px] text-gray-500 leading-snug">{sentence.left_recognition_text || '—'}</p>
              </div>
              <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-gray-50 rounded-lg">
                <span className="text-[10px] sm:text-[11px] text-gray-400">翻译</span>
                <p className="text-[12px] sm:text-[13px] text-gray-800 leading-snug">{sentence.left_translation_text || '—'}</p>
              </div>
            </div>

            {/* Audio player - prominent */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3">
              <AudioPlayer
                src={sentence.left_audio}
                label="引擎A"
                playCount={leftPlayCount}
                onPlayCountChange={setLeftPlayCount}
                large
              />
            </div>
          </div>

          {/* Engine B */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500 text-white text-[10px] sm:text-[11px] font-semibold flex items-center justify-center">B</span>
                <span className="text-[12px] sm:text-[13px] font-medium text-gray-600">引擎 B</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-gray-400">播放 {rightPlayCount} 次</span>
            </div>

            {/* Text info */}
            <div className="mb-2 sm:mb-3 space-y-1 sm:space-y-1.5">
              <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-gray-50 rounded-lg">
                <span className="text-[10px] sm:text-[11px] text-gray-400">识别</span>
                <p className="text-[12px] sm:text-[13px] text-gray-500 leading-snug">{sentence.right_recognition_text || '—'}</p>
              </div>
              <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-gray-50 rounded-lg">
                <span className="text-[10px] sm:text-[11px] text-gray-400">翻译</span>
                <p className="text-[12px] sm:text-[13px] text-gray-800 leading-snug">{sentence.right_translation_text || '—'}</p>
              </div>
            </div>

            {/* Audio player - prominent */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3">
              <AudioPlayer
                src={sentence.right_audio}
                label="引擎B"
                playCount={rightPlayCount}
                onPlayCountChange={setRightPlayCount}
                large
              />
            </div>
          </div>
        </div>

        {/* Rating - large circles */}
        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 sm:p-7">
          <div className="text-center text-[14px] sm:text-[15px] font-semibold text-slate-700 tracking-wide mb-4 sm:mb-7">哪个翻译更好？</div>
          <div className="flex justify-center items-end gap-2 sm:gap-5 mb-5 sm:mb-8">
            {RATING_OPTIONS.map((opt) => {
              const isSelected = rating === opt.value;
              // 移动端更小的按钮
              const size = opt.value === -2 || opt.value === 2
                ? 'w-14 h-14 sm:w-20 sm:h-20 text-[13px] sm:text-[15px]'
                : opt.value === -1 || opt.value === 1
                ? 'w-12 h-12 sm:w-[4.25rem] sm:h-[4.25rem] text-[12px] sm:text-[14px]'
                : 'w-11 h-11 sm:w-16 sm:h-16 text-[11px] sm:text-[13px]';

              let bg: string;
              if (isSelected) {
                bg = 'bg-blue-500 text-white border-blue-500 shadow-md scale-110';
              } else {
                bg = 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:bg-slate-50';
              }

              return (
                <div key={opt.value} className="flex flex-col items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => setRating(opt.value)}
                    className={`${size} rounded-full border-2 flex items-center justify-center font-bold transition-all cursor-pointer ${bg}`}
                  >
                    {opt.short}
                  </button>
                  <span className={`text-[10px] sm:text-[12px] font-medium ${isSelected ? 'text-blue-700' : 'text-gray-400'}`}>
                    {opt.label}
                  </span>
                </div>
              );
            })}
          </div>
          <button
            onClick={handleNext}
            disabled={rating === null || submitting}
            className="w-full py-3 sm:py-4 bg-blue-600 hover:bg-blue-500 text-white text-[14px] sm:text-[15px] font-semibold rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting
              ? '提交中...'
              : currentIndex >= sentence.total
              ? '提交并完成 ✓'
              : '下一句 →'}
          </button>
        </div>
      </div>
    </div>
  );
}
