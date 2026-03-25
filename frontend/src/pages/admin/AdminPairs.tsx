import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

interface Pair {
  id: number;
  pair_code: string;
  display_name: string;
  source_lang: string;
  target_lang: string;
  sentence_count: number;
}

interface PairRow {
  source_lang: string;
  target_lang: string;
  pair_code: string;
  display_name: string;
}

const emptyRow = (): PairRow => ({ source_lang: '', target_lang: '', pair_code: '', display_name: '' });

export default function AdminPairs() {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [filterSource, setFilterSource] = useState<string>('');
  const [filterTarget, setFilterTarget] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [rows, setRows] = useState<PairRow[]>([emptyRow()]);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const nav = useNavigate();

  const sourceOptions = Array.from(new Set(pairs.map((p) => p.source_lang).filter(Boolean))).sort();
  const targetOptions = Array.from(new Set(pairs.map((p) => p.target_lang).filter(Boolean))).sort();
  const filteredPairs = pairs.filter(
    (p) =>
      (!filterSource || p.source_lang === filterSource) &&
      (!filterTarget || p.target_lang === filterTarget)
  );

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await api.get('/admin/language-pairs');
    setPairs(data);
  };

  const updateRow = (idx: number, field: keyof PairRow, val: string) => {
    const next = [...rows];
    next[idx] = { ...next[idx], [field]: val };
    setRows(next);
  };

  const addRow = () => setRows([...rows, emptyRow()]);

  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    const valid = rows.filter(r => r.pair_code && r.display_name);
    if (valid.length === 0) return;
    setCreating(true);
    let success = 0;
    for (const row of valid) {
      try {
        await api.post('/admin/language-pairs', row);
        success++;
      } catch (err: any) {
        alert(`创建 ${row.pair_code} 失败: ${err.response?.data?.detail || '未知错误'}`);
      }
    }
    if (success > 0) {
      setShowForm(false);
      setRows([emptyRow()]);
      load();
    }
    setCreating(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此语言对及所有相关语料？')) return;
    await api.delete(`/admin/language-pairs/${id}`);
    load();
  };

  const downloadTemplate = async () => {
    const { data } = await api.get('/admin/language-pairs/template', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'language_pairs_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);
    setImporting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<{ imported: number; skipped: number; errors: { row: number; message: string }[] }>(
        '/admin/language-pairs/import-excel',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const parts: string[] = [];
      if (data.imported > 0) parts.push(`成功导入 ${data.imported} 条`);
      if (data.skipped > 0) parts.push(`跳过重复 ${data.skipped} 条`);
      if (data.errors?.length) parts.push(`错误 ${data.errors.length} 条：${data.errors.map((x) => `第${x.row}行 ${x.message}`).join('；')}`);
      setImportResult(parts.length ? parts.join('；') : '无有效数据');
      if (data.imported > 0) {
        load();
      }
    } catch (err: any) {
      setImportResult('导入失败：' + (err.response?.data?.detail || err.message));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-semibold text-gray-900">测试内容管理</h2>
          <span className="text-[13px] text-gray-500">共 {pairs.length} 个语言对</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="px-3 py-1.5 text-[13px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer border border-gray-200"
          >
            下载导入模板
          </button>
          <label className="px-3 py-1.5 text-[13px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer border border-gray-200">
            Excel 导入
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={importing}
              onChange={handleExcelImport}
            />
          </label>
          <button
            onClick={() => { setRows([emptyRow()]); setShowForm(true); setImportResult(null); }}
            className="px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-[13px] font-medium cursor-pointer"
          >
            + 新增语言对
          </button>
        </div>
      </div>
      {importResult && (
        <p className="text-[13px] text-gray-600 mb-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
          {importResult}
        </p>
      )}

      {(sourceOptions.length > 0 || targetOptions.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-[12px] text-gray-500">筛选：</span>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-md text-[13px] text-gray-700 bg-white min-w-[100px]"
          >
            <option value="">全部源语言</option>
            {sourceOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-200 rounded-md text-[13px] text-gray-700 bg-white min-w-[100px]"
          >
            <option value="">全部目标语言</option>
            {targetOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {(filterSource || filterTarget) && (
            <button
              type="button"
              onClick={() => { setFilterSource(''); setFilterTarget(''); }}
              className="text-[12px] text-gray-500 hover:text-gray-700"
            >
              清除筛选
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {filteredPairs.map((p) => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <span className="text-[14px] font-medium text-gray-900">{p.display_name}</span>
              <span className="text-gray-400 text-[12px] ml-2">({p.pair_code})</span>
              <p className="text-[12px] text-gray-400 mt-0.5">当前语料：{p.sentence_count} 条</p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => nav(`/admin/sentences/${p.id}`)}
                className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-md text-[13px] font-medium hover:bg-gray-100 cursor-pointer border border-gray-200"
              >
                编辑语料
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                className="px-3 py-1.5 text-gray-400 rounded-md text-[13px] hover:text-red-600 hover:bg-red-50 cursor-pointer"
              >
                删除
              </button>
            </div>
          </div>
        ))}
        {filteredPairs.length === 0 && (
          <div className="text-center text-gray-400 py-12 text-sm">
            {pairs.length === 0 ? '暂无语言对，请点击右上角新增' : '当前筛选无结果'}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-xl w-full mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-4">新增语言对</h3>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {rows.map((row, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 relative">
                  {rows.length > 1 && (
                    <button
                      onClick={() => removeRow(idx)}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-500 text-[18px] cursor-pointer leading-none"
                    >
                      &times;
                    </button>
                  )}
                  <div className="text-[11px] text-gray-400 mb-2 font-medium">#{idx + 1}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="源语言 (zh)"
                      value={row.source_lang}
                      onChange={(e) => updateRow(idx, 'source_lang', e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-md text-[13px] bg-gray-50/50 outline-none focus:border-gray-400"
                    />
                    <input
                      placeholder="目标语言 (en)"
                      value={row.target_lang}
                      onChange={(e) => updateRow(idx, 'target_lang', e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-md text-[13px] bg-gray-50/50 outline-none focus:border-gray-400"
                    />
                    <input
                      placeholder="编码 (zh-en)"
                      value={row.pair_code}
                      onChange={(e) => updateRow(idx, 'pair_code', e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-md text-[13px] bg-gray-50/50 outline-none focus:border-gray-400"
                    />
                    <input
                      placeholder="显示名称 (中文 → 英语)"
                      value={row.display_name}
                      onChange={(e) => updateRow(idx, 'display_name', e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-md text-[13px] bg-gray-50/50 outline-none focus:border-gray-400"
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addRow}
              className="w-full mt-3 py-2 border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 rounded-lg text-[13px] cursor-pointer transition"
            >
              + 再添加一个语言对
            </button>
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-[13px] font-medium cursor-pointer hover:bg-gray-800 disabled:opacity-40"
              >
                {creating ? '创建中...' : `创建 (${rows.filter(r => r.pair_code && r.display_name).length} 个)`}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 bg-white text-gray-600 rounded-lg text-[13px] font-medium cursor-pointer hover:bg-gray-50 border border-gray-200"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
