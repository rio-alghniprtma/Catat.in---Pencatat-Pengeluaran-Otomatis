import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, CATEGORIES } from '../types';
import {
  Search,
  Filter,
  Trash2,
  Edit2,
  Download,
  Upload,
  ArrowUpDown,
  Calendar,
  Sparkles,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Utensils,
  Car,
  ShoppingBag,
  Film,
  ReceiptText,
  HeartPulse,
  HelpCircle
} from 'lucide-react';

// Helper component to render category-specific icons dynamically
const CategoryIcon = ({ category }: { category: string }) => {
  const cat = CATEGORIES[category] || CATEGORIES['Lainnya'];
  switch (cat.icon) {
    case 'Utensils':
      return <Utensils className="w-4.5 h-4.5 animate-fade-in" />;
    case 'Car':
      return <Car className="w-4.5 h-4.5 animate-fade-in" />;
    case 'ShoppingBag':
      return <ShoppingBag className="w-4.5 h-4.5 animate-fade-in" />;
    case 'Film':
      return <Film className="w-4.5 h-4.5 animate-fade-in" />;
    case 'ReceiptText':
      return <ReceiptText className="w-4.5 h-4.5 animate-fade-in" />;
    case 'HeartPulse':
      return <HeartPulse className="w-4.5 h-4.5 animate-fade-in" />;
    case 'TrendingUp':
      return <TrendingUp className="w-4.5 h-4.5 animate-fade-in" />;
    default:
      return <HelpCircle className="w-4.5 h-4.5 animate-fade-in" />;
  }
};

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onImportJSON: (data: Transaction[]) => void;
}

export default function TransactionList({
  transactions,
  onEdit,
  onDelete,
  onImportJSON,
}: TransactionListProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Currency Formatter
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Import JSON File
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          // Quick validation
          const isValid = data.every(item => item.id && item.title && typeof item.amount === 'number');
          if (isValid) {
            onImportJSON(data);
            alert('Sukses mengimpor ' + data.length + ' transaksi!');
          } else {
            alert('Format JSON tidak sesuai standar transaksi Catat.in');
          }
        } else {
          alert('Data harus berupa array transaksi');
        }
      } catch (err) {
        alert('Gagal membaca file JSON. Pastikan file valid.');
      }
    };
    reader.readAsText(file);
    // Clear input
    e.target.value = '';
  };

  // Export to JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `catatin_backup_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Tanggal', 'Judul', 'Nominal', 'Tipe', 'Kategori', 'Catatan', 'Scan AI'];
    const rows = transactions.map(t => [
      t.id,
      t.date,
      `"${t.title.replace(/"/g, '""')}"`,
      t.amount,
      t.type,
      t.category,
      t.notes ? `"${t.notes.replace(/"/g, '""')}"` : '',
      t.isAutoParsed ? 'YA' : 'TIDAK'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `catatin_laporan_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = filteredTransactions.map((t, idx) => ({
      'No': idx + 1,
      'ID Transaksi': t.id,
      'Tanggal': t.date,
      'Nama Transaksi': t.title,
      'Tipe': t.type === 'expense' ? 'Pengeluaran' : 'Pemasukan',
      'Kategori': t.category,
      'Nominal (Rp)': t.amount,
      'Catatan': t.notes || '-',
      'Diproses AI': t.isAutoParsed ? 'Ya' : 'Tidak'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Catatan Keuangan');

    // Auto-fit column widths for beautifully presented Excel data
    const max_len = dataToExport.reduce((acc, row) => {
      Object.keys(row).forEach((key, colIdx) => {
        const val = row[key as keyof typeof row];
        const cellLen = val ? val.toString().length : 0;
        acc[colIdx] = Math.max(acc[colIdx] || 10, cellLen, key.length);
      });
      return acc;
    }, [] as number[]);
    worksheet['!cols'] = max_len.map(len => ({ wch: len + 3 }));

    XLSX.writeFile(workbook, `catatin_laporan_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  // Toggle sorting order or switch field
  const handleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filter & Sort core logic
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                              (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()));
        const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
        const matchesType = typeFilter === 'all' || t.type === typeFilter;
        return matchesSearch && matchesCategory && matchesType;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'date') {
          return sortOrder === 'desc' 
            ? new Date(valB).getTime() - new Date(valA).getTime()
            : new Date(valA).getTime() - new Date(valB).getTime();
        } else {
          return sortOrder === 'desc'
            ? (valB as number) - (valA as number)
            : (valA as number) - (valB as number);
        }
      });
  }, [transactions, search, categoryFilter, typeFilter, sortField, sortOrder]);

  return (
    <div className="bg-white rounded-[32px] border border-border-warm shadow-sm overflow-hidden" id="transaction_list_container">
      {/* Top Filter & Actions Header */}
      <div className="p-5 border-b border-border-warm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-extrabold text-earth">Riwayat Catatan Keuangan</h3>
          <p className="text-xs text-earth-light">Total {filteredTransactions.length} transaksi ditampilkan</p>
        </div>

        {/* Action controls (search and backup) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick search input */}
          <div className="relative shrink-0 w-full sm:w-64">
            <Search className="w-4 h-4 text-earth-light absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari transaksi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-cream-dark/50 border border-border-warm rounded-xl text-xs text-earth focus:outline-none transition-all"
              id="search_transaction_input"
            />
          </div>

          {/* Backup/Export / Import controls */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 border rounded-xl hover:bg-cream-dark/50 transition-colors flex items-center justify-center gap-1 text-earth ${showFilters ? 'bg-tan-light border-tan' : 'border-border-warm'}`}
            title="Filter Lanjutan"
          >
            <Filter className="w-4 h-4" />
            <span className="text-xs font-bold px-0.5">Filter</span>
          </button>

          {/* Export / Backup options */}
          <div className="flex items-center gap-1 border border-border-warm p-1 rounded-xl">
            <button
              onClick={handleExportExcel}
              className="p-1.5 text-sage hover:text-sage-dark hover:bg-cream-dark/50 rounded-lg transition-colors flex items-center gap-1"
              title="Ekspor Laporan Excel (.xlsx)"
              id="btn_export_excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sage" />
              <span className="text-[10px] font-bold text-sage">Excel</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="p-1.5 text-earth-light hover:text-earth hover:bg-cream-dark/50 rounded-lg transition-colors flex items-center gap-1"
              title="Ekspor CSV Laporan"
              id="btn_export_csv"
            >
              <span className="text-[10px] font-bold">CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="p-1.5 text-earth-light hover:text-earth hover:bg-cream-dark/50 rounded-lg transition-colors flex items-center gap-1"
              title="Cadangkan Transaksi (JSON)"
              id="btn_backup_json"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">Backup</span>
            </button>
            <label
              className="p-1.5 text-earth-light hover:text-earth hover:bg-cream-dark/50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="Pulihkan Transaksi dari File Backup"
              id="btn_restore_json_label"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">Restore</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
                id="btn_restore_json"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Expandable Advanced Filters Drawer */}
      {showFilters && (
        <div className="p-5 bg-cream-dark/40 border-b border-border-warm grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-down">
          {/* Filter Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-earth-light uppercase tracking-wide">Tipe Aliran Dana</label>
            <div className="grid grid-cols-3 gap-1.5 bg-white p-1 border border-border-warm rounded-xl">
              <button
                onClick={() => setTypeFilter('all')}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${typeFilter === 'all' ? 'bg-sage text-white shadow-sm' : 'text-earth-light hover:text-earth'}`}
              >
                Semua
              </button>
              <button
                onClick={() => setTypeFilter('expense')}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${typeFilter === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-earth-light hover:text-earth'}`}
              >
                Keluar
              </button>
              <button
                onClick={() => setTypeFilter('income')}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${typeFilter === 'income' ? 'bg-sage-dark text-white shadow-sm' : 'text-earth-light hover:text-earth'}`}
              >
                Masuk
              </button>
            </div>
          </div>

          {/* Filter Category */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-earth-light uppercase tracking-wide">Pilih Kategori</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-border-warm rounded-xl text-xs text-earth focus:outline-none focus:ring-1 focus:ring-sage"
            >
              <option value="All">Semua Kategori</option>
              {Object.keys(CATEGORIES).map(key => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters Option */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setCategoryFilter('All');
                setTypeFilter('all');
                setSearch('');
              }}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-earth hover:text-earth-light bg-white border border-border-warm hover:bg-cream-dark/50 rounded-xl transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Semua Filter</span>
            </button>
          </div>
        </div>
      )}

      {/* Sorting Column Header */}
      <div className="px-5 py-3 bg-cream-dark/50 border-b border-border-warm flex items-center justify-between text-[10px] font-bold text-earth-light uppercase tracking-wider">
        <button
          onClick={() => handleSort('date')}
          className="flex items-center gap-1 hover:text-earth transition-colors animate-fade-in"
        >
          <span>Tanggal Transaksi</span>
          {sortField === 'date' && <ArrowUpDown className="w-3.5 h-3.5 text-sage" />}
        </button>
        <button
          onClick={() => handleSort('amount')}
          className="flex items-center gap-1 hover:text-earth transition-colors animate-fade-in"
        >
          <span>Nominal</span>
          {sortField === 'amount' && <ArrowUpDown className="w-3.5 h-3.5 text-sage" />}
        </button>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="p-12 text-center space-y-3 animate-slide-up">
          <div className="w-12 h-12 bg-cream-dark rounded-full flex items-center justify-center text-earth-light mx-auto">
            <Search className="w-6 h-6 stroke-1" />
          </div>
          <div className="space-y-1">
            <span className="text-sm font-bold text-earth block">Tidak Menemukan Transaksi</span>
            <p className="text-xs text-earth-light max-w-xs mx-auto">
              Cobalah ubah filter pencarian Anda atau tambahkan transaksi baru menggunakan asisten AI.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border-warm" id="transaction_records_list">
          {filteredTransactions.map((t) => {
            const cat = CATEGORIES[t.category] || CATEGORIES['Lainnya'];
            return (
              <div
                key={t.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-cream-dark/20 transition-colors group"
              >
                {/* Left side: Icon + Title */}
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white shadow-sm"
                    style={{ backgroundColor: cat.bgLight, color: cat.color }}
                  >
                    <CategoryIcon category={t.category} />
                  </div>
                  
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-earth truncate max-w-[200px] sm:max-w-[320px]">
                        {t.title}
                      </span>
                      {/* AI parsed items indicators */}
                      {t.isAutoParsed && (
                        <span className="text-[9px] font-bold bg-tan-light text-earth px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          AI Scan
                        </span>
                      )}
                      <span className="text-[10px] text-earth-light px-1.5 py-0.5 bg-cream-dark rounded-md font-medium">
                        {t.category}
                      </span>
                    </div>

                    {t.notes && <p className="text-xs text-earth-light line-clamp-1">{t.notes}</p>}
                    
                    <div className="flex items-center gap-2 text-[10px] text-earth-light">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-mono">{t.date}</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Amount & Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-border-warm pt-2 sm:pt-0">
                  <span className={`text-sm font-bold font-mono shrink-0 ${t.type === 'expense' ? 'text-rose-600' : 'text-sage-dark'}`}>
                    {t.type === 'expense' ? '-' : '+'} {formatIDR(t.amount)}
                  </span>

                  {/* Inline actions visible on hover */}
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(t)}
                      className="p-1.5 text-earth-light hover:text-earth hover:bg-cream-dark/50 rounded-lg transition-colors"
                      title="Edit Transaksi"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(t.id)}
                      className="p-1.5 text-earth-light hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus Transaksi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
