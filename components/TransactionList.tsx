
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Debt } from '../types';
import { PlusCircle, Trash2, Edit2, Save, Repeat, CheckCircle2, Circle, ShieldCheck, PieChart as PieIcon, ArrowDownCircle, ArrowUpCircle, PiggyBank, Link as LinkIcon, Loader2, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface TransactionListProps {
  transactions: Transaction[];
  debts: Debt[];
  onAddTransaction: (t: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[]) => Promise<void>;
  onUpdateTransaction: (t: Transaction) => Promise<void>;
  onToggleStatus: (id: string) => void;
  onDeleteTransaction: (id: string) => void;
  onGenerateReport: () => void;
  isGeneratingReport?: boolean;
}

const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  debts, 
  onAddTransaction, 
  onUpdateTransaction, 
  onToggleStatus, 
  onDeleteTransaction,
  onGenerateReport,
  isGeneratingReport = false
}) => {
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
    
    let safeGuard = 0;
    while (cursor <= endDate && safeGuard < 60) {
      newTransactions.push({
        ...baseData,
        date: cursor.toISOString(),
      });
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
    
    if (type === 'EXPENSE' && isDebtPayment && !selectedDebtId) {
        alert("Por favor, selecione a dívida que deseja amortizar.");
        return;
    }

    setIsSubmitting(true);
    try {
        let finalCategory = 'General';
        if (type === 'SAVING') finalCategory = 'Investimento';
        if (isDebtPayment && selectedDebtId) finalCategory = 'Dívida';

        const baseData = {
          description: desc,
          amount: parseFloat(amount),
          type,
          category: finalCategory,
          status: 'PENDING' as const,
          linkedDebtId: (isDebtPayment && selectedDebtId) ? selectedDebtId : undefined
        };

        const endDate = isRecurring && recurrenceEndMonth 
          ? new Date(parseInt(recurrenceEndMonth.split('-')[0]), parseInt(recurrenceEndMonth.split('-')[1]), 0) 
          : null;

        if (editingId) {
          const existing = transactions.find(t => t.id === editingId);
          await onUpdateTransaction({ 
            ...baseData, 
            date: new Date(dateStr).toISOString(), 
            id: editingId,
            status: existing ? existing.status : 'PENDING'
          });
          if (isRecurring && endDate) {
            const nextMonthDate = new Date(dateStr);
            nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
            const futureTransactions = generateRecurringTransactions(baseData, nextMonthDate, endDate);
            if (futureTransactions.length > 0) await onAddTransaction(futureTransactions);
          }
          setEditingId(null);
        } else {
          if (isRecurring && endDate) {
            const allTransactions = generateRecurringTransactions(baseData, new Date(dateStr), endDate);
            await onAddTransaction(allTransactions);
          } else {
            await onAddTransaction({ ...baseData, date: new Date(dateStr).toISOString() });
          }
        }
        setDesc('');
        setAmount('');
        setIsRecurring(false);
        setRecurrenceEndMonth('');
        setType('EXPENSE');
        setIsDebtPayment(false);
        setSelectedDebtId('');
    } catch (error: any) {
        alert("Erro ao salvar transação: " + (error.message || "Verifique a conexão."));
    } finally {
        setIsSubmitting(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    let list = transactions;
    if (filterMode === 'MONTH') {
      list = list.filter(t => {
        const d = new Date(t.date);
        return d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
      });
    }
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, filterMode, selectedMonth, selectedYear]);

  const summaryStats = useMemo(() => {
    const totalIncome = filteredTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    const totalSavings = filteredTransactions.filter(t => t.type === 'SAVING').reduce((acc, t) => acc + t.amount, 0);
    const margin = Math.max(0, totalIncome - (totalExpense + totalSavings));
    const committedTotal = totalExpense + totalSavings;
    const percentCompromised = totalIncome > 0 ? (committedTotal / totalIncome) * 100 : 0;
    const chartData = [
      { name: 'Despesas', value: totalExpense },
      { name: 'Poupança', value: totalSavings },
      { name: 'Margem Livre', value: margin }
    ].filter(d => d.value > 0);
    return { totalIncome, totalExpense, totalSavings, margin, percentCompromised, chartData };
  }, [filteredTransactions]);

  const clusters = useMemo(() => {
    const vale = filteredTransactions.filter(t => {
      const day = new Date(t.date).getUTCDate(); 
      return day >= 15 && day <= 29;
    });
    const pag = filteredTransactions.filter(t => {
      const day = new Date(t.date).getUTCDate();
      return day >= 30 || (day >= 1 && day <= 14);
    });
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

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const renderTransactionRows = (items: Transaction[]) => {
      if(items.length === 0) return <div className="p-8 text-center text-slate-500 text-xs italic">Nenhuma transação neste período.</div>
      return (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
             {items.map(t => (
                 <div key={t.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                    <div className="flex items-center gap-4">
                        {t.type === 'INCOME' ? (
                            <div className="text-emerald-500 dark:text-emerald-400"><ArrowUpCircle className="w-6 h-6" /></div>
                        ) : (
                            <button onClick={() => onToggleStatus(t.id)} className="text-slate-400 hover:text-slate-600 dark:text-slate-600 dark:hover:text-white transition-colors">
                                {t.status === 'PAID' ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6" />}
                            </button>
                        )}
                        <div>
                            <p className={`font-bold text-sm ${t.status === 'PAID' && t.type !== 'INCOME' ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-white'}`}>{t.description}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">
                                <span>{new Date(t.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                                <span>•</span>
                                <span className="bg-slate-200 dark:bg-slate-800 px-1 rounded">{t.category}</span>
                                {t.linkedDebtId && <span className="flex items-center gap-1 text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-900/30 px-1 rounded border border-red-200 dark:border-red-900/50"><LinkIcon className="w-3 h-3" /> {debts.find(d => d.id === t.linkedDebtId)?.creditor || 'Dívida'}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-6 pl-10 md:pl-0">
                        <span className={`font-bold font-mono text-base ${t.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : t.type === 'SAVING' ? 'text-blue-600 dark:text-blue-300' : 'text-red-600 dark:text-red-400'}`}>
                            {t.type === 'EXPENSE' ? '- ' : '+ '}
                            R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(t)} className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-slate-700 rounded-sm"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => onDeleteTransaction(t.id)} className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-sm"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                 </div>
             ))}
          </div>
      );
  };

  return (
    <div className="space-y-8">
      {/* 1. Header & Quick Actions */}
      <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between transition-colors rounded-sm">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button onClick={() => setFilterMode('ALL')} className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors border border-slate-200 dark:border-slate-700 ${filterMode === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}>Geral</button>
            <button onClick={() => setFilterMode('MONTH')} className={`px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors border border-slate-200 dark:border-slate-700 ${filterMode === 'MONTH' ? 'bg-slate-900 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}>Mês</button>
          </div>
          {filterMode === 'MONTH' && (
            <div className="flex items-center gap-2">
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="border border-slate-200 dark:border-slate-700 p-2 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none">
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="border border-slate-200 dark:border-slate-700 p-2 w-20 text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none" />
            </div>
          )}
        </div>

        <button 
          onClick={onGenerateReport}
          disabled={isGeneratingReport}
          className="bg-red-600 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest flex items-center gap-3 hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg shadow-red-900/20"
        >
          {isGeneratingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {isGeneratingReport ? 'Processando IA...' : 'Imprimir Projeção Anual'}
        </button>
      </div>

      {/* 2. Summary Chart Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 transition-colors rounded-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
             <PieIcon className="w-5 h-5 text-slate-900 dark:text-white" />
             <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Análise de Comprometimento de Renda</h3>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-around gap-8">
              <div className="w-full md:w-1/3 h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={summaryStats.chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                        {summaryStats.chartData.map((entry, index) => {
                          let color = entry.name === 'Despesas' ? '#facc15' : entry.name === 'Poupança' ? '#3b82f6' : '#e2e8f0';
                          const isDark = document.documentElement.classList.contains('dark');
                          if (entry.name === 'Poupança') color = isDark ? '#f8fafc' : '#3b82f6';
                          if (entry.name === 'Margem Livre') color = isDark ? '#334155' : '#e2e8f0';
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
              </div>

              <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 border-l-4 border-slate-900 dark:border-white">
                      <div className="flex items-center gap-2 mb-1"><ArrowUpCircle className="w-4 h-4 text-slate-500" /><span className="text-xs font-bold uppercase text-slate-600">Receita</span></div>
                      <p className="text-lg font-bold">R$ {summaryStats.totalIncome.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-slate-800 p-4 border-l-4 border-yellow-500">
                      <div className="flex items-center gap-2 mb-1"><ArrowDownCircle className="w-4 h-4 text-yellow-600" /><span className="text-xs font-bold uppercase text-slate-600">Despesas</span></div>
                      <p className="text-lg font-bold text-yellow-700">R$ {summaryStats.totalExpense.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 border-l-4 border-slate-400">
                      <div className="flex items-center gap-2 mb-1"><PiggyBank className="w-4 h-4 text-slate-500" /><span className="text-xs font-bold uppercase text-slate-600">Poupança</span></div>
                      <p className="text-lg font-bold">R$ {summaryStats.totalSavings.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className={`p-4 border border-dashed text-center flex flex-col justify-center ${summaryStats.percentCompromised > 100 ? 'bg-yellow-50 border-yellow-300' : 'bg-slate-50 border-slate-300'}`}>
                      <span className="text-xs font-bold uppercase text-slate-500">Comprometido</span>
                      <p className={`text-xl font-black ${summaryStats.percentCompromised > 90 ? 'text-yellow-600' : 'text-slate-900 dark:text-white'}`}>{summaryStats.percentCompromised.toFixed(1)}%</p>
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 h-fit shadow-sm relative transition-colors rounded-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-slate-300 dark:bg-slate-700"></div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-tight">
            {editingId ? <Edit2 className="w-5 h-5 text-yellow-500" /> : <PlusCircle className="w-5 h-5" />} 
            {editingId ? 'Editar Transação' : 'Nova Transação'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label><input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="w-full border-b-2 border-slate-300 dark:border-slate-700 p-2 focus:border-slate-900 outline-none bg-slate-50 dark:bg-slate-950 font-medium text-slate-900 dark:text-white" /></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label><input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full border-b-2 border-slate-300 dark:border-slate-700 p-2 focus:border-slate-900 outline-none bg-slate-50 dark:bg-slate-950 font-medium text-slate-900 dark:text-white" placeholder="Ex: Salário, Aluguel..." /></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border-b-2 border-slate-300 dark:border-slate-700 p-2 focus:border-slate-900 outline-none bg-slate-50 dark:bg-slate-950 font-medium text-slate-900 dark:text-white" placeholder="0.00" /></div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setType('INCOME')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border transition-all ${type === 'INCOME' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>Receita</button>
              <button type="button" onClick={() => setType('EXPENSE')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border transition-all ${type === 'EXPENSE' ? 'bg-yellow-500 text-slate-900' : 'bg-slate-100 text-slate-500'}`}>Despesa</button>
              <button type="button" onClick={() => setType('SAVING')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border transition-all ${type === 'SAVING' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Poupança</button>
            </div>
            {type === 'EXPENSE' && (
               <div className="bg-slate-100 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2"><input type="checkbox" id="isDebtPayment" checked={isDebtPayment} onChange={(e) => setIsDebtPayment(e.target.checked)} className="w-4 h-4 text-yellow-500" /><label htmlFor="isDebtPayment" className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase cursor-pointer">Amortizar Dívida?</label></div>
                  {isDebtPayment && (
                    <div className="mt-2"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Selecione a Dívida</label><select value={selectedDebtId} onChange={(e) => setSelectedDebtId(e.target.value)} className="w-full border border-slate-300 p-2 text-sm bg-white dark:bg-slate-950"><option value="">-- Selecione --</option>{debts.map(d => <option key={d.id} value={d.id}>{d.creditor}</option>)}</select></div>
                  )}
               </div>
            )}
            <div className="flex gap-2 pt-4">
               {editingId && <button type="button" onClick={cancelEdit} className="flex-1 bg-slate-200 dark:bg-slate-800 py-3 font-bold uppercase text-xs">Cancelar</button>}
               <button type="submit" disabled={isSubmitting} className="flex-[2] bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 font-bold uppercase text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />)}
                {isSubmitting ? 'Salvando...' : (editingId ? 'Salvar' : 'Adicionar')}
              </button>
            </div>
          </form>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors rounded-sm">
                <div className="bg-slate-100 dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div><h4 className="font-bold text-slate-900 dark:text-white uppercase text-sm">Cluster: Vale</h4><p className="text-xs text-slate-500">Dia 15 ao 29</p></div>
                    <div className="text-right"><p className="text-[10px] uppercase font-bold text-slate-500">Saldo Realizado</p><span className={`font-mono font-bold ${clusters.vale.total >= 0 ? 'text-slate-900 dark:text-white' : 'text-yellow-600'}`}>R$ {clusters.vale.total.toLocaleString('pt-BR')}</span></div>
                </div>
                {renderTransactionRows(clusters.vale.list)}
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors rounded-sm">
                <div className="bg-slate-100 dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div><h4 className="font-bold text-slate-900 dark:text-white uppercase text-sm">Cluster: Pagamento</h4><p className="text-xs text-slate-500">Dia 30 ao 14</p></div>
                    <div className="text-right"><p className="text-[10px] uppercase font-bold text-slate-500">Saldo Realizado</p><span className={`font-mono font-bold ${clusters.pagamento.total >= 0 ? 'text-slate-900 dark:text-white' : 'text-yellow-600'}`}>R$ {clusters.pagamento.total.toLocaleString('pt-BR')}</span></div>
                </div>
                {renderTransactionRows(clusters.pagamento.list)}
            </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
