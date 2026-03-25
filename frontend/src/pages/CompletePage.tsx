import { useLocation, useNavigate } from 'react-router-dom';

export default function CompletePage() {
  const nav = useNavigate();
  const location = useLocation();
  const state = location.state as { total_score: number; count: number; language_pair: string } | null;

  const downloadExcel = () => {
    const token = localStorage.getItem('token');
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/export/excel', true);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
      <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 10l4 4 8-8" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-1">测试完成</h1>
        {state && (
          <div className="my-5">
            <p className="text-[13px] text-gray-500">{state.language_pair}</p>
            <p className="text-3xl font-semibold text-gray-900 mt-2 tabular-nums">
              {state.total_score > 0 ? '+' : ''}{state.total_score}
            </p>
            <p className="text-[12px] text-gray-400 mt-1">共 {state.count} 句</p>
          </div>
        )}
        <div className="space-y-2">
          <button
            onClick={downloadExcel}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition cursor-pointer"
          >
            下载结果 Excel
          </button>
          <button
            onClick={() => nav('/select')}
            className="w-full py-2.5 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-lg transition cursor-pointer border border-gray-200"
          >
            返回主页
          </button>
        </div>
      </div>
    </div>
  );
}
