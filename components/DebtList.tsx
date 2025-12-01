import React, { useState } from 'react';
import { Debt } from '../types';
import { CreditCard, Trash2, AlertCircle, Edit2, Save, PlusCircle } from 'lucide-react';

interface DebtListProps {
  debts: Debt[];
  onAddDebt: (d: Omit<Debt, 'id'>) => void;
  onUpdateDebt: (d: Debt) => void;
  onDeleteDebt: (id: string) => void;
}

const DebtList: React.FC<DebtListProps> = ({ debts, onAddDebt, onUpdateDebt, onDeleteDebt }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [creditor, setCreditor] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');

  const handleEdit = (d: Debt) => {
    setEditingId(d.id);
    setCreditor(d.creditor);
    setAmount(d.remainingAmount.toString());
    setRate(d.interestRate.toString());
    setPriority(d.priority);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCreditor('');
    setAmount('');
    setRate('');
    setPriority('MEDIUM');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditor || !amount) return;

    if (editingId) {
      // Find original to preserve totalAmount if needed, or just update
      const original = debts.find(d => d.id === editingId);
      onUpdateDebt({
        id: editingId,
        creditor,
        totalAmount: original ? original.totalAmount : parseFloat(amount), // Keep original total, or update? Let's keep original total logic for now
        remainingAmount: parseFloat(amount),
        interestRate: parseFloat(rate) || 0,
        dueDateDay: original ? original.dueDateDay : 1, // Keep original day or default
        priority
      });
      setEditingId(null);
    } else {
      onAddDebt({
        creditor,
        totalAmount: parseFloat(amount),
        remainingAmount: parseFloat(amount),
        interestRate: parseFloat(rate) || 0,
        dueDateDay: 1,
        priority
      });
    }

    setCreditor('');
    setAmount('');
    setRate('');
    setPriority('MEDIUM');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Input Form */}
      <div className="bg-white p-6 border border-slate-200 h-fit shadow-sm relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-slate-900"></div>
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
          {editingId ? <Edit2 className="w-5 h-5 text-red-600" /> : <CreditCard className="w-5 h-5" />} 
          {editingId ? 'Editar Obrigação' : 'Nova Obrigação'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Credor / Dívida</label>
            <input 
              type="text" 
              value={creditor}
              onChange={(e) => setCreditor(e.target.value)}
              className="w-full border-b-2 border-slate-200 p-2 focus:border-slate-900 outline-none bg-transparent transition-colors font-medium text-slate-900"
              placeholder="Ex: Cartão Visa, Empréstimo..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Saldo Devedor (R$)</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border-b-2 border-slate-200 p-2 focus:border-slate-900 outline-none bg-transparent transition-colors font-medium text-slate-900"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Juros Mensais (%)</label>
            <input 
              type="number" 
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full border-b-2 border-slate-200 p-2 focus:border-slate-900 outline-none bg-transparent transition-colors font-medium text-slate-900"
              placeholder="0.0"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridade</label>
            <select 
              value={priority} 
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full border-b-2 border-slate-200 p-2 focus:border-slate-900 outline-none bg-transparent font-medium text-slate-900"
            >
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta (Urgente)</option>
            </select>
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
              {editingId ? 'Salvar Alterações' : 'Adicionar Dívida'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="lg:col-span-2 space-y-6">
        <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight border-b border-slate-200 pb-2">Carteira de Passivos</h3>
        {debts.length === 0 ? (
          <div className="bg-white p-8 border border-slate-200 text-center text-slate-400 italic">
             Nenhuma dívida registrada. Parabéns!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debts.map(debt => (
              <div key={debt.id} className="bg-white p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-400 transition-colors">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${debt.priority === 'HIGH' ? 'bg-red-600' : 'bg-slate-300'}`}></div>
                <div className="flex justify-between items-start mb-4 pl-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{debt.creditor}</h4>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Juros: {debt.interestRate}% / mês</p>
                  </div>
                  <div className="flex gap-1">
                      <button onClick={() => handleEdit(debt)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDeleteDebt(debt.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                  </div>
                </div>
                <div className="pl-3 mt-4">
                  <span className="text-3xl font-bold text-slate-900">R$ {debt.remainingAmount.toLocaleString('pt-BR')}</span>
                  <div className="mt-4 flex items-center gap-2 text-xs">
                     {debt.priority === 'HIGH' && <AlertCircle className="w-4 h-4 text-red-600" />}
                     <span className={`px-2 py-1 uppercase font-bold text-[10px] tracking-widest ${
                       debt.priority === 'HIGH' ? 'bg-red-600 text-white' : 
                       'bg-slate-100 text-slate-600'
                     }`}>
                       Prioridade {debt.priority === 'HIGH' ? 'Alta' : debt.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                     </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebtList;