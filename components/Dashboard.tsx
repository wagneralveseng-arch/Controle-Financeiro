import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { FinancialState, AIPlanResponse } from '../types';
import { Wallet, TrendingDown, ArrowUpCircle, ArrowDownCircle, Flame, Calendar, Filter, PiggyBank } from 'lucide-react';

interface DashboardProps {
  state: FinancialState;
  plan: AIPlanResponse | null;
}

const Dashboard: React.FC<DashboardProps> = ({ state, plan }) => {
  // --- Filter State ---
  const [filterMode, setFilterMode] = useState<'ALL' | 'MONTH'>('MONTH');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(2025);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // --- Calculate Metrics based on filter ---
  const stats = useMemo(() => {
    let filteredTransactions = state.transactions;
    
    if (filterMode === 'MONTH') {
      filteredTransactions = state.transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });
    }

    // 1. Stacked Bar Data
    const income = filteredTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const expensesPaid = filteredTransactions.filter(t => t.type === 'EXPENSE' && t.status === 'PAID').reduce((sum, t) => sum + t.amount, 0);
    const expensesPending = filteredTransactions.filter(t => t.type === 'EXPENSE' && t.status === 'PENDING').reduce((sum, t) => sum + t.amount, 0);
    const savings = filteredTransactions.filter(t => t.type === 'SAVING').reduce((sum, t) => sum + t.amount, 0);

    const stackedData = [
      {
        name: filterMode === 'ALL' ? 'Geral' : months[selectedMonth],
        Receitas: income,
        'Despesas Pagas': expensesPaid,
        'Despesas Pendentes': expensesPending,
        'Poupança': savings
      }
    ];

    // 2. Donut: Allocation (Where is money going?)
    const allocationData = [
      { name: 'Despesas Pagas', value: expensesPaid },
      { name: 'Despesas Pendentes', value: expensesPending },
      { name: 'Poupança', value: savings }
    ].filter(d => d.value > 0);

    // 3. Donut: Liabilities (Debt)
    const totalOpenDebt = state.debts.reduce((acc, d) => acc + d.remainingAmount, 0);
    
    // Calculate how much was paid in the filtered period
    const debtPaymentsInPeriod = filteredTransactions
      .filter(t => t.type === 'EXPENSE' && t.status === 'PAID' && (t.category === 'Dívida' || t.description.toLowerCase().includes('dívida') || t.description.toLowerCase().includes('parcelamento')))
      .reduce((acc, t) => acc + t.amount, 0);

    const debtDonutData = [
       { name: 'Em Aberto', value: totalOpenDebt },
       { name: 'Amortizado', value: debtPaymentsInPeriod }
    ];

    return {
      income,
      expensesPaid,
      expensesPending,
      savings,
      stackedData,
      allocationData,
      debtDonutData,
      debtPaymentsInPeriod,
      totalOpenDebt
    };
  }, [state.transactions, state.debts, filterMode, selectedMonth, selectedYear]);

  // Colors
  const COLORS_ALLOCATION = ['#0f172a', '#dc2626', '#2563eb']; // Paid (Dark), Pending (Red), Savings (Blue)

  return (
    <div className="space-y-8">
      
      {/* 1. Filter Bar */}
      <div className="bg-white p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-slate-700 font-bold uppercase tracking-wider text-sm">
             <Filter className="w-5 h-5" />
             Filtros de Análise
           </div>
           <div className="flex gap-2">
              <button 
                onClick={() => setFilterMode('ALL')}
                className={`px-3 py-1 text-xs font-bold uppercase ${filterMode === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                Geral
              </button>
              <button 
                onClick={() => setFilterMode('MONTH')}
                className={`px-3 py-1 text-xs font-bold uppercase ${filterMode === 'MONTH' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                Mês
              </button>
           </div>
        </div>

        {filterMode === 'MONTH' && (
          <div className="flex items-center gap-2">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border border-slate-300 p-2 text-sm font-medium bg-white outline-none focus:border-slate-900 min-w-[120px]"
            >
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <input 
              type="number" 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-slate-300 p-2 w-24 text-sm font-medium bg-white outline-none focus:border-slate-900"
            />
          </div>
        )}
      </div>

      {/* 2. Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: Stacked Bar (Income vs Expense+Savings) */}
        <div className="bg-white p-6 shadow-sm border border-slate-200 min-h-[350px]">
           <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider flex items-center gap-2">
             <ArrowUpCircle className="w-4 h-4" /> Fluxo: Receitas vs Saídas
           </h3>
           <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.stackedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
                <YAxis fontSize={12} stroke="#94a3b8" />
                <Tooltip 
                   cursor={{fill: '#f8fafc'}}
                   contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}
                   formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                />
                <Legend />
                <Bar dataKey="Receitas" fill="#0f172a" stackId="a" barSize={50} />
                
                {/* Stack Output: Paid Expense, Pending Expense, Savings */}
                <Bar dataKey="Despesas Pagas" stackId="b" fill="#334155" barSize={50} />
                <Bar dataKey="Despesas Pendentes" stackId="b" fill="#dc2626" barSize={50} />
                <Bar dataKey="Poupança" stackId="b" fill="#2563eb" barSize={50} />
              </BarChart>
           </ResponsiveContainer>
        </div>

        {/* CHART 2: Allocation (Expenses vs Savings) */}
        <div className="bg-white p-6 shadow-sm border border-slate-200 min-h-[350px]">
           <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider flex items-center gap-2">
             <ArrowDownCircle className="w-4 h-4" /> Alocação de Recursos
           </h3>
           <div className="flex items-center justify-center h-[250px]">
             {stats.allocationData.length === 0 ? (
               <p className="text-slate-400 text-xs italic">Sem saídas registradas.</p>
             ) : (
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.allocationData.map((entry, index) => {
                         let color;
                         if (entry.name === 'Despesas Pagas') color = '#334155';
                         else if (entry.name === 'Despesas Pendentes') color = '#dc2626';
                         else color = '#2563eb'; // Savings
                         return <Cell key={`cell-${index}`} fill={color} />
                      })}
                    </Pie>
                    <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
               </ResponsiveContainer>
             )}
           </div>
        </div>

        {/* CHART 3: Liabilities Donut */}
        <div className="bg-white p-6 shadow-sm border border-slate-200 min-h-[350px] lg:col-span-2">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
               <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                 <Wallet className="w-4 h-4" /> Volume de Passivos (Dívidas)
               </h3>
               <div className="text-xs font-medium text-slate-500">
                  <span className="mr-3">Amortizado no Período: <strong className="text-slate-900">R$ {stats.debtPaymentsInPeriod.toLocaleString('pt-BR')}</strong></span>
                  <span>Em Aberto Total: <strong className="text-red-600">R$ {stats.totalOpenDebt.toLocaleString('pt-BR')}</strong></span>
               </div>
           </div>
           
           <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/2 h-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.debtDonutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                         {/* 0: Open (Red), 1: Amortized (Dark) */}
                         <Cell fill="#dc2626" />
                         <Cell fill="#0f172a" />
                      </Pie>
                      <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-4">
                  <div className="p-4 bg-slate-50 border-l-4 border-red-600">
                      <p className="text-xs uppercase text-slate-500 font-bold">Passivo Pendente</p>
                      <p className="text-xl font-bold text-red-600">R$ {stats.totalOpenDebt.toLocaleString('pt-BR')}</p>
                      <p className="text-[10px] text-slate-400 mt-1">Total que ainda precisa ser quitado.</p>
                  </div>
                  <div className="p-4 bg-slate-50 border-l-4 border-slate-900">
                      <p className="text-xs uppercase text-slate-500 font-bold">Esforço de Caixa (Amortização)</p>
                      <p className="text-xl font-bold text-slate-900">R$ {stats.debtPaymentsInPeriod.toLocaleString('pt-BR')}</p>
                      <p className="text-[10px] text-slate-400 mt-1">Valor alocado para dívidas no filtro selecionado.</p>
                  </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;