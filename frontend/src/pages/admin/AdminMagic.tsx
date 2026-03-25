import { useState } from 'react';
import api from '../../api';

const MAGIC_IMPORT_HEADERS = [
  '语料ID', '原始文本', '音频时长(秒)', '源语言', '目标语言',
  '引擎1翻译文本', '引擎1识别文本', '引擎2翻译文本', '引擎2识别文本',
  '编码', '显示名称'
];

export default function AdminMagic() {
  const [importing, setImporting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [scanResult, setScanResult] = useState<any>(null);

  const downloadTemplate = async () => {
    const { data } = await api.get('/admin/magic-import-template', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = '魔法导入模板.xlsx';
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
      const { data } = await api.post('/admin/magic-import-excel', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(data);
    } catch (err: any) {
      setImportResult({ error: err.response?.data?.detail || err.message });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleScanAllAudio = async () => {
    setScanResult(null);
    setScanning(true);
    try {
      const { data } = await api.post('/admin/scan-all-audio');
      setScanResult(data);
    } catch (err: any) {
      setScanResult({ error: err.response?.data?.detail || err.message });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-5">魔法导入</h2>

      {/* 导入部分 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-[14px] font-medium text-gray-900 mb-3">Step 1: 导入 Excel</h3>
        <p className="text-[12px] text-gray-500 mb-4">
          上传包含语言对和语料的 Excel，一次性创建语言对并导入语料。
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={downloadTemplate}
            className="px-3 py-1.5 text-[13px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer border border-gray-200"
          >
            下载导入模板
          </button>
          <label className="px-3 py-1.5 text-[13px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer border border-gray-200">
            {importing ? '导入中...' : '选择 Excel 文件'}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              disabled={importing}
              onChange={handleExcelImport}
            />
          </label>
        </div>

        {importResult && (
          <div className={`mt-4 p-3 rounded-lg text-[13px] ${importResult.error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {importResult.error ? (
              <p>导入失败：{importResult.error}</p>
            ) : (
              <p>
                完成！新建语言对: {importResult.pairs_created}，已有语言对: {importResult.pairs_existed}，
                导入语料: {importResult.sentences_imported}，跳过重复: {importResult.sentences_skipped}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 扫描音频部分 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-[14px] font-medium text-gray-900 mb-3">Step 2: 扫描音频</h3>
        <p className="text-[12px] text-gray-500 mb-4">
          扫描所有语言对的音频文件夹，匹配语料ID并更新音频地址。
        </p>

        <button
          onClick={handleScanAllAudio}
          disabled={scanning}
          className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-[13px] font-medium cursor-pointer disabled:opacity-40"
        >
          {scanning ? '扫描中...' : '扫描所有音频'}
        </button>

        {scanResult && (
          <div className={`mt-4 p-3 rounded-lg text-[13px] ${scanResult.error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {scanResult.error ? (
              <p>扫描失败：{scanResult.error}</p>
            ) : (
              <div>
                <p className="font-medium mb-2">
                  扫描完成！共匹配: {scanResult.total_matched}，未匹配: {scanResult.total_not_found}
                </p>
                <div className="mt-2 space-y-1">
                  {scanResult.pairs?.map((p: any) => (
                    <div key={p.pair_code} className="text-[12px] flex items-center gap-2">
                      <span className="font-medium">{p.pair_code}:</span>
                      <span className="text-green-600">匹配 {p.matched}</span>
                      {p.not_found > 0 && <span className="text-orange-500">未匹配 {p.not_found}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 表格说明 */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="text-[13px] font-medium text-gray-700 mb-2">Excel 表头说明</h4>
        <div className="text-[12px] text-gray-500 space-y-1">
          {MAGIC_IMPORT_HEADERS.map((h, i) => (
            <div key={h} className="flex gap-2">
              <span className="w-6 text-gray-400">{i + 1}.</span>
              <span>{h}</span>
              {i === 0 && <span className="text-orange-500">(支持 zh/KO-13-JIN_xxx.wav 格式，会自动去除前缀和扩展名)</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}