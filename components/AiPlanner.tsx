import React, { useState } from 'react';
import { FinancialState, AIPlanResponse } from '../types';
import { generateZeroDebtPlan } from '../services/geminiService';
import { Bot, RefreshCw, CheckCircle, FileText, Loader2, PlayCircle } from 'lucide-react';

interface AiPlannerProps {
  state: FinancialState;
  onPlanGenerated: (plan: AIPlanResponse) => void;
  currentPlan: AIPlanResponse | null;
}

const AiPlanner: React.FC<AiPlannerProps> = ({ state, onPlanGenerated, currentPlan }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const plan = await generateZeroDebtPlan(state);
      onPlanGenerated(plan);
    } catch (err) {
      setError("Falha ao gerar o plano. Verifique a API Key ou tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
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
        <div className="bg-white shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-900" />
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-sm">Plano de Execução Tático</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-slate-500 bg-slate-100 border-b border-slate-200 uppercase tracking-wider text-xs">
                        <tr>
                            <th className="py-4 px-6 font-bold">Mês Referência</th>
                            <th className="py-4 px-6 font-bold text-right">Saldo Inicial</th>
                            <th className="py-4 px-6 font-bold text-right">Fluxo Líq.</th>
                            <th className="py-4 px-6 font-bold">Ações de Pagamento</th>
                            <th className="py-4 px-6 font-bold text-right">Saldo Final</th>
                            <th className="py-4 px-6 font-bold w-1/3">Notas Operacionais</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currentPlan.projections.map((month, idx) => {
                            const netFlow = month.totalIncome - month.fixedExpenses;
                            
                            return (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-4 px-6 font-bold text-slate-900">{month.monthLabel}</td>
                                    <td className="py-4 px-6 text-right text-slate-500 font-mono">R$ {month.openingBalance.toLocaleString('pt-BR', {minimumFractionDigits: 0})}</td>
                                    <td className="py-4 px-6 text-right font-mono">
                                        <span className={netFlow >= 0 ? 'text-slate-900' : 'text-red-600'}>
                                            {netFlow >= 0 ? '+' : ''}{netFlow.toLocaleString('pt-BR', {minimumFractionDigits: 0})}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        {month.debtPayments.length > 0 ? (
                                            <ul className="space-y-1">
                                                {month.debtPayments.map((p, i) => (
                                                    <li key={i} className="flex justify-between items-center text-xs bg-red-50 text-red-800 px-2 py-1 border border-red-100 font-medium">
                                                        <span>{p.creditor}</span>
                                                        <span className="font-bold">- R${p.amount.toLocaleString('pt-BR')}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="text-slate-300 text-xs uppercase tracking-widest">-- Sem Ação --</span>
                                        )}
                                    </td>
                                    <td className={`py-4 px-6 text-right font-bold font-mono ${month.closingBalance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                        R$ {month.closingBalance.toLocaleString('pt-BR')}
                                    </td>
                                    <td className="py-4 px-6 text-slate-600 text-xs leading-relaxed border-l border-slate-100">
                                        {month.notes}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            <div className="p-8 bg-slate-100 border-t border-slate-200 flex justify-center">
                 <div className="flex items-center gap-3 text-slate-900 font-bold bg-white px-6 py-3 border border-slate-200 shadow-sm">
                    <CheckCircle className="w-5 h-5 text-slate-900" />
                    <span className="uppercase tracking-wider text-sm">Liberdade Financeira Estimada:</span>
                    <span className="text-xl">{currentPlan.estimatedDebtFreeDate}</span>
                 </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AiPlanner;