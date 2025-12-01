import React, { useState, useEffect } from 'react';
import { FinancialState, Transaction, Debt, AIPlanResponse } from './types';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import DebtList from './components/DebtList';
import AiPlanner from './components/AiPlanner';
import { Auth } from './components/Auth';
import { LayoutDashboard, Wallet, Receipt, BrainCircuit, Loader2, LogOut } from 'lucide-react';
import { dataService } from './services/dataService';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  // --- Global State ---
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [loadingData, setLoadingData] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [initialBalance, setInitialBalance] = useState(0); // Fixed at 0
  const [aiPlan, setAiPlan] = useState<AIPlanResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'debts' | 'ai'>('dashboard');

  // 1. Auth Logic
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Data Logic (Only load when session exists)
  useEffect(() => {
    if (session) {
      loadData();
    }
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setTransactions([]);
    setDebts([]);
    setAiPlan(null);
    setSession(null);
  };

  const financialState: FinancialState = {
    currentBalance: initialBalance,
    transactions,
    debts
  };

  // --- Handlers ---
  const addTransaction = async (input: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[]) => {
    const items = Array.isArray(input) ? input : [input];
    await dataService.addTransactions(items);
    await loadData(); // Reload to get IDs and fresh state
    setAiPlan(null);
  };

  const updateTransaction = async (updated: Transaction) => {
    // Optimistic update
    setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
    await dataService.updateTransaction(updated);
    setAiPlan(null);
  }

  const toggleTransactionStatus = async (id: string) => {
    const t = transactions.find(t => t.id === id);
    if (!t) return;
    
    const newStatus = t.status === 'PAID' ? 'PENDING' : 'PAID';
    // Optimistic
    setTransactions(prev => prev.map(tr => tr.id === id ? { ...tr, status: newStatus } : tr));
    
    await dataService.updateTransaction({ ...t, status: newStatus });
    setAiPlan(null);
  };

  const deleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    await dataService.deleteTransaction(id);
    setAiPlan(null);
  };

  const addDebt = async (d: Omit<Debt, 'id'>) => {
    await dataService.addDebt(d);
    await loadData();
    setAiPlan(null);
  };

  const updateDebt = async (updated: Debt) => {
    setDebts(prev => prev.map(d => d.id === updated.id ? updated : d));
    await dataService.updateDebt(updated);
    setAiPlan(null);
  };

  const deleteDebt = async (id: string) => {
    setDebts(prev => prev.filter(d => d.id !== id));
    await dataService.deleteDebt(id);
    setAiPlan(null);
  };

  // --- New Handler for Debt Payment ---
  const registerDebtPayment = async (debtId: string, amountPaid: number, date: string, createTransaction: boolean) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    const newRemaining = Math.max(0, debt.remainingAmount - amountPaid);
    
    // 1. Update Debt
    const updatedDebt = { ...debt, remainingAmount: newRemaining };
    await updateDebt(updatedDebt);

    // 2. Create Transaction (Optional)
    if (createTransaction) {
      await addTransaction({
        date: new Date(date).toISOString(),
        description: `Pgto Dívida: ${debt.creditor}`,
        amount: amountPaid,
        type: 'EXPENSE',
        category: 'Dívida', // Categoria específica para gráficos
        status: 'PAID'
      });
    }
  };

  // --- Render Conditions ---

  if (loadingSession) {
     return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-red-600" />
        </div>
     );
  }

  if (!session) {
    return <Auth />;
  }

  if (loadingData && transactions.length === 0) {
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-red-600" />
            <h2 className="text-xl font-bold">Sincronizando Banco de Dados...</h2>
            <p className="text-slate-400 text-sm mt-2">Carregando perfil do usuário...</p>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      
      {/* Sidebar Navigation - BLACK */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 sticky top-0 h-auto md:h-screen z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight text-white">Gerenciador <span className="text-red-600">Fin.</span></h1>
          <p className="text-xs text-slate-400 mt-1">Inteligência de Mercado</p>
          <div className="mt-2 text-[10px] text-slate-500 truncate">{session.user.email}</div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-none transition-all border-l-4 ${activeTab === 'dashboard' ? 'border-red-600 bg-slate-800 text-white font-medium' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard className="w-5 h-5" /> Visão Geral
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-none transition-all border-l-4 ${activeTab === 'transactions' ? 'border-red-600 bg-slate-800 text-white font-medium' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Receipt className="w-5 h-5" /> Transações
          </button>
          <button 
            onClick={() => setActiveTab('debts')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-none transition-all border-l-4 ${activeTab === 'debts' ? 'border-red-600 bg-slate-800 text-white font-medium' : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Wallet className="w-5 h-5" /> Passivos (Dívidas)
          </button>
          <div className="pt-4 mt-4 border-t border-slate-800">
            <button 
                onClick={() => setActiveTab('ai')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-none transition-all border-l-4 ${activeTab === 'ai' ? 'border-white bg-slate-800 text-white font-bold' : 'border-transparent text-slate-300 hover:bg-slate-800'}`}
            >
                <BrainCircuit className="w-5 h-5" /> Executar Plano
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors text-xs font-bold uppercase tracking-wider"
           >
             <LogOut className="w-4 h-4" /> Sair do Sistema
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10 shadow-sm flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-900 capitalize tracking-tight">
                {activeTab === 'ai' ? 'Centro de Estratégia' : 
                 activeTab === 'dashboard' ? 'Painel de Controle' :
                 activeTab === 'transactions' ? 'Fluxo de Caixa' : 'Gestão de Passivos'}
            </h2>
            <div className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-800 bg-white px-4 py-2 border border-slate-300 shadow-sm">
                <span className="text-slate-500 uppercase text-xs font-bold tracking-wider">Saldo Inicial:</span>
                <span className={initialBalance >= 0 ? 'text-slate-900 font-bold' : 'text-red-600 font-bold'}>
                    R$ {initialBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
            </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard state={financialState} plan={aiPlan} />}
          {activeTab === 'transactions' && (
            <TransactionList 
              transactions={transactions} 
              onAddTransaction={addTransaction} 
              onUpdateTransaction={updateTransaction}
              onToggleStatus={toggleTransactionStatus}
              onDeleteTransaction={deleteTransaction} 
            />
          )}
          {activeTab === 'debts' && (
            <DebtList 
              debts={debts} 
              onAddDebt={addDebt} 
              onUpdateDebt={updateDebt}
              onDeleteDebt={deleteDebt}
              onRegisterPayment={registerDebtPayment} 
            />
          )}
          {activeTab === 'ai' && <AiPlanner state={financialState} onPlanGenerated={setAiPlan} currentPlan={aiPlan} />}
        </div>
      </main>

    </div>
  );
};

export default App;