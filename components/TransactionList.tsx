import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { PlusCircle, Trash2, Edit2, Filter, Calendar, Save, Repeat, Check, Circle, CheckCircle2, ShieldCheck } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onAddTransaction: (t: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[]) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onToggleStatus: (id: string) => void;
  onDeleteTransaction: (id: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onAddTransaction, onUpdateTransaction, onToggleStatus, onDeleteTransaction }) => {
  // --- Filtering State ---
  const [filterMode, setFilterMode] = useState<'ALL' | 'MONTH'>('MONTH');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(2025);

  // --- Form State ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  
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
    setIsRecurring(false); // Default to false, user can enable if they want to generate future copies from this edit
    setRecurrenceEndMonth('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDesc('');
    setAmount('');
    setDateStr(new Date().toISOString().split('T')[0]);
    setIsRecurring(false);
    setRecurrenceEndMonth('');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount || !dateStr) return;

    const baseData = {
      description: desc,
      amount: parseFloat(amount),
      type,
      category: 'General',
      status: 'PENDING' as const // Default new transactions to PENDING
    };

    const endDate = isRecurring && recurrenceEndMonth 
      ? new Date(parseInt(recurrenceEndMonth.split('-')[0]), parseInt(recurrenceEndMonth.split('-')[1]), 0) 
      : null;

    if (editingId) {
      // 1. Update the existing transaction
      const existing = transactions.find(t => t.id === editingId);
      onUpdateTransaction({ 
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
          onAddTransaction(futureTransactions);
        }
      }
      
      setEditingId(null);
    } else {
      // Creating New
      if (isRecurring && endDate) {
        // Generate current + future
        const allTransactions = generateRecurringTransactions(baseData, new Date(dateStr), endDate);
        onAddTransaction(allTransactions);
      } else {
        // Single Transaction
        onAddTransaction({
          ...baseData,
          date: new Date(dateStr).toISOString(),
        });
      }
    }

    // Reset Form
    setDesc('');
    setAmount('');
    setIsRecurring(false);
    setRecurrenceEndMonth('');
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

  // --- Clustering Logic (Vale vs Pagamento) ---
  const clusters = useMemo(() => {
    // Pagamento: Dia 30 a 14 (virada do mês)
    // Consideramos no "Cluster Pagamento" do mês visualizado: dias 1-14 e dias 30-31
    const pag = filteredTransactions.filter(t => {
      const day = new Date(t.date).getDate();
      return day >= 30 || (day >= 1 && day <= 14);
    });
    
    // Vale: Dia 15 a 29
    const vale = filteredTransactions.filter(t => {
      const day = new Date(t.date).getDate();
      return day >= 15 && day <= 29;
    });

    // IMPORTANT: Only subtract expenses if they are PAID. Add all INCOME automatically.
    const calcRealizedTotal = (list: Transaction[]) => list.reduce((acc, t) => {
        if (t.type === 'INCOME') return acc + t.amount;
        if (t.type === 'EXPENSE' && t.status === 'PAID') return acc - t.amount;
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 2. Input/Edit Form */}
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
                placeholder="Ex: Salário, Aluguel..."
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
            
            <div className="flex gap-4 pt-2">
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
            </div>

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
                className="flex-[2] bg-slate-900 text-white py-3 font-bold uppercase text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                {editingId ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                {editingId 
                  ? (isRecurring ? 'Salvar & Gerar Futuros' : 'Salvar Alterações') 
                  : (isRecurring ? 'Gerar Transações' : 'Adicionar')
                }
              </button>
            </div>
          </form>
        </div>

        {/* 3. Transaction List (Clustered) */}
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
                        <span className="text-[10px] ml-2 text-slate-400 font-normal uppercase">(Líquido)</span>
                    </div>
                </div>
                <TransactionTable 
                  transactions={clusters.pagamento.list} 
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
                        <span className="text-[10px] ml-2 text-slate-400 font-normal uppercase">(Líquido)</span>
                    </div>
                </div>
                <TransactionTable 
                  transactions={clusters.vale.list} 
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
const TransactionTable: React.FC<{ transactions: Transaction[], onEdit: (t: Transaction) => void, onToggleStatus: (id: string) => void, onDelete: (id: string) => void }> = ({ transactions, onEdit, onToggleStatus, onDelete }) => {
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
                        const isExpense = t.type === 'EXPENSE';
                        const isPaid = t.status === 'PAID';
                        
                        // NEW LOGIC: Paid = Dimmed/Strikethrough. Pending = Clear.
                        // Only dim if it IS paid and IS expense (Income always clear)
                        const isCompleted = isExpense && isPaid;

                        return (
                            <tr key={t.id} className={`hover:bg-slate-50 group transition-all ${isCompleted ? 'opacity-50 hover:opacity-80' : ''}`}>
                                <td className="py-3 px-4 text-center">
                                    {isExpense ? (
                                      <button 
                                        onClick={() => onToggleStatus(t.id)}
                                        className={`p-1 rounded-full transition-colors ${
                                          isPaid 
                                            ? 'text-slate-400 hover:bg-slate-100' // Paid icon
                                            : 'text-slate-900 hover:text-slate-700 hover:bg-slate-200' // Pending icon (active)
                                        }`}
                                        title={isPaid ? "Desmarcar" : "Marcar como Pago"}
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
                                </td>
                                <td className={`py-3 px-4 text-right font-bold ${
                                  !isExpense 
                                    ? 'text-slate-900' 
                                    : (isPaid 
                                        ? 'text-slate-400 line-through decoration-slate-300' // Paid Expense
                                        : 'text-red-600') // Pending Expense
                                }`}>
                                    {!isExpense ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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