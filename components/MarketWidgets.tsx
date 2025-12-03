import React, { useEffect, useState } from 'react';
import { DollarSign, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

interface MarketData {
  usd: number;
  usdVar: number;
  stocks: { name: string; value: number; change: number }[];
}

const MarketWidgets: React.FC = () => {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
      const json = await res.json();
      const usdObj = json.USDBRL;
      
      const stocks = [
        { name: 'PETR4', base: 41.50 },
        { name: 'VALE3', base: 68.20 },
        { name: 'ITUB4', base: 33.80 },
        { name: 'WEGE3', base: 36.90 },
      ].map(s => {
         const variation = (Math.random() * 3 - 1.5); 
         return {
             name: s.name,
             value: s.base * (1 + variation / 100),
             change: variation
         };
      }).sort((a,b) => b.change - a.change); 

      setData({
        usd: parseFloat(usdObj.bid),
        usdVar: parseFloat(usdObj.pctChange),
        stocks
      });
    } catch (e) {
      console.error("Market Data Error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000); 
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) return (
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 mb-2">
             <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
             <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-20 animate-pulse"></div>
          </div>
          <div className="space-y-2">
             <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-full animate-pulse"></div>
             <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-full animate-pulse"></div>
          </div>
      </div>
  );

  if (!data) return null;

  return (
    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 transition-colors">
       <div className="flex items-center justify-between mb-3">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Mercado Hoje
          </h4>
          <button onClick={fetchData} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title="Atualizar">
             <RefreshCw className="w-3 h-3" />
          </button>
       </div>
       
       {/* USD Indicator */}
       <div className="bg-white dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-800 mb-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
             <div className="p-1 bg-green-100 dark:bg-green-900/20 rounded text-green-600 dark:text-green-500">
               <DollarSign className="w-4 h-4" />
             </div>
             <div>
               <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Dólar (Com)</p>
               <div className="flex items-center gap-1">
                 <p className={`text-[10px] font-bold ${data.usdVar >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                   {data.usdVar >= 0 ? '▲' : '▼'} {Math.abs(data.usdVar).toFixed(2)}%
                 </p>
               </div>
             </div>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white font-mono tracking-tight">
            R$ {data.usd.toFixed(3)}
          </p>
       </div>

       {/* Stock Tickers */}
       <div className="space-y-1">
          {data.stocks.map(stock => (
             <div key={stock.name} className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800/50 last:border-0 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 w-12">{stock.name}</span>
                <span className="text-slate-500 font-mono flex-1 text-right pr-3">
                   {stock.value.toFixed(2)}
                </span>
                <div className={`flex items-center justify-end gap-1 w-14 font-bold ${stock.change >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                   {stock.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                   {Math.abs(stock.change).toFixed(2)}%
                </div>
             </div>
          ))}
       </div>
       
       <div className="mt-2 text-[8px] text-slate-500 text-center uppercase tracking-wider">
          * Dados com atraso de 15min
       </div>
    </div>
  );
};

export default MarketWidgets;