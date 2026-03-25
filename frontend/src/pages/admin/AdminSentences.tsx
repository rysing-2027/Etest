import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';

interface Sentence {
  id: number;
  sid: string;
  sentence_index: number;
  source_text: string;
  source_audio_path: string | null;
  engine1_translation_text: string;
  engine1_recognition_text: string;
  engine1_audio_path: string | null;
  engine2_translation_text: string;
  engine2_recognition_text: string;
  engine2_audio_path: string | null;
}

function downloadTemplate(sourceLang: string, targetLang: string) {
  const headers = ['语料ID', '原始文本', '音频时长(秒)', '源语言', '目标语言', '引擎1翻译文本', '引擎1识别文本', '引擎2翻译文本', '引擎2识别文本'];
  const example = ['001', '你好，欢迎来到中国', '3.5', sourceLang, targetLang, 'Hello, welcome to China', 'Hello welcome to China', 'Hi, welcome to China', 'Hi welcome to China'];
  const csv = '\uFEFF' + headers.join(',') + '\n' + example.join(',') + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '语料导入模板.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminSentences() {
  const { pairId } = useParams<{ pairId: string }>();
  const nav = useNavigate();
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [pair, setPair] = useState<{ source_lang: string; target_lang: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const excelRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null); // 当前播放的音频标识

  const [form, setForm] = useState({
    sid: '',
    source_text: '',
    source_audio_duration: 0,
    engine1_translation_text: '',
    engine1_recognition_text: '',
    engine2_translation_text: '',
    engine2_recognition_text: '',
  });
  const [files, setFiles] = useState<{ source?: File; e1?: File; e2?: File }>({});

  useEffect(() => { load(); }, [pairId]);

  const load = async () => {
    const [sentencesRes, pairsRes] = await Promise.all([
      api.get(`/admin/sentences?language_pair_id=${pairId}`),
      api.get('/admin/language-pairs'),
    ]);
    setSentences(sentencesRes.data);
    setSelectedIds(new Set());
    const found = pairsRes.data.find((p: { id: number }) => String(p.id) === pairId);
    if (found) setPair({ source_lang: found.source_lang, target_lang: found.target_lang });
  };

  const handleCreate = async () => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('language_pair_id', pairId!);
      fd.append('sid', form.sid);
      fd.append('source_text', form.source_text);
      fd.append('source_audio_duration', String(form.source_audio_duration));
      fd.append('engine1_translation_text', form.engine1_translation_text);
      fd.append('engine1_recognition_text', form.engine1_recognition_text);
      fd.append('engine2_translation_text', form.engine2_translation_text);
      fd.append('engine2_recognition_text', form.engine2_recognition_text);
      if (files.source) fd.append('source_audio', files.source);
      if (files.e1) fd.append('engine1_audio', files.e1);
      if (files.e2) fd.append('engine2_audio', files.e2);

      await api.post('/admin/sentences', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowForm(false);
      setFiles({});
      load();
    } catch (err: any) {
      alert(err.response?.data?.detail || '创建失败');
    } finally {
      setUploading(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('language_pair_id', pairId!);
      fd.append('file', file);
      const { data } = await api.post('/admin/sentences/import-excel', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const parts = [`成功导入 ${data.imported} 条语料`];
      if (data.filtered) parts.push(`跳过 ${data.filtered} 条（语言对不匹配）`);
      if (data.skipped) parts.push(`跳过 ${data.skipped} 条（语料ID已存在）`);
      alert(parts.join('，'));
      load();
    } catch (err: any) {
      alert(err.response?.data?.detail || '导入失败');
    } finally {
      setUploading(false);
      if (excelRef.current) excelRef.current.value = '';
    }
  };

  const handleScanAudio = async () => {
    setScanning(true);
    try {
      const { data } = await api.post(`/admin/sentences/scan-audio?language_pair_id=${pairId}`);
      alert(`扫描完成：成功关联 ${data.matched} 条音频，${data.not_found} 条未匹配到句子`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.detail || '扫描失败');
    } finally {
      setScanning(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此条语料？')) return;
    await api.delete(`/admin/sentences/${id}`);
    load();
  };

  const allIds = sentences.map((s) => s.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allIds));
  };
  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条语料？此操作不可恢复。`)) return;
    setDeleting(true);
    try {
      const { data } = await api.post('/admin/sentences/batch-delete', { ids: Array.from(selectedIds) });
      alert(`已删除 ${data.deleted} 条语料`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.detail || '批量删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const playAudio = (path: string, id: string) => {
    if (playing === id) {
      // 正在播放这个，暂停
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlaying(null);
    } else {
      // 播放新的
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(`/api/audio/${path}`);
      audio.onended = () => setPlaying(null);
      audio.play();
      audioRef.current = audio;
      setPlaying(id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/admin/pairs')} className="text-gray-400 hover:text-gray-600 cursor-pointer text-[13px]">&larr; 返回</button>
          <h2 className="text-base font-semibold text-gray-900">语料管理</h2>
          <span className="text-[12px] text-gray-400">共 {sentences.length} 条</span>
        </div>
        <div className="flex gap-1.5 items-center">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBatchDelete}
              disabled={deleting}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-[13px] font-medium cursor-pointer disabled:opacity-50"
            >
              {deleting ? '删除中...' : `批量删除 (${selectedIds.size})`}
            </button>
          )}
          <button
            onClick={handleScanAudio}
            disabled={scanning}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md text-[13px] font-medium hover:bg-gray-50 cursor-pointer disabled:opacity-50"
          >
            {scanning ? '扫描中...' : '扫描关联音频'}
          </button>
          <button
            onClick={() => downloadTemplate(pair?.source_lang ?? '', pair?.target_lang ?? '')}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md text-[13px] font-medium hover:bg-gray-50 cursor-pointer"
          >
            下载模板
          </button>
          <label className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md text-[13px] font-medium hover:bg-gray-50 cursor-pointer">
            Excel 导入
            <input ref={excelRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
          </label>
          <button
            onClick={() => {
              setForm({ sid: '', source_text: '', source_audio_duration: 0, engine1_translation_text: '', engine1_recognition_text: '', engine2_translation_text: '', engine2_recognition_text: '' });
              setShowForm(true);
            }}
            className="px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-md text-[13px] font-medium cursor-pointer"
          >
            + 新增语料
          </button>
        </div>
      </div>

      {uploading && (
        <div className="text-center py-3 text-[13px] text-gray-500">上传中...</div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2.5 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-gray-600 focus:ring-gray-500 cursor-pointer"
                  title="全选"
                />
              </th>
              <th className="px-4 py-2.5 text-left text-gray-500 font-medium">语料ID</th>
              <th className="px-4 py-2.5 text-left text-gray-500 font-medium">原文</th>
              <th className="px-4 py-2.5 text-left text-gray-500 font-medium">引擎1翻译</th>
              <th className="px-4 py-2.5 text-left text-gray-500 font-medium">引擎2翻译</th>
              <th className="px-4 py-2.5 text-left text-gray-500 font-medium">音频</th>
              <th className="px-4 py-2.5 text-right text-gray-500 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {sentences.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleOne(s.id)}
                    className="rounded border-gray-300 text-gray-600 focus:ring-gray-500 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-2.5 text-gray-500 font-mono">{s.sid}</td>
                <td className="px-4 py-2.5 text-gray-800 max-w-48 truncate">{s.source_text}</td>
                <td className="px-4 py-2.5 text-gray-500 max-w-36 truncate">{s.engine1_translation_text || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 max-w-36 truncate">{s.engine2_translation_text || '—'}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    {s.source_audio_path && (
                      <button
                        onClick={() => playAudio(s.source_audio_path!, `source-${s.id}`)}
                        className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                          playing === `source-${s.id}`
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        原始
                      </button>
                    )}
                    {s.engine1_audio_path && (
                      <button
                        onClick={() => playAudio(s.engine1_audio_path!, `e1-${s.id}`)}
                        className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                          playing === `e1-${s.id}`
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        E1
                      </button>
                    )}
                    {s.engine2_audio_path && (
                      <button
                        onClick={() => playAudio(s.engine2_audio_path!, `e2-${s.id}`)}
                        className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                          playing === `e2-${s.id}`
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        E2
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-gray-400 hover:text-red-600 text-[13px] cursor-pointer"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sentences.length === 0 && (
          <div className="text-center text-gray-400 py-12 text-sm">暂无语料</div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-4">新增语料</h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Section 1: Source */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-[12px] font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">原始音频 / 文本</div>
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-400 mb-1 block">语料ID</label>
                      <input
                        type="text"
                        placeholder="如 001, S01"
                        value={form.sid}
                        onChange={(e) => setForm({ ...form, sid: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] bg-gray-50/50 outline-none focus:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 mb-1 block">音频时长(秒)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.source_audio_duration}
                        onChange={(e) => setForm({ ...form, source_audio_duration: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] bg-gray-50/50 outline-none focus:border-gray-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">原始文本</label>
                    <textarea
                      value={form.source_text}
                      onChange={(e) => setForm({ ...form, source_text: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] bg-gray-50/50 outline-none focus:border-gray-400"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">音频文件</label>
                    <input type="file" accept=".wav,.mp3" onChange={(e) => setFiles({ ...files, source: e.target.files?.[0] })} className="text-[12px] text-gray-500" />
                  </div>
                </div>
              </div>

              {/* Section 2: Engine 1 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-[12px] font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">引擎 1（自研）</div>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">翻译文本</label>
                    <input
                      value={form.engine1_translation_text}
                      onChange={(e) => setForm({ ...form, engine1_translation_text: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] bg-gray-50/50 outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">识别文本 (ASR)</label>
                    <input
                      value={form.engine1_recognition_text}
                      onChange={(e) => setForm({ ...form, engine1_recognition_text: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] bg-gray-50/50 outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">翻译音频</label>
                    <input type="file" accept=".wav,.mp3" onChange={(e) => setFiles({ ...files, e1: e.target.files?.[0] })} className="text-[12px] text-gray-500" />
                  </div>
                </div>
              </div>

              {/* Section 3: Engine 2 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-[12px] font-medium text-gray-900 mb-3 pb-2 border-b border-gray-100">引擎 2（讯飞）</div>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">翻译文本</label>
                    <input
                      value={form.engine2_translation_text}
                      onChange={(e) => setForm({ ...form, engine2_translation_text: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] bg-gray-50/50 outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">识别文本 (ASR)</label>
                    <input
                      value={form.engine2_recognition_text}
                      onChange={(e) => setForm({ ...form, engine2_recognition_text: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-[13px] bg-gray-50/50 outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">翻译音频</label>
                    <input type="file" accept=".wav,.mp3" onChange={(e) => setFiles({ ...files, e2: e.target.files?.[0] })} className="text-[12px] text-gray-500" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button onClick={handleCreate} disabled={uploading} className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-[13px] font-medium cursor-pointer hover:bg-gray-800 disabled:opacity-40">
                {uploading ? '上传中...' : '创建'}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-white text-gray-600 rounded-lg text-[13px] font-medium cursor-pointer hover:bg-gray-50 border border-gray-200">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
