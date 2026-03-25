import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';

interface Detail {
  sentence_index: number;
  sid: string;
  source_text: string;
  engine_left: string;
  engine_right: string;
  left_play_count: number;
  right_play_count: number;
  user_rating: number | null;
  duration_seconds: number;
  rated_at: string | null;
}

interface SessionDetail {
  user_id: string;
  language_pair: string;
  pair_code: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  details: Detail[];
}

export default function AdminResultDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const nav = useNavigate();
  const [data, setData] = useState<SessionDetail | null>(null);

  useEffect(() => {
    api.get(`/admin/results/${sessionId}/detail`).then(({ data }) => setData(data));
  }, [sessionId]);

  if (!data) {
    return <div className="text-center text-gray-400 py-12 text-sm">加载中...</div>;
  }

  // 按引擎计算统计（引擎1=自研，引擎2=讯飞）
  // 规则：user_rating < 0 表示左边胜，> 0 表示右边胜
  // 如果左边是引擎1，则 rating < 0 表示引擎1胜
  // 如果右边是引擎1，则 rating > 0 表示引擎1胜
  const engine1Score = data.details.reduce((s, d) => {
    if (d.user_rating === null) return s;
    // 如果左边是引擎1(self_research)，则 rating < 0 表示引擎1胜（给负分）
    // 如果右边是引擎1(self_research)，则 rating > 0 表示引擎1胜（给正分）
    if (d.engine_left === 'self_research') {
      return s - d.user_rating; // 取反：rating < 0 变成正数（引擎1胜）
    } else {
      return s + d.user_rating; // rating > 0 是正数（引擎1胜）
    }
  }, 0);

  // 统计各档次数（按引擎）
  const engine1Better2 = data.details.filter((d) => {
    if (d.user_rating === null) return false;
    if (d.engine_left === 'self_research') return d.user_rating === -2;
    return d.user_rating === 2;
  }).length;
  const engine1Better1 = data.details.filter((d) => {
    if (d.user_rating === null) return false;
    if (d.engine_left === 'self_research') return d.user_rating === -1;
    return d.user_rating === 1;
  }).length;
  const ties = data.details.filter((d) => d.user_rating === 0).length;
  const engine2Better1 = data.details.filter((d) => {
    if (d.user_rating === null) return false;
    if (d.engine_left === 'iflytek') return d.user_rating === -1;
    return d.user_rating === 1;
  }).length;
  const engine2Better2 = data.details.filter((d) => {
    if (d.user_rating === null) return false;
    if (d.engine_left === 'iflytek') return d.user_rating === -2;
    return d.user_rating === 2;
  }).length;

  const ratingLabel = (v: number | null) => {
    if (v === null) return '—';
    const labels: Record<number, string> = { [-2]: 'A更好', [-1]: 'A好一点', 0: '差不多', 1: 'B好一点', 2: 'B更好' };
    return labels[v] ?? String(v);
  };

  const ratingColor = (v: number | null) => {
    if (v === null) return '';
    if (v < 0) return 'text-gray-900 font-medium';
    if (v > 0) return 'text-gray-900 font-medium';
    return 'text-gray-400';
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => nav('/admin/results')} className="text-gray-400 hover:text-gray-600 cursor-pointer text-[13px]">&larr; 返回</button>
        <h2 className="text-base font-semibold text-gray-900">测试详情</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded-lg p-3.5">
          <div className="text-[11px] text-gray-400">测试人员</div>
          <div className="text-[15px] font-semibold text-gray-900 mt-1">{data.user_id}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3.5">
          <div className="text-[11px] text-gray-400">语言对</div>
          <div className="text-[15px] font-semibold text-gray-900 mt-1">{data.language_pair}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3.5">
          <div className="text-[11px] text-gray-400">自研总分（负=讯飞优，正=自研优）</div>
          <div className="text-[15px] font-semibold text-gray-900 mt-1 tabular-nums">{engine1Score > 0 ? `+${engine1Score}` : engine1Score}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3.5">
          <div className="text-[11px] text-gray-400">自研更好 / 好一点 / 差不多 / 讯飞好一点 / 讯飞更好</div>
          <div className="text-[15px] font-semibold text-gray-900 mt-1 tabular-nums">{engine1Better2} / {engine1Better1} / {ties} / {engine2Better1} / {engine2Better2}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2.5 text-left text-gray-500 font-medium">语料ID</th>
              <th className="px-4 py-2.5 text-left text-gray-500 font-medium">原文</th>
              <th className="px-4 py-2.5 text-center text-gray-500 font-medium">左侧</th>
              <th className="px-4 py-2.5 text-center text-gray-500 font-medium">右侧</th>
              <th className="px-4 py-2.5 text-center text-gray-500 font-medium">播放(左/右)</th>
              <th className="px-4 py-2.5 text-center text-gray-500 font-medium">评分</th>
              <th className="px-4 py-2.5 text-right text-gray-500 font-medium">耗时</th>
            </tr>
          </thead>
          <tbody>
            {data.details.map((d, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-gray-400 font-mono">{d.sid}</td>
                <td className="px-4 py-2.5 text-gray-800 max-w-64 truncate">{d.source_text}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                    {d.engine_left === 'self_research' ? '自研' : '讯飞'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                    {d.engine_right === 'self_research' ? '自研' : '讯飞'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center text-gray-500 tabular-nums">{d.left_play_count} / {d.right_play_count}</td>
                <td className={`px-4 py-2.5 text-center ${ratingColor(d.user_rating)}`}>
                  {ratingLabel(d.user_rating)}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">{d.duration_seconds}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
