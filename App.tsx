import React, { useState, useEffect, useMemo } from 'react';
import { FinancialState, Transaction, Debt, AIPlanResponse } from './types';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import DebtList from './components/DebtList';
import AiPlanner from './components/AiPlanner';
import Fluxo from './components/Fluxo';
import MarketWidgets from './components/MarketWidgets';
import { Auth } from './components/Auth';
import { LayoutDashboard, Wallet, Receipt, BrainCircuit, Loader2, LogOut, Activity, Sun, Moon } from 'lucide-react';
import { dataService } from './services/dataService';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  // --- Global State ---
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [loadingData, setLoadingData] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [aiPlan, setAiPlan] = useState<AIPlanResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'debts' | 'ai' | 'fluxo'>('dashboard');

  // 0. Theme Initialization
  useEffect(() => {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      setTheme('dark'); // Default to dark as per user preference
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

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

  // --- Dynamic Balance Calculation (Real-Time Cash) ---
  const currentRealBalance = useMemo(() => {
    return transactions.reduce((acc, t) => {
        // Income adds to balance
        if (t.type === 'INCOME') {
            return acc + t.amount;
        }
        // Expense/Saving subtracts ONLY if PAID
        if ((t.type === 'EXPENSE' || t.type === 'SAVING') && t.status === 'PAID') {
            return acc - t.amount;
        }
        return acc;
    }, 0);
  }, [transactions]);

  const financialState: FinancialState = {
    currentBalance: currentRealBalance,
    transactions,
    debts
  };

  // --- Logic for Debt Linking ---
  const handleDebtAdjustment = async (debtId: string, amount: number, type: 'PAY' | 'REVERT') => {
    const debt = debts.find(d => d.id === debtId);
    if(!debt) return;
    
    // PAY: Subtract amount from remaining
    // REVERT: Add amount back to remaining
    const newRemaining = type === 'PAY'
       ? Math.max(0, debt.remainingAmount - amount)
       : debt.remainingAmount + amount;

    // Use existing update logic which updates state and DB
    await updateDebt({ ...debt, remainingAmount: newRemaining });
  }


  // --- Handlers ---
  const addTransaction = async (input: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[]) => {
    try {
        const items = Array.isArray(input) ? input : [input];
        await dataService.addTransactions(items);
        
        // Check if any added transaction is already PAID and Linked to Debt
        for (const item of items) {
            if (item.status === 'PAID' && item.linkedDebtId) {
                await handleDebtAdjustment(item.linkedDebtId, item.amount, 'PAY');
            }
        }

        await loadData(); // Reload to get IDs and fresh state
        setAiPlan(null);
    } catch (error) {
        console.error("Critical Error Adding Transaction:", error);
        throw error; // Rethrow so component can handle UI
    }
  };

  const updateTransaction = async (updated: Transaction) => {
    try {
        // 1. Logic for Linked Debts is complex on Update.
        // To be safe, we check what changed.
        const oldTransaction = transactions.find(t => t.id === updated.id);
        
        if (oldTransaction) {
            // If it WAS paid and linked -> REVERT old impact
            if (oldTransaction.status === 'PAID' && oldTransaction.linkedDebtId) {
                await handleDebtAdjustment(oldTransaction.linkedDebtId, oldTransaction.amount, 'REVERT');
            }
            
            // If it IS now paid and linked -> APPLY new impact
            if (updated.status === 'PAID' && updated.linkedDebtId) {
                // Note: We await here because updateDebt modifies state.
                // If we didn't wait, we might have race conditions.
                // However, for UI responsiveness, we might see a flicker.
                await handleDebtAdjustment(updated.linkedDebtId, updated.amount, 'PAY');
            }
        }

        // Optimistic update for UI list
        setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
        await dataService.updateTransaction(updated);
        setAiPlan(null);
    } catch (error) {
        console.error("Critical Error Updating Transaction:", error);
        throw error;
    }
  }

  const toggleTransactionStatus = async (id: string) => {
    const t = transactions.find(t => t.id === id);
    if (!t) return;
    
    const newStatus = t.status === 'PAID' ? 'PENDING' : 'PAID';
    
    // Debt Logic
    if (t.linkedDebtId) {
        if (newStatus === 'PAID') {
            await handleDebtAdjustment(t.linkedDebtId, t.amount, 'PAY');
        } else {
            // Unchecking (Reverting)
            await handleDebtAdjustment(t.linkedDebtId, t.amount, 'REVERT');
        }
    }

    // Optimistic
    setTransactions(prev => prev.map(tr => tr.id === id ? { ...tr, status: newStatus } : tr));
    
    await dataService.updateTransaction({ ...t, status: newStatus });
    setAiPlan(null);
  };

  const deleteTransaction = async (id: string) => {
    const t = transactions.find(t => t.id === id);
    
    // Debt Logic: If deleting a PAID linked transaction, we must Revert (Add back debt)
    if (t && t.status === 'PAID' && t.linkedDebtId) {
        await handleDebtAdjustment(t.linkedDebtId, t.amount, 'REVERT');
    }

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
    // Optimistic update
    setDebts(prev => prev.map(d => d.id === updated.id ? updated : d));
    await dataService.updateDebt(updated);
    setAiPlan(null);
  };

  const deleteDebt = async (id: string) => {
    setDebts(prev => prev.filter(d => d.id !== id));
    await dataService.deleteDebt(id);
    setAiPlan(null);
  };

  // --- Handler for Manual Debt Payment (from Debt Screen) ---
  const registerDebtPayment = async (debtId: string, amountPaid: number, date: string, createTransaction: boolean) => {
    if (createTransaction) {
        await addTransaction({
            date: new Date(date).toISOString(),
            description: `Pgto Dívida (Manual)`,
            amount: amountPaid,
            type: 'EXPENSE',
            category: 'Dívida', 
            status: 'PAID',
            linkedDebtId: debtId // LINK IT!
        });
    } else {
        await handleDebtAdjustment(debtId, amountPaid, 'PAY');
    }
  };

  // --- Render Conditions ---

  if (loadingSession) {
     return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-red-600" />
        </div>
     );
  }

  if (!session) {
    return <Auth />;
  }

  if (loadingData && transactions.length === 0) {
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-red-600" />
            <h2 className="text-xl font-bold">Sincronizando Banco de Dados...</h2>
            <p className="text-slate-500 text-sm mt-2">Carregando perfil do usuário...</p>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex flex-col flex-shrink-0 sticky top-0 h-auto md:h-screen z-10 border-r border-slate-200 dark:border-slate-800 transition-colors shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Gerenciador <span className="text-red-600">Fin.</span></h1>
            <p className="text-xs text-slate-500 mt-1">Inteligência de Mercado</p>
          </div>
        </div>

        {/* User & Theme Toggle */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
           <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{session.user.email}</div>
           <button 
             onClick={toggleTheme}
             className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
             title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
           >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
           </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-none transition-all border-l-4 ${activeTab === 'dashboard' ? 'border-red-600 bg-slate-100 dark:bg-slate-800 font-medium' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <LayoutDashboard className="w-5 h-5" /> Visão Geral
          </button>
          
          <button 
            onClick={() => setActiveTab('fluxo')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-none transition-all border-l-4 ${activeTab === 'fluxo' ? 'border-red-600 bg-slate-100 dark:bg-slate-800 font-medium' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Activity className="w-5 h-5" /> Fluxo Diário
          </button>

          <button 
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-none transition-all border-l-4 ${activeTab === 'transactions' ? 'border-red-600 bg-slate-100 dark:bg-slate-800 font-medium' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Receipt className="w-5 h-5" /> Transações (DRE)
          </button>
          <button 
            onClick={() => setActiveTab('debts')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-none transition-all border-l-4 ${activeTab === 'debts' ? 'border-red-600 bg-slate-100 dark:bg-slate-800 font-medium' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Wallet className="w-5 h-5" /> Passivos (Dívidas)
          </button>
          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
            <button 
                onClick={() => setActiveTab('ai')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-none transition-all border-l-4 ${activeTab === 'ai' ? 'border-slate-900 dark:border-white bg-slate-200 dark:bg-slate-800 font-bold' : 'border-transparent text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                <BrainCircuit className="w-5 h-5" /> Executar Plano
            </button>
          </div>
        </nav>

        {/* MARKET WIDGETS SECTION */}
        <MarketWidgets />

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
           <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800 hover:text-red-600 dark:hover:text-red-300 transition-colors text-xs font-bold uppercase tracking-wider"
           >
             <LogOut className="w-4 h-4" /> Sair do Sistema
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-5 sticky top-0 z-10 shadow-sm flex justify-between items-center transition-colors">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white capitalize tracking-tight">
                {activeTab === 'ai' ? 'Centro de Estratégia' : 
                 activeTab === 'dashboard' ? 'Painel de Controle' :
                 activeTab === 'fluxo' ? 'Gestão de Fluxo Diário' :
                 activeTab === 'transactions' ? 'Fluxo de Caixa (DRE)' : 'Gestão de Passivos'}
            </h2>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard state={financialState} plan={aiPlan} isDarkMode={theme === 'dark'} />}
          {activeTab === 'fluxo' && (
             <Fluxo 
               transactions={transactions} 
               onAddTransaction={addTransaction}
               onUpdateTransaction={updateTransaction}
               onDeleteTransaction={deleteTransaction} 
             />
          )}
          {activeTab === 'transactions' && (
            <TransactionList 
              transactions={transactions} 
              debts={debts}
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