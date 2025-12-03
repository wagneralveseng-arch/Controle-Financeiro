import React, { useState } from 'react';
import { Debt } from '../types';
import { CreditCard, Trash2, AlertCircle, Edit2, Save, PlusCircle, DollarSign, Calendar } from 'lucide-react';

interface DebtListProps {
  debts: Debt[];
  onAddDebt: (d: Omit<Debt, 'id'>) => void;
  onUpdateDebt: (d: Debt) => void;
  onDeleteDebt: (id: string) => void;
  onRegisterPayment: (debtId: string, amount: number, date: string, createTransaction: boolean) => void;
}

const DebtList: React.FC<DebtListProps> = ({ debts, onAddDebt, onUpdateDebt, onDeleteDebt, onRegisterPayment }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<'DETAILS' | 'PAY'>('DETAILS');
  
  // Details Form State
  const [creditor, setCreditor] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');

  // Payment Form State
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [createTrans, setCreateTrans] = useState(true);

  const handleEdit = (d: Debt) => {
    setEditingId(d.id);
    setEditTab('DETAILS');
    setCreditor(d.creditor);
    setAmount(d.remainingAmount.toString());
    setRate(d.interestRate.toString());
    setPriority(d.priority);
    setPayAmount('');
    setPayDate(new Date().toISOString().split('T')[0]);
    setCreateTrans(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCreditor('');
    setAmount('');
    setRate('');
    setPriority('MEDIUM');
  };

  const handleSubmitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditor || !amount) return;

    if (editingId) {
      const original = debts.find(d => d.id === editingId);
      onUpdateDebt({
        id: editingId,
        creditor,
        totalAmount: original ? original.totalAmount : parseFloat(amount),
        remainingAmount: parseFloat(amount),
        interestRate: parseFloat(rate) || 0,
        dueDateDay: original ? original.dueDateDay : 1,
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

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !payAmount || !payDate) return;
    
    onRegisterPayment(editingId, parseFloat(payAmount), payDate, createTrans);
    setEditingId(null); 
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Input / Edit Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-fit shadow-sm relative transition-colors rounded-sm">
        <div className="absolute top-0 left-0 w-1 h-full bg-slate-300 dark:bg-slate-700"></div>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
           <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
            {editingId ? <Edit2 className="w-5 h-5 text-red-500" /> : <CreditCard className="w-5 h-5" />} 
            {editingId ? 'Gerenciar Dívida' : 'Nova Obrigação'}
          </h3>
        </div>

        {/* Edit Tabs */}
        {editingId && (
            <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button 
                  onClick={() => setEditTab('DETAILS')}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${editTab === 'DETAILS' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-b-2 border-red-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Editar Dados
                </button>
                <button 
                  onClick={() => setEditTab('PAY')}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${editTab === 'PAY' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-b-2 border-red-600' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    Amortizar / Pagar
                </button>
            </div>
        )}
        
        <div className="p-6">
          {editingId && editTab === 'PAY' ? (
             // --- PAYMENT FORM ---
             <form onSubmit={handlePaymentSubmit} className="space-y-5">
                <div className="bg-red-50 dark:bg-red-950/30 p-3 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium mb-4">
                    Registre um pagamento parcial ou total. O sistema atualizará o saldo devedor automaticamente.
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor do Pagamento (R$)</label>
                  <div className="relative">
                     <DollarSign className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                     <input 
                        type="number" 
                        step="0.01"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-700 pl-10 p-2 focus:border-slate-900 dark:focus:border-white outline-none transition-colors font-medium bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                        placeholder="0.00"
                        autoFocus
                      />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data do Pagamento</label>
                   <div className="relative">
                     <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                     <input 
                        type="date" 
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        className="w-full border border-slate-300 dark:border-slate-700 pl-10 p-2 focus:border-slate-900 dark:focus:border-white outline-none transition-colors font-medium bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                      />
                  </div>
                </div>
                
                <div className="flex items-start gap-2 pt-2">
                    <input 
                      type="checkbox" 
                      id="createTrans" 
                      checked={createTrans}
                      onChange={(e) => setCreateTrans(e.target.checked)}
                      className="mt-1 w-4 h-4 text-slate-900 border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 rounded focus:ring-slate-700"
                    />
                    <label htmlFor="createTrans" className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none leading-snug">
                        <span className="font-bold block uppercase text-slate-700 dark:text-slate-300">Gerar Transação de Despesa?</span>
                        Cria automaticamente um registro "Pago" na aba Transações para manter o fluxo de caixa correto.
                    </label>
                </div>

                <div className="flex gap-2 pt-4">
                   <button 
                     type="button" 
                     onClick={cancelEdit}
                     className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-3 font-bold uppercase text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                   >
                     Cancelar
                   </button>
                   <button 
                    type="submit" 
                    className="flex-[2] bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 font-bold uppercase text-xs hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" /> Confirmar Pagamento
                  </button>
                </div>
             </form>
          ) : (
             // --- DETAILS FORM ---
             <form onSubmit={handleSubmitDetails} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Credor / Dívida</label>
                <input 
                  type="text" 
                  value={creditor}
                  onChange={(e) => setCreditor(e.target.value)}
                  className="w-full border-b-2 border-slate-300 dark:border-slate-700 p-2 focus:border-slate-900 dark:focus:border-white outline-none bg-transparent transition-colors font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                  placeholder="Ex: Cartão Visa, Empréstimo..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Saldo Devedor (R$)</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border-b-2 border-slate-300 dark:border-slate-700 p-2 focus:border-slate-900 dark:focus:border-white outline-none bg-transparent transition-colors font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Juros Mensais (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full border-b-2 border-slate-300 dark:border-slate-700 p-2 focus:border-slate-900 dark:focus:border-white outline-none bg-transparent transition-colors font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Prioridade</label>
                <select 
                  value={priority} 
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full border-b-2 border-slate-300 dark:border-slate-700 p-2 focus:border-slate-900 dark:focus:border-white outline-none bg-slate-50 dark:bg-slate-950 font-medium text-slate-900 dark:text-white transition-colors"
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
                     className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-3 font-bold uppercase text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                   >
                     Cancelar
                   </button>
                 )}
                 <button 
                  type="submit" 
                  className="flex-[2] bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 font-bold uppercase text-xs hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  {editingId ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                  {editingId ? 'Salvar Alterações' : 'Adicionar Dívida'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* List */}
      <div className="lg:col-span-2 space-y-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight border-b border-slate-200 dark:border-slate-800 pb-2">Carteira de Passivos</h3>
        {debts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 border border-slate-200 dark:border-slate-800 text-center text-slate-500 italic rounded-sm transition-colors">
             Nenhuma dívida registrada. Parabéns!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debts.map(debt => (
              <div key={debt.id} className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-slate-400 dark:hover:border-slate-600 transition-colors rounded-sm">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${debt.priority === 'HIGH' ? 'bg-red-600' : 'bg-slate-400 dark:bg-slate-600'}`}></div>
                <div className="flex justify-between items-start mb-4 pl-3">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-lg">{debt.creditor}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">Juros: {debt.interestRate}% / mês</p>
                  </div>
                  <div className="flex gap-1">
                      <button 
                        onClick={() => handleEdit(debt)} 
                        className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors rounded-sm flex items-center gap-2 text-xs font-bold uppercase"
                      >
                        <Edit2 className="w-3 h-3" /> Gerenciar
                      </button>
                      <button onClick={() => onDeleteDebt(debt.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                  </div>
                </div>
                <div className="pl-3 mt-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Saldo Devedor</p>
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">R$ {debt.remainingAmount.toLocaleString('pt-BR')}</span>
                  
                  {debt.remainingAmount < debt.totalAmount && (
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 mt-3 rounded-full overflow-hidden">
                          <div 
                             className="h-full bg-slate-400 dark:bg-slate-400" 
                             style={{ width: `${((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100}%` }}
                          ></div>
                      </div>
                  )}

                  <div className="mt-4 flex items-center gap-2 text-xs">
                     {debt.priority === 'HIGH' && <AlertCircle className="w-4 h-4 text-red-500" />}
                     <span className={`px-2 py-1 uppercase font-bold text-[10px] tracking-widest ${
                       debt.priority === 'HIGH' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200' : 
                       'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
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