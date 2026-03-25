import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/login', { user_id: userId, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ user_id: data.user_id, is_admin: data.is_admin }));
      nav(data.is_admin ? '/admin' : '/select');
    } catch (err: any) {
      setError(err.response?.data?.detail || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f8f9fb] to-[#eef0f5] relative overflow-hidden">
      {/* 背景动态音条 */}
      <div className="absolute inset-0 flex items-end justify-center gap-1 opacity-20 px-4">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="w-2 sm:w-3 bg-gradient-to-t from-green-500 via-blue-500 to-cyan-400 rounded-t-full animate-audio-bar"
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: `${1.2 + Math.random() * 0.8}s`,
              '--bar-height': `${20 + Math.random() * 70}%`,
            } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="w-full max-w-sm mx-4 z-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Timekettle</h1>
          <p className="text-sm text-gray-400 mt-3 tracking-wide">翻译引擎测评系统</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg shadow-gray-100/50">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-gray-600 mb-1.5">账号</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none transition text-sm bg-gray-50/50"
                placeholder="请输入账号ID"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-600 mb-1.5">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none transition text-sm bg-gray-50/50"
                placeholder="请输入密码"
                required
              />
            </div>
            {error && <p className="text-red-600 text-[13px] bg-red-50 border border-red-100 p-2.5 rounded-lg">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition disabled:opacity-40 cursor-pointer mt-2"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
