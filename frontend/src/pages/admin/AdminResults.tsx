import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

interface Result {
  session_id: number;
  user_id: string;
  language_pair: string;
  pair_code: string;
  started_at: string | null;
  completed_at: string | null;
  total_score: number;
  avg_score: number;
  rated_count: number;
  status: string;
}

interface Pair { id: number; display_name: string; pair_code: string; }

export default function AdminResults() {
  const [results, setResults] = useState<Result[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [filterPair, setFilterPair] = useState<string>('');
  const [filterTester, setFilterTester] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    api.get('/admin/language-pairs').then(({ data }) => setPairs(data));
    load();
  }, []);

  const load = async () => {
    const params: Record<string, string> = {};
    if (filterPair) params.language_pair_id = filterPair;
    if (filterTester) params.tester_id = filterTester;
    const { data } = await api.get('/admin/results', { params });
    setResults(data);
  };

  useEffect(() => { load(); }, [filterPair, filterTester]);

  const handleExport = () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (filterPair) params.set('language_pair_id', filterPair);
    if (filterTester) params.set('tester_id', filterTester);

    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/api/export/excel?${params.toString()}`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.responseType = 'blob';
    xhr.onload = () => {
      if (xhr.status === 200) {
        const url = URL.createObjectURL(xhr.response);
        const link = document.createElement('a');
        link.href = url;
        link.download = `evaluation_results.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
      }
    };
    xhr.send();
  };

  const fmtTime = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900">测试结果</h2>
        <button
          onClick={handleExport}
          className="px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-md text-[13px] font-medium cursor-pointer"
        >
          导出 Excel
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <select
          value={filterPair}
          onChange={(e) => setFilterPair(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-md text-[13px] bg-white outline-none"
        >
          <option value="">全部语言对</option>
          {pairs.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
        <input
          placeholder="筛选测试人员ID"
          value={filterTester}
          onChange={(e) => setFilterTester(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-md text-[13px] bg-white outline-none"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2.5 text-left text-gray-500 font-medium">测试人员</th>
              <th className="px-4 py-2.5 text-left text-gray-500 font-medium">语言对</th>
              <th className="px-4 py-2.5 text-left text-gray-500 font-medium">开始时间</th>
              <th className="px-4 py-2.5 text-left text-gray-500 font-medium">结束时间</th>
              <th className="px-4 py-2.5 text-right text-gray-500 font-medium">自研总分</th>
              <th className="px-4 py-2.5 text-right text-gray-500 font-medium">平均分</th>
              <th className="px-4 py-2.5 text-left text-gray-500 font-medium">状态</th>
              <th className="px-4 py-2.5 text-right text-gray-500 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.session_id} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-medium text-gray-800">{r.user_id}</td>
                <td className="px-4 py-2.5 text-gray-500">{r.language_pair}</td>
                <td className="px-4 py-2.5 text-gray-400 tabular-nums">{fmtTime(r.started_at)}</td>
                <td className="px-4 py-2.5 text-gray-400 tabular-nums">{fmtTime(r.completed_at)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-gray-800 tabular-nums">
                  {r.status === 'completed' ? (r.total_score > 0 ? `+${r.total_score}` : r.total_score) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">
                  {r.status === 'completed' ? r.avg_score : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                    r.status === 'completed' ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {r.status === 'completed' ? '已完成' : '进行中'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => nav(`/admin/results/${r.session_id}`)}
                    className="text-gray-500 hover:text-gray-900 text-[13px] cursor-pointer"
                  >
                    详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {results.length === 0 && (
          <div className="text-center text-gray-400 py-12 text-sm">暂无测试结果</div>
        )}
      </div>
    </div>
  );
}
