import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { Wallet, PlusCircle, TrendingDown, DollarSign, CalendarClock, ShoppingBag } from 'lucide-react';

interface FluxoProps {
  transactions: Transaction[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
}

const Fluxo: React.FC<FluxoProps> = ({ transactions, onAddTransaction }) => {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 1. Identify Current Cluster & Date Range ---
  const currentClusterInfo = useMemo(() => {
    const today = new Date();
    const day = today.getUTCDate(); // Use UTC to match App logic
    const month = today.getUTCMonth();
    const year = today.getUTCFullYear();

    let clusterName = '';
    let startDate: Date;
    let endDate: Date;

    // Logic: Vale (15-29) | Pagamento (30 - 14 of next month)
    if (day >= 15 && day <= 29) {
      clusterName = 'Vale (Quinzenal)';
      startDate = new Date(Date.UTC(year, month, 15));
      endDate = new Date(Date.UTC(year, month, 29, 23, 59, 59));
    } else {
      clusterName = 'Pagamento (Principal)';
      if (day >= 30) {
        // Late month (30, 31) -> Cycle started on day 30
        startDate = new Date(Date.UTC(year, month, 30));
        // Ends 14th of NEXT month
        endDate = new Date(Date.UTC(year, month + 1, 14, 23, 59, 59));
      } else {
        // Early month (1-14) -> Cycle started on 30th of PREVIOUS month
        startDate = new Date(Date.UTC(year, month - 1, 30));
        endDate = new Date(Date.UTC(year, month, 14, 23, 59, 59));
      }
    }

    return { clusterName, startDate, endDate };
  }, []);

  // --- 2. Calculate Balance for this specific Cluster Window ---
  const clusterStats = useMemo(() => {
    const { startDate, endDate } = currentClusterInfo;

    // Filter transactions within the specific date range of the active cluster
    const clusterTrans = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= startDate && tDate <= endDate;
    });

    const income = clusterTrans
      .filter(t => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0);

    // Subtract PAID expenses + SAVINGS
    const committed = clusterTrans
      .filter(t => (t.type === 'EXPENSE' || t.type === 'SAVING') && t.status === 'PAID')
      .reduce((acc, t) => acc + t.amount, 0);

    const pendingBills = clusterTrans
      .filter(t => (t.type === 'EXPENSE' || t.type === 'SAVING') && t.status === 'PENDING')
      .reduce((acc, t) => acc + t.amount, 0);

    const availableCash = income - committed;
    // "Real Free" considers pending bills too, but user asked for "Money Left from Transactions" (Cash flow view)
    // We will show Available Cash (Real) and maybe a warning about pending.

    return { income, committed, availableCash, pendingBills, clusterTrans };
  }, [transactions, currentClusterInfo]);

  // --- 3. Handle Quick Add ---
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount) return;

    setIsSubmitting(true);
    try {
      await onAddTransaction({
        date: new Date().toISOString(), // NOW
        description: desc,
        amount: parseFloat(amount),
        type: 'EXPENSE',
        category: 'Fluxo Variável', // Auto category
        status: 'PAID', // AUTO PAID as requested
      });
      setDesc('');
      setAmount('');
    } catch (error) {
      alert("Erro ao adicionar gasto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER: CLUSTER INFO & BALANCE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* BIG BALANCE CARD */}
        <div className="bg-slate-900 border border-slate-800 p-8 shadow-lg relative overflow-hidden group">
          <div className={`absolute top-0 right-0 p-4 opacity-10`}>
             <Wallet className="w-32 h-32 text-white" />
          </div>
          
          <div className="relative z-10">
             <div className="flex items-center gap-2 mb-2">
                <span className="bg-slate-800 text-slate-300 text-[10px] font-bold uppercase px-2 py-1 rounded border border-slate-700">
                  {currentClusterInfo.clusterName}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {currentClusterInfo.startDate.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} até {currentClusterInfo.endDate.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}
                </span>
             </div>

             <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Saldo Disponível para Gasto</h2>
             <div className="flex items-baseline gap-1 mt-1">
               <span className="text-4xl md:text-5xl font-bold text-white tracking-tighter">
                 R$ {clusterStats.availableCash.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
               </span>
             </div>

             {clusterStats.pendingBills > 0 && (
                <div className="mt-4 flex items-center gap-2 text-xs text-red-400 bg-red-950/30 p-2 border border-red-900/30 w-fit rounded">
                   <CalendarClock className="w-4 h-4" />
                   <span>Atenção: Você ainda tem <strong>R$ {clusterStats.pendingBills.toLocaleString('pt-BR')}</strong> em contas pendentes neste ciclo.</span>
                </div>
             )}
          </div>
        </div>

        {/* INPUT FORM */}
        <div className="bg-slate-900 border border-slate-800 p-8 shadow-lg flex flex-col justify-center">
           <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-6 flex items-center gap-2">
             <ShoppingBag className="w-5 h-5 text-red-500" />
             Registrar Gasto Rápido
           </h3>
           
           <form onSubmit={handleQuickAdd} className="space-y-4">
              <div>
                 <input 
                   type="text" 
                   value={desc}
                   onChange={(e) => setDesc(e.target.value)}
                   placeholder="Com o que você gastou?"
                   className="w-full bg-slate-950 border-b-2 border-slate-700 p-3 text-white placeholder-slate-600 focus:border-white outline-none transition-colors"
                   autoFocus
                 />
              </div>
              <div className="relative">
                 <span className="absolute left-3 top-3 text-slate-500 font-bold">R$</span>
                 <input 
                   type="number" 
                   step="0.01"
                   value={amount}
                   onChange={(e) => setAmount(e.target.value)}
                   placeholder="0.00"
                   className="w-full bg-slate-950 border-b-2 border-slate-700 p-3 pl-10 text-xl font-bold text-white placeholder-slate-700 focus:border-red-500 outline-none transition-colors"
                 />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting || !desc || !amount}
                className="w-full bg-white text-slate-950 font-bold uppercase text-xs py-4 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 mt-4"
              >
                 {isSubmitting ? 'Registrando...' : 'Confirmar Gasto (Pago)'}
                 <PlusCircle className="w-4 h-4" />
              </button>
           </form>
        </div>

      </div>

      {/* RECENT VARIABLE SPENDING LIST */}
      <div className="bg-slate-900 border border-slate-800 shadow-sm mt-8">
         <div className="p-6 border-b border-slate-800">
            <h3 className="font-bold text-white uppercase text-sm tracking-wider">Gastos Variáveis Recentes (Neste Cluster)</h3>
         </div>
         
         <div className="divide-y divide-slate-800">
            {clusterStats.clusterTrans
               .filter(t => t.type === 'EXPENSE' && t.status === 'PAID' && t.category === 'Fluxo Variável')
               .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
               .map(t => (
                 <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                       <div className="p-2 bg-slate-800 rounded text-slate-400">
                          <TrendingDown className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="font-bold text-white">{t.description}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold">
                             {new Date(t.date).toLocaleDateString('pt-BR')} • {new Date(t.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                          </p>
                       </div>
                    </div>
                    <span className="text-red-500 font-mono font-bold text-lg">
                       - R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </span>
                 </div>
               ))}
               
             {clusterStats.clusterTrans.filter(t => t.category === 'Fluxo Variável').length === 0 && (
                <div className="p-8 text-center text-slate-600 text-xs italic">
                   Nenhum gasto variável registrado neste ciclo ainda.
                </div>
             )}
         </div>
      </div>

    </div>
  );
};

export default Fluxo;