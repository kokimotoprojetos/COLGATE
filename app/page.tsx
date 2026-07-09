'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'motion/react';

// Interfaces for our interactive states
interface UserProfile {
  username: string;
  balance: number;
  totalRecharge: number;
  totalWithdrawal: number;
  totalIncome: number;
  pixKey: string;
  pixType: string;
  idCode: string;
  registerDate: string;
}

interface PurchasedPlan {
  id: string;
  planId: string;
  name: string;
  price: number;
  dailyIncome: number;
  cycleDays: number;
  purchasedAt: string;
  lastClaimedAt: string;
  earningsClaimed: number;
  earningsAccumulated: number;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'investment' | 'yield';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  details: string;
}

// Fixed Colgate plans catalog
const PLANS_CATALOG = [
  {
    id: 'colgate-total-12',
    name: 'VIP 1',
    slogan: '',
    price: 25.00,
    dailyIncome: 5.50, // 22% daily
    cycleDays: 30,
    color: 'from-red-500 to-rose-600',
    accentColor: '#E11B22',
    iconColor: 'text-red-500',
    desc: '',
    svgPath: 'toothpaste',
    imagePath: '/plano1.png'
  },
  {
    id: 'colgate-luminous-white',
    name: 'VIP 2',
    slogan: '',
    price: 50.00,
    dailyIncome: 11.00, // 22% daily
    cycleDays: 30,
    color: 'from-blue-600 to-sky-500',
    accentColor: '#004B87',
    iconColor: 'text-blue-500',
    desc: '',
    svgPath: 'luminous',
    imagePath: '/plano2.png'
  },
  {
    id: 'colgate-plax-fresh',
    name: 'VIP 3',
    slogan: '',
    price: 150.00,
    dailyIncome: 33.00, // 22% daily
    cycleDays: 30,
    color: 'from-teal-500 to-emerald-400',
    accentColor: '#00A3A6',
    iconColor: 'text-teal-500',
    desc: '',
    svgPath: 'plax',
    imagePath: '/plano3.png'
  },
  {
    id: 'colgate-ortho-care',
    name: 'VIP 4',
    slogan: '',
    price: 500.00,
    dailyIncome: 110.00, // 22% daily
    cycleDays: 30,
    color: 'from-purple-600 to-indigo-500',
    accentColor: '#6D28D9',
    iconColor: 'text-purple-500',
    desc: '',
    svgPath: 'ortho',
    imagePath: '/plano4.png'
  },
  {
    id: 'colgate-sorriso-vip',
    name: 'VIP 5',
    slogan: '',
    price: 1500.00,
    dailyIncome: 330.00, // 22% daily
    cycleDays: 30,
    color: 'from-amber-500 to-yellow-600',
    accentColor: '#D97706',
    iconColor: 'text-amber-500',
    desc: '',
    svgPath: 'vip',
    imagePath: '/plano5.png'
  }
];

export default function ColgateInvestApp() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Current active navigation tab
  const [activeTab, setActiveTab] = useState<'home' | 'products' | 'team' | 'profile'>('home');
  
  // App States
  const [profile, setProfile] = useState<UserProfile>({
    username: 'Carregando...',
    balance: 0.00,
    totalRecharge: 0.00,
    totalWithdrawal: 0.00,
    totalIncome: 0.00,
    pixKey: '',
    pixType: 'cpf',
    idCode: 'COLG-0000',
    registerDate: '00/00/0000'
  });

  const [activePlans, setActivePlans] = useState<PurchasedPlan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Modals States
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('50.00');
  const [rechargeStep, setRechargeStep] = useState<'input' | 'qr'>('input');
  const [rechargeCpf, setRechargeCpf] = useState('43444695772');
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [rechargePixCode, setRechargePixCode] = useState('');
  const [rechargeQrCodeBase64, setRechargeQrCodeBase64] = useState('');
  const [currentTxId, setCurrentTxId] = useState<string | null>(null);
  const [copiedPixCode, setCopiedPixCode] = useState(false);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawName, setWithdrawName] = useState('');
  const [tempPixKey, setTempPixKey] = useState('');
  const [tempPixType, setTempPixType] = useState('cpf');
  const [withdrawError, setWithdrawError] = useState('');

  const [showBuyModal, setShowBuyModal] = useState<typeof PLANS_CATALOG[0] | null>(null);

  // Notifications State
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Active filter for home page plans list
  const [homePlanFilter, setHomePlanFilter] = useState<'populares' | 'meus' | 'todos'>('populares');

  // Trigger notification toast helper
  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  // Check Auth & Fetch Data
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setSessionUser(session.user);
        await loadUserData(session.user.id);
      }
      setLoadingAuth(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      } else if (session) {
        setSessionUser(session.user);
        await loadUserData(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const loadUserData = async (userId: string) => {
    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
        setProfile({
          username: profileData.username,
          balance: parseFloat(profileData.balance),
          totalRecharge: parseFloat(profileData.total_recharge),
          totalWithdrawal: parseFloat(profileData.total_withdrawal),
          totalIncome: parseFloat(profileData.total_income),
          pixKey: profileData.pix_key || '',
          pixType: profileData.pix_type || 'cpf',
          idCode: profileData.id_code,
          registerDate: new Date(profileData.created_at).toLocaleDateString('pt-BR')
        });
        setTempPixKey(profileData.pix_key || '');
        setTempPixType(profileData.pix_type || 'cpf');
      }

      // 2. Fetch Active Plans
      const { data: plansData, error: plansError } = await supabase
        .from('active_plans')
        .select('*')
        .eq('user_id', userId);

      if (plansError) {
        console.error('Error fetching plans:', plansError);
      } else if (plansData) {
        const formattedPlans: PurchasedPlan[] = plansData.map(p => ({
          id: p.id,
          planId: p.plan_id,
          name: p.name,
          price: parseFloat(p.price),
          dailyIncome: parseFloat(p.daily_income),
          cycleDays: p.cycle_days,
          purchasedAt: new Date(p.purchased_at).toLocaleString('pt-BR'),
          lastClaimedAt: p.last_claimed_at,
          earningsClaimed: parseFloat(p.earnings_claimed || 0),
          earningsAccumulated: parseFloat(p.earnings_accumulated || 0)
        }));
        setActivePlans(formattedPlans);
      }

      // 3. Fetch Transactions
      const { data: txsData, error: txsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (txsError) {
        console.error('Error fetching transactions:', txsError);
      } else if (txsData) {
        const formattedTxs: Transaction[] = txsData.map(t => ({
          id: t.id,
          type: t.type as any,
          amount: parseFloat(t.amount),
          status: t.status as any,
          date: new Date(t.created_at).toLocaleString('pt-BR'),
          details: t.details || ''
        }));
        setTransactions(formattedTxs);
      }
    } catch (e) {
      console.error('Error loading data:', e);
    }
  };

  const handleLogout = async () => {
    if (sessionUser) {
      try {
        // Final sync of balance/earnings
        await supabase.from('profiles').update({
          balance: profile.balance,
          total_income: profile.totalIncome
        }).eq('id', sessionUser.id);

        for (const plan of activePlans) {
          await supabase.from('active_plans').update({
            earnings_accumulated: plan.earningsAccumulated
          }).eq('id', plan.id);
        }
      } catch (err) {
        console.error('Error in final sync during logout:', err);
      }
    }
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ─── 24-hour yield countdown + periodic sync ────────────────────────────
  // Actual yield crediting runs SERVER-SIDE every hour via the Vercel Cron Job
  // at /api/cron/yield — independent of the user.
  // This effect drives the visual countdown AND refreshes plan data every 2 min
  // so the countdown stays accurate after a cron credit.

  const [nextYieldCountdowns, setNextYieldCountdowns] = useState<Record<string, number>>({});
  const activePlansRef = useRef(activePlans);
  activePlansRef.current = activePlans;

  useEffect(() => {
    if (activePlans.length === 0 || !sessionUser) return;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    const tick = setInterval(() => {
      const now = Date.now();
      const countdowns: Record<string, number> = {};
      for (const plan of activePlansRef.current) {
        const lastClaimed = new Date(plan.lastClaimedAt).getTime();
        const nextYield = lastClaimed + MS_PER_DAY;
        const remaining = Math.max(0, Math.round((nextYield - now) / 1000));
        countdowns[plan.id] = remaining;
      }
      setNextYieldCountdowns(countdowns);
    }, 1000);

    // Refresh active plans from DB every 2 minutes so lastClaimedAt stays in sync
    const syncHandle = setInterval(async () => {
      const { data: plansData, error: plansError } = await supabase
        .from('active_plans')
        .select('*')
        .eq('user_id', sessionUser.id);
      if (plansData && !plansError) {
        setActivePlans(plansData.map(p => ({
          id: p.id,
          planId: p.plan_id,
          name: p.name,
          price: parseFloat(p.price),
          dailyIncome: parseFloat(p.daily_income),
          cycleDays: p.cycle_days,
          purchasedAt: new Date(p.purchased_at).toLocaleString('pt-BR'),
          lastClaimedAt: p.last_claimed_at,
          earningsClaimed: parseFloat(p.earnings_claimed || 0),
          earningsAccumulated: parseFloat(p.earnings_accumulated || 0)
        })));
      }
    }, 120_000);

    return () => { clearInterval(tick); clearInterval(syncHandle); };
  }, [activePlans.length, sessionUser?.id]);

  const formatCountdown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };


  // Success handler for verified PIX payments
  const handleRechargeSuccess = async (amt: number) => {
    if (!sessionUser) return;
    
    const newBalance = profile.balance + amt;
    const newTotalRecharge = profile.totalRecharge + amt;

    const updatedProfile = {
      ...profile,
      balance: newBalance,
      totalRecharge: newTotalRecharge
    };

    // DB: Insert transaction
    const { data: txData, error: txError } = await supabase.from('transactions').insert([
      {
        user_id: sessionUser.id,
        type: 'deposit',
        amount: amt,
        status: 'completed',
        details: 'Recarga concluída via PIX'
      }
    ]).select().single();

    if (txError) {
      console.error('Error saving deposit transaction:', txError);
    }

    // DB: Update profile balance
    const { error: profileError } = await supabase.from('profiles').update({
      balance: newBalance,
      total_recharge: newTotalRecharge
    }).eq('id', sessionUser.id);

    if (profileError) {
      console.error('Error updating profile balance after deposit:', profileError);
    }

    const newTx: Transaction = {
      id: txData?.id || `tx-dep-${Date.now()}`,
      type: 'deposit',
      amount: amt,
      status: 'completed',
      date: new Date().toLocaleString('pt-BR'),
      details: 'Recarga concluída via PIX'
    };

    const updatedTxs = [newTx, ...transactions];

    setProfile(updatedProfile);
    setTransactions(updatedTxs);

    setShowRechargeModal(false);
    setRechargeStep('input');
    setCurrentTxId(null);
    triggerToast(`Recarga de R$ ${amt.toFixed(2)} recebida com sucesso! Saldo atualizado.`, 'success');
  };

  // Poll payment status to auto-approve when paid
  useEffect(() => {
    if (rechargeStep !== 'qr' || !currentTxId) return;

    let isSubscribed = true;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pix-status?txid=${currentTxId}`);
        const data = await res.json();
        
const rawStatus = data.status || (data.charge && data.charge.status) || '';
const chargeStatus = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : '';
if (chargeStatus === 'paid' || chargeStatus === 'completed') {
          clearInterval(pollInterval);
          if (isSubscribed) {
            handleRechargeSuccess(parseFloat(rechargeAmount));
          }
        }
      } catch (err) {
        console.error('Error polling payment status:', err);
      }
    }, 4000);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
    };
  }, [rechargeStep, currentTxId, rechargeAmount]);

  // Simulating Deposit (Recharge) flow
  const handleConfirmRechargeRequest = async () => {
    const amt = parseFloat(rechargeAmount);
    if (isNaN(amt) || amt < 25) {
      triggerToast('O valor mínimo para recarga é R$ 25,00', 'error');
      return;
    }

    const cleanCpf = '43444695772';

    setIsGeneratingPix(true);
    try {
      const response = await fetch('/api/pix-recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amt,
          name: profile.username,
          email: sessionUser?.email,
          cpf: cleanCpf
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao emitir pagamento via PIX');
      }

      setRechargePixCode(data.copyPaste || '');
      setRechargeQrCodeBase64(data.qrcode || '');
      setCurrentTxId(data.txid || data.id || data.charge_id || null);
      setRechargeStep('qr');
      triggerToast('PIX gerado com sucesso! Aguardando pagamento.', 'success');
    } catch (error: any) {
      console.error('Recharge PIX generation failure:', error);
      triggerToast(error.message || 'Erro ao processar transação. Tente novamente.', 'error');
    } finally {
      setIsGeneratingPix(false);
    }
  };



  // Simulating Withdrawal Flow
  const handleConfirmWithdrawal = async () => {
    if (!sessionUser) return;
    const amt = parseFloat(withdrawAmount);
    const key = profile.pixKey || tempPixKey;

    // Rule: must have at least one active plan to withdraw
    if (activePlans.length === 0) {
      setWithdrawError('Para solicitar um saque você precisa ter pelo menos um plano ativo.');
      return;
    }

    if (isNaN(amt) || amt < 10) {
      setWithdrawError('O valor mínimo de saque é R$ 10,00');
      return;
    }
    if (amt > profile.balance) {
      setWithdrawError('Saldo disponível insuficiente para este saque.');
      return;
    }
    if (!key.trim()) {
      setWithdrawError('Por favor, informe uma chave PIX para transferência.');
      return;
    }
    if (!withdrawName.trim()) {
      setWithdrawError('Por favor, informe seu nome completo para o PIX.');
      return;
    }

    setWithdrawError('');

    const fee = amt * 0.12;
    const netAmount = amt - fee;
    const newBalance = profile.balance - amt;
    const newTotalWithdrawal = profile.totalWithdrawal + amt;

    const updatedProfile = {
      ...profile,
      balance: newBalance,
      totalWithdrawal: newTotalWithdrawal,
      pixKey: key,
      pixType: tempPixType
    };

    // DB: Insert withdrawal transaction as pending
    const { data: txData, error: txError } = await supabase.from('transactions').insert([
      {
        user_id: sessionUser.id,
        type: 'withdrawal',
        amount: amt,
        status: 'pending',
        details: `Saque PIX para ${withdrawName.trim()} | chave: ${key} | taxa: ${fee.toFixed(2)} | liquido: ${netAmount.toFixed(2)}`
      }
    ]).select().single();

    if (txError) {
      console.error('Error saving withdrawal transaction:', txError);
    }

    // DB: Update profile balance and PIX settings
    const { error: profileError } = await supabase.from('profiles').update({
      balance: newBalance,
      total_withdrawal: newTotalWithdrawal,
      pix_key: key,
      pix_type: tempPixType
    }).eq('id', sessionUser.id);

    if (profileError) {
      console.error('Error updating profile after withdrawal:', profileError);
    }

    const newTx: Transaction = {
      id: txData?.id || `tx-wit-${Date.now()}`,
      type: 'withdrawal',
      amount: amt,
      status: 'pending',
      date: new Date().toLocaleString('pt-BR'),
      details: `Saque PIX para ${withdrawName.trim()} | chave: ${key} | taxa: ${fee.toFixed(2)} | liquido: ${netAmount.toFixed(2)}`
    };

    const updatedTxs = [newTx, ...transactions];

    setProfile(updatedProfile);
    setTransactions(updatedTxs);

    setShowWithdrawModal(false);
    setWithdrawAmount('');
    setWithdrawName('');
    triggerToast(`Saque de R$ ${amt.toFixed(2)} solicitado! Taxa de 12% aplicada. Você receberá R$ ${netAmount.toFixed(2)}.`, 'success');

    // No simulation: withdrawal remains pending until approved and processed by administrator.
  };

  // Purchasing investment plans
  const handleBuyPlan = async (plan: typeof PLANS_CATALOG[0]) => {
    if (profile.balance < plan.price) {
      setShowBuyModal(null);
      // Open recharge instead
      setShowRechargeModal(true);
      setRechargeAmount(plan.price.toFixed(2));
      triggerToast(`Saldo insuficiente. Adicione R$ ${(plan.price - profile.balance).toFixed(2)} para adquirir o plano.`, 'info');
      return;
    }

    if (!sessionUser) return;

    const newBalance = profile.balance - plan.price;
    const updatedProfile = {
      ...profile,
      balance: newBalance
    };

    // DB: Add active plan
    const { data: planData, error: planError } = await supabase.from('active_plans').insert([
      {
        user_id: sessionUser.id,
        plan_id: plan.id,
        name: plan.name,
        price: plan.price,
        daily_income: plan.dailyIncome,
        cycle_days: plan.cycleDays
      }
    ]).select().single();

    if (planError) {
      console.error('Error saving active plan:', planError);
    }

    // DB: Insert transaction
    const { data: txData, error: txError } = await supabase.from('transactions').insert([
      {
        user_id: sessionUser.id,
        type: 'investment',
        amount: plan.price,
        status: 'completed',
        details: `Compra do plano: ${plan.name}`
      }
    ]).select().single();

    if (txError) {
      console.error('Error saving investment transaction:', txError);
    }

    // DB: Update profile balance
    const { error: profileError } = await supabase.from('profiles').update({
      balance: newBalance
    }).eq('id', sessionUser.id);

    if (profileError) {
      console.error('Error updating profile after plan purchase:', profileError);
    }

    const newPurchasedPlan: PurchasedPlan = {
      id: planData?.id || `plan-active-${Date.now()}`,
      planId: plan.id,
      name: plan.name,
      price: plan.price,
      dailyIncome: plan.dailyIncome,
      cycleDays: plan.cycleDays,
      purchasedAt: new Date().toLocaleString('pt-BR'),
      lastClaimedAt: new Date().toISOString(),
      earningsClaimed: 0,
      earningsAccumulated: 0
    };

    const newTx: Transaction = {
      id: txData?.id || `tx-inv-${Date.now()}`,
      type: 'investment',
      amount: plan.price,
      status: 'completed',
      date: new Date().toLocaleString('pt-BR'),
      details: `Compra do plano: ${plan.name}`
    };

    const updatedPlans = [...activePlans, newPurchasedPlan];
    const updatedTxs = [newTx, ...transactions];

    setProfile(updatedProfile);
    setActivePlans(updatedPlans);
    setTransactions(updatedTxs);

    setShowBuyModal(null);
    triggerToast(`Plano ${plan.name} ativado! Rendimentos começaram a ser gerados em tempo real.`, 'success');
    
    // Jump to home active plans list
    setActiveTab('home');
    setHomePlanFilter('meus');
  };

  // Clipboard copy function helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    triggerToast(`${label} copiado com sucesso!`, 'success');
  };

  // Dynamic Colgate Product SVG drawings
  const renderProductSVG = (type: string, accent: string) => {
    switch (type) {
      case 'toothpaste':
        return (
          <svg className="w-16 h-16 drop-shadow-md" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="22" y="10" width="20" height="8" rx="2" fill="#D1D5DB" />
            <rect x="25" y="6" width="14" height="4" fill="#9CA3AF" />
            <path d="M14 18C14 18 16 35 20 54H44C48 35 50 18 50 18H14Z" fill={accent} />
            <path d="M22 18H42V54H22V18Z" fill="white" opacity="0.15" />
            <path d="M14 18C14 18 20 22 32 22C44 22 50 18 50 18" stroke="white" strokeWidth="2" />
            <path d="M18 26C18 26 26 38 18 48" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <text x="32" y="38" fill="white" fontSize="7" fontWeight="bold" textAnchor="middle" transform="rotate(-90 32 38)" fontFamily="sans-serif">Colgate</text>
            <circle cx="48" cy="48" r="3" fill="#60A5FA" opacity="0.8" />
            <circle cx="16" cy="32" r="2" fill="#60A5FA" opacity="0.6" />
          </svg>
        );
      case 'luminous':
        return (
          <svg className="w-16 h-16 drop-shadow-md" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="22" y="10" width="20" height="8" rx="2" fill="#E5E7EB" />
            <rect x="25" y="6" width="14" height="4" fill="#D1D5DB" />
            <path d="M14 18C14 18 16 35 20 54H44C48 35 50 18 50 18H14Z" fill="#004B87" />
            <path d="M14 18C14 18 20 24 32 24C44 24 50 18 50 18" fill="#E11B22" />
            <path d="M20 28L44 44" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.2" />
            <text x="32" y="38" fill="white" fontSize="6.5" fontWeight="bold" textAnchor="middle" transform="rotate(-90 32 38)">Luminous</text>
            <path d="M42 42L45 45M45 45L48 42M45 45L42 48M45 45L48 48" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="45" cy="45" r="1.5" fill="#FBBF24" />
          </svg>
        );
      case 'plax':
        return (
          <svg className="w-16 h-16 drop-shadow-md" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="24" y="6" width="16" height="8" rx="1" fill="#E11B22" />
            <path d="M26 14L24 18H40L38 14H26Z" fill="#B01015" />
            <path d="M18 20C18 20 20 24 24 24H40C44 24 46 20 46 20V52C46 55.3 43.3 58 40 58H24C20.7 58 18 55.3 18 52V20Z" fill="#38BDF8" fillOpacity="0.4" stroke="#0284C7" strokeWidth="1.5" />
            <rect x="20" y="28" width="24" height="18" rx="1" fill="#E11B22" />
            <text x="32" y="37" fill="white" fontSize="6" fontWeight="bold" textAnchor="middle">PLAX</text>
            <text x="32" y="43" fill="white" fontSize="4" textAnchor="middle">Fresh Mint</text>
            <ellipse cx="26" cy="50" rx="2" ry="1.5" fill="white" opacity="0.6" />
            <ellipse cx="36" cy="52" rx="1" ry="1" fill="white" opacity="0.6" />
          </svg>
        );
      case 'ortho':
        return (
          <svg className="w-16 h-16 drop-shadow-md" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="26" fill="#F3E8FF" stroke="#A78BFA" strokeWidth="2" />
            <path d="M16 32H48" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" />
            <path d="M22 24V40M32 24V40M42 24V40" stroke="#E11B22" strokeWidth="2" strokeLinecap="round" />
            <rect x="28" y="28" width="8" height="8" rx="1.5" fill="#7C3AED" />
            <rect x="18" y="28" width="8" height="8" rx="1.5" fill="#7C3AED" />
            <rect x="38" y="28" width="8" height="8" rx="1.5" fill="#7C3AED" />
          </svg>
        );
      case 'vip':
        return (
          <svg className="w-16 h-16 drop-shadow-md animate-pulse-gold" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="28" fill="url(#vipGrad)" />
            <path d="M20 40L24 24L32 30L40 24L44 40H20Z" fill="#F59E0B" />
            <circle cx="20" cy="24" r="2" fill="white" />
            <circle cx="32" cy="30" r="2" fill="white" />
            <circle cx="44" cy="24" r="2" fill="white" />
            <text x="32" y="48" fill="#78350F" fontSize="6.5" fontWeight="black" textAnchor="middle">VIP GOLD</text>
            <defs>
              <linearGradient id="vipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
            </defs>
          </svg>
        );
      default: // herbal
        return (
          <svg className="w-16 h-16 drop-shadow-md" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="22" y="10" width="20" height="8" rx="2" fill="#D1D5DB" />
            <path d="M14 18C14 18 16 35 20 54H44C48 35 50 18 50 18H14Z" fill="#15803D" />
            <path d="M22 18H42V54H22V18Z" fill="white" opacity="0.1" />
            <path d="M28 26C33 26 38 32 36 40C34 48 24 50 28 26Z" fill="#4ADE80" opacity="0.8" />
            <path d="M38 32C41 32 44 36 43 41C42 46 36 47 38 32Z" fill="#22C55E" opacity="0.9" />
            <text x="32" y="32" fill="white" fontSize="5.5" fontWeight="bold" textAnchor="middle" transform="rotate(-90 32 32)">HERBAL</text>
            <path d="M14 18C14 18 20 21 32 21C44 21 50 18 50 18" stroke="white" strokeWidth="2.5" />
          </svg>
        );
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Icon icon="streamline-color:cloud-refresh" className="w-8 h-8 text-colgate-red animate-spin" />
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider animate-pulse">Verificando sessão segura...</p>
        </div>
      </div>
    );
  }

  if (!sessionUser) {
    return null;
  }

  return (
    <div id="colgate-root" className="max-w-md mx-auto bg-white min-h-screen shadow-2xl relative flex flex-col pb-20 select-none overflow-x-hidden">
      
      {/* GLOBAL TOAST NOTIFICATION */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 16 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm"
          >
            <div className={`p-4 rounded-xl shadow-xl border flex items-center gap-3 ${
              showToast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              showToast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {showToast.type === 'success' ? <Icon icon="streamline-color:check" className="w-5 h-5 text-emerald-600 shrink-0" /> : <Icon icon="streamline-color:warning-triangle" className="w-5 h-5 text-rose-600 shrink-0" />}
              <span className="text-xs font-semibold">{showToast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER BAR */}
      <header id="colgate-header" className="bg-colgate-red text-white p-4 flex justify-between items-center sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          {/* Colgate Logo */}
          <img
            src="/logo.png"
            alt="Colgate Investimentos"
            className="h-10 w-auto object-contain drop-shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <button 
            id="btn-bell" 
            onClick={() => triggerToast("Sem novas notificações no momento. Escove seus dentes e aproveite seus lucros!", "info")}
            className="p-1.5 rounded-full hover:bg-white/10 relative"
          >
            <Icon icon="streamline-color:ringing-bell-notification" className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
          </button>
          
          <div id="user-badge" className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-medium">
            <Icon icon="streamline-color:user-single-neutral-male" className="w-3.5 h-3.5" />
            <span>ID: {profile.idCode}</span>
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT BODY */}
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: HOME */}
          {activeTab === 'home' && (
            <motion.div
              key="tab-home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-4"
            >

              {/* QUICK ACTION BUTTON GRID */}
              <div id="quick-actions" className="grid grid-cols-3 gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <button 
                  onClick={() => { setShowRechargeModal(true); setRechargeStep('input'); }}
                  className="flex flex-col items-center gap-1.5 text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-red-50 text-colgate-red flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <Icon icon="streamline-color:bag-dollar" className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Recarregar</span>
                </button>

                <button 
                  onClick={() => { setShowWithdrawModal(true); setWithdrawError(''); }}
                  className="flex flex-col items-center gap-1.5 text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-colgate-blue flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <Icon icon="streamline-color:payment-cash-out-3" className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Sacar</span>
                </button>

                <button 
                  onClick={() => { setHomePlanFilter('meus'); }}
                  className="flex flex-col items-center gap-1.5 text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <Icon icon="streamline-color:archive-box" className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Meus Planos</span>
                </button>
              </div>



              {/* EARNINGS DASHBOARD CARD */}
              <div id="earnings-card" className="bg-colgate-blue rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                <div className="absolute right-3 top-3 opacity-10">
                  <Icon icon="streamline-color:wallet" className="w-20 h-20" />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] text-white/70 uppercase tracking-widest font-bold">Saldo Disponível (PIX)</p>
                      <h3 className="text-3xl font-display font-extrabold tracking-tight">
                        R$ {profile.balance.toFixed(2)}
                      </h3>
                    </div>
                    <div className="bg-white/20 text-white font-bold text-[10px] py-1 px-2.5 rounded-full flex items-center gap-1">
                      <Icon icon="streamline-color:shield-check" className="w-3 h-3 text-emerald-300" />
                      Ativo
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/10 text-center">
                    <div>
                      <p className="text-[10px] text-white/60 uppercase">Rendimento Acumulado</p>
                      <p className="text-sm font-bold text-green-300">R$ {profile.totalIncome.toFixed(3)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/60 uppercase">Total Recarregado</p>
                      <p className="text-sm font-bold text-blue-100">R$ {profile.totalRecharge.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEGMENT SWITCH TABS */}
              <div id="segment-switch" className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  onClick={() => setHomePlanFilter('populares')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${homePlanFilter === 'populares' ? 'bg-white text-colgate-red shadow-sm' : 'text-slate-500'}`}
                >
                  Populares
                </button>
                <button 
                  onClick={() => setHomePlanFilter('meus')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${homePlanFilter === 'meus' ? 'bg-white text-colgate-red shadow-sm' : 'text-slate-500'}`}
                >
                  Meus Planos ({activePlans.length})
                </button>
                <button 
                  onClick={() => setHomePlanFilter('todos')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${homePlanFilter === 'todos' ? 'bg-white text-colgate-red shadow-sm' : 'text-slate-500'}`}
                >
                  Todos
                </button>
              </div>

              {/* LIST OF PLANS */}
              <div className="space-y-3">
                {homePlanFilter === 'populares' && (
                  PLANS_CATALOG.slice(0, 3).map(plan => (
                    <div key={plan.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex gap-4 items-center shadow-sm relative hover:border-slate-200 transition-all">
                      <div className="shrink-0 bg-slate-50 p-1 border border-slate-100 rounded-xl h-20 w-20 flex items-center justify-center overflow-hidden">
                        {plan.imagePath ? (
                          <img src={plan.imagePath} alt={plan.name} className="w-full h-full object-contain rounded-lg" />
                        ) : (
                          renderProductSVG(plan.svgPath, plan.accentColor)
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-bold text-slate-800">{plan.name}</h4>
                          <span className="text-[10px] font-bold text-colgate-red bg-red-50 px-2 py-0.5 rounded-full">5.0% - 7.0%/dia</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] text-slate-600 border-t border-slate-50">
                          <div>
                            <span className="block text-slate-400 font-semibold uppercase text-[8px]">Preço</span>
                            <span className="font-bold text-slate-800">R$ {plan.price.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="block text-slate-400 font-semibold uppercase text-[8px]">Diário</span>
                            <span className="font-bold text-emerald-600">+R$ {plan.dailyIncome.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="block text-slate-400 font-semibold uppercase text-[8px]">Retorno</span>
                            <span className="font-bold text-colgate-blue">R$ {(plan.dailyIncome * plan.cycleDays).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowBuyModal(plan)}
                        className="bg-colgate-red hover:bg-colgate-dark-red text-white text-[11px] font-bold py-2 px-3 rounded-lg shadow-sm transition-colors uppercase"
                      >
                        Comprar
                      </button>
                    </div>
                  ))
                )}

                {homePlanFilter === 'meus' && (
                  activePlans.length === 0 ? (
                    <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                      <Icon icon="streamline-color:archive-box" className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-500 font-semibold">Nenhum plano ativado ainda.</p>
                      <button 
                        onClick={() => setActiveTab('products')} 
                        className="text-xs font-bold text-colgate-red hover:underline"
                      >
                        Comprar meu primeiro plano agora
                      </button>
                    </div>
                  ) : (
                    activePlans.map(plan => {
                      const baseCatalogPlan = PLANS_CATALOG.find(p => p.id === plan.planId);
                      return (
                        <div key={plan.id} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm relative overflow-hidden">
                          {/* Top active bar */}
                          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse" />
                          <div className="flex gap-3 items-center">
                            <div className="shrink-0 bg-slate-50 p-1 border border-slate-100 rounded-lg h-16 w-16 flex items-center justify-center overflow-hidden">
                              {baseCatalogPlan?.imagePath ? (
                                <img src={baseCatalogPlan.imagePath} alt={baseCatalogPlan.name} className="w-full h-full object-contain rounded" />
                              ) : (
                                renderProductSVG(baseCatalogPlan?.svgPath || 'toothpaste', baseCatalogPlan?.accentColor || '#E11B22')
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <h4 className="text-xs font-bold text-slate-800">{plan.name}</h4>
                                <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Icon icon="streamline-color:cloud-refresh" className="w-2.5 h-2.5 animate-spin" /> Gerando
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400">Ativado em: {plan.purchasedAt}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-[10px] text-center font-semibold">
                            <div>
                              <p className="text-slate-400 text-[8px] uppercase">Preço Inicial</p>
                              <p className="text-slate-800">R$ {plan.price.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-[8px] uppercase">Rendimento Diário</p>
                              <p className="text-emerald-600">+R$ {plan.dailyIncome.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-[8px] uppercase">Acumulado Total</p>
                              <p className="text-colgate-blue font-bold">R$ {plan.earningsAccumulated.toFixed(2)}</p>
                            </div>
                          </div>

                          {/* 24h countdown to next yield */}
                          <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <Icon icon="streamline-color:clock-1" className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="text-[9px] font-extrabold text-emerald-700 uppercase tracking-wide">Próximo rendimento em</span>
                            </div>
                            <span className="font-black text-emerald-700 text-sm font-mono tracking-widest">
                              {nextYieldCountdowns[plan.id] !== undefined
                                ? nextYieldCountdowns[plan.id] === 0
                                  ? '⏳ Creditando...'
                                  : formatCountdown(nextYieldCountdowns[plan.id])
                                : '--:--:--'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )
                )}

                {homePlanFilter === 'todos' && (
                  PLANS_CATALOG.map(plan => (
                    <div key={plan.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex gap-4 items-center shadow-sm relative hover:border-slate-200 transition-all">
                      <div className="shrink-0 bg-slate-50 p-1 border border-slate-100 rounded-xl h-20 w-20 flex items-center justify-center overflow-hidden">
                        {plan.imagePath ? (
                          <img src={plan.imagePath} alt={plan.name} className="w-full h-full object-contain rounded-lg" />
                        ) : (
                          renderProductSVG(plan.svgPath, plan.accentColor)
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-bold text-slate-800">{plan.name}</h4>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] text-slate-600 border-t border-slate-50">
                          <div>
                            <span className="block text-slate-400 font-semibold uppercase text-[8px]">Preço</span>
                            <span className="font-bold text-slate-800">R$ {plan.price.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="block text-slate-400 font-semibold uppercase text-[8px]">Rendimento</span>
                            <span className="font-bold text-emerald-600">+R$ {plan.dailyIncome.toFixed(2)}/dia</span>
                          </div>
                          <div>
                            <span className="block text-slate-400 font-semibold uppercase text-[8px]">Retorno</span>
                            <span className="font-bold text-colgate-blue">R$ {(plan.dailyIncome * plan.cycleDays).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowBuyModal(plan)}
                        className="bg-colgate-red hover:bg-colgate-dark-red text-white text-[11px] font-bold py-2 px-3 rounded-lg shadow-sm transition-colors uppercase"
                      >
                        Ativar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 2: PRODUCTS CATALOG */}
          {activeTab === 'products' && (
            <motion.div
              key="tab-products"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-4"
            >
              <div className="text-center space-y-1">
                <h2 className="text-lg font-display font-bold text-slate-800">Planos de Investimento Oral Care</h2>
                <p className="text-xs text-slate-500">Escolha a fórmula perfeita de rendimento para o seu sorriso financeiro.</p>
              </div>

              <div className="space-y-4">
                {PLANS_CATALOG.map(plan => (
                  <div key={plan.id} className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
                    {/* Large Product Hero Image Container */}
                    <div className="bg-slate-50/70 p-6 flex items-center justify-center h-48 border-b border-slate-55 relative group">
                      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${plan.color}`} />
                      {plan.imagePath ? (
                        <img 
                          src={plan.imagePath} 
                          alt={plan.name} 
                          className="h-full w-auto object-contain transition-transform duration-300 group-hover:scale-105" 
                        />
                      ) : (
                        <div className="w-20 h-20 flex items-center justify-center">
                          {renderProductSVG(plan.svgPath, plan.accentColor)}
                        </div>
                      )}
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-base font-extrabold text-slate-800 tracking-tight">{plan.name}</h3>
                        <span className="text-[9px] font-bold text-colgate-red bg-red-50 px-2.5 py-1 rounded-full uppercase">Fórmula Ativa</span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                        <div className="space-y-1">
                          <p className="text-slate-400 uppercase text-[9px] font-extrabold tracking-wider">Preço</p>
                          <p className="text-slate-800 font-black text-sm">R$ {plan.price.toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400 uppercase text-[9px] font-extrabold tracking-wider">Rendimento</p>
                          <p className="text-emerald-600 font-black text-sm">R$ {plan.dailyIncome.toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400 uppercase text-[9px] font-extrabold tracking-wider">Estimado</p>
                          <p className="text-colgate-blue font-black text-sm">R$ {(plan.dailyIncome * plan.cycleDays).toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400 uppercase text-[9px] font-extrabold tracking-wider">Ciclo</p>
                          <p className="text-slate-700 font-black text-sm">{plan.cycleDays} Dias</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Icon icon="streamline-color:shield-check" className="w-3.5 h-3.5 text-colgate-red" /> Seguro Colgate
                        </span>
                        <button 
                          onClick={() => setShowBuyModal(plan)}
                          className="bg-colgate-red hover:bg-colgate-dark-red text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2"
                        >
                          Ativar Plano <Icon icon="streamline-color:arrow-round-right" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}



          {/* TAB 4: TEAM / REFERRAL NETWORK */}
          {activeTab === 'team' && (
            <motion.div
              key="tab-team"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-4"
            >
              <div className="text-center space-y-1">
                <h2 className="text-lg font-display font-bold text-slate-800">Programa de Afiliados Colgate</h2>
                <p className="text-xs text-slate-500">Convide amigos para escovarem lucros juntos e ganhe comissão!</p>
              </div>

              {/* Commission statistics box */}
              <div className="bg-gradient-to-r from-colgate-red to-red-800 text-white rounded-2xl p-5 shadow-md grid grid-cols-3 gap-2 text-center relative overflow-hidden">
                <div className="space-y-1">
                  <span className="text-[10px] text-white/70 block">Time Total</span>
                  <span className="text-lg font-bold">4 Afiliados</span>
                </div>
                <div className="space-y-1 border-x border-white/10">
                  <span className="text-[10px] text-white/70 block">Ganhos de Indicação</span>
                  <span className="text-lg font-bold text-green-300">R$ 15,00</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-white/70 block">Seu Nível</span>
                  <span className="text-lg font-bold text-amber-300">Vip Bronze</span>
                </div>
              </div>

              {/* Copy Invite Links */}
              <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm">
                <h3 className="text-xs font-bold text-slate-800">Compartilhe e Ganhe</h3>
                
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-semibold block uppercase">Código de Convite</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 flex items-center">
                      COLG-INV-{profile.idCode}
                    </div>
                    <button 
                      onClick={() => copyToClipboard(`COLG-INV-${profile.idCode}`, "Código de convite")}
                      className="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl text-slate-600 transition-colors shrink-0"
                    >
                      <Icon icon="streamline-color:copy-paste" className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-semibold block uppercase">Link de Afiliado Exclusivo</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap flex items-center">
                      {process.env.NEXT_PUBLIC_APP_URL || 'https://www.colgates.online'}/?ref={profile.idCode}
                    </div>
                    <button 
                      onClick={() => copyToClipboard(`${process.env.NEXT_PUBLIC_APP_URL || 'https://www.colgates.online'}/?ref=${profile.idCode}`, "Link de afiliado")}
                      className="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl text-slate-600 transition-colors shrink-0"
                    >
                      <Icon icon="streamline-color:copy-paste" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Commission rules list */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-colgate-blue flex items-center gap-1.5">
                  <Icon icon="streamline-color:magic-wand-2" className="w-4 h-4" /> Níveis de Comissão Colgate
                </h3>
                <ul className="text-xs space-y-2 text-slate-600">
                  <li className="flex justify-between">
                    <span>Nível 1 (🥇 Indicação Direta):</span>
                    <span className="font-bold text-colgate-red">23% de Bônus</span>
                  </li>
                  <li className="flex justify-between border-t border-slate-100 pt-2">
                    <span>Nível 2 (🥈 Indicação do seu Indicado):</span>
                    <span className="font-bold text-slate-700">4% de Bônus</span>
                  </li>
                  <li className="flex justify-between border-t border-slate-100 pt-2">
                    <span>Nível 3 (🥉):</span>
                    <span className="font-bold text-slate-500">1% de Bônus</span>
                  </li>
                </ul>
              </div>

              {/* Invited friends list */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-800">Seus Indicados Ativos</h3>
                <div className="space-y-2">
                  <div className="bg-white border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800">Lucas Santos</p>
                      <p className="text-[10px] text-slate-400">Registrado em: 07/07/2026</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Ativo</span>
                      <p className="font-bold text-slate-700 mt-1">Investido: R$ 50,00</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800">Ana Júlia Lima</p>
                      <p className="text-[10px] text-slate-400">Registrada em: 08/07/2026</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Ativo</span>
                      <p className="font-bold text-slate-700 mt-1">Investido: R$ 100,00</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs opacity-60">
                    <div>
                      <p className="font-bold text-slate-800">Matheus Moreira</p>
                      <p className="text-[10px] text-slate-400">Registrado em: 08/07/2026</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">Pendente</span>
                      <p className="font-bold text-slate-500 mt-1">Investido: R$ 0,00</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 5: USER PROFILE */}
          {activeTab === 'profile' && (
            <motion.div
              key="tab-profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 space-y-4"
            >
              {/* User Bio Card */}
              <div className="bg-white border border-slate-100 rounded-2xl p-4 flex gap-4 items-center shadow-sm">
                <div className="w-16 h-16 rounded-full bg-colgate-red text-white flex items-center justify-center font-display font-extrabold text-2xl shadow-inner uppercase">
                  {profile.username.substring(0, 2)}
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800">{profile.username}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Membro VIP Colgate desde {profile.registerDate}</p>
                  <p className="text-xs font-semibold text-slate-600">PIX Cadastrado: {profile.pixKey || <span className="text-rose-500">Pendente de Chave</span>}</p>
                </div>
              </div>

              {/* Financial Box Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Investido Total</span>
                  <span className="text-base font-bold text-slate-800">
                    R$ {activePlans.reduce((acc, p) => acc + p.price, 0).toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Sacado</span>
                  <span className="text-base font-bold text-slate-800">
                    R$ {profile.totalWithdrawal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Register/Modify PIX Key Area */}
              <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Icon icon="streamline-color:wallet" className="w-4 h-4 text-colgate-red" /> Chave PIX de Saque
                </h3>
                
                <div className="space-y-3">
                  <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                    {['cpf', 'email', 'telefone', 'aleatoria'].map(type => (
                      <button
                        key={type}
                        onClick={() => setTempPixType(type)}
                        className={`flex-1 py-1.5 text-[9px] uppercase font-black rounded-lg transition-all ${tempPixType === type ? 'bg-white text-colgate-red shadow-sm' : 'text-slate-500'}`}
                      >
                        {type === 'aleatoria' ? 'Chave Aleat.' : type}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder={
                        tempPixType === 'cpf' ? '000.000.000-00' :
                        tempPixType === 'email' ? 'exemplo@colgate.com' :
                        tempPixType === 'telefone' ? '(11) 99999-9999' :
                        'Informe sua chave PIX completa'
                      }
                      value={tempPixKey || profile.pixKey}
                      onChange={(e) => setTempPixKey(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-colgate-red"
                    />
                    <button
                      onClick={async () => {
                        if (!tempPixKey.trim()) {
                          triggerToast('Escreva sua chave PIX antes de salvar.', 'error');
                          return;
                        }
                        const updated = { ...profile, pixKey: tempPixKey, pixType: tempPixType };
                        setProfile(updated);
                        
                        if (sessionUser) {
                          const { error } = await supabase.from('profiles').update({
                            pix_key: tempPixKey,
                            pix_type: tempPixType
                          }).eq('id', sessionUser.id);
                          if (error) {
                            console.error('Error saving PIX key to DB:', error);
                            triggerToast('Erro ao salvar no banco de dados.', 'error');
                            return;
                          }
                        }
                        triggerToast('Chave PIX atualizada e salva!', 'success');
                      }}
                      className="bg-colgate-blue hover:bg-blue-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-colors"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>

              {/* Transactions History Log */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Icon icon="streamline-color:graph-arrow-increase" className="w-4 h-4 text-colgate-red" /> Histórico de Transações
                </h3>
                <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar pr-1">
                  {transactions.map(tx => (
                    <div key={tx.id} className="bg-white border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs shadow-sm">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            tx.type === 'deposit' ? 'bg-emerald-500' : 
                            tx.type === 'withdrawal' ? 'bg-blue-500' : 
                            tx.type === 'investment' ? 'bg-rose-500' : 'bg-yellow-500'
                          }`} />
                          <p className="font-bold text-slate-800 capitalize">{
                            tx.type === 'deposit' ? 'Depósito' : 
                            tx.type === 'withdrawal' ? 'Saque' : 
                            tx.type === 'investment' ? 'Investimento' : 'Rendimento'
                          }</p>
                        </div>
                        <p className="text-[9px] text-slate-400 font-semibold">{tx.date}</p>
                        <p className="text-[10px] text-slate-500">{tx.details}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className={`font-black ${
                          tx.type === 'deposit' || tx.type === 'yield' ? 'text-emerald-600' : 'text-slate-800'
                        }`}>
                          {tx.type === 'deposit' || tx.type === 'yield' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                        </p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          tx.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          tx.status === 'pending' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {tx.status === 'completed' ? 'Sucesso' : tx.status === 'pending' ? 'Processando' : 'Falhou'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logout Button */}
              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Sessão Ativa</h4>
                  <p className="text-[10px] text-slate-500">Desconectar e salvar seus dados com segurança.</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="bg-colgate-red hover:bg-colgate-dark-red text-white text-[11px] font-bold py-2 px-3.5 rounded-xl transition-all shadow-sm"
                >
                  Sair da Conta
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* BOTTOM NAVIGATION TAB BAR */}
      <nav id="bottom-navbar" className="fixed bottom-0 max-w-md w-full bg-white border-t border-slate-150 py-2.5 px-4 grid grid-cols-4 gap-1 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] rounded-t-2xl">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 text-center ${activeTab === 'home' ? 'text-colgate-red' : 'text-slate-400'}`}
        >
          <Icon icon="streamline-color:home-3" className={`w-5.5 h-5.5 transition-all ${activeTab === 'home' ? 'grayscale-0 opacity-100 scale-105' : 'grayscale opacity-60'}`} />
          <span className="text-[9px] font-extrabold uppercase tracking-tight">Início</span>
        </button>

        <button 
          onClick={() => setActiveTab('products')}
          className={`flex flex-col items-center gap-1 text-center ${activeTab === 'products' ? 'text-colgate-red' : 'text-slate-400'}`}
        >
          <Icon icon="streamline-color:archive-box" className={`w-5.5 h-5.5 transition-all ${activeTab === 'products' ? 'grayscale-0 opacity-100 scale-105' : 'grayscale opacity-60'}`} />
          <span className="text-[9px] font-extrabold uppercase tracking-tight">Produtos</span>
        </button>

        <button 
          onClick={() => setActiveTab('team')}
          className={`flex flex-col items-center gap-1 text-center ${activeTab === 'team' ? 'text-colgate-red' : 'text-slate-400'}`}
        >
          <Icon icon="streamline-color:user-multiple-group" className={`w-5.5 h-5.5 transition-all ${activeTab === 'team' ? 'grayscale-0 opacity-100 scale-105' : 'grayscale opacity-60'}`} />
          <span className="text-[9px] font-extrabold uppercase tracking-tight">Equipe</span>
        </button>

        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 text-center ${activeTab === 'profile' ? 'text-colgate-red' : 'text-slate-400'}`}
        >
          <Icon icon="streamline-color:user-single-neutral-male" className={`w-5.5 h-5.5 transition-all ${activeTab === 'profile' ? 'grayscale-0 opacity-100 scale-105' : 'grayscale opacity-60'}`} />
          <span className="text-[9px] font-extrabold uppercase tracking-tight">Perfil</span>
        </button>
      </nav>

      {/* RECHARGE MODAL FLOW */}
      <AnimatePresence>
        {showRechargeModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
              <div className="bg-colgate-red p-4 text-white text-center">
                <h3 className="text-base font-bold">Recarga Colgate via PIX</h3>
                <p className="text-[10px] text-white/80">Adicione saldo instantaneamente na sua carteira</p>
              </div>

              <div className="p-5 space-y-4">
                {isGeneratingPix ? (
                  <div className="py-12 flex flex-col justify-center items-center gap-3">
                    <Icon icon="streamline-color:cloud-refresh" className="w-8 h-8 text-colgate-red animate-spin" />
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider animate-pulse">Gerando PIX com segurança...</p>
                  </div>
                ) : rechargeStep === 'input' ? (
                  <>
                    <div className="space-y-1 text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Selecione ou digite um valor</p>
                      <div className="text-2xl font-bold text-slate-800 flex items-center justify-center">
                        <span>R$</span>
                        <input 
                          type="number" 
                          value={rechargeAmount}
                          onChange={(e) => setRechargeAmount(e.target.value)}
                          className="w-28 text-center bg-transparent focus:outline-none font-extrabold text-3xl text-colgate-red border-b border-dashed border-slate-300 ml-1 pb-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {['25.00', '50.00', '100.00', '500.00', '1500.00', '5000.00'].map(val => (
                        <button
                          key={val}
                          onClick={() => setRechargeAmount(val)}
                          className={`py-2 text-xs font-bold border rounded-xl transition-all ${
                            rechargeAmount === val ? 'bg-red-50 border-colgate-red text-colgate-red shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          R$ {parseFloat(val).toFixed(0)}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2 pt-3">
                      <button
                        onClick={handleConfirmRechargeRequest}
                        className="w-full bg-colgate-red hover:bg-colgate-dark-red text-white py-3 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1"
                      >
                        <Icon icon="streamline-color:qr-code" className="w-4 h-4" /> Gerar Chave de Pagamento PIX
                      </button>
                      <button
                        onClick={() => setShowRechargeModal(false)}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 text-center">
                    <p className="text-[10px] text-amber-600 bg-amber-50 py-1.5 px-3 rounded-full font-bold inline-block">
                      Aguardando confirmação de pagamento
                    </p>

                    {/* QR Code representation */}
                    <div className="bg-slate-50 p-4 rounded-2xl inline-block border border-slate-200 relative">
                      {rechargePixCode || rechargeQrCodeBase64 ? (
                        <img 
                          src={
                            rechargeQrCodeBase64 && (rechargeQrCodeBase64.startsWith('http') || rechargeQrCodeBase64.startsWith('data:image/'))
                              ? rechargeQrCodeBase64 
                              : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(rechargePixCode || rechargeQrCodeBase64)}`
                          } 
                          className="w-36 h-36 mx-auto rounded-xl shadow-sm bg-white p-1" 
                          alt="PIX QR Code" 
                        />
                      ) : (
                        <div className="w-36 h-36 mx-auto flex items-center justify-center bg-slate-100 text-[10px] text-slate-400 font-bold rounded-xl">
                          Sem QR Code
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-800 font-sans">Código PIX Copia e Cola</p>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[9px] font-mono text-slate-500 overflow-y-auto max-h-16 break-all text-left select-all">
                          {rechargePixCode}
                        </div>
                        <button
                          onClick={() => {
                            copyToClipboard(rechargePixCode, "PIX Copia e Cola");
                            setCopiedPixCode(true);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl text-slate-600 transition-colors shrink-0 flex items-center justify-center"
                        >
                          <Icon icon="streamline-color:copy-paste" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-center gap-2 text-[10px] text-emerald-600 bg-emerald-50 py-2.5 px-3 rounded-xl font-bold animate-pulse">
                        <Icon icon="streamline-color:cloud-refresh" className="w-4 h-4 animate-spin text-emerald-500" />
                        <span>Aguardando recebimento do PIX automático...</span>
                      </div>
                      <button
                        onClick={() => {
                          setShowRechargeModal(false);
                          setRechargeStep('input');
                          setCurrentTxId(null);
                        }}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs transition-colors"
                      >
                        Fechar Janela
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WITHDRAW MODAL FLOW */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
              <div className="bg-colgate-blue p-4 text-white text-center">
                <h3 className="text-base font-bold">Solicitar Saque PIX</h3>
                <p className="text-[10px] text-white/80">Transfira seus rendimentos Colgate para sua conta corrente</p>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Seu Saldo Disponível</span>
                  <span className="text-2xl font-black text-slate-800">R$ {profile.balance.toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Nome Completo do Titular</label>
                  <div className="flex bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 items-center gap-2">
                    <Icon icon="streamline-color:user-single-neutral-male" className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Nome conforme cadastro no banco"
                      value={withdrawName}
                      onChange={(e) => setWithdrawName(e.target.value)}
                      className="flex-1 bg-transparent focus:outline-none text-slate-800 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Valor para Saque (Mínimo R$ 10,00)</label>
                  <div className="flex bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 items-center">
                    <span className="font-bold text-slate-400 text-xs mr-1">R$</span>
                    <input 
                      type="number" 
                      placeholder="0,00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="flex-1 bg-transparent focus:outline-none text-slate-800 text-sm font-bold"
                    />
                    <button 
                      onClick={() => setWithdrawAmount(profile.balance.toFixed(2))}
                      className="text-[9px] font-black text-colgate-red bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md uppercase shrink-0 transition-colors"
                    >
                      Máximo
                    </button>
                  </div>
                </div>

                {/* Fee calculation display */}
                {(() => {
                  const amt = parseFloat(withdrawAmount);
                  if (!isNaN(amt) && amt > 0) {
                    const fee = amt * 0.12;
                    const net = amt - fee;
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">Valor solicitado</span>
                          <span className="font-bold text-slate-800">R$ {amt.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">Taxa de saque (12%)</span>
                          <span className="font-bold text-red-500">- R$ {fee.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-amber-200 pt-1.5 flex justify-between text-[11px]">
                          <span className="font-bold text-slate-600">Você recebe</span>
                          <span className="font-black text-emerald-600">R$ {net.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {!profile.pixKey && (
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase block">Chave PIX de Destino</label>
                    <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                      {['cpf', 'email', 'telefone', 'aleatoria'].map(t => (
                        <button
                          key={t}
                          onClick={() => setTempPixType(t)}
                          className={`flex-1 py-1 text-[8px] uppercase font-black rounded-md transition-all ${tempPixType === t ? 'bg-white text-colgate-blue shadow-sm' : 'text-slate-500'}`}
                        >
                          {t === 'aleatoria' ? 'Chave Aleat.' : t}
                        </button>
                      ))}
                    </div>
                    <input 
                      type="text" 
                      placeholder="Insira sua Chave PIX"
                      value={tempPixKey}
                      onChange={(e) => setTempPixKey(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-colgate-blue"
                    />
                  </div>
                )}

                {withdrawError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl flex items-center gap-2 text-[10px] font-semibold">
                    <Icon icon="streamline-color:warning-triangle" className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{withdrawError}</span>
                  </div>
                )}

                {/* Active plan requirement rule banner */}
                <div className={`p-3.5 rounded-xl text-[9px] font-semibold leading-relaxed border ${
                  activePlans.length > 0
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <p className="font-bold uppercase flex items-center gap-1 mb-1">
                    <Icon icon={activePlans.length > 0 ? 'streamline-color:shield-check' : 'streamline-color:warning-triangle'} className="w-3.5 h-3.5 shrink-0" />
                    {activePlans.length > 0 ? `Plano ativo: ${activePlans[0].name}` : 'Plano ativo obrigatório'}
                  </p>
                  {activePlans.length === 0 && (
                    <p>Para solicitar um saque você precisa ter pelo menos <strong>um plano ativo</strong>. Ative um plano na aba de produtos e volte aqui.</p>
                  )}
                </div>

                <div className="bg-blue-50 text-colgate-blue p-3.5 rounded-xl text-[9px] font-semibold leading-relaxed space-y-1">
                  <p className="font-bold uppercase flex items-center gap-1">
                    <Icon icon="streamline-color:help-question-1" className="w-3.5 h-3.5 text-colgate-blue" /> Informações Importantes
                  </p>
                  <p>• A taxa de saque é de <strong>12%</strong> sobre o valor solicitado.</p>
                  <p>• Para solicitar um saque é necessário ter um <strong>plano ativo</strong>.</p>
                  <p>• O valor do saque é creditado em até <strong>1 dia útil</strong>.</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={handleConfirmWithdrawal}
                    disabled={activePlans.length === 0}
                    className="w-full bg-colgate-blue hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-xs shadow-sm transition-all"
                  >
                    Confirmar Solicitação de Saque
                  </button>
                  <button
                    onClick={() => setShowWithdrawModal(false)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PLAN PURCHASE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showBuyModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
              <div className={`p-4 text-white text-center bg-gradient-to-r ${showBuyModal.color}`}>
                <h3 className="text-base font-bold">Ativar {showBuyModal.name}</h3>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-slate-600 text-center leading-relaxed">
                    Você está prestes a ativar o pacote de investimentos temático <strong>{showBuyModal.name}</strong> por <strong>R$ {showBuyModal.price.toFixed(2)}</strong>.
                  </p>

                  <div className="bg-slate-50 rounded-2xl p-4 space-y-3.5 border border-slate-100 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-400">Rendimento Diário</span>
                      <span className="text-emerald-600">+R$ {showBuyModal.dailyIncome.toFixed(2)} / dia</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t border-slate-100 pt-2">
                      <span className="text-slate-400">Ciclo Contratual</span>
                      <span className="text-slate-800">{showBuyModal.cycleDays} Dias</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t border-slate-100 pt-2">
                      <span className="text-slate-400">Retorno Bruto Estimado</span>
                      <span className="text-colgate-blue font-bold">R$ {(showBuyModal.dailyIncome * showBuyModal.cycleDays).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t border-slate-100 pt-2">
                      <span className="text-slate-400">Seu Saldo Disponível</span>
                      <span className={profile.balance >= showBuyModal.price ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                        R$ {profile.balance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {profile.balance < showBuyModal.price && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl flex items-center gap-2 text-[10px] font-semibold leading-relaxed">
                    <Icon icon="streamline-color:warning-triangle" className="w-5 h-5 text-rose-600 shrink-0" />
                    <p>Seu saldo é insuficiente para esta compra. Você será redirecionado para a recarga de R$ {showBuyModal.price.toFixed(2)} para completar.</p>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleBuyPlan(showBuyModal)}
                    className={`w-full text-white py-3 rounded-xl font-bold text-xs shadow-sm transition-all ${
                      profile.balance >= showBuyModal.price 
                        ? 'bg-colgate-red hover:bg-colgate-dark-red' 
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {profile.balance >= showBuyModal.price ? 'Confirmar Compra' : 'Recarregar Valor via PIX'}
                  </button>
                  <button
                    onClick={() => setShowBuyModal(null)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
