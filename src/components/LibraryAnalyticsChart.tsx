import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  Search,
  Wrench,
  Clock,
  Filter,
  CheckCircle2,
  RefreshCw,
  Zap,
  ArrowRight
} from 'lucide-react';
import { KnownIssue } from '../types';

interface LibraryAnalyticsChartProps {
  userActivity: any[];
  dbIssues: KnownIssue[];
  language: 'ko' | 'en';
  onSelectCategory?: (category: string) => void;
  onRunDiagnosis?: (query: string) => void;
}

interface CategoryMetric {
  key: string;
  nameKo: string;
  nameEn: string;
  diagnoses: number;
  searches: number;
  views: number;
  total: number;
  color: string;
  secondaryColor: string;
  recentQueries: string[];
}

const CANONICAL_CATEGORIES = [
  { key: '업데이트', nameKo: '업데이트', nameEn: 'Updates', color: '#6366f1', secondaryColor: '#818cf8', keywords: ['0x8007', '0x8024', '0x800f', 'update', '업데이트', 'kb', '누적', '설치'] },
  { key: '시스템/블루스크린', nameKo: '시스템/BSOD', nameEn: 'System/BSOD', color: '#ef4444', secondaryColor: '#f87171', keywords: ['bsod', '블루스크린', '0x0000', 'whea', 'page_fault', 'crash', '재부팅', '멈춤', 'freeze', 'kernel'] },
  { key: '네트워크', nameKo: '네트워크', nameEn: 'Network', color: '#3b82f6', secondaryColor: '#60a5fa', keywords: ['인터넷', 'wifi', 'dns', 'ping', '네트워크', '이더넷', '연결', 'ip', '0x800704cf'] },
  { key: '스토어/앱', nameKo: '스토어/앱', nameEn: 'Store/Apps', color: '#10b981', secondaryColor: '#34d399', keywords: ['스토어', 'store', '앱', 'app', '다운로드', '0x80073d02', '0x80073cf9', 'uwp'] },
  { key: '보안/백신', nameKo: '보안/백신', nameEn: 'Security', color: '#8b5cf6', secondaryColor: '#a78bfa', keywords: ['defender', '백신', '보안', '방화벽', '바이러스', 'smartscreen', 'tpm', '격리'] },
  { key: '정품인증', nameKo: '정품인증', nameEn: 'Activation', color: '#f59e0b', secondaryColor: '#fbbf24', keywords: ['정품', '인증', '키', '라이선스', 'activation', 'slmgr', '0xc004', '0x803f'] },
  { key: '디스플레이/그래픽', nameKo: '디스플레이/GPU', nameEn: 'Display/GPU', color: '#06b6d4', secondaryColor: '#22d3ee', keywords: ['디스플레이', '화면', '모니터', '해상도', '주사율', 'gpu', 'nvidia', 'amd', '그래픽'] },
  { key: '오디오/사운드', nameKo: '오디오/사운드', nameEn: 'Audio/Sound', color: '#ec4899', secondaryColor: '#f472b6', keywords: ['오디오', '사운드', '스피커', '마이크', '소리', '헤드셋', '음량', 'realtek'] }
];

export const LibraryAnalyticsChart: React.FC<LibraryAnalyticsChartProps> = ({
  userActivity = [],
  dbIssues = [],
  language = 'ko',
  onSelectCategory,
  onRunDiagnosis
}) => {
  const [chartMode, setChartMode] = useState<'stacked' | 'grouped'>('stacked');
  const [useSampleIfEmpty, setUseSampleIfEmpty] = useState<boolean>(true);

  // Map user activities to categories
  const { categoryData, hasRealData, totalDiagnoses, totalSearches, topCategory, topKeyword } = useMemo(() => {
    const countsMap: Record<string, { diagnoses: number; searches: number; views: number; queries: Set<string> }> = {};
    
    for (const cat of CANONICAL_CATEGORIES) {
      countsMap[cat.key] = { diagnoses: 0, searches: 0, views: 0, queries: new Set() };
    }

    let realCount = 0;
    const keywordFreq: Record<string, number> = {};

    for (const act of userActivity) {
      const q = (act.query || '').trim();
      const lowerQ = q.toLowerCase();
      let matchedCategory = act.metadata?.category || '';

      // Count keywords
      if (q) {
        const cleanWord = q.split(/\s+/)[0];
        if (cleanWord.length >= 3) {
          keywordFreq[cleanWord] = (keywordFreq[cleanWord] || 0) + 1;
        }
      }

      // 1. Try metadata category
      if (matchedCategory && countsMap[matchedCategory]) {
        // valid
      } else if (act.targetId) {
        // 2. Try target issue category
        const targetIssue = dbIssues.find(i => i.id === act.targetId);
        if (targetIssue && countsMap[targetIssue.category]) {
          matchedCategory = targetIssue.category;
        }
      }

      // 3. Keyword matching if not resolved
      if (!matchedCategory) {
        for (const cat of CANONICAL_CATEGORIES) {
          if (cat.keywords.some(k => lowerQ.includes(k.toLowerCase()))) {
            matchedCategory = cat.key;
            break;
          }
        }
      }

      // Default fallback
      if (!matchedCategory || !countsMap[matchedCategory]) {
        matchedCategory = '시스템/블루스크린';
      }

      realCount++;
      if (act.type === 'diagnosis') {
        countsMap[matchedCategory].diagnoses += 1;
      } else if (act.type === 'search') {
        countsMap[matchedCategory].searches += 1;
      } else {
        countsMap[matchedCategory].views += 1;
      }

      if (q) {
        countsMap[matchedCategory].queries.add(q);
      }
    }

    // Default sample telemetry when user activity is low or empty
    const baselineDistribution: Record<string, { diagnoses: number; searches: number }> = {
      '업데이트': { diagnoses: 14, searches: 22 },
      '시스템/블루스크린': { diagnoses: 19, searches: 15 },
      '네트워크': { diagnoses: 11, searches: 18 },
      '스토어/앱': { diagnoses: 8, searches: 13 },
      '보안/백신': { diagnoses: 6, searches: 10 },
      '정품인증': { diagnoses: 9, searches: 7 },
      '디스플레이/그래픽': { diagnoses: 7, searches: 9 },
      '오디오/사운드': { diagnoses: 5, searches: 8 }
    };

    const hasReal = realCount > 0;
    const shouldFallback = !hasReal && useSampleIfEmpty;

    let sumDiag = 0;
    let sumSearch = 0;

    const list: CategoryMetric[] = CANONICAL_CATEGORIES.map(cat => {
      const real = countsMap[cat.key];
      const fallback = baselineDistribution[cat.key] || { diagnoses: 2, searches: 4 };

      const diag = shouldFallback ? fallback.diagnoses : real.diagnoses;
      const srch = shouldFallback ? fallback.searches : real.searches;
      const vws = shouldFallback ? Math.round(fallback.searches * 0.7) : real.views;

      sumDiag += diag;
      sumSearch += srch;

      return {
        key: cat.key,
        nameKo: cat.nameKo,
        nameEn: cat.nameEn,
        diagnoses: diag,
        searches: srch,
        views: vws,
        total: diag + srch,
        color: cat.color,
        secondaryColor: cat.secondaryColor,
        recentQueries: Array.from(real.queries).slice(0, 3)
      };
    });

    // Sort by total descending
    list.sort((a, b) => b.total - a.total);

    const top = list[0] || null;
    let topKw = '0x80070643';
    let maxKwCount = 0;
    for (const [kw, c] of Object.entries(keywordFreq)) {
      if (c > maxKwCount) {
        maxKwCount = c;
        topKw = kw;
      }
    }

    return {
      categoryData: list,
      hasRealData: hasReal,
      totalDiagnoses: sumDiag,
      totalSearches: sumSearch,
      topCategory: top,
      topKeyword: topKw
    };
  }, [userActivity, dbIssues, useSampleIfEmpty]);

  // Formatter for category names based on language
  const getCategoryLabel = (item: CategoryMetric) => {
    return language === 'en' ? item.nameEn : item.nameKo;
  };

  // Custom Recharts Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const currentItem = categoryData.find(c => (language === 'en' ? c.nameEn : c.nameKo) === label) || categoryData[0];
    const totalCount = (payload[0]?.value || 0) + (payload[1]?.value || 0);

    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 text-xs min-w-[200px]">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentItem.color }}></div>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            {language === 'en' ? currentItem.nameEn : currentItem.nameKo}
          </span>
        </div>

        <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-indigo-500"></span>
              {language === 'en' ? 'AI Diagnoses:' : 'AI 오류 진단:'}
            </span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {currentItem.diagnoses}회
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-sky-400"></span>
              {language === 'en' ? 'Search Queries:' : '가이드 검색:'}
            </span>
            <span className="font-mono font-bold text-sky-500">
              {currentItem.searches}회
            </span>
          </div>

          <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center font-bold text-slate-800 dark:text-slate-200">
            <span>{language === 'en' ? 'Total Frequency:' : '총 누적 빈도:'}</span>
            <span className="font-mono text-sm text-slate-900 dark:text-slate-100">{totalCount}회</span>
          </div>
        </div>

        {currentItem.recentQueries && currentItem.recentQueries.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
            <span className="block font-semibold mb-1 text-slate-500">
              {language === 'en' ? 'Recent Query:' : '최근 쿼리 키워드:'}
            </span>
            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 truncate block">
              {currentItem.recentQueries[0]}
            </span>
          </div>
        )}
      </div>
    );
  };

  const chartData = useMemo(() => {
    return categoryData.map(c => ({
      name: language === 'en' ? c.nameEn : c.nameKo,
      key: c.key,
      diagnoses: c.diagnoses,
      searches: c.searches,
      total: c.total,
      color: c.color
    }));
  }, [categoryData, language]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-sm shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {language === 'en' ? 'User Query Categories & Diagnostic Frequencies' : '사용자 오류 쿼리 카테고리 & 진단 빈도 분석'}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                hasRealData 
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                  : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
              }`}>
                {hasRealData 
                  ? (language === 'en' ? 'Live Activity Data' : '실시간 활동 데이터') 
                  : (language === 'en' ? 'Benchmark Analytics' : '종합 통계 데이터')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'en'
                ? 'Visualizing user inquiry distributions across 8 Windows error categories and AI diagnostic usage frequency.'
                : '8대 Windows 오류 카테고리별 검색량과 AI 문제 해결 진단 실행 빈도를 Recharts 시각화로 분석합니다.'}
            </p>
          </div>
        </div>

        {/* Controls: Stacked vs Grouped, Data Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setChartMode('stacked')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                chartMode === 'stacked'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {language === 'en' ? 'Stacked' : '누적형'}
            </button>
            <button
              onClick={() => setChartMode('grouped')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                chartMode === 'grouped'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {language === 'en' ? 'Grouped' : '분리형'}
            </button>
          </div>

          {!hasRealData && (
            <button
              onClick={() => setUseSampleIfEmpty(prev => !prev)}
              className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              title={language === 'en' ? 'Toggle benchmark sample preview' : '샘플 벤치마크 데이터 토글'}
            >
              <RefreshCw className="w-3 h-3" />
              <span>{useSampleIfEmpty ? (language === 'en' ? 'Real Only' : '실제만') : (language === 'en' ? 'Sample' : '통계샘플')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Bento KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-50/70 dark:bg-slate-850/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>{language === 'en' ? 'Top Category' : '최다 진단 카테고리'}</span>
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
              {topCategory ? getCategoryLabel(topCategory) : 'N/A'}
            </span>
            {topCategory && (
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {topCategory.total}회
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5 bg-slate-50/70 dark:bg-slate-850/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>{language === 'en' ? 'Total Queries' : '총 누적 쿼리 빈도'}</span>
            <Activity className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="mt-1">
            <span className="text-xl sm:text-2xl font-mono font-black text-slate-900 dark:text-slate-100">
              {(totalDiagnoses + totalSearches).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 ml-1">회</span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50/70 dark:bg-slate-850/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>{language === 'en' ? 'AI Diagnosis Rate' : 'AI 해결 진단 비중'}</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-mono font-black text-amber-600 dark:text-amber-400">
              {totalDiagnoses + totalSearches > 0 
                ? `${Math.round((totalDiagnoses / (totalDiagnoses + totalSearches)) * 100)}%` 
                : '0%'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              ({totalDiagnoses} / {totalDiagnoses + totalSearches})
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50/70 dark:bg-slate-850/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>{language === 'en' ? 'Frequent Keyword' : '주요 빈발 오류 코드'}</span>
            <Zap className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-1">
            <span className="text-sm sm:text-base font-mono font-bold text-rose-600 dark:text-rose-400 truncate block">
              {topKeyword || '0x80070643'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Bar Chart Container */}
      <div className="h-[320px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 15, right: 10, left: -10, bottom: 25 }}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.2} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1', opacity: 0.4 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={45}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              formatter={(value) => {
                if (value === 'diagnoses') return language === 'en' ? 'AI Diagnoses' : 'AI 오류 진단';
                if (value === 'searches') return language === 'en' ? 'Search Queries' : '가이드 검색';
                return value;
              }}
            />

            <Bar
              dataKey="diagnoses"
              name="diagnoses"
              stackId={chartMode === 'stacked' ? 'a' : undefined}
              fill="#6366f1"
              radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
              maxBarSize={36}
            />

            <Bar
              dataKey="searches"
              name="searches"
              stackId={chartMode === 'stacked' ? 'a' : undefined}
              fill="#38bdf8"
              radius={chartMode === 'stacked' ? [6, 6, 0, 0] : [6, 6, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Category Action Badges */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-indigo-500" />
            {language === 'en' ? 'Direct Category Filter (Click to Explore Issues)' : '카테고리 바로가기 (클릭 시 해당 해결 가이드북으로 이동)'}
          </span>
          <span className="text-[10px] text-slate-400">
            {language === 'en' ? '8 Windows Error Domains' : '8대 Windows 오류 영역'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {categoryData.map((cat) => (
            <button
              key={cat.key}
              onClick={() => onSelectCategory && onSelectCategory(cat.key)}
              className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 hover:bg-indigo-50/50 dark:bg-slate-800/30 dark:hover:bg-slate-800 transition-all text-left flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                  {getCategoryLabel(cat)}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <span className="text-[11px] font-mono font-bold text-slate-500 group-hover:text-indigo-600">
                  {cat.total}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
