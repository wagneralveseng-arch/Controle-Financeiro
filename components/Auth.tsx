import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Lock, Mail, Loader2, ArrowRight, UserPlus } from 'lucide-react';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Cadastro realizado! Verifique seu email para confirmar ou faça login.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro na autenticação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight">Gerenciador <span className="text-red-600">Financeiro</span></h1>
        <p className="text-slate-400 text-sm mt-2">Inteligência de Mercado & Controle de Dívidas</p>
      </div>

      <div className="w-full max-w-md bg-slate-900 rounded-none shadow-2xl overflow-hidden border-t-4 border-red-600 border-x border-b border-slate-800">
        <div className="p-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            {isSignUp ? <UserPlus className="w-5 h-5 text-red-600" /> : <Lock className="w-5 h-5 text-red-600" />}
            {isSignUp ? 'Criar Nova Conta' : 'Acesso ao Sistema'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 text-red-400 text-sm font-medium flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

           {message && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-900/50 text-green-400 text-sm font-medium flex items-center gap-2">
              <span>✅</span> {message}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Corporativo / Pessoal</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-700 pl-10 p-2 text-sm focus:border-white outline-none transition-colors bg-slate-950 text-white placeholder-slate-600"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha de Acesso</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-700 pl-10 p-2 text-sm focus:border-white outline-none transition-colors bg-slate-950 text-white placeholder-slate-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-slate-900 py-3 font-bold uppercase text-xs hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {isSignUp ? 'Cadastrar Usuário' : 'Entrar no Painel'}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-slate-800 pt-4">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
              className="text-xs font-bold text-slate-500 uppercase hover:text-white transition-colors"
            >
              {isSignUp ? 'Já tem conta? Faça Login' : 'Não tem conta? Cadastre-se'}
            </button>
          </div>
        </div>
      </div>
       <p className="text-slate-600 text-[10px] mt-8 uppercase tracking-widest font-bold">Sistema Seguro • Supabase Auth</p>
    </div>
  );
};