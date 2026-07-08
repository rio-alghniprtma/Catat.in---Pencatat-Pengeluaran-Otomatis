import React, { useState, useEffect } from 'react';
import { Transaction, CATEGORIES } from '../types';
import { X, Save, Sparkles, Receipt } from 'lucide-react';

interface TransactionFormProps {
  transactionToEdit?: Transaction | null;
  onSave: (transaction: Omit<Transaction, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

export default function TransactionForm({
  transactionToEdit,
  onSave,
  onCancel,
}: TransactionFormProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Makanan & Minuman');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate data when editing an existing transaction
  useEffect(() => {
    if (transactionToEdit) {
      setTitle(transactionToEdit.title);
      setAmount(transactionToEdit.amount.toString());
      setCategory(transactionToEdit.category);
      setDate(transactionToEdit.date);
      setType(transactionToEdit.type);
      setNotes(transactionToEdit.notes || '');
    } else {
      // Defaults for a new transaction
      setTitle('');
      setAmount('');
      setCategory('Makanan & Minuman');
      setDate(new Date().toISOString().split('T')[0]);
      setType('expense');
      setNotes('');
    }
    setErrors({});
  }, [transactionToEdit]);

  // Handle smart category auto-suggestions based on transaction title
  const handleTitleChange = (val: string) => {
    setTitle(val);
    
    // Simple heuristic-based category suggestions to make manual input even faster!
    const lowercaseTitle = val.toLowerCase();
    
    if (lowercaseTitle.match(/(kopi|makan|go-food|gofood|grabfood|warung|restoran|bakso|nasgor|mie|pasar|indomaret|alfamart|susu|roti)/)) {
      setCategory('Makanan & Minuman');
    } else if (lowercaseTitle.match(/(bensin|pertamax|pertalite|gojek|grab|uber|ojek|bus|kereta|mrt|lrt|taxi|taksi|tol|parkir)/)) {
      setCategory('Transportasi');
    } else if (lowercaseTitle.match(/(baju|sepatu|kaos|tokopedia|shopee|lazada|belanja|supermarket|mall|celana|tas)/)) {
      setCategory('Belanja');
    } else if (lowercaseTitle.match(/(bioskop|netflix|film|game|spotify|hiburan|konser|wisata|jalan-jalan|timezone)/)) {
      setCategory('Hiburan');
    } else if (lowercaseTitle.match(/(listrik|pln|pdam|air|wifi|pulsa|kuota|bpjs|sewa|kos|kontrakan|utilitas)/)) {
      setCategory('Tagihan & Utilitas');
    } else if (lowercaseTitle.match(/(dokter|obat|apotek|sakit|klinik|rs|rumah sakit|vitamin|gigi|kesehatan)/)) {
      setCategory('Kesehatan');
    } else if (lowercaseTitle.match(/(saham|reksadana|crypto|tabungan|investasi|emas|bibit)/)) {
      setCategory('Investasi & Tabungan');
    }
  };

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!title.trim()) tempErrors.title = 'Nama transaksi wajib diisi';
    if (!amount.trim()) {
      tempErrors.amount = 'Nominal uang wajib diisi';
    } else if (isNaN(Number(amount)) || Number(amount) <= 0) {
      tempErrors.amount = 'Nominal harus berupa angka positif';
    }
    if (!date) tempErrors.date = 'Tanggal wajib dipilih';
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      ...(transactionToEdit ? { id: transactionToEdit.id } : {}),
      title: title.trim(),
      amount: Math.round(Number(amount)),
      category,
      date,
      type,
      notes: notes.trim() || undefined,
      isAutoParsed: transactionToEdit?.isAutoParsed || false,
    });
  };

  return (
    <div className="bg-white rounded-[32px] border border-border-warm shadow-md overflow-hidden" id="transaction_form_panel">
      {/* Form Header */}
      <div className="bg-sage text-white p-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-tan-light">
            <Receipt className="w-4 h-4" />
          </div>
          <h3 className="font-extrabold text-sm">
            {transactionToEdit ? 'Ubah Transaksi' : 'Tambah Transaksi Baru'}
          </h3>
        </div>
        <button
          onClick={onCancel}
          className="text-sage-light hover:text-white p-1 rounded-lg transition-colors"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Transaction Type Switcher */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-earth-light block uppercase tracking-wide">TIPE TRANSAKSI</label>
          <div className="grid grid-cols-2 gap-2 bg-cream-dark p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${type === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-earth-light hover:text-earth'}`}
            >
              <span className={`w-2 h-2 rounded-full ${type === 'expense' ? 'bg-white' : 'bg-rose-500'}`}></span>
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${type === 'income' ? 'bg-sage text-white shadow-sm' : 'text-earth-light hover:text-earth'}`}
            >
              <span className={`w-2 h-2 rounded-full ${type === 'income' ? 'bg-white' : 'bg-sage'}`}></span>
              Pemasukan
            </button>
          </div>
        </div>

        {/* Title/Description input */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-earth-light block uppercase tracking-wide">NAMA TRANSAKSI</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Contoh: Beli Kopi Kenangan, Gaji Bulanan, dll."
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className={`w-full px-4 py-2.5 bg-cream-dark/50 border rounded-xl text-xs text-earth focus:outline-none transition-all ${errors.title ? 'border-rose-400 focus:ring-rose-400' : 'border-border-warm'}`}
              id="input_transaction_title"
            />
            {title && (
              <span className="absolute right-3 top-2.5 text-[10px] bg-tan-light text-earth font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-fade-in pointer-events-none">
                <Sparkles className="w-3 h-3" />
                Auto-Saran Kategori
              </span>
            )}
          </div>
          {errors.title && <span className="text-[10px] font-semibold text-rose-500 block mt-0.5">{errors.title}</span>}
        </div>

        {/* Amount Input */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-earth-light block uppercase tracking-wide">NOMINAL TRANSAKSI (RP)</label>
          <div className="relative">
            <div className="absolute left-4 top-2.5 text-xs font-bold text-earth-light">Rp</div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Contoh: 15000"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              className={`w-full pl-10 pr-4 py-2.5 bg-cream-dark/50 border rounded-xl font-bold font-mono text-xs text-earth focus:outline-none transition-all ${errors.amount ? 'border-rose-400 focus:ring-rose-400' : 'border-border-warm'}`}
              id="input_transaction_amount"
            />
          </div>
          {errors.amount && <span className="text-[10px] font-semibold text-rose-500 block mt-0.5">{errors.amount}</span>}
        </div>

        {/* Category Selector */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-earth-light block uppercase tracking-wide">KATEGORI</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 bg-cream-dark/50 border border-border-warm rounded-xl text-xs text-earth focus:outline-none transition-all cursor-pointer font-medium"
            id="input_transaction_category"
          >
            {Object.keys(CATEGORIES).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>

        {/* Date Selector */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-earth-light block uppercase tracking-wide">TANGGAL TRANSAKSI</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-cream-dark/50 border border-border-warm rounded-xl text-xs text-earth focus:outline-none transition-all cursor-pointer font-mono font-medium"
            id="input_transaction_date"
          />
          {errors.date && <span className="text-[10px] font-semibold text-rose-500 block mt-0.5">{errors.date}</span>}
        </div>

        {/* Additional Notes */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-earth-light block uppercase tracking-wide">CATATAN / KETERANGAN (OPSIONAL)</label>
          <textarea
            rows={2}
            placeholder="Tambahkan detail rincian belanjaan atau sumber dana..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2.5 bg-cream-dark/50 border border-border-warm rounded-xl text-xs text-earth focus:outline-none transition-all resize-none"
            id="input_transaction_notes"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 border border-border-warm hover:bg-cream-dark/40 text-earth-light rounded-xl font-bold text-xs transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            className="flex-1 py-3 bg-sage hover:bg-sage-dark text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-sage/10 active:scale-95"
            id="btn_save_transaction"
          >
            <Save className="w-4 h-4" />
            <span>Simpan</span>
          </button>
        </div>
      </form>
    </div>
  );
}
