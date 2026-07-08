import React, { useState } from 'react';
import { Budget, CATEGORIES } from '../types';
import { X, Save, Settings2, ShieldCheck } from 'lucide-react';

interface BudgetManagerProps {
  budgets: Budget[];
  onSaveBudgets: (updatedBudgets: Budget[]) => void;
  onClose: () => void;
}

export default function BudgetManager({
  budgets,
  onSaveBudgets,
  onClose,
}: BudgetManagerProps) {
  // Local state with initial budget values or defaults (0) for all categories
  const [localLimits, setLocalLimits] = useState<Record<string, string>>(() => {
    const limits: Record<string, string> = {};
    // Seed with existing budgets
    Object.keys(CATEGORIES).forEach((cat) => {
      const existing = budgets.find((b) => b.category === cat);
      limits[cat] = existing ? existing.limit.toString() : '0';
    });
    return limits;
  });

  const handleLimitChange = (category: string, value: string) => {
    // Only allow numbers
    const cleanValue = value.replace(/[^0-9]/g, '');
    setLocalLimits((prev) => ({
      ...prev,
      [category]: cleanValue,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Budget[] = Object.entries(localLimits).map(([category, limitStr]) => ({
      id: budgets.find((b) => b.category === category)?.id || Math.random().toString(),
      category,
      limit: parseInt(limitStr as string, 10) || 0,
    }));

    onSaveBudgets(updated);
    alert('✅ Batasan anggaran kategori berhasil diperbarui!');
    onClose();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden" id="budget_manager_panel">
      {/* Header */}
      <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
            <Settings2 className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm">Pengaturan Batas Anggaran Bulanan</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Form */}
      <form onSubmit={handleSave} className="p-6 space-y-6">
        <div className="bg-blue-50 p-3.5 border border-blue-100 rounded-2xl flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Atur target batas pengeluaran bulanan Anda untuk setiap kategori. Sistem asisten AI akan memperingatkan Anda saat pengeluaran kategori tersebut mendekati batas target.
          </p>
        </div>

        {/* Categories Input Grid List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
          {Object.entries(CATEGORIES).map(([catName, info]) => (
            <div
              key={catName}
              className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: info.color }}></span>
                <span className="text-xs font-bold text-slate-800">{catName}</span>
              </div>

              {/* Currency Input Box */}
              <div className="relative">
                <div className="absolute left-3.5 top-2.5 text-[11px] font-bold text-slate-400">Rp</div>
                <input
                  type="text"
                  placeholder="0"
                  value={localLimits[catName]}
                  onChange={(e) => handleLimitChange(catName, e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  id={`budget_input_${catName.replace(/\s+/g, '_')}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/10 active:scale-95"
            id="btn_save_budgets"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Anggaran</span>
          </button>
        </div>
      </form>
    </div>
  );
}
