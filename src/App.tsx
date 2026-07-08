import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Budget } from './types';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import AIPanel from './components/AIPanel';
import BudgetManager from './components/BudgetManager';
import { Sparkles, HelpCircle, Receipt, Trash2, Wallet, Plus } from 'lucide-react';

// Help helper for Indonesian mock transactional seed data
const getInitialTransactions = (): Transaction[] => {
  const now = new Date();
  const formatWithOffset = (dayOffset: number) => {
    const d = new Date();
    d.setDate(now.getDate() - dayOffset);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: 'tx-1',
      title: 'Pemasukan Gaji Bulanan',
      amount: 7500000,
      category: 'Investasi & Tabungan',
      date: formatWithOffset(12),
      type: 'income',
      notes: 'Transfer masuk dari kantor pusat',
    },
    {
      id: 'tx-2',
      title: 'Belanja Bulanan Alfamart',
      amount: 320000,
      category: 'Belanja',
      date: formatWithOffset(8),
      type: 'expense',
      notes: 'Beli detergen, susu, tisu, sabun mandi',
      isAutoParsed: true,
    },
    {
      id: 'tx-3',
      title: 'Kopi Kenangan Mantan',
      amount: 28000,
      category: 'Makanan & Minuman',
      date: formatWithOffset(4),
      type: 'expense',
      notes: 'Kopi susu gula aren regular',
    },
    {
      id: 'tx-4',
      title: 'Bensin Pertamax SPBU',
      amount: 50000,
      category: 'Transportasi',
      date: formatWithOffset(2),
      type: 'expense',
      notes: 'Motor NMax full tank',
    },
    {
      id: 'tx-5',
      title: 'Langganan Netflix Bulanan',
      amount: 186000,
      category: 'Hiburan',
      date: formatWithOffset(1),
      type: 'expense',
      notes: 'Paket Premium 4K family share',
    }
  ];
};

const getInitialBudgets = (): Budget[] => [
  { id: 'b-1', category: 'Makanan & Minuman', limit: 1200000 },
  { id: 'b-2', category: 'Transportasi', limit: 500000 },
  { id: 'b-3', category: 'Belanja', limit: 1500000 },
  { id: 'b-4', category: 'Hiburan', limit: 600000 },
  { id: 'b-5', category: 'Tagihan & Utilitas', limit: 800000 },
  { id: 'b-6', category: 'Kesehatan', limit: 300000 },
  { id: 'b-7', category: 'Investasi & Tabungan', limit: 2000000 },
  { id: 'b-8', category: 'Lainnya', limit: 500000 }
];

export default function App() {
  // Core application states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  
  // Panel triggers
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Load data on component mount
  useEffect(() => {
    const savedTx = localStorage.getItem('catatin_transactions');
    const savedBudgets = localStorage.getItem('catatin_budgets');

    if (savedTx) {
      setTransactions(JSON.parse(savedTx));
    } else {
      const initial = getInitialTransactions();
      setTransactions(initial);
      localStorage.setItem('catatin_transactions', JSON.stringify(initial));
    }

    if (savedBudgets) {
      setBudgets(JSON.parse(savedBudgets));
    } else {
      const initial = getInitialBudgets();
      setBudgets(initial);
      localStorage.setItem('catatin_budgets', JSON.stringify(initial));
    }
  }, []);

  // Save transactions to localStorage
  const saveTransactionsState = (newTxList: Transaction[]) => {
    setTransactions(newTxList);
    localStorage.setItem('catatin_transactions', JSON.stringify(newTxList));
  };

  // Save budgets to localStorage
  const saveBudgetsState = (newBudgetList: Budget[]) => {
    setBudgets(newBudgetList);
    localStorage.setItem('catatin_budgets', JSON.stringify(newBudgetList));
  };

  // Add or update transaction trigger
  const handleSaveTransaction = (data: Omit<Transaction, 'id'> & { id?: string }) => {
    if (data.id) {
      // Edit mode
      const updated = transactions.map(t => t.id === data.id ? { ...t, ...data } : t);
      saveTransactionsState(updated);
    } else {
      // Add mode
      const newTx: Transaction = {
        ...data,
        id: 'tx-' + Math.random().toString(36).substr(2, 9),
      };
      saveTransactionsState([newTx, ...transactions]);
    }
    setShowAddForm(false);
    setEditingTransaction(null);
  };

  const handleEditTransactionClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setShowAddForm(true);
    // Smooth scroll into form panel
    setTimeout(() => {
      document.getElementById('transaction_form_panel')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus catatan transaksi ini?')) {
      const updated = transactions.filter(t => t.id !== id);
      saveTransactionsState(updated);
    }
  };

  const handleClearAllData = () => {
    if (confirm('⚠️ PERINGATAN: Tindakan ini akan menghapus semua riwayat transaksi harian Anda secara permanen. Apakah Anda yakin?')) {
      saveTransactionsState([]);
      alert('Semua riwayat transaksi Anda telah dibersihkan!');
    }
  };

  const handleImportJSON = (importedTransactions: Transaction[]) => {
    saveTransactionsState([...importedTransactions, ...transactions]);
  };

  // Quick helper to handle parsed receipt approvals directly from AI panel
  const handleAddDirectTransactionFromAI = (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...tx,
      id: 'tx-ai-' + Math.random().toString(36).substr(2, 9),
      isAutoParsed: true,
    };
    saveTransactionsState([newTx, ...transactions]);
  };

  return (
    <div className="min-h-screen bg-cream text-earth antialiased selection:bg-tan-light selection:text-earth pb-12">
      {/* Top Header Nav Banner */}
      <header className="bg-cream/95 border-b border-border-warm sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sage rounded-2xl flex items-center justify-center text-white font-black text-xl tracking-tighter shadow-md shadow-sage/10">
              C.
            </div>
            <div className="space-y-0.5">
              <span className="font-extrabold text-sm text-earth tracking-tight block">Catat.in</span>
              <span className="text-[10px] text-sage font-bold tracking-wide flex items-center gap-1 uppercase">
                <Sparkles className="w-3 h-3 animate-pulse" />
                Asisten Pengeluaran AI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAllData}
              className="text-xs font-semibold text-rose-600 bg-rose-50/50 hover:bg-rose-100/50 px-3.5 py-2 rounded-xl transition-all"
              title="Bersihkan Semua Data Riwayat"
            >
              Reset Data
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-earth-light font-medium px-3.5 py-2 bg-cream-dark rounded-xl border border-border-warm">
              <Wallet className="w-4 h-4 text-earth-light" />
              <span>Offline-First (Tersimpan Lokal)</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Viewport Canvas */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDE: Financial Analytics & Logs Grid (7 Columns) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Main Interactive Dashboard Statistics */}
            <Dashboard
              transactions={transactions}
              budgets={budgets}
              onAddTransactionClick={() => {
                setEditingTransaction(null);
                setShowAddForm(true);
                setTimeout(() => {
                  document.getElementById('transaction_form_panel')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              onManageBudgetsClick={() => {
                setShowBudgetForm(true);
                setTimeout(() => {
                  document.getElementById('budget_manager_panel')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
            />

            {/* Sliding Form Panels (Add, Edit, Budget) */}
            {showAddForm && (
              <div className="animate-slide-up">
                <TransactionForm
                  transactionToEdit={editingTransaction}
                  onSave={handleSaveTransaction}
                  onCancel={() => {
                    setShowAddForm(false);
                    setEditingTransaction(null);
                  }}
                />
              </div>
            )}

            {showBudgetForm && (
              <div className="animate-slide-up">
                <BudgetManager
                  budgets={budgets}
                  onSaveBudgets={saveBudgetsState}
                  onClose={() => setShowBudgetForm(false)}
                />
              </div>
            )}

            {/* Interactive Transaction History Table */}
            <TransactionList
              transactions={transactions}
              onEdit={handleEditTransactionClick}
              onDelete={handleDeleteTransaction}
              onImportJSON={handleImportJSON}
            />

          </div>

          {/* RIGHT SIDE: Intelligent AI Controls (5 Columns) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-22">
            
            {/* The Smart AI Co-Pilot Panel */}
            <AIPanel
              transactions={transactions}
              budgets={budgets}
              onAddTransaction={handleAddDirectTransactionFromAI}
            />

            {/* Decorative Brand Card */}
            <div className="bg-sage text-white rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-sage/10 border border-sage-dark/10">
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none scale-150 transform translate-x-1/4 translate-y-1/4">
                <Sparkles className="w-32 h-32 text-tan" />
              </div>
              <div className="space-y-3 relative z-10">
                <div className="flex items-center gap-2 text-xs font-bold text-tan-light uppercase tracking-widest">
                  <Plus className="w-4 h-4 text-tan" />
                  <span>Teknologi Gemini 3.5 Flash</span>
                </div>
                <h4 className="text-sm font-bold tracking-tight">Privasi & Keamanan Terjamin</h4>
                <p className="text-xs text-sage-light/90 leading-relaxed">
                  Semua transaksi finansial Anda disimpan secara aman di browser lokal Anda tanpa diunggah ke server database publik mana pun. Foto struk dikirim langsung ke Gemini API asisten hanya untuk pemrosesan ekstraksi instan dan segera dibersihkan dari memori server.
                </p>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
