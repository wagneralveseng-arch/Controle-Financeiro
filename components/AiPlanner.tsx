import React, { useState } from 'react';
import { FinancialState, AIPlanResponse } from '../types';
import { generateZeroDebtPlan } from '../services/geminiService';
import { Bot, CheckCircle, FileText, Loader2, PlayCircle, Wallet, TrendingDown, Target, Layout } from 'lucide-react';

interface AiPlannerProps {
  state: FinancialState;
  onPlanGenerated: (plan: AIPlanResponse) => void;
  currentPlan: AIPlanResponse | null;
}

const AiPlanner: React.FC<AiPlannerProps> = ({ state, onPlanGenerated, currentPlan }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'OVERVIEW' | 'STRATEGY'>('OVERVIEW');

  const totalDebt = state.debts.reduce((acc, d) => acc + d.remainingAmount, 0);

  const handleGeneratePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const plan = await generateZeroDebtPlan(state);
      onPlanGenerated(plan);
      setSubTab('STRATEGY'); // Switch to strategy view after generation
    } catch (err) {
      setError("Falha ao gerar o plano. Verifique a API Key ou tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sub Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900">
         <button 
           onClick={() => setSubTab('OVERVIEW')}
           className={`px-6 py-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${subTab === 'OVERVIEW' ? 'border-white text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
         >
            <Wallet className="w-4 h-4" /> Visão Geral da Carteira
         </button>
         <button 
           onClick={() => setSubTab('STRATEGY')}
           className={`px-6 py-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${subTab === 'STRATEGY' ? 'border-red-600 text-red-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
         >
            <Bot className="w-4 h-4" /> Estratégia IA
         </button>
      </div>

      {subTab === 'OVERVIEW' && (
        <div className="animate-in fade-in duration-300">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Global Balance */}
                <div className="bg-slate-900 p-6 border border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Disponível (Total)</p>
                    <h3 className={`text-2xl font-bold mt-1 ${state.currentBalance < 0 ? 'text-red-500' : 'text-white'}`}>
                    R$ {state.currentBalance.toLocaleString('pt-BR')}
                    </h3>
                </div>
                <div className="p-3 bg-slate-800 rounded-full">
                    <Wallet className="w-6 h-6 text-slate-400" />
                </div>
                </div>

                {/* Global Debt */}
                <div className="bg-red-900/20 p-6 border border-red-900/50 shadow-sm flex items-center justify-between text-white">
                <div>
                    <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Passivo Total</p>
                    <h3 className="text-2xl font-bold mt-1 text-red-100">R$ {totalDebt.toLocaleString('pt-BR')}</h3>
                </div>
                <div className="p-3 bg-red-900/50 rounded-full">
                    <TrendingDown className="w-6 h-6 text-red-400" />
                </div>
                </div>

                {/* Forecast */}
                <div className="bg-slate-900 p-6 border border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Zero Dívida (Est.)</p>
                    <h3 className="text-2xl font-bold mt-1 text-white">
                    {currentPlan ? currentPlan.estimatedDebtFreeDate : '--/--'}
                    </h3>
                </div>
                <div className="p-3 bg-slate-800 rounded-full">
                    <Target className="w-6 h-6 text-slate-400" />
                </div>
                </div>
            </div>
            
            <div className="mt-8 bg-slate-950 p-8 text-center border border-slate-800 border-dashed">
                <Layout className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-white font-bold uppercase tracking-wider">Gestão Global</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-lg mx-auto">
                    Utilize esta aba para monitorar os grandes números da sua saúde financeira. 
                    Para ações táticas, alterne para a aba "Estratégia IA".
                </p>
            </div>
        </div>
      )}

      {subTab === 'STRATEGY' && (
          <div className="animate-in fade-in duration-300 space-y-8">
            <div className="bg-slate-900 p-8 shadow-lg text-white relative overflow-hidden border-l-8 border-red-600">
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3 tracking-tight">
                    <Bot className="w-8 h-8 text-white" />
                    ANÁLISE DE INTELIGÊNCIA
                    </h2>
                    <p className="text-slate-400 mt-2 max-w-xl text-sm leading-relaxed">
                    O motor de IA irá processar as datas das transações e agrupar o fluxo de caixa entre <strong>Pagamento (01-14)</strong> e <strong>Vale (15-31)</strong> para garantir liquidez e alocar o excedente (Fluxo de Caixa Livre) para quitação das dívidas.
                    </p>
                </div>
                <button
                    onClick={handleGeneratePlan}
                    disabled={loading}
                    className={`px-8 py-4 font-bold uppercase tracking-wider text-xs transition-all flex items-center gap-3 border ${loading ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed' : 'bg-white text-slate-900 border-white hover:bg-slate-200'}`}
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                    {loading ? 'Processando Dados...' : 'EXECUTAR PLANO AGORA'}
                </button>
                </div>
                
                {error && (
                <div className="mt-6 p-4 bg-red-900/50 border border-red-800 text-red-200 text-sm font-medium">
                    {error}
                </div>
                )}
            </div>

            {currentPlan && (
                <div className="bg-slate-900 shadow-sm border border-slate-800">
                    <div className="p-6 border-b border-slate-800 bg-slate-950 flex items-center gap-3">
                        <FileText className="w-5 h-5 text-white" />
                        <h3 className="font-bold text-white uppercase tracking-wider text-sm">Plano de Execução Tático</h3>
                    </div>
                    
                    {/* Summary */}
                    <div className="p-6 border-b border-slate-800">
                       <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Resumo Executivo</h4>
                       <p className="text-slate-300 leading-relaxed whitespace-pre-line text-sm">{currentPlan.strategySummary}</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-slate-500 bg-slate-950 border-b border-slate-800 uppercase tracking-wider text-xs">
                                <tr>
                                    <th className="py-4 px-6 font-bold">Mês Referência</th>
                                    <th className="py-4 px-6 font-bold text-right">Saldo Inicial</th>
                                    <th className="py-4 px-6 font-bold text-right">Fluxo Líq.</th>
                                    <th className="py-4 px-6 font-bold">Ações de Pagamento</th>
                                    <th className="py-4 px-6 font-bold text-right">Saldo Final</th>
                                    <th className="py-4 px-6 font-bold w-1/3">Notas Operacionais</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {currentPlan.projections.map((month, idx) => {
                                    const netFlow = month.totalIncome - month.fixedExpenses;
                                    
                                    return (
                                        <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="py-4 px-6 font-bold text-white">{month.monthLabel}</td>
                                            <td className="py-4 px-6 text-right text-slate-400 font-mono">R$ {month.openingBalance.toLocaleString('pt-BR', {minimumFractionDigits: 0})}</td>
                                            <td className="py-4 px-6 text-right font-mono">
                                                <span className={netFlow >= 0 ? 'text-white' : 'text-red-500'}>
                                                    {netFlow >= 0 ? '+' : ''}{netFlow.toLocaleString('pt-BR', {minimumFractionDigits: 0})}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                {month.debtPayments.length > 0 ? (
                                                    <ul className="space-y-1">
                                                        {month.debtPayments.map((p, i) => (
                                                            <li key={i} className="flex justify-between items-center text-xs bg-red-900/30 text-red-200 px-2 py-1 border border-red-900/50 font-medium">
                                                                <span>{p.creditor}</span>
                                                                <span className="font-bold">- R${p.amount.toLocaleString('pt-BR')}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <span className="text-slate-600 text-xs uppercase tracking-widest">-- Sem Ação --</span>
                                                )}
                                            </td>
                                            <td className={`py-4 px-6 text-right font-bold font-mono ${month.closingBalance < 0 ? 'text-red-500' : 'text-white'}`}>
                                                R$ {month.closingBalance.toLocaleString('pt-BR')}
                                            </td>
                                            <td className="py-4 px-6 text-slate-400 text-xs leading-relaxed border-l border-slate-800">
                                                {month.notes}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="p-8 bg-slate-950 border-t border-slate-800 flex justify-center">
                        <div className="flex items-center gap-3 text-white font-bold bg-slate-900 px-6 py-3 border border-slate-800 shadow-sm">
                            <CheckCircle className="w-5 h-5 text-white" />
                            <span className="uppercase tracking-wider text-sm">Liberdade Financeira Estimada:</span>
                            <span className="text-xl">{currentPlan.estimatedDebtFreeDate}</span>
                        </div>
                    </div>
                </div>
            )}
          </div>
      )}

    </div>
  );
};

export default AiPlanner;