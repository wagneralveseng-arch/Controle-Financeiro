
import React from 'react';
import { AnnualReportResponse } from '../types';
import { X, Printer, TrendingUp, TrendingDown, Target, Award, AlertTriangle, CheckCircle2, FileText, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AnnualReportModalProps {
  report: AnnualReportResponse;
  onClose: () => void;
}

const AnnualReportModal: React.FC<AnnualReportModalProps> = ({ report, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 overflow-y-auto print:static print:h-auto animate-in fade-in zoom-in duration-300">
      {/* Controls - Hidden on Print */}
      <div className="sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 px-8 flex justify-between items-center z-10 print:hidden">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-red-600" />
          <h2 className="text-xl font-bold tracking-tight uppercase">Relatório de Inteligência Financeira</h2>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handlePrint}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2 text-sm font-bold uppercase flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            <Printer className="w-4 h-4" /> Imprimir Relatório
          </button>
          <button 
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 md:p-12 space-y-12 print:p-0">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-slate-900 dark:border-white pb-6 gap-6">
          <div>
             <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Análise Anual <br/> de Projeção</h1>
             <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          <div className="text-right">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Documento de Caráter Tático</span>
             <p className="text-lg font-bold text-slate-900 dark:text-white">Gerenciador Financeiro Pro</p>
          </div>
        </div>

        {/* Economic Profile Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900 p-8 border border-slate-200 dark:border-slate-800 rounded-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Award className="w-24 h-24" />
             </div>
             <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-sm uppercase tracking-widest text-slate-500">Perfil Econômico Identificado</h3>
             </div>
             <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase mb-4">{report.economicProfile.category}</h2>
             <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">{report.economicProfile.description}</p>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <h4 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                     <CheckCircle2 className="w-3 h-3" /> Pontos Fortes
                   </h4>
                   <ul className="space-y-1">
                      {report.economicProfile.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex gap-2">• {s}</li>
                      ))}
                   </ul>
                </div>
                <div>
                   <h4 className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                     <AlertTriangle className="w-3 h-3" /> Pontos de Atenção
                   </h4>
                   <ul className="space-y-1">
                      {report.economicProfile.weaknesses.map((w, i) => (
                        <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex gap-2">• {w}</li>
                      ))}
                   </ul>
                </div>
             </div>
          </div>

          <div className="flex flex-col gap-8">
             <div className="bg-slate-900 text-white p-8 border-l-8 border-red-600 rounded-sm shadow-xl flex flex-col justify-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Finance Score</h3>
                <div className={`text-6xl font-black ${getScoreColor(report.economicProfile.score)}`}>
                   {report.economicProfile.score}<span className="text-2xl text-slate-500">/100</span>
                </div>
                <p className="text-xs mt-4 text-slate-400 font-medium">{report.economicProfile.keyAdvice}</p>
             </div>
             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-sm">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Métricas de Projeção Anual</h3>
                <div className="space-y-4">
                   <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Renda Total Projetada</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">R$ {report.annualSummary.totalProjectedIncome.toLocaleString('pt-BR')}</span>
                   </div>
                   <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Média de Saldo/Mês</span>
                      <span className="text-lg font-bold text-emerald-600">R$ {report.annualSummary.averageMonthlyBalance.toLocaleString('pt-BR')}</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-6">
           <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
             <TrendingUp className="w-4 h-4" /> Fluxo de Caixa Projetado (12 Meses)
           </h3>
           <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 h-[400px] print:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.projections}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="monthLabel" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '0', border: '1px solid #000', fontSize: '12px' }}
                    formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`}
                  />
                  <Legend verticalAlign="top" align="right" />
                  <Bar dataKey="totalIncome" name="Entradas" fill="#1e293b" barSize={20} />
                  <Bar dataKey="totalExpenses" name="Saídas" fill="#dc2626" barSize={20} />
                  <Bar dataKey="totalSavings" name="Investimentos" fill="#3b82f6" barSize={20} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Detailed Table Section */}
        <div className="space-y-4">
           <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
             <Info className="w-4 h-4" /> Detalhamento Tático Mensal
           </h3>
           <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
             <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                   <tr>
                      <th className="p-4">Mês/Ano</th>
                      <th className="p-4 text-right">Abertura</th>
                      <th className="p-4 text-right">Renda</th>
                      <th className="p-4 text-right text-red-500">Despesas</th>
                      <th className="p-4 text-right text-blue-500">Poupança</th>
                      <th className="p-4 text-right">Saldo Final</th>
                      <th className="p-4 w-1/4">Observações</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                   {report.projections.map((p, i) => (
                     <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 font-bold">{p.monthLabel}</td>
                        <td className="p-4 text-right font-mono">R$ {p.openingBalance.toLocaleString('pt-BR')}</td>
                        <td className="p-4 text-right font-mono">R$ {p.totalIncome.toLocaleString('pt-BR')}</td>
                        <td className="p-4 text-right font-mono text-red-500">R$ {p.totalExpenses.toLocaleString('pt-BR')}</td>
                        <td className="p-4 text-right font-mono text-blue-500">R$ {p.totalSavings.toLocaleString('pt-BR')}</td>
                        <td className="p-4 text-right font-mono font-bold">R$ {p.closingBalance.toLocaleString('pt-BR')}</td>
                        <td className="p-4 text-slate-500 italic">{p.notes}</td>
                     </tr>
                   ))}
                </tbody>
             </table>
           </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
             Este relatório foi gerado automaticamente por Inteligência Artificial Financeira. <br/>
             As projeções baseiam-se em comportamentos passados e não garantem rentabilidade futura.
           </p>
        </div>
      </div>
    </div>
  );
};

export default AnnualReportModal;
