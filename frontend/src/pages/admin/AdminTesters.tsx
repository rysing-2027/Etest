import { useEffect, useState, useRef } from 'react';
import api from '../../api';

interface LangPairOption {
  id: number;
  display_name: string;
  pair_code: string;
  source_lang: string;
  target_lang: string;
}

interface Tester {
  id: number;
  user_id: string;
  status: string;
  completed_pairs: string[];
  allowed_language_pairs: { id: number; display_name: string }[];
  created_at: string | null;
}

function downloadTemplate() {
  const csv = '\uFEFF账号ID,密码\ntester_001,123456\ntester_002,123456\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '测试人员导入模板.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminTesters() {
  const [testers, setTesters] = useState<Tester[]>([]);
  const [pairs, setPairs] = useState<LangPairOption[]>([]);
  const [pairFilterSource, setPairFilterSource] = useState<string>('');
  const [pairFilterTarget, setPairFilterTarget] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ user_id: '', password: '', language_pair_ids: [] as number[] });
  const [importing, setImporting] = useState(false);
  const excelRef = useRef<HTMLInputElement>(null);

  const pairSourceOptions = Array.from(new Set(pairs.map((p) => p.source_lang).filter(Boolean))).sort();
  const pairTargetOptions = Array.from(new Set(pairs.map((p) => p.target_lang).filter(Boolean))).sort();
  const filteredPairs = pairs.filter(
    (p) =>
      (!pairFilterSource || p.source_lang === pairFilterSource) &&
      (!pairFilterTarget || p.target_lang === pairFilterTarget)
  );

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [testersRes, pairsRes] = await Promise.all([
      api.get('/admin/testers'),
      api.get('/admin/language-pairs'),
    ]);
    setTesters(testersRes.data);
    setPairs(
      pairsRes.data.map((p: { id: number; display_name: string; pair_code: string; source_lang: string; target_lang: string }) => ({
        id: p.id,
        display_name: p.display_name,
        pair_code: p.pair_code,
        source_lang: p.source_lang || '',
        target_lang: p.target_lang || '',
      }))
    );
  };

  const openForm = () => {
    setForm({ user_id: '', password: '', language_pair_ids: [] });
    setShowForm(true);
  };

  const togglePair = (id: number) => {
    setForm((f) => ({
      ...f,
      language_pair_ids: f.language_pair_ids.includes(id)
        ? f.language_pair_ids.filter((x) => x !== id)
        : [...f.language_pair_ids, id],
    }));
  };

  const handleCreate = async () => {
    if (!form.user_id || !form.password) return;
    try {
      await api.post('/admin/testers', {
        user_id: form.user_id,
        password: form.password,
        language_pair_ids: form.language_pair_ids.length > 0 ? form.language_pair_ids : undefined,
      });
      setShowForm(false);
      setForm({ user_id: '', password: '', language_pair_ids: [] });
      load();
    } catch (err: any) {
      alert(err.response?.data?.detail || '创建失败');
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/admin/testers/import-excel', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert(`成功导入 ${data.imported} 人，跳过 ${data.skipped} 人（已存在）`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.detail || '导入失败');
    } finally {
      setImporting(false);
      if (excelRef.current) excelRef.current.value = '';
    }
  };

  const handleReset = async (id: number) => {
    if (!confirm('重置后该用户可重新测试，原记录将被标记为已作废。确定？')) return;
    await api.post(`/admin/testers/${id}/reset`);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此测试人员？')) return;
    await api.delete(`/admin/testers/${id}`);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900">测试人员管理</h2>
        <div className="flex gap-1.5">
          <button
            onClick={downloadTemplate}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md text-[13px] font-medium hover:bg-gray-50 cursor-pointer"
          >
            下载模板
          </button>
          <label className={`px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md text-[13px] font-medium hover:bg-gray-50 cursor-pointer ${importing ? 'opacity-50' : ''}`}>
            {importing ? '导入中...' : 'Excel 导入'}
            <input ref={excelRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} disabled={importing} />
          </label>
          <button
            onClick={openForm}
            className="px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-md text-[13px] font-medium cursor-pointer"
          >
            + 新增
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-2.5 text-left text-gray-500 font-medium">账号ID</th>
              <th className="px-5 py-2.5 text-left text-gray-500 font-medium">可测语言对</th>
              <th className="px-5 py-2.5 text-left text-gray-500 font-medium">状态</th>
              <th className="px-5 py-2.5 text-left text-gray-500 font-medium">已测语言对</th>
              <th className="px-5 py-2.5 text-right text-gray-500 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {testers.map((t) => (
              <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-5 py-3 font-medium text-gray-800">{t.user_id}</td>
                <td className="px-5 py-3 text-gray-600 text-[12px]">
                  {t.allowed_language_pairs?.length > 0
                    ? t.allowed_language_pairs.map((p) => p.display_name).join('、')
                    : '全部'}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                    t.status === '已完成' ? 'bg-gray-100 text-gray-600'
                    : t.status === '测试中' ? 'bg-amber-50 text-amber-600'
                    : 'bg-gray-50 text-gray-400'
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500">
                  {t.completed_pairs.length > 0 ? t.completed_pairs.join(', ') : '—'}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => handleReset(t.id)} className="px-2.5 py-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded text-[13px] cursor-pointer">
                      重置
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="px-2.5 py-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded text-[13px] cursor-pointer">
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {testers.length === 0 && (
          <div className="text-center text-gray-400 py-12 text-sm">暂无测试人员</div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-4">新增测试人员</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-gray-400 mb-1 block">账号ID</label>
                <input
                  value={form.user_id}
                  onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                  placeholder="如：tester_001"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] bg-gray-50/50 outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 mb-1 block">初始密码</label>
                <input
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  type="password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] bg-gray-50/50 outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 mb-1.5 block">测试语言对（可多选，不选则全部可用）</label>
                {pairs.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[11px] text-gray-500">筛选：</span>
                    <select
                      value={pairFilterSource}
                      onChange={(e) => setPairFilterSource(e.target.value)}
                      className="px-2 py-1 border border-gray-200 rounded text-[12px] text-gray-700 bg-white min-w-[90px]"
                    >
                      <option value="">全部源语言</option>
                      {pairSourceOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      value={pairFilterTarget}
                      onChange={(e) => setPairFilterTarget(e.target.value)}
                      className="px-2 py-1 border border-gray-200 rounded text-[12px] text-gray-700 bg-white min-w-[90px]"
                    >
                      <option value="">全部目标语言</option>
                      {pairTargetOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2.5 bg-gray-50/50 space-y-1.5">
                  {pairs.length === 0 ? (
                    <p className="text-[12px] text-gray-400">暂无语言对，请先在语言对管理中创建</p>
                  ) : (
                    filteredPairs.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/60 rounded px-2 py-1">
                        <input
                          type="checkbox"
                          checked={form.language_pair_ids.includes(p.id)}
                          onChange={() => togglePair(p.id)}
                          className="rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                        />
                        <span className="text-[13px] text-gray-800">{p.display_name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button onClick={handleCreate} className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-[13px] font-medium cursor-pointer hover:bg-gray-800">创建</button>
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-white text-gray-600 rounded-lg text-[13px] font-medium cursor-pointer hover:bg-gray-50 border border-gray-200">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
