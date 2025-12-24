
import React, { useState, useEffect, useMemo } from 'react';
import { FinancialState, Transaction, Debt, AnnualReportResponse } from './types';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import DebtList from './components/DebtList';
import Fluxo from './components/Fluxo';
import MarketWidgets from './components/MarketWidgets';
import AnnualReportModal from './components/AnnualReportModal';
import { Auth } from './components/Auth';
import { LayoutDashboard, Wallet, Receipt, Loader2, LogOut, Activity, Sun, Moon, FileText } from 'lucide-react';
import { dataService } from './services/dataService';
import { supabase } from './services/supabaseClient';
import { generateAnnualReport } from './services/geminiService';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [loadingData, setLoadingData] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'debts' | 'fluxo'>('dashboard');

  // Report State
  const [annualReport, setAnnualReport] = useState<AnnualReportResponse | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingSession(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const state = await dataService.fetchFinancialState();
      setTransactions(state.transactions);
      setDebts(state.debts);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoadingData(false);
    }
  };

  const currentRealBalance = useMemo(() => {
    return transactions.reduce((acc, t) => {
        if (t.type === 'INCOME') return acc + t.amount;
        if ((t.type === 'EXPENSE' || t.type === 'SAVING') && t.status === 'PAID') return acc - t.amount;
        return acc;
    }, 0);
  }, [transactions]);

  const financialState: FinancialState = {
    currentBalance: currentRealBalance,
    transactions,
    debts
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const report = await generateAnnualReport(financialState);
      setAnnualReport(report);
      setShowReportModal(true);
    } catch (error: any) {
      console.error("UI Error Generating Report:", error);
      alert(`Erro ao gerar o relatório anual com IA. Motivo: ${error.message || 'Erro desconhecido'}. Tente novamente em instantes.`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const addTransaction = async (input: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[]) => {
    const items = Array.isArray(input) ? input : [input];
    await dataService.addTransactions(items);
    await loadData();
  };

  const updateTransaction = async (updated: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
    await dataService.updateTransaction(updated);
  };

  const toggleTransactionStatus = async (id: string) => {
    const t = transactions.find(t => t.id === id);
    if (!t) return;
    const newStatus = t.status === 'PAID' ? 'PENDING' : 'PAID';
    setTransactions(prev => prev.map(tr => tr.id === id ? { ...tr, status: newStatus } : tr));
    await dataService.updateTransaction({ ...t, status: newStatus });
  };

  const deleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    await dataService.deleteTransaction(id);
  };

  const addDebt = async (d: Omit<Debt, 'id'>) => {
    await dataService.addDebt(d);
    await loadData();
  };

  const updateDebt = async (updated: Debt) => {
    setDebts(prev => prev.map(d => d.id === updated.id ? updated : d));
    await dataService.updateDebt(updated);
  };

  if (loadingSession) return <div className="h-screen w-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-12 h-12 animate-spin text-red-600" /></div>;
  if (!session) return <Auth />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans transition-colors">
      <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 z-10">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight">Gerenciador <span className="text-red-600">Fin.</span></h1>
        </div>
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-500">
           <span className="truncate">{session.user.email}</span>
           <button onClick={toggleTheme}>{theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 border-l-4 ${activeTab === 'dashboard' ? 'border-red-600 bg-slate-100 dark:bg-slate-800' : 'border-transparent text-slate-500'}`}><LayoutDashboard className="w-5 h-5" /> Visão Geral</button>
          <button onClick={() => setActiveTab('fluxo')} className={`w-full flex items-center gap-3 px-4 py-3 border-l-4 ${activeTab === 'fluxo' ? 'border-red-600 bg-slate-100 dark:bg-slate-800' : 'border-transparent text-slate-500'}`}><Activity className="w-5 h-5" /> Fluxo Diário</button>
          <button onClick={() => setActiveTab('transactions')} className={`w-full flex items-center gap-3 px-4 py-3 border-l-4 ${activeTab === 'transactions' ? 'border-red-600 bg-slate-100 dark:bg-slate-800' : 'border-transparent text-slate-500'}`}><Receipt className="w-5 h-5" /> Transações (DRE)</button>
          <button onClick={() => setActiveTab('debts')} className={`w-full flex items-center gap-3 px-4 py-3 border-l-4 ${activeTab === 'debts' ? 'border-red-600 bg-slate-100 dark:bg-slate-800' : 'border-transparent text-slate-500'}`}><Wallet className="w-5 h-5" /> Dívidas</button>
        </nav>
        <MarketWidgets />
      </aside>

      <main className="flex-1 overflow-y-auto h-screen relative">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-5 sticky top-0 z-10 shadow-sm flex justify-between items-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">{activeTab}</h2>
        </header>
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard state={financialState} plan={null} isDarkMode={theme === 'dark'} />}
          {activeTab === 'fluxo' && <Fluxo transactions={transactions} onAddTransaction={addTransaction} onUpdateTransaction={updateTransaction} onDeleteTransaction={deleteTransaction} />}
          {activeTab === 'transactions' && <TransactionList transactions={transactions} debts={debts} onAddTransaction={addTransaction} onUpdateTransaction={updateTransaction} onToggleStatus={toggleTransactionStatus} onDeleteTransaction={deleteTransaction} onGenerateReport={handleGenerateReport} isGeneratingReport={isGeneratingReport} />}
          {activeTab === 'debts' && <DebtList debts={debts} onAddDebt={addDebt} onUpdateDebt={updateDebt} onDeleteDebt={() => {}} onRegisterPayment={() => {}} />}
        </div>
      </main>

      {showReportModal && annualReport && (
        <AnnualReportModal report={annualReport} onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
};

export default App;
