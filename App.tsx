import React, { useState } from 'react';
import { FinancialState, Transaction, Debt, AIPlanResponse } from './types';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import DebtList from './components/DebtList';
import AiPlanner from './components/AiPlanner';
import { LayoutDashboard, Wallet, Receipt, BrainCircuit } from 'lucide-react';

const App: React.FC = () => {
  // --- Global State ---
  
  // 1. Transactions (Using specific dates for Dec 2025 as base)
  const [transactions, setTransactions] = useState<Transaction[]>([
    // VALE CLUSTER (15-30)
    { id: 'inc-1', date: '2025-12-15T10:00:00.000Z', description: 'Renda Mensal (Vale)', amount: 2323.20, type: 'INCOME', category: 'Salary', status: 'PAID' },
    { id: 'exp-1', date: '2025-12-15T10:00:00.000Z', description: 'Aluguel', amount: 550.00, type: 'EXPENSE', category: 'Housing', status: 'PENDING' },
    { id: 'exp-2', date: '2025-12-15T10:00:00.000Z', description: 'Celular', amount: 60.00, type: 'EXPENSE', category: 'Utilities', status: 'PENDING' },
    { id: 'exp-3', date: '2025-12-15T10:00:00.000Z', description: 'Futebol', amount: 50.00, type: 'EXPENSE', category: 'Leisure', status: 'PENDING' },
    { id: 'exp-4', date: '2025-12-15T10:00:00.000Z', description: 'Cannabis', amount: 150.00, type: 'EXPENSE', category: 'Personal', status: 'PENDING' },
    { id: 'exp-5', date: '2025-12-16T10:00:00.000Z', description: 'Filho/Lazer (Parcial 1)', amount: 300.00, type: 'EXPENSE', category: 'Family', status: 'PENDING' },
    { id: 'exp-6', date: '2025-12-16T10:00:00.000Z', description: 'Variável Geral', amount: 50.00, type: 'EXPENSE', category: 'General', status: 'PENDING' },

    // VALE (End of month items usually fall into the 30th bucket)
    { id: 'inc-2', date: '2025-12-30T10:00:00.000Z', description: 'Renda Mensal (Fim Mês)', amount: 1061.17, type: 'INCOME', category: 'Salary', status: 'PENDING' },
    { id: 'exp-7', date: '2025-12-30T10:00:00.000Z', description: 'Internet', amount: 165.00, type: 'EXPENSE', category: 'Utilities', status: 'PENDING' },
    { id: 'exp-8', date: '2025-12-30T10:00:00.000Z', description: 'Filho/Lazer (Parcial 2)', amount: 300.00, type: 'EXPENSE', category: 'Family', status: 'PENDING' },
    { id: 'exp-9', date: '2025-12-30T10:00:00.000Z', description: 'Variável Geral (Fim Mês)', amount: 50.00, type: 'EXPENSE', category: 'General', status: 'PENDING' },
    
    // PAGAMENTO CLUSTER (01-14) - Example for next month context if viewed generally
    // (None initially for Dec 2025 based on prompt, but available for future entries)
  ]);

  // 2. Debts (Dívidas Pendentes)
  const [debts, setDebts] = useState<Debt[]>([
    { id: 'd1', creditor: 'Receita Federal (Parcelamento)', totalAmount: 5184.96, remainingAmount: 5184.96, monthlyPayment: 740.71, installmentsRemaining: 7, interestRate: 0, dueDateDay: 20, priority: 'HIGH' },
    { id: 'd2', creditor: 'Multa do Carro', totalAmount: 850.00, remainingAmount: 850.00, monthlyPayment: 850.00, installmentsRemaining: 1, interestRate: 0, dueDateDay: 10, priority: 'MEDIUM' },
    { id: 'd3', creditor: 'Faculdade', totalAmount: 1559.16, remainingAmount: 1559.16, monthlyPayment: 1559.16, installmentsRemaining: 1, interestRate: 0, dueDateDay: 10, priority: 'MEDIUM' },
    { id: 'd4', creditor: 'Luz (Atrasada)', totalAmount: 365.00, remainingAmount: 365.00, monthlyPayment: 365.00, installmentsRemaining: 1, interestRate: 0, dueDateDay: 5, priority: 'HIGH' },
    { id: 'd5', creditor: 'Sabesp (Atrasada)', totalAmount: 1109.24, remainingAmount: 1109.24, monthlyPayment: 1109.24, installmentsRemaining: 1, interestRate: 0, dueDateDay: 5, priority: 'HIGH' },
    { id: 'd6', creditor: 'Carro Dívida Ativa', totalAmount: 773.28, remainingAmount: 773.28, monthlyPayment: 386.64, installmentsRemaining: 2, interestRate: 0, dueDateDay: 20, priority: 'MEDIUM' },
  ]);

  // 3. Current Balance (Zerado conforme solicitação)
  const [initialBalance, setInitialBalance] = useState(0);

  const [aiPlan, setAiPlan] = useState<AIPlanResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'debts' | 'ai'>('dashboard');

  const financialState: FinancialState = {
    currentBalance: initialBalance,
    transactions,
    debts
  };

  // --- Handlers ---
  const addTransaction = (input: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[]) => {
    const newItems = Array.isArray(input) ? input : [input];
    const withIds = newItems.map(t => ({ 
      ...t, 
      id: crypto.randomUUID(),
      // Ensure status is set if not provided (though types suggest it should be there, safe default)
      status: t.status || 'PENDING' 
    }));
    setTransactions(prev => [...prev, ...withIds]);
    setAiPlan(null);
  };

  const updateTransaction = (updated: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
    setAiPlan(null);
  }

  const toggleTransactionStatus = (id: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status: t.status === 'PAID' ? 'PENDING' : 'PAID' };
      }
      return t;
    }));
    setAiPlan(null);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    setAiPlan(null);
  };

  const addDebt = (d: Omit<Debt, 'id'>) => {
    setDebts(prev => [...prev, { ...d, id: crypto.randomUUID() }]);
    setAiPlan(null);
  };

  const updateDebt = (updated: Debt) => {
    setDebts(prev => prev.map(d => d.id === updated.id ? updated : d));
    setAiPlan(null);
  };

  const deleteDebt = (id: string) => {
    setDebts(prev => prev.filter(d => d.id !== id));
    setAiPlan(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      
      {/* Sidebar Navigation - BLACK */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 sticky top-0 h-auto md:h-screen z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight text-white">ZeroDebt <span className="text-red-600">AI</span></h1>
          <p className="text-xs text-slate-400 mt-1">Inteligência de Mercado</p>
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

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          Analista v2.1 - Zero Debt
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
            />
          )}
          {activeTab === 'ai' && <AiPlanner state={financialState} onPlanGenerated={setAiPlan} currentPlan={aiPlan} />}
        </div>
      </main>

    </div>
  );
};

export default App;