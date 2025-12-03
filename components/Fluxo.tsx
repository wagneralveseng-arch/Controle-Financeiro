import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { Wallet, PlusCircle, TrendingDown, DollarSign, CalendarClock, ShoppingBag, Edit2, Trash2, Calendar, Save, X } from 'lucide-react';

interface FluxoProps {
  transactions: Transaction[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
  onUpdateTransaction: (t: Transaction) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
}

const Fluxo: React.FC<FluxoProps> = ({ transactions, onAddTransaction, onUpdateTransaction, onDeleteTransaction }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 1. Identify Current Cluster & Date Range ---
  const currentClusterInfo = useMemo(() => {
    const today = new Date();
    const day = today.getUTCDate();
    const month = today.getUTCMonth();
    const year = today.getUTCFullYear();

    let clusterName = '';
    let startDate: Date;
    let endDate: Date;

    if (day >= 15 && day <= 29) {
      clusterName = 'Vale (Quinzenal)';
      startDate = new Date(Date.UTC(year, month, 15));
      endDate = new Date(Date.UTC(year, month, 29, 23, 59, 59));
    } else {
      clusterName = 'Pagamento (Principal)';
      if (day >= 30) {
        startDate = new Date(Date.UTC(year, month, 30));
        endDate = new Date(Date.UTC(year, month + 1, 14, 23, 59, 59));
      } else {
        startDate = new Date(Date.UTC(year, month - 1, 30));
        endDate = new Date(Date.UTC(year, month, 14, 23, 59, 59));
      }
    }

    return { clusterName, startDate, endDate };
  }, []);

  // --- 2. Calculate Balance for this specific Cluster Window ---
  const clusterStats = useMemo(() => {
    const { startDate, endDate } = currentClusterInfo;

    const clusterTrans = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= startDate && tDate <= endDate;
    });

    const income = clusterTrans
      .filter(t => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0);

    const committed = clusterTrans
      .filter(t => (t.type === 'EXPENSE' || t.type === 'SAVING') && t.status === 'PAID')
      .reduce((acc, t) => acc + t.amount, 0);

    const pendingBills = clusterTrans
      .filter(t => (t.type === 'EXPENSE' || t.type === 'SAVING') && t.status === 'PENDING')
      .reduce((acc, t) => acc + t.amount, 0);

    const availableCash = income - committed;

    return { income, committed, availableCash, pendingBills, clusterTrans };
  }, [transactions, currentClusterInfo]);

  // --- 3. Handlers ---
  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    setDesc(t.description);
    setAmount(t.amount.toString());
    setDateStr(t.date.split('T')[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDesc('');
    setAmount('');
    setDateStr(new Date().toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount || !dateStr) return;

    setIsSubmitting(true);
    try {
      const payloadDate = new Date(dateStr);
      const now = new Date();
      if (dateStr === now.toISOString().split('T')[0]) {
          payloadDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      } else {
          payloadDate.setHours(12, 0, 0);
      }

      if (editingId) {
        const original = transactions.find(t => t.id === editingId);
        if (original) {
            await onUpdateTransaction({
                ...original,
                description: desc,
                amount: parseFloat(amount),
                date: payloadDate.toISOString()
            });
        }
        setEditingId(null);
      } else {
        await onAddTransaction({
            date: payloadDate.toISOString(),
            description: desc,
            amount: parseFloat(amount),
            type: 'EXPENSE',
            category: 'Fluxo Variável',
            status: 'PAID',
        });
      }
      setDesc('');
      setAmount('');
      setDateStr(new Date().toISOString().split('T')[0]); 

    } catch (error) {
      alert("Erro ao salvar transação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
      if (confirm("Tem certeza que deseja excluir este gasto? O valor retornará ao saldo disponível.")) {
          await onDeleteTransaction(id);
      }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER: CLUSTER INFO & BALANCE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* BIG BALANCE CARD */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-lg relative overflow-hidden group transition-colors rounded-sm">
          <div className={`absolute top-0 right-0 p-4 opacity-10`}>
             <Wallet className="w-32 h-32 text-slate-900 dark:text-white" />
          </div>
          
          <div className="relative z-10">
             <div className="flex items-center gap-2 mb-2">
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                  {currentClusterInfo.clusterName}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-500 font-medium">
                  {currentClusterInfo.startDate.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} até {currentClusterInfo.endDate.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}
                </span>
             </div>

             <h2 className="text-sm font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Saldo Disponível para Gasto</h2>
             <div className="flex items-baseline gap-1 mt-1">
               <span className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tighter">
                 R$ {clusterStats.availableCash.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
               </span>
             </div>

             {clusterStats.pendingBills > 0 && (
                <div className="mt-4 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2 border border-red-200 dark:border-red-900/30 w-fit rounded">
                   <CalendarClock className="w-4 h-4" />
                   <span>Atenção: Você ainda tem <strong>R$ {clusterStats.pendingBills.toLocaleString('pt-BR')}</strong> em contas pendentes neste ciclo.</span>
                </div>
             )}
          </div>
        </div>

        {/* INPUT FORM */}
        <div className={`bg-white dark:bg-slate-900 border p-8 shadow-lg flex flex-col justify-center transition-colors rounded-sm ${editingId ? 'border-red-600' : 'border-slate-200 dark:border-slate-800'}`}>
           <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-2">
             {editingId ? <Edit2 className="w-5 h-5 text-red-500" /> : <ShoppingBag className="w-5 h-5 text-red-500" />}
             {editingId ? 'Editar Gasto' : 'Registrar Gasto Rápido'}
           </h3>
           
           <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                 <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-500 mb-1 block">O que você comprou?</label>
                 <input 
                   type="text" 
                   value={desc}
                   onChange={(e) => setDesc(e.target.value)}
                   placeholder="Descrição..."
                   className="w-full bg-slate-50 dark:bg-slate-950 border-b-2 border-slate-300 dark:border-slate-700 p-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-slate-900 dark:focus:border-white outline-none transition-colors"
                   autoFocus={!editingId}
                 />
              </div>
              
              <div className="flex gap-4">
                  <div className="w-1/3">
                      <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-500 mb-1 block">Data</label>
                      <div className="relative">
                          <input 
                            type="date" 
                            value={dateStr}
                            onChange={(e) => setDateStr(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border-b-2 border-slate-300 dark:border-slate-700 p-3 text-sm text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white outline-none transition-colors"
                          />
                      </div>
                  </div>
                  <div className="w-2/3">
                      <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-500 mb-1 block">Valor Total</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-slate-500 font-bold">R$</span>
                        <input 
                            type="number" 
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-slate-50 dark:bg-slate-950 border-b-2 border-slate-300 dark:border-slate-700 p-3 pl-10 text-xl font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-700 focus:border-red-500 outline-none transition-colors"
                        />
                      </div>
                  </div>
              </div>

              <div className="flex gap-2 mt-4">
                  {editingId && (
                      <button 
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-300 font-bold uppercase text-xs py-4 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                      >
                         <X className="w-4 h-4" /> Cancelar
                      </button>
                  )}
                  <button 
                    type="submit"
                    disabled={isSubmitting || !desc || !amount}
                    className="flex-[2] bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold uppercase text-xs py-4 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                     {isSubmitting ? 'Salvando...' : (editingId ? 'Salvar Alteração' : 'Confirmar Gasto (Pago)')}
                     {editingId ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                  </button>
              </div>
           </form>
        </div>

      </div>

      {/* RECENT VARIABLE SPENDING LIST */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mt-8 transition-colors rounded-sm">
         <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white uppercase text-sm tracking-wider">Gastos Variáveis Recentes (Neste Cluster)</h3>
         </div>
         
         <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {clusterStats.clusterTrans
               .filter(t => t.type === 'EXPENSE' && t.status === 'PAID' && t.category === 'Fluxo Variável')
               .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
               .map(t => (
                 <div key={t.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-4 group">
                    <div className="flex items-center gap-4">
                       <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                          <TrendingDown className="w-5 h-5" />
                       </div>
                       <div>
                          <p className={`font-bold ${editingId === t.id ? 'text-red-600 dark:text-red-500' : 'text-slate-900 dark:text-white'}`}>{t.description}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-2">
                             <Calendar className="w-3 h-3" />
                             {new Date(t.date).toLocaleDateString('pt-BR')}
                          </p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-6 justify-between md:justify-end w-full md:w-auto pl-14 md:pl-0">
                        <span className="text-red-600 dark:text-red-500 font-mono font-bold text-lg">
                        - R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </span>

                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => handleEdit(t)}
                                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-sm transition-colors"
                                title="Editar Gasto"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => handleDelete(t.id)}
                                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-sm transition-colors"
                                title="Excluir Gasto"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                 </div>
               ))}
               
             {clusterStats.clusterTrans.filter(t => t.category === 'Fluxo Variável').length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs italic">
                   Nenhum gasto variável registrado neste ciclo ainda.
                </div>
             )}
         </div>
      </div>

    </div>
  );
};

export default Fluxo;