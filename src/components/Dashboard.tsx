import React, { useState, useMemo } from 'react';
import { Transaction, Budget, CATEGORIES } from '../types';
import { TrendingUp, TrendingDown, Wallet, AlertCircle, Sparkles, ChevronRight, Settings, Plus } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  budgets: Budget[];
  onAddTransactionClick: () => void;
  onManageBudgetsClick: () => void;
}

export default function Dashboard({
  transactions,
  budgets,
  onAddTransactionClick,
  onManageBudgetsClick,
}: DashboardProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [selectedChartTab, setSelectedChartTab] = useState<'expense' | 'income'>('expense');

  // Currency Formatter
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Get current month info (e.g. "2026-06")
  const currentMonthStr = useMemo(() => {
    return new Date().toISOString().substring(0, 7);
  }, []);

  const currentMonthName = useMemo(() => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${months[new Date().getMonth()]} ${new Date().getFullYear()}`;
  }, []);

  // Filter current month transactions
  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(currentMonthStr));
  }, [transactions, currentMonthStr]);

  // Financial Summaries
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    // Calculate overall total from all transactions
    let totalIncomeAll = 0;
    let totalExpenseAll = 0;
    transactions.forEach(t => {
      if (t.type === 'income') totalIncomeAll += t.amount;
      else totalExpenseAll += t.amount;
    });

    // Current month stats
    monthlyTransactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });

    const balance = totalIncomeAll - totalExpenseAll;

    return {
      balance,
      monthlyIncome: income,
      monthlyExpense: expense,
    };
  }, [transactions, monthlyTransactions]);

  // Category summary for Donut Chart
  const categorySummary = useMemo(() => {
    const summary: Record<string, number> = {};
    
    // Initialize with 0 for categories present in transactions
    monthlyTransactions
      .filter(t => t.type === selectedChartTab)
      .forEach(t => {
        summary[t.category] = (summary[t.category] || 0) + t.amount;
      });

    const total = Object.values(summary).reduce((sum, val) => sum + val, 0);

    return Object.entries(summary).map(([name, amount]) => ({
      name,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
      color: CATEGORIES[name]?.color || '#9CA3AF',
      bgLight: CATEGORIES[name]?.bgLight || '#F3F4F6',
    })).sort((a, b) => b.amount - a.amount);
  }, [monthlyTransactions, selectedChartTab]);

  // Donut Chart calculations (SVG paths)
  const donutSegments = useMemo(() => {
    let accumulatedPercentage = 0;
    const radius = 50;
    const circumference = 2 * Math.PI * radius;

    return categorySummary.map(cat => {
      const percentage = cat.percentage;
      const strokeLength = (percentage / 100) * circumference;
      const strokeOffset = circumference - (accumulatedPercentage / 100) * circumference;
      
      accumulatedPercentage += percentage;

      return {
        ...cat,
        strokeLength,
        strokeOffset,
        circumference,
        radius,
      };
    });
  }, [categorySummary]);

  // Daily Trend Line Chart calculations
  const trendData = useMemo(() => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const dailyMap: Record<number, { expense: number; income: number }> = {};
    
    // Initialize days
    for (let i = 1; i <= daysInMonth; i++) {
      dailyMap[i] = { expense: 0, income: 0 };
    }

    // Populate data
    monthlyTransactions.forEach(t => {
      const day = parseInt(t.date.split('-')[2], 10);
      if (day >= 1 && day <= daysInMonth) {
        if (t.type === 'income') {
          dailyMap[day].income += t.amount;
        } else {
          dailyMap[day].expense += t.amount;
        }
      }
    });

    // Create chart arrays
    return Object.entries(dailyMap).map(([dayStr, data]) => ({
      day: parseInt(dayStr, 10),
      ...data,
    }));
  }, [monthlyTransactions]);

  // Daily Trend SVG Path generator
  const trendChartPath = useMemo(() => {
    if (trendData.length === 0) return { path: '', points: [] };
    
    const width = 600;
    const height = 180;
    const padding = 20;
    
    const maxVal = Math.max(...trendData.map(d => d.expense), 10000); // minimum scale peak
    
    const points = trendData.map(d => {
      const x = padding + ((d.day - 1) / (trendData.length - 1)) * (width - 2 * padding);
      // Invert Y because SVG coordinates go top-down
      const y = height - padding - (d.expense / maxVal) * (height - 2 * padding);
      return { x, y, day: d.day, amount: d.expense };
    });

    // Build SVG path
    let path = '';
    if (points.length > 0) {
      path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        // Curve lines smoothly
        const xc = (points[i - 1].x + points[i].x) / 2;
        const yc = (points[i - 1].y + points[i].y) / 2;
        path += ` Q ${points[i - 1].x} ${points[i - 1].y}, ${xc} ${yc}`;
      }
      path += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    }

    return { path, points, maxVal };
  }, [trendData]);

  // Budget status calculations
  const budgetStatuses = useMemo(() => {
    return budgets.map(b => {
      // Calculate current spending for this category
      const currentSpending = monthlyTransactions
        .filter(t => t.type === 'expense' && t.category === b.category)
        .reduce((sum, t) => sum + t.amount, 0);

      const percentage = b.limit > 0 ? (currentSpending / b.limit) * 100 : 0;
      
      // Determine color
      let colorClass = 'bg-sage';
      let textClass = 'text-sage-dark bg-sage-light';
      if (percentage >= 100) {
        colorClass = 'bg-rose-500';
        textClass = 'text-rose-700 bg-rose-50';
      } else if (percentage >= 80) {
        colorClass = 'bg-tan';
        textClass = 'text-tan-dark bg-tan-light';
      }

      return {
        ...b,
        currentSpending,
        percentage,
        colorClass,
        textClass,
      };
    });
  }, [budgets, monthlyTransactions]);

  // AI-Assisted budget summary highlight
  const totalLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpentInLimitCategories = monthlyTransactions
    .filter(t => t.type === 'expense' && budgets.some(b => b.category === t.category))
    .reduce((sum, t) => sum + t.amount, 0);
  const totalBudgetPercentage = totalLimit > 0 ? (totalSpentInLimitCategories / totalLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Upper Panel: Welcome & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-sage text-white rounded-[32px] p-6 md:p-8 shadow-lg shadow-sage/10 relative overflow-hidden" id="dashboard_welcome">
        {/* Background glow accents */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-tan rounded-full filter blur-[80px] opacity-20 pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-tan-dark rounded-full filter blur-[80px] opacity-15 pointer-events-none"></div>
        
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2 text-tan-light text-xs font-bold tracking-widest uppercase">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>ASISTEN FINANSIAL PERSONAL</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Halo, Rencana Keuanganmu Hari Ini?</h1>
          <p className="text-sage-light/90 text-xs sm:text-sm max-w-xl">
            Catat pengeluaran secara kilat via obrolan asisten AI atau upload foto struk belanja untuk pelacakan otomatis instan.
          </p>
        </div>

        <button
          onClick={onAddTransactionClick}
          className="relative z-10 flex items-center justify-center gap-2 bg-tan hover:bg-tan-dark text-earth font-bold px-6 py-3.5 rounded-2xl shadow-md active:scale-95 transition-all text-xs self-start md:self-auto"
          id="btn_quick_add"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Transaksi</span>
        </button>
      </div>

      {/* Grid 1: Balance & Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="dashboard_stats_grid">
        {/* Balance Card */}
        <div className="bg-white p-6 rounded-[32px] border border-border-warm shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-earth-light text-xs font-bold uppercase tracking-wide">Total Saldo Tersisa</span>
            <div className="w-10 h-10 bg-cream-dark rounded-2xl flex items-center justify-center text-earth-light">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-[10px] text-earth-light block font-mono">DARI SEMUA LOG TRANSAKSI</span>
            <span className="text-2xl font-extrabold text-earth tracking-tight block mt-1">
              {formatIDR(stats.balance)}
            </span>
            <span className={`text-[10px] font-bold inline-flex items-center gap-1 mt-2.5 px-2.5 py-0.5 rounded-full ${stats.balance >= 0 ? 'bg-sage-light text-sage-dark' : 'bg-rose-50 text-rose-700'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${stats.balance >= 0 ? 'bg-sage' : 'bg-rose-500'}`}></span>
              {stats.balance >= 0 ? 'Kondisi Aman' : 'Defisit Anggaran'}
            </span>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white p-6 rounded-[32px] border border-border-warm shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-earth-light text-xs font-bold uppercase tracking-wide">Pengeluaran {currentMonthName}</span>
            <div className="w-10 h-10 bg-rose-50/50 rounded-2xl flex items-center justify-center text-rose-500">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-[10px] text-earth-light block font-mono">TOTAL BULAN INI</span>
            <span className="text-2xl font-extrabold text-rose-600 tracking-tight block mt-1">
              {formatIDR(stats.monthlyExpense)}
            </span>
            <span className="text-[10px] text-earth-light block mt-2 leading-relaxed">
              Berdasarkan {monthlyTransactions.filter(t => t.type === 'expense').length} kali pengeluaran harian
            </span>
          </div>
        </div>

        {/* Income Card */}
        <div className="bg-white p-6 rounded-[32px] border border-border-warm shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-earth-light text-xs font-bold uppercase tracking-wide">Pemasukan {currentMonthName}</span>
            <div className="w-10 h-10 bg-sage-light rounded-2xl flex items-center justify-center text-sage">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-[10px] text-earth-light block font-mono">TOTAL BULAN INI</span>
            <span className="text-2xl font-extrabold text-sage-dark tracking-tight block mt-1">
              {formatIDR(stats.monthlyIncome)}
            </span>
            <span className="text-[10px] text-earth-light block mt-2 leading-relaxed">
              Berdasarkan {monthlyTransactions.filter(t => t.type === 'income').length} kali pemasukan/gaji
            </span>
          </div>
        </div>
      </div>

      {/* Grid 2: Visual Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard_insights_grid">
        {/* Left Side: Spending Trend (7 Columns) */}
        <div className="bg-white p-6 rounded-[32px] border border-border-warm shadow-sm lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-earth">Tren Pengeluaran Harian</h3>
                <p className="text-xs text-earth-light mt-0.5">Grafik dinamika pengeluaran sepanjang bulan {currentMonthName}</p>
              </div>
              <span className="text-[10px] font-mono font-bold bg-cream-dark text-earth px-2.5 py-1 rounded-lg">
                Skala Maks: {formatIDR(trendChartPath.maxVal)}
              </span>
            </div>

            {/* Line Chart Render */}
            <div className="mt-6 relative w-full h-[180px] overflow-visible">
              {monthlyTransactions.filter(t => t.type === 'expense').length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-earth-light/60">
                  <TrendingDown className="w-10 h-10 stroke-1 mb-2 text-earth-light/40" />
                  <span className="text-xs">Belum ada pengeluaran dicatat bulan ini</span>
                </div>
              ) : (
                <svg viewBox="0 0 600 180" className="w-full h-full overflow-visible">
                  {/* Grid Lines */}
                  <line x1="20" y1="20" x2="580" y2="20" stroke="#F7F5F2" strokeWidth="1.5" strokeDasharray="3" />
                  <line x1="20" y1="80" x2="580" y2="80" stroke="#F7F5F2" strokeWidth="1.5" strokeDasharray="3" />
                  <line x1="20" y1="140" x2="580" y2="140" stroke="#F7F5F2" strokeWidth="1.5" strokeDasharray="3" />
                  <line x1="20" y1="160" x2="580" y2="160" stroke="#E8E4DF" strokeWidth="1.5" />

                  {/* Gradient Background under the Line */}
                  <defs>
                    <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A67C52" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#A67C52" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Render shaded path */}
                  {trendChartPath.points.length > 0 && (
                    <path
                      d={`${trendChartPath.path} L ${trendChartPath.points[trendChartPath.points.length - 1].x} 160 L ${trendChartPath.points[0].x} 160 Z`}
                      fill="url(#chart-grad)"
                    />
                  )}

                  {/* Red/Brown trend line path */}
                  <path
                    d={trendChartPath.path}
                    fill="none"
                    stroke="#A67C52"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Points Markers */}
                  {trendChartPath.points.map((p, i) => (
                    <g key={i} className="group/dot cursor-pointer">
                      {p.amount > 0 && (
                        <>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="4.5"
                            fill="#FFFFFF"
                            stroke="#A67C52"
                            strokeWidth="3"
                          />
                          {/* Tooltip Hover Area */}
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="12"
                            fill="transparent"
                          />
                          {/* Rich Floating Tooltip on Hover */}
                          <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <rect
                              x={Math.max(10, p.x - 70)}
                              y={p.y - 48}
                              width="140"
                              height="38"
                              rx="8"
                              fill="#4A453F"
                            />
                            <text
                              x={Math.max(10, p.x - 70) + 70}
                              y={p.y - 34}
                              fill="#FFFFFF"
                              fontSize="9"
                              fontWeight="bold"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              Tgl {p.day}: {formatIDR(p.amount)}
                            </text>
                            <text
                              x={Math.max(10, p.x - 70) + 70}
                              y={p.y - 20}
                              fill="#F2EFEA"
                              fontSize="8"
                              textAnchor="middle"
                            >
                              Tap tgl untuk perincian
                            </text>
                          </g>
                        </>
                      )}
                    </g>
                  ))}
                </svg>
              )}
            </div>

            {/* X-Axis labels */}
            <div className="flex justify-between px-3 text-[10px] font-mono text-earth-light mt-2 border-t border-cream-dark pt-2">
              <span>Tgl 1</span>
              <span>Tgl 10</span>
              <span>Tgl 20</span>
              <span>Tgl {trendData.length}</span>
            </div>
          </div>

          <div className="bg-tan-light/40 p-4 rounded-2xl flex items-start gap-3 mt-4 border border-border-warm">
            <AlertCircle className="w-5 h-5 text-tan-dark shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-earth block">Saran Alokasi Cerdas AI</span>
              <p className="text-xs text-earth-light">
                {stats.monthlyExpense > stats.monthlyIncome
                  ? 'Pengeluaran bulan ini sudah melampaui pemasukan. Cobalah kurangi kategori non-primer seperti Hiburan atau Belanja.'
                  : stats.monthlyExpense > 0
                    ? `Pengeluaranmu saat ini sebesar ${(stats.monthlyExpense / (stats.monthlyIncome || 1) * 100).toFixed(0)}% dari total pemasukan bulan ini. Pertahankan rasio di bawah 60%!`
                    : 'Log transaksi masih bersih. Silakan catat belanja hari ini untuk melihat analisis keuangan instan bertenaga AI!'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Category Donut Breakdown (5 Columns) */}
        <div className="bg-white p-6 rounded-[32px] border border-border-warm shadow-sm lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-earth">Distribusi Transaksi</h3>
                <p className="text-xs text-earth-light mt-0.5">Komposisi pengeluaran dan pemasukan bulan ini</p>
              </div>
              
              {/* Type Switch Tabs */}
              <div className="flex bg-cream-dark p-1 rounded-xl">
                <button
                  onClick={() => setSelectedChartTab('expense')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${selectedChartTab === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-earth-light hover:text-earth'}`}
                >
                  Keluar
                </button>
                <button
                  onClick={() => setSelectedChartTab('income')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${selectedChartTab === 'income' ? 'bg-white text-sage-dark shadow-sm' : 'text-earth-light hover:text-earth'}`}
                >
                  Masuk
                </button>
              </div>
            </div>

            {/* Donut and Legend Wrapper */}
            {categorySummary.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-earth-light/60">
                <TrendingUp className="w-10 h-10 stroke-1 mb-2 text-earth-light/40" />
                <span className="text-xs text-center">
                  Belum ada data {selectedChartTab === 'expense' ? 'pengeluaran' : 'pemasukan'} bulan ini
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center mt-6">
                {/* SVG Donut (5 Columns) */}
                <div className="sm:col-span-5 flex justify-center relative">
                  <div className="w-32 h-32 relative">
                    <svg viewBox="0 0 120 120" className="w-full h-full rotate-[-90deg]">
                      {donutSegments.map((seg, i) => {
                        const isHovered = hoveredCategory === seg.name;
                        return (
                           <circle
                            key={i}
                            cx="60"
                            cy="60"
                            r={seg.radius}
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth={isHovered ? 14 : 10}
                            strokeDasharray={seg.strokeLength + ' ' + (seg.circumference - seg.strokeLength)}
                            strokeDashoffset={seg.strokeOffset}
                            strokeLinecap="round"
                            className="transition-all duration-300 cursor-pointer"
                            onMouseEnter={() => setHoveredCategory(seg.name)}
                            onMouseLeave={() => setHoveredCategory(null)}
                          />
                        );
                      })}
                    </svg>

                    {/* Center Info Text overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      {hoveredCategory ? (
                        <>
                          <span className="text-[9px] font-bold text-earth-light uppercase tracking-wider block text-center truncate max-w-[70px]">
                            {hoveredCategory}
                          </span>
                          <span className="text-xs font-bold text-earth block">
                            {categorySummary.find(c => c.name === hoveredCategory)?.percentage.toFixed(0)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[9px] font-bold text-earth-light block uppercase">TOTAL</span>
                          <span className="text-xs font-bold text-earth block font-mono">
                            {formatIDR(categorySummary.reduce((sum, c) => sum + c.amount, 0))}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Legend List (7 Columns) */}
                <div className="sm:col-span-7 space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {categorySummary.map((cat, i) => (
                    <div
                      key={i}
                      onMouseEnter={() => setHoveredCategory(cat.name)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      className={`flex items-center justify-between p-1.5 rounded-xl transition-all ${hoveredCategory === cat.name ? 'bg-cream-dark' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                        <span className="text-xs font-medium text-earth truncate">{cat.name}</span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="text-xs font-bold text-earth block font-mono">{formatIDR(cat.amount)}</span>
                        <span className="text-[10px] text-earth-light block">{cat.percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] text-earth-light/80 text-center border-t border-cream-dark pt-3 mt-2">
            Sorot bagian grafik atau daftar untuk rincian persentase transaksi.
          </div>
        </div>
      </div>

      {/* Grid 3: Budget Targets & Goals */}
      <div className="bg-white p-6 rounded-[32px] border border-border-warm shadow-sm" id="dashboard_budgets_container">
        <div className="flex items-center justify-between border-b border-cream-dark pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-earth">Pemantauan Anggaran Kategori</h3>
            <p className="text-xs text-earth-light mt-0.5">Pantau ketat pengeluaran Anda agar tidak melampaui limit target bulanan</p>
          </div>
          <button
            onClick={onManageBudgetsClick}
            className="flex items-center gap-1.5 text-xs font-bold text-sage bg-sage-light hover:bg-sage/15 px-3.5 py-2 rounded-xl transition-all"
            id="btn_manage_budgets"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Atur Limit Budget</span>
          </button>
        </div>

        {budgetStatuses.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-cream-dark rounded-full flex items-center justify-center text-earth-light mx-auto">
              <AlertCircle className="w-6 h-6 stroke-1" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-bold text-earth block">Belum ada Target Anggaran</span>
              <p className="text-xs text-earth-light max-w-sm mx-auto">
                Anda belum mengatur limit budget pengeluaran. Atur sekarang untuk memantau penghematan Anda.
              </p>
            </div>
            <button
              onClick={onManageBudgetsClick}
              className="text-xs font-bold bg-sage hover:bg-sage-dark text-white px-4 py-2.5 rounded-xl transition-all"
            >
              Atur Budget Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {budgetStatuses.map((b, i) => (
              <div key={i} className="p-4 rounded-2xl border border-border-warm hover:border-earth-light/20 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORIES[b.category]?.color || '#9CA3AF' }}></span>
                    <span className="text-xs font-bold text-earth">{b.category}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.textClass}`}>
                    {b.percentage.toFixed(0)}% Terpakai
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-earth-light">Terpakai:</span>
                    <span className="font-bold text-earth font-mono">{formatIDR(b.currentSpending)}</span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs text-earth-light">
                    <span>Limit:</span>
                    <span className="font-medium font-mono">{formatIDR(b.limit)}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-cream-dark h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${b.colorClass}`}
                    style={{ width: `${Math.min(b.percentage, 100)}%` }}
                  ></div>
                </div>

                {/* Warning message */}
                {b.percentage >= 100 ? (
                  <span className="text-[10px] font-bold text-rose-600 block bg-rose-50/50 p-1.5 rounded-lg text-center">
                    ⚠️ Anggaran Telah Terlampaui!
                  </span>
                ) : b.percentage >= 80 ? (
                  <span className="text-[10px] font-bold text-tan-dark block bg-tan-light p-1.5 rounded-lg text-center">
                    ⚠️ Hampir mencapai limit budget!
                  </span>
                ) : (
                  <span className="text-[10px] text-earth-light block text-center">
                    Sisa budget: {formatIDR(Math.max(0, b.limit - b.currentSpending))}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
