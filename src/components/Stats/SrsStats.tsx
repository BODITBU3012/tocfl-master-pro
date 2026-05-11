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
      { name: 'Mới', value: vocabulary.filter(v => v.repetitionCount === 0).length, color: '#6366f1' },
      { name: 'Đang học', value: vocabulary.filter(v => v.repetitionCount > 0 && v.srsInterval < 3).length, color: '#8b5cf6' },
      { name: 'Đang nhớ', value: vocabulary.filter(v => v.srsInterval >= 3 && v.srsInterval < 14).length, color: '#d946ef' },
      { name: 'Thành thạo', value: vocabulary.filter(v => v.srsInterval >= 14).length, color: '#10b981' },
    ].filter(s => s.value > 0);

    // Future Forecast (Next 7 days)
    const forecast = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      date.setHours(23, 59, 59, 999);
      const timestamp = date.getTime();
      
      const dayName = i === 0 ? 'Hôm nay' : `+${i}n`;
      return {
        name: dayName,
        reviews: vocabulary.filter(v => (v.nextReviewAt || 0) <= timestamp && (v.nextReviewAt || 0) > (timestamp - 86400000 * (i === 0 ? 100 : 1))).length
      };
    });

    // Progression over "Addition Time"
    // Show average mastery grouped by when items were added
    const now = Date.now();
    const oneDay = 86400000;
    const progressTimeline = Array.from({ length: 6 }).map((_, i) => {
      const start = now - (i + 1) * 7 * oneDay;
      const end = now - i * 7 * oneDay;
      const weekItems = vocabulary.filter(v => v.createdAt >= start && v.createdAt < end);
      if (weekItems.length === 0) return null;
      return {
        name: i === 0 ? 'Tuần này' : `${i}t trước`,
        mastery: Math.round(weekItems.reduce((acc, v) => acc + (v.masteryScore || 0), 0) / weekItems.length),
        count: weekItems.length
      };
    }).filter(p => p !== null).reverse();

    return { total, avgInterval, avgEase, intervalBuckets, masteryBuckets, stages, forecast, progressTimeline };
  }, [vocabulary]);

  if (!stats) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl h-[90vh] bg-slate-900 border border-slate-800 rounded-[40px] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-3xl sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Thống kê SRS nâng cao</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Phân tích hiệu quả ôn tập</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-800 rounded-2xl text-slate-500 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          
          {/* Top Level KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Tổng từ vựng', value: stats.total, icon: Brain, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
              { label: 'Khoảng cách TB', value: `${stats.avgInterval.toFixed(1)} ngày`, icon: Calendar, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Độ dễ TB (Ease)', value: stats.avgEase.toFixed(2), icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Cần ôn tập', value: stats.forecast[0].reviews, icon: Clock, color: 'text-rose-400', bg: 'bg-rose-500/10' },
            ].map((kpi, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 bg-slate-950 border border-slate-800 rounded-3xl"
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", kpi.bg, kpi.color)}>
                  <kpi.icon size={20} />
                </div>
                <div className="text-2xl font-black text-white mb-1">{kpi.value}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{kpi.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Interval Distribution Chart */}
            <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-[32px] p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-white">Phân phối khoảng cách ôn tập</h3>
                  <p className="text-xs text-slate-500">Số lượng từ vựng theo số ngày giữa các lần ôn tập</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Intervals</span>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.intervalBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {stats.intervalBuckets.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index > 3 ? '#10b981' : '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SRS Stage Pie Chart */}
            <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-[32px] p-8">
              <h3 className="text-lg font-bold text-white mb-6">Trạng thái ghi nhớ</h3>
              <div className="h-[200px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.stages}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.stages.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-white">{stats.total}</span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Từ vựng</span>
                </div>
              </div>
              <div className="mt-8 space-y-3">
                {stats.stages.map((stage, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-xs font-bold text-slate-400">{stage.name}</span>
                    </div>
                    <span className="text-xs font-black text-white">{stage.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Future Review Forecast */}
            <div className="lg:col-span-12 bg-slate-950 border border-slate-800 rounded-[32px] p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-white">Dự báo khối lượng ôn tập</h3>
                  <p className="text-xs text-slate-500">Ước tính số lượng từ vựng cần ôn tập trong 7 ngày tới</p>
                </div>
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                  <Calendar size={20} />
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.forecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="reviews" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorReviews)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mastery Progression (By age of vocab) */}
            <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-8">
              <h3 className="text-lg font-bold text-white mb-2">Tỉ lệ thành thạo theo thời gian</h3>
              <p className="text-xs text-slate-500 mb-8">Trung bình điểm thành thạo của các từ vựng theo tuần gia nhập</p>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.progressTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMastery" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 8, fontWeight: 600 }} 
                      dy={10}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="mastery" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorMastery)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Mastery Score Distribution */}
            <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-8">
              <h3 className="text-lg font-bold text-white mb-2">Phân bổ điểm thành thạo</h3>
              <p className="text-xs text-slate-500 mb-8">Số lượng từ vựng đạt được các mốc thành thạo (0-100)</p>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.masteryBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {stats.masteryBuckets.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tips / Insights Section */}
          <div className="p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-[32px]">
            <h4 className="flex items-center gap-2 text-sm font-black text-indigo-400 uppercase tracking-widest mb-6">
              <Sparkles size={16} />
              Gợi ý tối ưu lộ trình
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-xs font-bold text-white">Ổn định khoảng cách</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Hiện tại khoảng cách ôn tập trung bình của bạn là {stats.avgInterval.toFixed(1)} ngày. Hãy cố gắng đạt được mốc 14 ngày cho ít nhất 50% vốn từ để đảm bảo trí nhớ dài hạn.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-white">Điều chỉnh Ease Factor</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Ease factor trung bình ({stats.avgEase.toFixed(2)}) cho thấy độ khó tổng thể. Nếu Ease thấp hơn 2.0, hãy cân nhắc chia nhỏ từ vựng hoặc học thêm các ví dụ minh họa.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-white">Dự báo khối lượng</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Ngày có khối lượng ôn tập lớn nhất là {stats.forecast.reduce((max, f) => f.reviews > max.reviews ? f : max, stats.forecast[0]).name}. Hãy chuẩn bị thời gian vào ngày này!
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
