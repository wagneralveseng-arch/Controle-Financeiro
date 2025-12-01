import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { FinancialState, AIPlanResponse } from '../types';
import { Wallet, TrendingDown, TrendingUp, AlertTriangle, Calendar, ArrowUpCircle, ArrowDownCircle, Flame, Target } from 'lucide-react';

interface DashboardProps {
  state: FinancialState;
  plan: AIPlanResponse | null;
}

const Dashboard: React.FC<DashboardProps> = ({ state, plan }) => {
  const totalDebt = state.debts.reduce((acc, d) => acc + d.remainingAmount, 0);
  
  // --- Filter State for Monthly Performance ---
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(2025);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // --- Calculate Monthly Stats based on filter (CASH BASIS / REALIZED) ---
  const monthlyStats = useMemo(() => {
    const filtered = state.transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    // INCOME is usually considered reliable/projected, but expenses we now track by PAID status
    // For Dashboard, we likely want to see "Realized" to know current burn.
    const income = filtered.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'EXPENSE' && t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0);
    const result = income - expense;
    
    // For Burn Rate, we might want projected expense too? Let's stick to Realized as per user request.
    const projectedExpense = filtered.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);

    // Group by Category
    const categoryData: Record<string, number> = {};
    filtered.filter(t => t.type === 'EXPENSE' && t.status === 'PAID').forEach(t => {
       categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
    });
    const pieData = Object.keys(categoryData).map(k => ({ name: k, value: categoryData[k] }));

    // Daily Cash Flow Curve
    const dailyData: any[] = [];
    let runningBalance = 0; // Starts at 0 for the month view? Or cumulative? Let's show net flow accumulation.
    
    // Sort by day
    const sorted = [...filtered].sort((a,b) => new Date(a.date).getDate() - new Date(b.date).getDate());
    
    // Aggregate by day
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        const dayTransactions = sorted.filter(t => new Date(t.date).getDate() === i);
        const dayIncome = dayTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const dayExpense = dayTransactions.filter(t => t.type === 'EXPENSE' && t.status === 'PAID').reduce((s, t) => s + t.amount, 0);
        
        runningBalance += (dayIncome - dayExpense);
        dailyData.push({ day: i, balance: runningBalance });
    }

    return { income, expense, result, projectedExpense, pieData, dailyData };
  }, [state.transactions, selectedMonth, selectedYear]);

  // --- Chart Data (AI Plan) ---
  const chartData = plan ? plan.projections.slice(0, 12).map(p => ({
    ...p,
    totalDebtPay: p.debtPayments.reduce((sum, pay) => sum + pay.amount, 0)
  })) : [];

  const burnRate = monthlyStats.income > 0 ? (monthlyStats.expense / monthlyStats.income) * 100 : 0;
  const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#dc2626'];

  return (
    <div className="space-y-8">
      
      {/* 1. Month/Year Filter */}
      <div className="bg-white p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-slate-700 font-bold uppercase tracking-wider text-sm">
           <Calendar className="w-5 h-5" />
           Inteligência Financeira Mensal
        </div>
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
      </div>

      {/* 2. Intelligence Unit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 border-l-4 border-slate-900 shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Receita Total</p>
                 <ArrowUpCircle className="w-4 h-4 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">R$ {monthlyStats.income.toLocaleString('pt-BR', {minimumFractionDigits: 0})}</h3>
        </div>

        <div className="bg-white p-6 border-l-4 border-red-600 shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Despesa Realizada</p>
                 <ArrowDownCircle className="w-4 h-4 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-red-600">R$ {monthlyStats.expense.toLocaleString('pt-BR', {minimumFractionDigits: 0})}</h3>
            {monthlyStats.projectedExpense > monthlyStats.expense && (
                <p className="text-[10px] text-slate-400 mt-1">De R$ {monthlyStats.projectedExpense.toLocaleString('pt-BR', {minimumFractionDigits:0})} previstos</p>
            )}
        </div>

        <div className="bg-white p-6 border-l-4 border-slate-500 shadow-sm">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resultado Operacional</p>
                 <Wallet className="w-4 h-4 text-slate-300" />
            </div>
            <h3 className={`text-xl font-bold ${monthlyStats.result >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                {monthlyStats.result >= 0 ? '+' : ''}R$ {monthlyStats.result.toLocaleString('pt-BR', {minimumFractionDigits: 0})}
            </h3>
        </div>

        <div className="bg-slate-900 p-6 shadow-sm text-white">
             <div className="flex justify-between items-start mb-2">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Burn Rate (Queima)</p>
                 <Flame className={`w-4 h-4 ${burnRate > 90 ? 'text-red-500' : 'text-slate-400'}`} />
            </div>
            <h3 className="text-xl font-bold text-white">{burnRate.toFixed(1)}%</h3>
            <div className="w-full bg-slate-700 h-1 mt-3">
                <div className={`h-1 ${burnRate > 100 ? 'bg-red-600' : 'bg-white'}`} style={{ width: `${Math.min(burnRate, 100)}%` }}></div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Narrative Box */}
        <div className="bg-white p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Análise Sintética</h4>
            <p className="text-lg font-medium text-slate-800 leading-snug">
                {monthlyStats.result < 0 
                  ? "Atenção: Você está operando em Déficit Crítico. Aumente a receita ou corte despesas imediatamente para não consumir a reserva." 
                  : monthlyStats.expense === 0 
                  ? "Mês iniciado. Aguardando execução de pagamentos para análise de liquidez."
                  : "Superávit Operacional detectado. O excedente deve ser alocado integralmente para amortização de passivos (dívidas) conforme a regra de ouro."}
            </p>
        </div>

        {/* Daily Cash Curve */}
        <div className="bg-white p-6 border border-slate-200 shadow-sm lg:col-span-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Curva de Liquidez Diária (Realizado)</h4>
            <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyStats.dailyData}>
                        <defs>
                            <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="day" hide />
                        <YAxis hide />
                        <Tooltip />
                        <Area type="step" dataKey="balance" stroke="#0f172a" strokeWidth={2} fill="url(#colorFlow)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* 3. Global Overview Cards */}
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-l-4 border-slate-900 pl-3 pt-2">Visão Geral da Carteira</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Global Balance */}
        <div className="bg-white p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Disponível (Total)</p>
            <h3 className={`text-2xl font-bold mt-1 ${state.currentBalance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
              R$ {state.currentBalance.toLocaleString('pt-BR')}
            </h3>
          </div>
          <div className="p-3 bg-slate-100 rounded-full">
            <Wallet className="w-6 h-6 text-slate-400" />
          </div>
        </div>

        {/* Global Debt */}
        <div className="bg-red-600 p-6 shadow-sm flex items-center justify-between text-white">
          <div>
            <p className="text-xs font-bold text-red-200 uppercase tracking-wider">Passivo Total</p>
            <h3 className="text-2xl font-bold mt-1 text-white">R$ {totalDebt.toLocaleString('pt-BR')}</h3>
          </div>
          <div className="p-3 bg-red-700 rounded-full">
            <TrendingDown className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Forecast */}
        <div className="bg-white p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zero Dívida (Est.)</p>
            <h3 className="text-2xl font-bold mt-1 text-slate-900">
              {plan ? plan.estimatedDebtFreeDate : '--/--'}
            </h3>
          </div>
          <div className="p-3 bg-slate-100 rounded-full">
            <Target className="w-6 h-6 text-slate-600" />
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Projection */}
        <div className="bg-white p-6 shadow-sm border border-slate-200 min-h-[400px]">
          <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider">Projeção de Fluxo de Caixa (12 Meses)</h3>
          {!plan ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 pb-12">
              <AlertTriangle className="w-12 h-12 mb-2 text-slate-300" />
              <p>Gere um plano para ver as projeções</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="monthLabel" fontSize={10} tickMargin={10} stroke="#94a3b8" />
                <YAxis fontSize={10} stroke="#94a3b8" />
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', color: '#0f172a' }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Saldo']}
                />
                <Area type="monotone" dataKey="closingBalance" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorBal)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Debt Payoff Structure */}
        <div className="bg-white p-6 shadow-sm border border-slate-200 min-h-[400px]">
          <h3 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider">Alocação de Pagamentos</h3>
          {!plan ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 pb-12">
              <p>Gere um plano para ver a alocação</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="monthLabel" fontSize={10} tickMargin={10} stroke="#94a3b8" />
                <YAxis fontSize={10} stroke="#94a3b8" />
                <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}
                />
                <Legend iconType="square" />
                <Bar dataKey="totalIncome" name="Renda" fill="#cbd5e1" />
                <Bar 
                  dataKey="totalDebtPay" 
                  name="Pgto Dívida" 
                  fill="#dc2626" 
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      
      {plan && (
        <div className="bg-slate-900 p-8 rounded-none border border-slate-900 text-white">
           <h3 className="text-lg font-bold mb-4 uppercase tracking-widest border-b border-slate-700 pb-2">Sumário Executivo</h3>
           <p className="text-slate-300 leading-relaxed whitespace-pre-line font-light">{plan.strategySummary}</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;