import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface LangPair {
  id: number;
  pair_code: string;
  display_name: string;
  sentence_count: number;
  status: string;
}

export default function SelectPair() {
  const [pairs, setPairs] = useState<LangPair[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [resumePrompt, setResumePrompt] = useState<{ sessionId: number; pairId: number } | null>(null);
  const nav = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => { loadPairs(); }, []);

  const loadPairs = async () => {
    const { data } = await api.get('/language-pairs');
    setPairs(data);
  };

  const handleStart = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/test/start?language_pair_id=${selected}`);
      if (data.resumed && data.current_index > 1) {
        setResumePrompt({ sessionId: data.session_id, pairId: selected });
        setLoading(false);
        return;
      }
      nav(`/test/${data.session_id}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || '操作失败');
      setLoading(false);
    }
  };

  const handleResume = () => {
    if (resumePrompt) nav(`/test/${resumePrompt.sessionId}`);
  };

  const handleRestart = async () => {
    if (!resumePrompt) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/test/start?language_pair_id=${resumePrompt.pairId}&restart=true`);
      nav(`/test/${data.session_id}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || '操作失败');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    nav('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
      <div className="w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-lg font-semibold text-gray-900">选择测试语言对</h1>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-gray-400">{user.user_id}</span>
            <button onClick={handleLogout} className="text-[13px] text-gray-400 hover:text-gray-600 cursor-pointer">退出</button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2.5">
          {pairs.map((p) => (
            <label
              key={p.id}
              className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition ${
                p.status === 'completed'
                  ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                  : selected === p.id
                  ? 'border-blue-400 bg-slate-50'
                  : 'border-gray-150 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="pair"
                  value={p.id}
                  checked={selected === p.id}
                  disabled={p.status === 'completed'}
                  onChange={() => setSelected(p.id)}
                  className="w-4 h-4 accent-blue-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800">{p.display_name}</span>
                  <span className="text-xs text-gray-400 ml-2">{p.sentence_count} 条</span>
                </div>
              </div>
              {p.status === 'completed' && (
                <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">已完成</span>
              )}
              {p.status === 'in_progress' && (
                <span className="text-[11px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-medium">进行中</span>
              )}
            </label>
          ))}
          {pairs.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">暂无可测试的语言对</p>
          )}
          <button
            onClick={handleStart}
            disabled={!selected || loading}
            className="w-full mt-3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition disabled:opacity-40 cursor-pointer"
          >
            {loading ? '加载中...' : '开始测试'}
          </button>
        </div>

        {resumePrompt && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white border border-gray-200 rounded-xl p-7 max-w-sm w-full mx-4">
              <h2 className="text-base font-semibold mb-2 text-gray-900">检测到未完成的测试</h2>
              <p className="text-sm text-gray-500 mb-5">是否继续上次的测试？</p>
              <div className="flex gap-2.5">
                <button
                  onClick={handleResume}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium cursor-pointer"
                >
                  继续测试
                </button>
                <button
                  onClick={handleRestart}
                  className="flex-1 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium cursor-pointer border border-gray-200"
                >
                  重新开始
                </button>
              </div>
              <button
                onClick={() => setResumePrompt(null)}
                className="w-full mt-2.5 py-2 text-gray-400 hover:text-gray-600 text-[13px] cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
