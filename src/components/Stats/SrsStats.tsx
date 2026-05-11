import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area, Legend 
} from 'recharts';
import { X, TrendingUp, Brain, Calendar, Sparkles, Clock, ChevronRight } from 'lucide-react';
import { VocabularyItem } from '../../types';
import { cn } from '../../lib/utils';

interface SrsStatsProps {
  vocabulary: VocabularyItem[];
  onClose: () => void;
}

export default function SrsStats({ vocabulary, onClose }: SrsStatsProps) {
  const stats = useMemo(() => {
    if (vocabulary.length === 0) return null;

    const total = vocabulary.length;
    const avgInterval = vocabulary.reduce((acc, v) => acc + (v.srsInterval || 0), 0) / total;
    const avgEase = vocabulary.reduce((acc, v) => acc + (v.srsEase || 2.5), 0) / total;
    
    // Interval Distribution
    const intervalBuckets = [
      { name: '0d', count: 0, range: [0, 0] },
      { name: '1-3d', count: 0, range: [1, 3] },
      { name: '4-7d', count: 0, range: [4, 7] },
      { name: '8-14d', count: 0, range: [8, 14] },
      { name: '15-30d', count: 0, range: [15, 30] },
      { name: '31-60d', count: 0, range: [31, 60] },
      { name: '60d+', count: 0, range: [61, 99999] },
    ];

    vocabulary.forEach(v => {
      const interval = v.srsInterval || 0;
      const bucket = intervalBuckets.find(b => interval >= b.range[0] && interval <= b.range[1]);
      if (bucket) bucket.count++;
    });

    // Mastery Distribution
    const masteryBuckets = [
      { name: '0-20', count: 0, color: '#ef4444' },
      { name: '21-40', count: 0, color: '#f97316' },
      { name: '41-60', count: 0, color: '#f59e0b' },
      { name: '61-80', count: 0, color: '#84cc16' },
      { name: '81-100', count: 0, color: '#10b981' },
    ];

    vocabulary.forEach(v => {
      const score = v.masteryScore || 0;
      if (score <= 20) masteryBuckets[0].count++;
      else if (score <= 40) masteryBuckets[1].count++;
      else if (score <= 60) masteryBuckets[2].count++;
      else if (score <= 80) masteryBuckets[3].count++;
      else masteryBuckets[4].count++;
    });

    // SRS Status Distribution (Stages)
    const stages = [
      { name: 'Mới', value: vocabulary.filter(v => v.repetitionCount === 0).length, color: '#6366f1', description: 'Chưa bắt đầu ôn tập' },
      { name: 'Đang học', value: vocabulary.filter(v => v.repetitionCount > 0 && v.srsInterval < 3).length, color: '#8b5cf6', description: 'Giai đoạn ghi nhớ ngắn hạn' },
      { name: 'Đang nhớ', value: vocabulary.filter(v => v.srsInterval >= 3 && v.srsInterval < 14).length, color: '#ec4899', description: 'Dần chuyển vào trí nhớ dài hạn' },
      { name: 'Thành thạo', value: vocabulary.filter(v => v.srsInterval >= 14).length, color: '#10b981', description: 'Đã thuộc lòng ổn định' },
    ];

    const activeStages = stages.filter(s => s.value > 0);
    const memoryStrength = Math.round((stages[3].value * 1.0 + stages[2].value * 0.6 + stages[1].value * 0.3) / total * 100);

    // Future Forecast (Next 7 days)
    const forecast = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      date.setHours(23, 59, 59, 999);
      const timestamp = date.getTime();
      
      const dayName = i === 0 ? 'Hôm nay' : `Day ${i}`;
      const dayLabel = i === 0 ? 'Hôm nay' : date.toLocaleDateString('vi-VN', { weekday: 'short' });
      return {
        name: dayLabel,
        count: vocabulary.filter(v => (v.nextReviewAt || 0) <= timestamp && (v.nextReviewAt || 0) > (timestamp - 86400000 * (i === 0 ? 100 : 1))).length
      };
    });

    // Progression Timeline
    const now = Date.now();
    const oneDay = 86400000;
    const progressTimeline = Array.from({ length: 6 }).map((_, i) => {
      const start = now - (i + 1) * 7 * oneDay;
      const end = now - i * 7 * oneDay;
      const weekItems = vocabulary.filter(v => v.createdAt >= start && v.createdAt < end);
      if (weekItems.length === 0) return { name: i === 0 ? 'Tuần này' : `${i}t trước`, mastery: 0, count: 0 };
      return {
        name: i === 0 ? 'Tuần này' : `${i}t trước`,
        mastery: Math.round(weekItems.reduce((acc, v) => acc + (v.masteryScore || 0), 0) / weekItems.length),
        count: weekItems.length
      };
    }).reverse();

    return { total, avgInterval, avgEase, intervalBuckets, masteryBuckets, stages, activeStages, memoryStrength, forecast, progressTimeline };
  }, [vocabulary]);

  if (!stats) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="relative w-full max-w-6xl h-full md:h-[90vh] bg-slate-900 md:border md:border-slate-800 md:rounded-[40px] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Chỉ số Trí não</h2>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Hệ thống lặp lại ngắt quãng (SRS)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-800 rounded-2xl text-slate-500 hover:text-white transition-all group"
          >
            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Dashoard Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 no-scrollbar pb-20">
          
          {/* Hero Stats Section */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Memory Strength Gauge */}
            <div className="lg:col-span-1 bg-slate-950 border border-slate-800 p-6 rounded-[32px] flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Brain size={80} />
              </div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Sức mạnh trí nhớ</h3>
              <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-slate-900"
                  />
                  <motion.circle
                    initial={{ strokeDashoffset: 365 }}
                    animate={{ strokeDashoffset: 365 - (365 * stats.memoryStrength) / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray="365"
                    fill="transparent"
                    strokeLinecap="round"
                    className="text-indigo-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white">{stats.memoryStrength}%</span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase">HP</span>
                </div>
              </div>
              <p className="text-[10px] text-center text-slate-400 font-medium px-4">
                {stats.memoryStrength > 80 ? 'Trí nhớ cực kỳ ổn định!' : stats.memoryStrength > 50 ? 'Khả năng ghi nhớ tốt.' : 'Cần tập trung ôn tập thêm.'}
              </p>
            </div>

            {/* Core Metrics Cards */}
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Vốn từ vựng', value: stats.total, icon: Brain, color: 'text-blue-400', sub: 'Tổng từ đã học' },
                { label: 'Cách quãng TB', value: `${stats.avgInterval.toFixed(1)}n`, icon: Calendar, color: 'text-emerald-400', sub: 'Thời gian nhớ TB' },
                { label: 'Hôm nay', value: stats.forecast[0].count, icon: Clock, color: 'text-rose-400', sub: 'Từ cần ôn ngay' },
                { label: 'Dự báo (7n)', value: stats.forecast.reduce((a, b) => a + b.count, 0), icon: TrendingUp, color: 'text-indigo-400', sub: 'Tổng lượt ôn tập' },
                { label: 'Độ dễ TB', value: stats.avgEase.toFixed(2), icon: Sparkles, color: 'text-amber-400', sub: 'Chỉ số Ease Factor' },
                { label: 'Ghi nhớ tốt', value: stats.stages[3].value, icon: ChevronRight, color: 'text-emerald-500', sub: 'Đã thuộc lòng' },
              ].map((kpi, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="p-5 bg-slate-950 border border-slate-800 rounded-3xl hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn("p-2 rounded-xl bg-slate-900 border border-slate-800", kpi.color)}>
                      <kpi.icon size={16} />
                    </div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{kpi.label}</span>
                  </div>
                  <div className="text-xl font-black text-white">{kpi.value}</div>
                  <div className="text-[9px] text-slate-600 font-medium">{kpi.sub}</div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Interval Distribution Chart */}
            <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-[32px] p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Cấu trúc khoảng cách
                  </h3>
                  <p className="text-xs text-slate-500">Số lượng từ vựng chia theo số ngày ôn tập</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Intervals</span>
                </div>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.intervalBuckets} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="barGradientGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.02)' }} 
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '16px', fontSize: '11px', fontWeight: 700, padding: '12px' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                      {stats.intervalBuckets.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index >= stats.intervalBuckets.length - 2 ? "url(#barGradientGreen)" : "url(#barGradient)"} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SRS Stage Detailed */}
            <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-[32px] p-6 md:p-8 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-6">Trạng thái ôn tập</h3>
              <div className="flex-1 space-y-4">
                {stats.stages.map((stage, i) => (
                  <div key={i} className="group cursor-default">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="text-xs font-bold text-slate-300">{stage.name}</span>
                      </div>
                      <span className="text-xs font-black text-white">{stage.value} <span className="text-[10px] text-slate-500">từ</span></span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mb-1">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(stage.value / stats.total) * 100}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                    </div>
                    <p className="text-[9px] text-slate-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {stage.description}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-slate-900">
                 <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                   <span>Thành thạo</span>
                   <span className="text-emerald-400">{Math.round((stats.stages[3].value / stats.total) * 100)}%</span>
                 </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Future Review Forecast */}
            <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-white">Dự báo khối lượng</h3>
                  <p className="text-xs text-slate-500">Từ vựng đến hạn trong 7 ngày tới</p>
                </div>
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                  <Clock size={20} />
                </div>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.forecast} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="roseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '16px', fontSize: '11px', fontWeight: 700 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#f43f5e" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#roseGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Mastery Progression */}
            <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-6 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-white">Tiến độ học tập</h3>
                  <p className="text-xs text-slate-500">Trung bình điểm thành thạo theo thời gian</p>
                </div>
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <Sparkles size={20} />
                </div>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.progressTimeline} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} 
                      dy={10}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '16px', fontSize: '11px', fontWeight: 700 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="mastery" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#emeraldGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AI-like Smart Insights */}
          <div className="p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-[40px] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 text-indigo-500/10 rotate-12">
               <Sparkles size={120} />
            </div>
            <h4 className="flex items-center gap-2 text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-8">
              <Brain size={14} />
              Phân tích & Gợi ý lộ trình
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-xs">1</div>
                <p className="text-xs font-black text-white">Tính ổn định</p>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                  Khoảng cách TB là {stats.avgInterval.toFixed(1)} ngày. Mục tiêu lý tưởng là đạt mốc 14 ngày cho 50% vốn từ. Bạn đang đi đúng hướng!
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">2</div>
                <p className="text-xs font-black text-white">Chất lượng học (Ease)</p>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                  Chỉ số Ease {stats.avgEase.toFixed(2)} cho thấy độ khó vừa phải. Nếu con số này xuống dưới 2.0, hãy chia nhỏ danh sách từ vựng.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-black text-xs">3</div>
                <p className="text-xs font-black text-white">Kế hoạch ôn tập</p>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                  Ngày bận rộn nhất trong tuần là {stats.forecast.reduce((max, f) => f.count > max.count ? f : max, stats.forecast[0]).name}. Hãy dành ít nhất 15 phút tập trung vào ngày này.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
