import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { FinancialState, AIPlanResponse } from '../types';
import { Wallet, TrendingDown, ArrowUpCircle, ArrowDownCircle, Flame, Calendar, Filter, PiggyBank, CalendarClock, BarChart3 } from 'lucide-react';

interface DashboardProps {
  state: FinancialState;
  plan: AIPlanResponse | null;
}

const Dashboard: React.FC<DashboardProps> = ({ state, plan }) => {
  // --- Filter State ---
  const [filterMode, setFilterMode] = useState<'ALL' | 'MONTH'>('MONTH');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // --- 1. SPECIAL DATA FOR MAIN CHART (HISTORY/PROJECTION) ---
  // This data ignores the filters to show the full timeline evolution of Expenses/Savings
  const historyData = useMemo(() => {
    const groups: Record<string, any> = {};

    state.transactions.forEach(t => {
      // Use UTC to avoid timezone shifts
      const d = new Date(t.date);
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth();
      const key = `${year}-${String(month).padStart(2, '0')}`; // Sortable Key YYYY-MM

      if (!groups[key]) {
         groups[key] = {
           sortKey: key,
           name: `${months[month].substring(0, 3)}/${year.toString().slice(2)}`, // Label: Jan/25
           'Despesas Pagas': 0,
           'Despesas Pendentes': 0,
           'Poupança': 0
         };
      }

      if (t.type === 'EXPENSE') {
         if (t.status === 'PAID') groups[key]['Despesas Pagas'] += t.amount;
         else groups[key]['Despesas Pendentes'] += t.amount;
      } else if (t.type === 'SAVING') {
         groups[key]['Poupança'] += t.amount;
      }
    });

    // Convert to array and sort by date key
    return Object.values(groups).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey));
  }, [state.transactions]); // Dependencies: Only transactions, NOT filters


  // --- 2. Calculate Metrics based on filter (For other cards/charts) ---
  const stats = useMemo(() => {
    let filteredTransactions = state.transactions;
    
    if (filterMode === 'MONTH') {
      filteredTransactions = state.transactions.filter(t => {
        // Use UTC to avoid timezone issues
        const d = new Date(t.date);
        return d.getUTCMonth() === selectedMonth && d.getUTCFullYear() === selectedYear;
      });
    }

    // Allocation Data (Donut)
    const expensesPaid = filteredTransactions.filter(t => t.type === 'EXPENSE' && t.status === 'PAID').reduce((sum, t) => sum + t.amount, 0);
    const expensesPending = filteredTransactions.filter(t => t.type === 'EXPENSE' && t.status === 'PENDING').reduce((sum, t) => sum + t.amount, 0);
    const savings = filteredTransactions.filter(t => t.type === 'SAVING').reduce((sum, t) => sum + t.amount, 0);

    const allocationData = [
      { name: 'Despesas Pagas', value: expensesPaid },
      { name: 'Despesas Pendentes', value: expensesPending },
      { name: 'Poupança', value: savings }
    ].filter(d => d.value > 0);

    // Liabilities Logic
    const totalOpenDebt = state.debts.reduce((acc, d) => acc + d.remainingAmount, 0);
    
    // Calculate how much was paid in the filtered period
    const debtPaymentsInPeriod = filteredTransactions
      .filter(t => t.type === 'EXPENSE' && t.status === 'PAID' && (t.linkedDebtId || t.category === 'Dívida' || t.description.toLowerCase().includes('dívida') || t.description.toLowerCase().includes('parcelamento')))
      .reduce((acc, t) => acc + t.amount, 0);

    const debtDonutData = [
       { name: 'Em Aberto', value: totalOpenDebt },
       { name: 'Amortizado', value: debtPaymentsInPeriod }
    ];

    // Debt Schedule Timeline (Bar Chart)
    const debtTransactions = filteredTransactions.filter(t => 
       t.type === 'EXPENSE' && 
       (t.linkedDebtId || t.category === 'Dívida' || t.description.toLowerCase().includes('dívida') || t.description.toLowerCase().includes('parcelamento'))
    );

    let timelineData = [];

    if (filterMode === 'MONTH') {
        // Group by Day (1..31)
        const dayMap: Record<number, number> = {};
        debtTransactions.forEach(t => {
            const day = new Date(t.date).getUTCDate();
            dayMap[day] = (dayMap[day] || 0) + t.amount;
        });
        
        timelineData = Object.keys(dayMap)
            .map(day => ({ 
                name: `Dia ${day.padStart(2, '0')}`, 
                sortKey: parseInt(day), 
                Valor: dayMap[parseInt(day)] 
            }))
            .sort((a, b) => a.sortKey - b.sortKey);

    } else {
        // Group by Month (0..11)
        const monthMap: Record<number, number> = {};
        debtTransactions.forEach(t => {
            const month = new Date(t.date).getUTCMonth();
            monthMap[month] = (monthMap[month] || 0) + t.amount;
        });

        timelineData = Object.keys(monthMap)
            .map(mIdx => ({ 
                name: months[parseInt(mIdx)].substring(0, 3), // Jan, Fev...
                sortKey: parseInt(mIdx), 
                Valor: monthMap[parseInt(mIdx)] 
            }))
            .sort((a, b) => a.sortKey - b.sortKey);
    }

    return {
      expensesPaid,
      expensesPending,
      savings,
      allocationData,
      debtDonutData,
      debtPaymentsInPeriod,
      totalOpenDebt,
      timelineData
    };
  }, [state.transactions, state.debts, filterMode, selectedMonth, selectedYear]);

  // Colors for Dark Mode (YELLOW / GRAY / WHITE Palette)
  const COLOR_EXPENSE_PAID = '#475569'; // Slate 600 (Neutral/Gray)
  const COLOR_EXPENSE_PENDING = '#facc15'; // Yellow 400 (Attention/Warning)
  const COLOR_SAVING = '#f8fafc'; // Slate 50 (White/Bright)

  return (
    <div className="space-y-8">
      
      {/* 1. Filter Bar (Affects cards below, NOT the first chart) */}
      <div className="bg-slate-900 p-4 border border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-wider text-sm">
             <Filter className="w-5 h-5" />
             Filtros de Análise (Métricas)
           </div>
           <div className="flex gap-2">
              <button 
                onClick={() => setFilterMode('ALL')}
                className={`px-3 py-1 text-xs font-bold uppercase border border-slate-700 ${filterMode === 'ALL' ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
              >
                Geral
              </button>
              <button 
                onClick={() => setFilterMode('MONTH')}
                className={`px-3 py-1 text-xs font-bold uppercase border border-slate-700 ${filterMode === 'MONTH' ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
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
              className="border border-slate-700 p-2 text-sm font-medium bg-slate-950 text-white outline-none focus:border-white min-w-[120px]"
            >
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <input 
              type="number" 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-slate-700 p-2 w-24 text-sm font-medium bg-slate-950 text-white outline-none focus:border-white"
            />
          </div>
        )}
      </div>

      {/* 2. Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: Timeline Evolution (Projected Expenses) */}
        {/* THIS CHART IS INDEPENDENT OF FILTERS */}
        <div className="bg-slate-900 p-6 shadow-sm border border-slate-800 min-h-[350px]">
           <div className="flex justify-between items-start mb-6">
               <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                 <BarChart3 className="w-4 h-4" /> Evolução de Saídas (Histórico & Projetado)
               </h3>
               <span className="text-[10px] text-slate-500 bg-slate-950 px-2 py-1 border border-slate-800 rounded">
                 Todos os Meses
               </span>
           </div>
           
           {historyData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-slate-500 text-xs italic">
                    Sem dados para projeção.
                </div>
            ) : (
               <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={historyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
                    <YAxis fontSize={12} stroke="#94a3b8" />
                    <Tooltip 
                       cursor={{fill: '#1e293b'}}
                       contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                       formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                    />
                    <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                    
                    {/* Stack Output: Paid Expense, Pending Expense, Savings */}
                    <Bar dataKey="Despesas Pagas" stackId="b" fill={COLOR_EXPENSE_PAID} barSize={40} />
                    <Bar dataKey="Despesas Pendentes" stackId="b" fill={COLOR_EXPENSE_PENDING} barSize={40} />
                    <Bar dataKey="Poupança" stackId="b" fill={COLOR_SAVING} barSize={40} />
                  </BarChart>
               </ResponsiveContainer>
            )}
        </div>

        {/* CHART 2: Allocation (Expenses vs Savings) - AFFECTED BY FILTER */}
        <div className="bg-slate-900 p-6 shadow-sm border border-slate-800 min-h-[350px]">
           <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
             <ArrowDownCircle className="w-4 h-4" /> Alocação de Recursos ({filterMode === 'ALL' ? 'Geral' : `${months[selectedMonth]}`})
           </h3>
           <div className="flex items-center justify-center h-[250px]">
             {stats.allocationData.length === 0 ? (
               <p className="text-slate-500 text-xs italic">Sem saídas registradas neste período.</p>
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
                      stroke="none"
                    >
                      {stats.allocationData.map((entry, index) => {
                         let color;
                         if (entry.name === 'Despesas Pagas') color = COLOR_EXPENSE_PAID;
                         else if (entry.name === 'Despesas Pendentes') color = COLOR_EXPENSE_PENDING;
                         else color = COLOR_SAVING; // Savings
                         return <Cell key={`cell-${index}`} fill={color} />
                      })}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                        formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} 
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#cbd5e1' }} />
                  </PieChart>
               </ResponsiveContainer>
             )}
           </div>
        </div>
      </div>
      
      {/* 3. Debt Specific Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CHART 3: Liabilities Donut */}
        <div className="bg-slate-900 p-6 shadow-sm border border-slate-800 min-h-[350px]">
           <div className="flex flex-col justify-between items-start mb-6">
               <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                 <Wallet className="w-4 h-4" /> Volume de Passivos (Dívidas)
               </h3>
               <div className="text-xs font-medium text-slate-400 mt-2">
                  <span className="mr-3">Amortizado ({filterMode === 'ALL' ? 'Total' : 'Mês'}): <strong className="text-white">R$ {stats.debtPaymentsInPeriod.toLocaleString('pt-BR')}</strong></span>
                  <span>Em Aberto Total: <strong className="text-yellow-500">R$ {stats.totalOpenDebt.toLocaleString('pt-BR')}</strong></span>
               </div>
           </div>
           
           <div className="h-[200px]">
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
                    stroke="none"
                  >
                     {/* 0: Open (Yellow), 1: Amortized (Gray) */}
                     <Cell fill={COLOR_EXPENSE_PENDING} />
                     <Cell fill={COLOR_EXPENSE_PAID} />
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} 
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#cbd5e1' }} />
                </PieChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* CHART 4: Debt Payment Timeline (NEW) */}
        <div className="bg-slate-900 p-6 shadow-sm border border-slate-800 min-h-[350px]">
            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                <CalendarClock className="w-4 h-4" /> Cronograma de Pagamentos
            </h3>
            {stats.timelineData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-slate-500 text-xs italic">
                    Nenhum pagamento de dívida programado neste período.
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats.timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
                        <YAxis fontSize={10} stroke="#94a3b8" tickFormatter={(val) => `R$${val}`} width={60} />
                        <Tooltip 
                            cursor={{fill: '#1e293b'}}
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Valor Pago/Prog.']}
                        />
                        <Bar dataKey="Valor" fill={COLOR_EXPENSE_PENDING} barSize={30} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;