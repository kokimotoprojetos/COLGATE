'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  ShieldCheck, 
  AlertCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AuthPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  // Loading & error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Check if already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
      }
    };
    checkUser();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Preencha todos os campos obrigatórios.');
      setIsLoading(false);
      return;
    }

    if (activeTab === 'register' && !username) {
      setErrorMsg('Por favor, escolha um nome de usuário.');
      setIsLoading(false);
      return;
    }

    try {
      if (activeTab === 'login') {
        // LOGIN FLOW
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;
        
        router.push('/');
      } else {
        // REGISTER FLOW
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        const user = signUpData.user;
        if (user) {
          // Generate a unique client ID
          const idCode = 'COLG-' + Math.floor(1000 + Math.random() * 9000);
          
          // Create user profile in profiles table
          const { error: profileError } = await supabase.from('profiles').insert([
            {
              id: user.id,
              username: username,
              balance: 10.00, // R$ 10.00 register bonus
              total_recharge: 0.00,
              total_withdrawal: 0.00,
              total_income: 0.00,
              pix_key: '',
              pix_type: 'cpf',
              id_code: idCode
            }
          ]);

          if (profileError) {
            console.error('Error creating profile:', profileError);
            setErrorMsg('Erro ao criar perfil. Por favor, tente novamente.');
            setIsLoading(false);
            return;
          }

          setSuccessMsg('Cadastro realizado com sucesso! Redirecionando...');
          
          // Automatically log in
          await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          setTimeout(() => {
            router.push('/');
          }, 1500);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ocorreu um erro ao processar sua solicitação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 antialiased">
      {/* Container principal com design premium */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
      >
        {/* Header da Colgate */}
        <div className="bg-colgate-red text-white p-6 flex flex-col items-center relative overflow-hidden">
          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
            <Sparkles className="w-32 h-32 text-white" />
          </div>
          
          <img 
            src="/logo.png" 
            alt="Colgate Logo" 
            className="h-10 w-auto object-contain drop-shadow-md mb-2"
          />
          <p className="text-xs text-white/80 font-medium tracking-wide">Sorriso Financeiro & Investimentos</p>
        </div>

        {/* Seleção de Tabs (Login vs Registro) */}
        <div className="flex border-b border-slate-100 p-2 bg-slate-50/50">
          <button
            onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
            className={`flex-1 text-center py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'login' 
                ? 'bg-white text-colgate-red shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
            className={`flex-1 text-center py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'register' 
                ? 'bg-white text-colgate-red shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleAuth} className="p-6 space-y-4">
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-rose-50 border border-rose-100 rounded-2xl p-3 flex gap-2 items-center text-rose-700 text-xs font-semibold"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex gap-2 items-center text-emerald-700 text-xs font-semibold"
              >
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {activeTab === 'register' && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400">Nome de Usuário</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Seu nome ou apelido"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-colgate-red rounded-2xl pl-10 pr-4 py-3 text-xs outline-none transition-all font-medium text-slate-700 shadow-inner focus:shadow-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400">E-mail</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-colgate-red rounded-2xl pl-10 pr-4 py-3 text-xs outline-none transition-all font-medium text-slate-700 shadow-inner focus:shadow-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400">Senha</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-colgate-red rounded-2xl pl-10 pr-4 py-3 text-xs outline-none transition-all font-medium text-slate-700 shadow-inner focus:shadow-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-colgate-red hover:bg-colgate-dark-red disabled:bg-slate-300 text-white font-bold py-3.5 px-4 rounded-2xl text-xs uppercase shadow-md flex items-center justify-center gap-1.5 transition-all mt-6"
          >
            {isLoading ? (
              <span>Processando...</span>
            ) : (
              <>
                <span>{activeTab === 'login' ? 'Entrar no Sistema' : 'Criar minha Conta'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Informativo */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase">
          <ShieldCheck className="w-3.5 h-3.5 text-colgate-blue" />
          <span>Sistema Seguro Colgate</span>
        </div>
      </motion.div>
    </div>
  );
}
