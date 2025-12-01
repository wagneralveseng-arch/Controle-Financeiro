import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Debt } from '../types';
import { PlusCircle, Trash2, Edit2, Save, Repeat, CheckCircle2, Circle, ShieldCheck, PieChart as PieIcon, ArrowDownCircle, ArrowUpCircle, PiggyBank, Link as LinkIcon, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface TransactionListProps {
  transactions: Transaction[];
  debts: Debt[];
  onAddTransaction: (t: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[]) => Promise<void>;
  onUpdateTransaction: (t: Transaction) => Promise<void>;
  onToggleStatus: (id: string) => void;
  onDeleteTransaction: (id: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, debts, onAddTransaction, onUpdateTransaction, onToggleStatus, onDeleteTransaction }) => {
  // --- Filtering State ---
  const [filterMode, setFilterMode] = useState<'ALL' | 'MONTH'>('MONTH');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // --- Form State ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- Debt Linking State ---
  const [isDebtPayment, setIsDebtPayment] = useState(false);
  const [selectedDebtId, setSelectedDebtId] = useState('');
  
  // --- Recurrence State ---
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceEndMonth, setRecurrenceEndMonth] = useState('');

  // --- Edit Mode Logic ---
  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    setDesc(t.description);
    setAmount(t.amount.toString());
    setType(t.type);
    setDateStr(t.date.split('T')[0]);
    setIsRecurring(false); 
    setRecurrenceEndMonth('');
    
    if (t.linkedDebtId) {
      setIsDebtPayment(true);
      setSelectedDebtId(t.linkedDebtId);
    } else {
      setIsDebtPayment(false);
      setSelectedDebtId('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDesc('');
    setAmount('');
    setDateStr(new Date().toISOString().split('T')[0]);
    setIsRecurring(false);
    setRecurrenceEndMonth('');
    setType('EXPENSE');
    setIsDebtPayment(false);
    setSelectedDebtId('');
  };

  const generateRecurringTransactions = (baseData: any, startFromDate: Date, endDate: Date): Omit<Transaction, 'id'>[] => {
    const newTransactions: Omit<Transaction, 'id'>[] = [];
    let cursor = new Date(startFromDate);
    
    // Safety break (max 60 months)
    let safeGuard = 0;
    
    while (cursor <= endDate && safeGuard < 60) {
      newTransactions.push({
        ...baseData,
        date: cursor.toISOString(),
      });

      // Move to next month, same day
      const nextMonth = new Date(cursor);
      nextMonth.setMonth(cursor.getMonth() + 1);
      cursor = nextMonth;
      safeGuard++;
    }
    return newTransactions;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount || !dateStr) return;

    setIsSubmitting(true);

    try {
        // Determine category and link
        let finalCategory = 'General';
        if (type === 'SAVING') finalCategory = 'Investimento';
        if (isDebtPayment && selectedDebtId) finalCategory = 'Dívida';

        const baseData = {
          description: desc,
          amount: parseFloat(amount),
          type,
          category: finalCategory,
          status: 'PENDING' as const, // Default new transactions to PENDING
          linkedDebtId: (isDebtPayment && selectedDebtId) ? selectedDebtId : undefined
        };

        const endDate = isRecurring && recurrenceEndMonth 
          ? new Date(parseInt(recurrenceEndMonth.split('-')[0]), parseInt(recurrenceEndMonth.split('-')[1]), 0) 
          : null;

        if (editingId) {
          // 1. Update the existing transaction
          const existing = transactions.find(t => t.id === editingId);
          await onUpdateTransaction({ 
            ...baseData, 
            date: new Date(dateStr).toISOString(), 
            id: editingId,
            status: existing ? existing.status : 'PENDING' // Preserve status on edit
          });

          // 2. If recurrence is enabled during edit, generate FUTURE transactions starting from next month
          if (isRecurring && endDate) {
            const nextMonthDate = new Date(dateStr);
            nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
            
            const futureTransactions = generateRecurringTransactions(baseData, nextMonthDate, endDate);
            if (futureTransactions.length > 0) {
              await onAddTransaction(futureTransactions);
            }
          }
          
          setEditingId(null);
        } else {
          // Creating New
          if (isRecurring && endDate) {
            // Generate current + future
            const allTransactions = generateRecurringTransactions(baseData, new Date(dateStr), endDate);
            await onAddTransaction(allTransactions);
          } else {
            // Single Transaction
            await onAddTransaction({
              ...baseData,
              date: new Date(dateStr).toISOString(),
            });
          }
        }

        // Reset Form ONLY on success
        setDesc('');
        setAmount('');
        setIsRecurring(false);
        setRecurrenceEndMonth('');
        setType('EXPENSE');
        setIsDebtPayment(false);
        setSelectedDebtId('');

    } catch (error: any) {
        console.error("Erro no formulário:", error);
        alert("Erro ao salvar transação: " + (error.message || "Verifique os dados ou a conexão."));
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- Filtering Logic ---
  const filteredTransactions = useMemo(() => {
    let list = transactions;
    if (filterMode === 'MONTH') {
      list = list.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });
    }
    // Sort by date ascending
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, filterMode, selectedMonth, selectedYear]);

  // --- Financial Summary Logic (Chart Data) ---
  const summaryStats = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalExpense = filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalSavings = filteredTransactions
      .filter(t => t.type === 'SAVING')
      .reduce((acc, t) => acc + t.amount, 0);

    // Margin = Income - (Expenses + Savings)
    const margin = Math.max(0, totalIncome - (totalExpense + totalSavings));
    
    const committedTotal = totalExpense + totalSavings;
    const percentCompromised = totalIncome > 0 ? (committedTotal / totalIncome) * 100 : 0;

    // Chart Data: Expense, Saving, Margin
    const chartData = [
      { name: 'Despesas', value: totalExpense },
      { name: 'Poupança', value: totalSavings },
      { name: 'Margem Livre', value: margin }
    ].filter(d => d.value > 0);

    return { totalIncome, totalExpense, totalSavings, margin, percentCompromised, chartData };
  }, [filteredTransactions]);


  // --- Clustering Logic (Vale vs Pagamento) ---
  const clusters = useMemo(() => {
    // Pagamento: Dia 30 a 14 (virada do mês)
    const pag = filteredTransactions.filter(t => {
      const day = new Date(t.date).getDate();
      return day >= 30 || (day >= 1 && day <= 14);
    });
    
    // Vale: Dia 15 a 29
    const vale = filteredTransactions.filter(t => {
      const day = new Date(t.date).getDate();
      return day >= 15 && day <= 29;
    });

    // IMPORTANT: Only subtract expenses/savings if they are PAID. Add all INCOME automatically.
    const calcRealizedTotal = (list: Transaction[]) => list.reduce((acc, t) => {
        if (t.type === 'INCOME') return acc + t.amount;
        if ((t.type === 'EXPENSE' || t.type === 'SAVING') && t.status === 'PAID') return acc - t.amount;
        return acc;
    }, 0);

    return {
      pagamento: { list: pag, total: calcRealizedTotal(pag) },
      vale: { list: vale, total: calcRealizedTotal(vale) }
    };
  }, [filteredTransactions]);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="space-y-8">
      
      {/* 1. Filter Bar */}
      <div className="bg-white p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setFilterMode('ALL')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${filterMode === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Geral
          </button>
          <button 
            onClick={() => setFilterMode('MONTH')}
            className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${filterMode === 'MONTH' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Mês Específico
          </button>
        </div>

        {filterMode === 'MONTH' && (
          <div className="flex items-center gap-2">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border border-slate-300 p-2 text-sm font-medium bg-white outline-none focus:border-slate-900"
            >
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <input 
              type="number" 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-slate-300 p-2 w-20 text-sm font-medium bg-white outline-none focus:border-slate-900"
            />
          </div>
        )}
      </div>

      {/* 2. Compromised Income Analysis */}
      <div className="bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
             <PieIcon className="w-5 h-5 text-slate-900" />
             <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Análise de Comprometimento de Renda</h3>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-around gap-8">
              <div className="w-full md:w-1/3 h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summaryStats.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {summaryStats.chartData.map((entry, index) => {
                          let color = '#000';
                          if (entry.name === 'Despesas') color = '#dc2626';
                          else if (entry.name === 'Poupança') color = '#2563eb';
                          else color = '#0f172a';
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
              </div>

              <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 border-l-4 border-slate-900">
                      <div className="flex items-center gap-2 mb-1">
                          <ArrowUpCircle className="w-4 h-4 text-slate-500" />
                          <span className="text-xs font-bold uppercase text-slate-500">Receita</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900">R$ {summaryStats.totalIncome.toLocaleString('pt-BR')}</p>
                  </div>

                  <div className="bg-slate-50 p-4 border-l-4 border-red-600">
                      <div className="flex items-center gap-2 mb-1">
                          <ArrowDownCircle className="w-4 h-4 text-red-500" />
                          <span className="text-xs font-bold uppercase text-slate-500">Despesas</span>
                      </div>
                      <p className="text-lg font-bold text-red-600">R$ {summaryStats.totalExpense.toLocaleString('pt-BR')}</p>
                  </div>

                  <div className="bg-slate-50 p-4 border-l-4 border-blue-600">
                      <div className="flex items-center gap-2 mb-1">
                          <PiggyBank className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-bold uppercase text-slate-500">Poupança</span>
                      </div>
                      <p className="text-lg font-bold text-blue-600">R$ {summaryStats.totalSavings.toLocaleString('pt-BR')}</p>
                  </div>

                  <div className={`p-4 border border-dashed text-center flex flex-col justify-center ${summaryStats.percentCompromised > 100 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-300'}`}>
                      <span className="text-xs font-bold uppercase text-slate-500">Comprometido</span>
                      <p className={`text-xl font-black ${summaryStats.percentCompromised > 90 ? 'text-red-600' : 'text-slate-900'}`}>
                          {summaryStats.percentCompromised.toFixed(1)}%
                      </p>
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3. Input/Edit Form */}
        <div className="bg-white p-6 border border-slate-200 h-fit shadow-sm relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-slate-900"></div>
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
            {editingId ? <Edit2 className="w-5 h-5 text-red-600" /> : <PlusCircle className="w-5 h-5" />} 
            {editingId ? 'Editar Transação' : 'Nova Transação'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
              <input 
                type="date" 
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full border-b-2 border-slate-200 p-2 focus:border-slate-900 outline-none bg-transparent transition-colors font-medium text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
              <input 
                type="text" 
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full border-b-2 border-slate-200 p-2 focus:border-slate-900 outline-none bg-transparent transition-colors font-medium text-slate-900"
                placeholder="Ex: Salário, Aluguel, Reserva..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
              <input 
                type="number" 
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border-b-2 border-slate-200 p-2 focus:border-slate-900 outline-none bg-transparent transition-colors font-medium text-slate-900"
                placeholder="0.00"
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setType('INCOME')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border transition-all ${type === 'INCOME' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
              >
                Receita
              </button>
              <button
                type="button"
                onClick={() => setType('EXPENSE')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border transition-all ${type === 'EXPENSE' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setType('SAVING')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border transition-all ${type === 'SAVING' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
              >
                Poupança
              </button>
            </div>

            {/* Debt Linking Option (Only for Expenses) */}
            {type === 'EXPENSE' && (
               <div className="bg-slate-50 p-4 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <input 
                      type="checkbox" 
                      id="isDebtPayment" 
                      checked={isDebtPayment} 
                      onChange={(e) => setIsDebtPayment(e.target.checked)}
                      className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
                    />
                    <label htmlFor="isDebtPayment" className="text-xs font-bold text-slate-700 uppercase cursor-pointer">
                       Amortizar Dívida?
                    </label>
                  </div>
                  
                  {isDebtPayment && (
                    <div className="mt-2 animate-in fade-in duration-200">
                       <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Selecione a Dívida</label>
                       <select
                         value={selectedDebtId}
                         onChange={(e) => setSelectedDebtId(e.target.value)}
                         className="w-full border border-slate-300 p-2 text-sm bg-white outline-none focus:border-slate-900"
                       >
                         <option value="">-- Selecione --</option>
                         {debts.map(d => (
                           <option key={d.id} value={d.id}>{d.creditor} (Restante: R$ {d.remainingAmount.toFixed(2)})</option>
                         ))}
                       </select>
                       <p className="text-[10px] text-slate-500 mt-1 italic">
                         Ao marcar como "Pago", o valor será abatido automaticamente do saldo desta dívida.
                       </p>
                    </div>
                  )}
               </div>
            )}

            {/* Recurrence Options */}
            <div className={`bg-slate-50 p-4 border border-slate-100 mt-2 transition-all ${editingId ? 'border-l-4 border-l-red-600' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <input 
                  type="checkbox" 
                  id="isRecurring" 
                  checked={isRecurring} 
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
                />
                <label htmlFor="isRecurring" className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1 cursor-pointer">
                  <Repeat className="w-3 h-3" /> 
                  {editingId ? 'Gerar Futuras?' : 'Recorrência Mensal?'}
                </label>
              </div>
              
              {isRecurring && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Repetir até qual mês?</label>
                  <input 
                    type="month" 
                    value={recurrenceEndMonth}
                    onChange={(e) => setRecurrenceEndMonth(e.target.value)}
                    className="w-full border border-slate-300 p-2 text-sm bg-white outline-none focus:border-slate-900"
                  />
                  {editingId && (
                     <p className="text-[10px] text-red-600 mt-2 font-medium">
                       * Atualiza esta transação e cria cópias novas para os meses seguintes.
                     </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
               {editingId && (
                   <button 
                   type="button" 
                   onClick={cancelEdit}
                   className="flex-1 bg-white border border-slate-300 text-slate-600 py-3 font-bold uppercase text-xs hover:bg-slate-50 transition-colors"
                 >
                   Cancelar
                 </button>
               )}
               <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-[2] bg-slate-900 text-white py-3 font-bold uppercase text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />)}
                {isSubmitting ? 'Salvando...' : (editingId 
                  ? (isRecurring ? 'Salvar & Gerar Futuros' : 'Salvar Alterações') 
                  : (isRecurring ? 'Gerar Transações' : 'Adicionar')
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 4. Transaction List (Clustered) */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* Cluster: Pagamento (30 a 14) */}
            <div className="bg-white border border-slate-200 shadow-sm">
                <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h4 className="font-bold text-slate-900 uppercase tracking-wide text-sm">Cluster: Pagamento</h4>
                        <p className="text-xs text-slate-500">Dia 30 ao Dia 14</p>
                    </div>
                    <div className={`text-lg font-bold ${clusters.pagamento.total >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                        {clusters.pagamento.total < 0 ? '-' : ''}R$ {Math.abs(clusters.pagamento.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        <span className="text-[10px] ml-2 text-slate-400 font-normal uppercase">(Líquido Realizado)</span>
                    </div>
                </div>
                <TransactionTable 
                  transactions={clusters.pagamento.list} 
                  debts={debts}
                  onEdit={handleEdit} 
                  onToggleStatus={onToggleStatus}
                  onDelete={onDeleteTransaction} 
                />
            </div>

            {/* Cluster: Vale (15 a 29) */}
            <div className="bg-white border border-slate-200 shadow-sm">
                <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h4 className="font-bold text-slate-900 uppercase tracking-wide text-sm">Cluster: Vale</h4>
                        <p className="text-xs text-slate-500">Dia 15 ao Dia 29</p>
                    </div>
                    <div className={`text-lg font-bold ${clusters.vale.total >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                        {clusters.vale.total < 0 ? '-' : ''}R$ {Math.abs(clusters.vale.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        <span className="text-[10px] ml-2 text-slate-400 font-normal uppercase">(Líquido Realizado)</span>
                    </div>
                </div>
                <TransactionTable 
                  transactions={clusters.vale.list} 
                  debts={debts}
                  onEdit={handleEdit} 
                  onToggleStatus={onToggleStatus}
                  onDelete={onDeleteTransaction} 
                />
            </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component for table display
const TransactionTable: React.FC<{ transactions: Transaction[], debts: Debt[], onEdit: (t: Transaction) => void, onToggleStatus: (id: string) => void, onDelete: (id: string) => void }> = ({ transactions, debts, onEdit, onToggleStatus, onDelete }) => {
    if (transactions.length === 0) {
        return <div className="p-8 text-center text-slate-400 text-sm italic">Nenhum registro neste período.</div>
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="py-3 px-4 font-bold text-center w-16">Status</th>
                        <th className="py-3 px-4 font-bold">Dia</th>
                        <th className="py-3 px-4 font-bold">Descrição</th>
                        <th className="py-3 px-4 font-bold text-right">Valor</th>
                        <th className="py-3 px-4 font-bold text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                    {transactions.map(t => {
                        const dateObj = new Date(t.date);
                        const isIncome = t.type === 'INCOME';
                        const isExpense = t.type === 'EXPENSE';
                        const isSaving = t.type === 'SAVING';
                        
                        const isPaid = t.status === 'PAID';
                        
                        // Paid = Dimmed/Strikethrough if it's an outflow (Expense or Saving)
                        const isCompleted = (isExpense || isSaving) && isPaid;

                        // Identify linked debt
                        const linkedDebt = t.linkedDebtId ? debts.find(d => d.id === t.linkedDebtId) : null;

                        return (
                            <tr key={t.id} className={`hover:bg-slate-50 group transition-all ${isCompleted ? 'opacity-50 hover:opacity-80' : ''}`}>
                                <td className="py-3 px-4 text-center">
                                    {isExpense || isSaving ? (
                                      <button 
                                        onClick={() => onToggleStatus(t.id)}
                                        className={`p-1 rounded-full transition-colors ${
                                          isPaid 
                                            ? 'text-slate-400 hover:bg-slate-100' // Paid icon
                                            : 'text-slate-900 hover:text-slate-700 hover:bg-slate-200' // Pending icon (active)
                                        }`}
                                        title={isPaid ? "Desmarcar (Estornar)" : "Marcar como Realizado (Pagar)"}
                                      >
                                          {isPaid ? <CheckCircle2 className="w-5 h-5 fill-slate-300 text-white" /> : <Circle className="w-5 h-5" />}
                                      </button>
                                    ) : (
                                      <div title="Receita Contabilizada" className="flex justify-center cursor-default">
                                         <ShieldCheck className="w-5 h-5 text-slate-900" />
                                      </div>
                                    )}
                                </td>
                                <td className="py-3 px-4 font-medium text-slate-500">
                                    {dateObj.getUTCDate().toString().padStart(2, '0')}/{ (dateObj.getUTCMonth()+1).toString().padStart(2, '0') }
                                </td>
                                <td className={`py-3 px-4 font-semibold ${isCompleted ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900'}`}>
                                    {t.description}
                                    {isSaving && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase font-bold">Poupança</span>}
                                    {linkedDebt && (
                                       <span className="ml-2 flex items-center gap-1 w-fit text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded-full uppercase font-bold mt-1 md:mt-0 md:inline-flex">
                                          <LinkIcon className="w-3 h-3" /> {linkedDebt.creditor}
                                       </span>
                                    )}
                                </td>
                                <td className={`py-3 px-4 text-right font-bold ${
                                  isIncome 
                                    ? 'text-slate-900' 
                                    : (isPaid 
                                        ? 'text-slate-400 line-through decoration-slate-300' // Paid Outflow
                                        : (isSaving ? 'text-blue-600' : 'text-red-600')) // Pending Outflow
                                }`}>
                                    {isIncome ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onEdit(t)} className="p-1 text-slate-400 hover:text-slate-900">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDelete(t.id)} className="p-1 text-slate-400 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default TransactionList;