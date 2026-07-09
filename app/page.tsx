'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  Package, 
  Headphones, 
  Users, 
  User, 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  ChevronRight, 
  Timer, 
  Calendar, 
  Sparkles, 
  DollarSign, 
  Wallet,
  ShieldCheck,
  RefreshCw,
  Bell,
  HelpCircle,
  QrCode
} from 'lucide-react';
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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// Fixed Colgate plans catalog
const PLANS_CATALOG = [
  {
    id: 'colgate-total-12',
    name: 'Colgate Total 12 Active',
    slogan: 'Prevenção completa de cáries e lucros garantidos.',
    price: 10.00,
    dailyIncome: 0.50, // 5% daily
    cycleDays: 30,
    color: 'from-red-500 to-rose-600',
    accentColor: '#E11B22',
    iconColor: 'text-red-500',
    desc: 'O plano básico ideal para escovar seus primeiros rendimentos diários sem risco.',
    svgPath: 'toothpaste'
  },
  {
    id: 'colgate-luminous-white',
    name: 'Colgate Luminous White',
    slogan: 'Um sorriso e um saldo bancário radiantes.',
    price: 50.00,
    dailyIncome: 3.00, // 6% daily
    cycleDays: 30,
    color: 'from-blue-600 to-sky-500',
    accentColor: '#004B87',
    iconColor: 'text-blue-500',
    desc: 'Clareamento financeiro acelerado. Sinta a refrescância dos rendimentos constantes.',
    svgPath: 'luminous'
  },
  {
    id: 'colgate-plax-fresh',
    name: 'Colgate Plax Fresh',
    slogan: 'Refrescância financeira de longo alcance.',
    price: 150.00,
    dailyIncome: 10.50, // 7% daily
    cycleDays: 30,
    color: 'from-teal-500 to-emerald-400',
    accentColor: '#00A3A6',
    iconColor: 'text-teal-500',
    desc: 'Elimina as dúvidas e traz lucros de longo prazo com o poder refrescante do Plax.',
    svgPath: 'plax'
  },
  {
    id: 'colgate-ortho-care',
    name: 'Colgate Ortho Care',
    slogan: 'Alinhamento impecável para o seu orçamento.',
    price: 500.00,
    dailyIncome: 40.00, // 8% daily
    cycleDays: 30,
    color: 'from-purple-600 to-indigo-500',
    accentColor: '#6D28D9',
    iconColor: 'text-purple-500',
    desc: 'Para quem usa aparelho ou deseja alinhar sua conta bancária rumo à independência.',
    svgPath: 'ortho'
  },
  {
    id: 'colgate-sorriso-vip',
    name: 'Colgate Sorriso VIP Gold',
    slogan: 'O brilho máximo digno de comercial de TV.',
    price: 1500.00,
    dailyIncome: 150.00, // 10% daily
    cycleDays: 30,
    color: 'from-amber-500 to-yellow-600',
    accentColor: '#D97706',
    iconColor: 'text-amber-500',
    desc: 'O mais cobiçado tratamento estético para sua carteira. Rendimentos nível ouro.',
    svgPath: 'vip'
  },
  {
    id: 'colgate-herbal-premium',
    name: 'Colgate Herbal Organics',
    slogan: 'Fórmula natural de crescimento financeiro.',
    price: 5000.00,
    dailyIncome: 600.00, // 12% daily
    cycleDays: 30,
    color: 'from-green-600 to-emerald-700',
    accentColor: '#15803D',
    iconColor: 'text-green-600',
    desc: 'Extratos de ervas selecionadas que irrigam sua conta com lucros orgânicos incríveis.',
    svgPath: 'herbal'
  }
];

export default function ColgateInvestApp() {
  // Current active navigation tab
  const [activeTab, setActiveTab] = useState<'home' | 'products' | 'support' | 'team' | 'profile'>('home');
  
  // App States
  const [profile, setProfile] = useState<UserProfile>({
    username: 'Investidor Colgate',
    balance: 10.00, // R$ 10 free starting bonus
    totalRecharge: 0.00,
    totalWithdrawal: 0.00,
    totalIncome: 0.00,
    pixKey: '',
    pixType: 'cpf',
    idCode: 'COLG-4981',
    registerDate: '08/07/2026'
  });

  const [activePlans, setActivePlans] = useState<PurchasedPlan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'tx-0',
      type: 'yield',
      amount: 10.00,
      status: 'completed',
      date: '08/07/2026 12:00',
      details: 'Bônus Colgate de boas-vindas'
    }
  ]);

  // Support Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-start',
      role: 'assistant',
      content: 'Olá! Sou a Dra. Sorriso, sua consultora de bem-estar bucal e financeiro na Colgate Investimentos. 🪥✨ Como posso clarear suas dúvidas hoje? Posso te explicar sobre nossos planos de rendimento, como fazer saques via PIX ou dar dicas de escovação!'
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Modals States
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('50.00');
  const [rechargeStep, setRechargeStep] = useState<'input' | 'qr'>('input');
  const [copiedPixCode, setCopiedPixCode] = useState(false);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
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

  // Load state from LocalStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('colgate_profile');
    const savedPlans = localStorage.getItem('colgate_plans');
    const savedTransactions = localStorage.getItem('colgate_transactions');

    if (savedProfile) setProfile(JSON.parse(savedProfile));
    if (savedPlans) setActivePlans(JSON.parse(savedPlans));
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    
    // Randomize a custom registration ID on first load if not set
    if (!savedProfile) {
      const randomID = `COLG-${Math.floor(1000 + Math.random() * 9000)}`;
      setProfile(prev => {
        const next = { ...prev, idCode: randomID };
        localStorage.setItem('colgate_profile', JSON.stringify(next));
        return next;
      });
    }
  }, []);

  // Save states to LocalStorage helper
  const saveStateToStorage = (updatedProfile: UserProfile, updatedPlans: PurchasedPlan[], updatedTransactions: Transaction[]) => {
    localStorage.setItem('colgate_profile', JSON.stringify(updatedProfile));
    localStorage.setItem('colgate_plans', JSON.stringify(updatedPlans));
    localStorage.setItem('colgate_transactions', JSON.stringify(updatedTransactions));
  };

  // Real-time accelerated yield ticking system
  useEffect(() => {
    const interval = setInterval(() => {
      if (activePlans.length === 0) return;

      // Accelerate accumulation: every 3 seconds ticks 1% of the daily yield of all active plans
      // This is highly visual and satisfying, allowing the user to watch their earnings rise.
      let accruedAmount = 0;
      const updatedPlans = activePlans.map(plan => {
        // Daily yield divided by 2400 (simulating fast hours)
        const tickGain = plan.dailyIncome / 800; 
        accruedAmount += tickGain;
        return {
          ...plan,
          earningsAccumulated: plan.earningsAccumulated + tickGain
        };
      });

      if (accruedAmount > 0) {
        setProfile(prev => {
          const next = {
            ...prev,
            balance: prev.balance + accruedAmount,
            totalIncome: prev.totalIncome + accruedAmount
          };
          saveStateToStorage(next, updatedPlans, transactions);
          return next;
        });
        setActivePlans(updatedPlans);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activePlans, transactions]);

  // Autoscroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  // Support Pre-written Question Helper
  const handlePredefinedQuestion = (question: string) => {
    setUserInput(question);
    sendMessage(question);
  };

  // Chat message submission to Gemini API Support
  const sendMessage = async (overrideInput?: string) => {
    const promptToSend = overrideInput || userInput;
    if (!promptToSend.trim()) return;

    const newUserMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: promptToSend
    };

    setChatMessages(prev => [...prev, newUserMessage]);
    if (!overrideInput) setUserInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/app/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, newUserMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          userProfile: {
            balance: profile.balance,
            activePlansCount: activePlans.length
          }
        })
      });

      const data = await response.json();
      
      const newAssistantMessage: ChatMessage = {
        id: `msg-assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Peço desculpas, tive uma oscilação na rede e não consegui processar sua dúvida. Pode tentar de novo?'
      };

      setChatMessages(prev => [...prev, newAssistantMessage]);
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [
        ...prev,
        {
          id: `msg-error-${Date.now()}`,
          role: 'assistant',
          content: 'Desculpe, estou enfrentando uma pequena instabilidade de conexão no momento. De qualquer forma, lembre-se: saques mínimos são de R$ 10,00 e o PIX cai em minutos! O que mais posso ajudar?'
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Simulating Deposit (Recharge) flow
  const handleConfirmRechargeRequest = () => {
    const amt = parseFloat(rechargeAmount);
    if (isNaN(amt) || amt < 10) {
      triggerToast('O valor mínimo para recarga é R$ 10,00', 'error');
      return;
    }
    setRechargeStep('qr');
  };

  const handleSimulatePaymentCompletion = () => {
    const amt = parseFloat(rechargeAmount);
    const updatedProfile = {
      ...profile,
      balance: profile.balance + amt,
      totalRecharge: profile.totalRecharge + amt
    };

    const newTx: Transaction = {
      id: `tx-dep-${Date.now()}`,
      type: 'deposit',
      amount: amt,
      status: 'completed',
      date: new Date().toLocaleString('pt-BR'),
      details: 'Recarga aprovada via PIX'
    };

    const updatedTxs = [newTx, ...transactions];

    setProfile(updatedProfile);
    setTransactions(updatedTxs);
    saveStateToStorage(updatedProfile, activePlans, updatedTxs);

    setShowRechargeModal(false);
    setRechargeStep('input');
    triggerToast(`Recarga de R$ ${amt.toFixed(2)} concluída com sucesso! Saldo atualizado.`, 'success');
  };

  // Simulating Withdrawal Flow
  const handleConfirmWithdrawal = () => {
    const amt = parseFloat(withdrawAmount);
    const key = profile.pixKey || tempPixKey;

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

    setWithdrawError('');

    // Deduct balance and register withdrawal transaction as processing
    const updatedProfile = {
      ...profile,
      balance: profile.balance - amt,
      totalWithdrawal: profile.totalWithdrawal + amt,
      pixKey: key,
      pixType: tempPixType
    };

    const newTx: Transaction = {
      id: `tx-wit-${Date.now()}`,
      type: 'withdrawal',
      amount: amt,
      status: 'pending', // Starts pending to mimic high-fidelity transaction review
      date: new Date().toLocaleString('pt-BR'),
      details: `Saque PIX para chave: ${key}`
    };

    const updatedTxs = [newTx, ...transactions];

    setProfile(updatedProfile);
    setTransactions(updatedTxs);
    saveStateToStorage(updatedProfile, activePlans, updatedTxs);

    setShowWithdrawModal(false);
    setWithdrawAmount('');
    triggerToast(`Saque de R$ ${amt.toFixed(2)} solicitado com sucesso!`, 'success');

    // Simulate completion in 15 seconds to show dynamic status updating
    setTimeout(() => {
      setTransactions(prevTxs => {
        const nextTxs = prevTxs.map(t => {
          if (t.id === newTx.id) {
            return { ...t, status: 'completed' as const };
          }
          return t;
        });
        localStorage.setItem('colgate_transactions', JSON.stringify(nextTxs));
        return nextTxs;
      });
      triggerToast(`Saque de R$ ${amt.toFixed(2)} enviado para sua conta bancária via PIX!`, 'success');
    }, 15000);
  };

  // Purchasing investment plans
  const handleBuyPlan = (plan: typeof PLANS_CATALOG[0]) => {
    if (profile.balance < plan.price) {
      setShowBuyModal(null);
      // Open recharge instead
      setShowRechargeModal(true);
      setRechargeAmount(plan.price.toFixed(2));
      triggerToast(`Saldo insuficiente. Adicione R$ ${(plan.price - profile.balance).toFixed(2)} para adquirir o plano.`, 'info');
      return;
    }

    // Process Purchase
    const updatedProfile = {
      ...profile,
      balance: profile.balance - plan.price
    };

    const newPurchasedPlan: PurchasedPlan = {
      id: `plan-active-${Date.now()}`,
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
      id: `tx-inv-${Date.now()}`,
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
    saveStateToStorage(updatedProfile, updatedPlans, updatedTxs);

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
              {showToast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
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
            className="h-9 w-auto object-contain drop-shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <button 
            id="btn-bell" 
            onClick={() => triggerToast("Sem novas notificações no momento. Escove seus dentes e aproveite seus lucros!", "info")}
            className="p-1.5 rounded-full hover:bg-white/10 relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
          </button>
          
          <div id="user-badge" className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-medium">
            <User className="w-3.5 h-3.5" />
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
              {/* BRAND PROMO HERO BANNER */}
              <div id="promo-banner" className="bg-gradient-to-r from-colgate-red to-rose-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-20 pointer-events-none flex items-center justify-center">
                  <Sparkles className="w-24 h-24 text-white animate-pulse" />
                </div>
                <div className="relative z-10 space-y-2">
                  <span className="bg-white/20 text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full">
                    Parceria de Fidelidade Oficial
                  </span>
                  <h2 className="text-xl font-display font-extrabold tracking-tight">
                    O Sorriso do Seu Futuro Financeiro
                  </h2>
                  <p className="text-xs text-white/80 leading-relaxed max-w-[280px]">
                    Participe da rede de investimentos Colgate e obtenha rendimentos de até 12% ao dia com segurança absoluta e saques imediatos.
                  </p>
                  <div className="pt-2 flex gap-2">
                    <button 
                      onClick={() => setActiveTab('products')} 
                      className="bg-white text-colgate-red hover:bg-slate-50 transition-colors text-xs font-bold px-4 py-2 rounded-xl shadow-md"
                    >
                      Ver Planos
                    </button>
                    <button 
                      onClick={() => setActiveTab('support')} 
                      className="bg-colgate-blue text-white hover:bg-blue-800 transition-colors text-xs font-bold px-4 py-2 rounded-xl shadow-md border border-white/10 flex items-center gap-1"
                    >
                      Falar com IA
                    </button>
                  </div>
                </div>
              </div>

              {/* QUICK ACTION BUTTON GRID */}
              <div id="quick-actions" className="grid grid-cols-4 gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <button 
                  onClick={() => { setShowRechargeModal(true); setRechargeStep('input'); }}
                  className="flex flex-col items-center gap-1.5 text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-red-50 text-colgate-red flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <ArrowDownLeft className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Recarregar</span>
                </button>

                <button 
                  onClick={() => { setShowWithdrawModal(true); setWithdrawError(''); }}
                  className="flex flex-col items-center gap-1.5 text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-colgate-blue flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <ArrowUpRight className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Sacar</span>
                </button>

                <button 
                  onClick={() => setActiveTab('support')}
                  className="flex flex-col items-center gap-1.5 text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Suporte AI</span>
                </button>

                <button 
                  onClick={() => { setHomePlanFilter('meus'); }}
                  className="flex flex-col items-center gap-1.5 text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <Package className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Meus Planos</span>
                </button>
              </div>

              {/* SCROLLING ANNOUNCEMENT TICKER */}
              <div id="announcement-ticker" className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-3">
                <div className="bg-amber-100 p-1.5 rounded-lg text-amber-800">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="flex-1 overflow-hidden h-5 relative">
                  <div className="absolute whitespace-nowrap animate-[marquee_18s_linear_infinite] text-xs font-semibold text-amber-800 flex gap-6">
                    <span>🔥 Bônus Grátis de R$ 10,00 adicionado para novos cadastros!</span>
                    <span>🦷 Colgate Total 12 Active rendendo 5.0% ao dia já disponível!</span>
                    <span>💰 Indique amigos na aba Equipe e ganhe comissão direta de 10% instantaneamente!</span>
                  </div>
                </div>
              </div>

              {/* EARNINGS DASHBOARD CARD */}
              <div id="earnings-card" className="bg-colgate-blue rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                <div className="absolute right-3 top-3 opacity-10">
                  <Wallet className="w-20 h-20" />
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
                      <ShieldCheck className="w-3 h-3 text-emerald-300" />
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
                      <div className="shrink-0 bg-slate-50 p-2 rounded-xl">
                        {renderProductSVG(plan.svgPath, plan.accentColor)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-bold text-slate-800">{plan.name}</h4>
                          <span className="text-[10px] font-bold text-colgate-red bg-red-50 px-2 py-0.5 rounded-full">5.0% - 7.0%/dia</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">{plan.slogan}</p>
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
                      <Package className="w-8 h-8 text-slate-300 mx-auto" />
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
                            <div className="shrink-0 bg-slate-50 p-1.5 rounded-lg">
                              {renderProductSVG(baseCatalogPlan?.svgPath || 'toothpaste', baseCatalogPlan?.accentColor || '#E11B22')}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <h4 className="text-xs font-bold text-slate-800">{plan.name}</h4>
                                <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Gerando
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
                              <p className="text-colgate-blue font-bold">R$ {plan.earningsAccumulated.toFixed(4)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )
                )}

                {homePlanFilter === 'todos' && (
                  PLANS_CATALOG.map(plan => (
                    <div key={plan.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex gap-4 items-center shadow-sm relative hover:border-slate-200 transition-all">
                      <div className="shrink-0 bg-slate-50 p-2 rounded-xl">
                        {renderProductSVG(plan.svgPath, plan.accentColor)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-bold text-slate-800">{plan.name}</h4>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">{plan.slogan}</p>
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
                  <div key={plan.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div className={`h-2 bg-gradient-to-r ${plan.color}`} />
                    <div className="p-4 space-y-3">
                      <div className="flex gap-4">
                        <div className="shrink-0 bg-slate-50 p-2.5 rounded-2xl h-16 w-16 flex items-center justify-center">
                          {renderProductSVG(plan.svgPath, plan.accentColor)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <h3 className="text-sm font-bold text-slate-800">{plan.name}</h3>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">{plan.slogan}</p>
                          <p className="text-xs text-slate-600 leading-relaxed">{plan.desc}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl text-[10px] text-center">
                        <div>
                          <p className="text-slate-400 uppercase text-[8px]">Preço do Ativo</p>
                          <p className="font-bold text-slate-800">R$ {plan.price.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 uppercase text-[8px]">Rendimento Diário</p>
                          <p className="font-bold text-emerald-600">R$ {plan.dailyIncome.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 uppercase text-[8px]">Retorno Estimado</p>
                          <p className="font-bold text-colgate-blue">R$ {(plan.dailyIncome * plan.cycleDays).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 uppercase text-[8px]">Ciclo Total</p>
                          <p className="font-bold text-slate-700">{plan.cycleDays} Dias</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-colgate-red" /> Seguro Garantido Colgate
                        </span>
                        <button 
                          onClick={() => setShowBuyModal(plan)}
                          className="bg-colgate-red hover:bg-colgate-dark-red text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2"
                        >
                          Ativar Plano <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 3: LIVE AI SUPPORT (Dra. Sorriso) */}
          {activeTab === 'support' && (
            <motion.div
              key="tab-support"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-[calc(100vh-140px)]"
            >
              {/* Support Doctor Header Banner */}
              <div className="bg-gradient-to-r from-colgate-red to-red-700 p-4 text-white flex items-center gap-3 shadow-inner">
                <div className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden relative bg-white/20 flex items-center justify-center font-bold text-white text-lg shadow-md shrink-0">
                  👩‍⚕️
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold">Dra. Sorriso</h3>
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  </div>
                  <p className="text-[10px] text-white/80">Especialista Colgate • Online 24h</p>
                </div>
              </div>

              {/* Chat Messages Log */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {chatMessages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm text-xs leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-colgate-blue text-white rounded-br-none' 
                        : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl rounded-bl-none p-3 border border-slate-100 shadow-sm flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-colgate-red" />
                      Dra. Sorriso está analisando...
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Predefined Questions Grid */}
              <div className="p-3 bg-slate-100 border-t border-slate-200 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                <button 
                  onClick={() => handlePredefinedQuestion("Como funcionam os rendimentos diários?")}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-full shrink-0 shadow-sm"
                >
                  🤔 Como funciona?
                </button>
                <button 
                  onClick={() => handlePredefinedQuestion("Qual é o valor mínimo para sacar?")}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-full shrink-0 shadow-sm"
                >
                  💸 Saque mínimo?
                </button>
                <button 
                  onClick={() => handlePredefinedQuestion("Como recarregar com PIX?")}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-full shrink-0 shadow-sm"
                >
                  ⚡ Como Recarregar?
                </button>
                <button 
                  onClick={() => handlePredefinedQuestion("Me dê dicas de escovação saudável!")}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-full shrink-0 shadow-sm"
                >
                  🪥 Dicas de dentes brancos
                </button>
              </div>

              {/* Input Message Area */}
              <div className="p-3 bg-white border-t border-slate-200 flex gap-2 shrink-0">
                <input 
                  type="text" 
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Escreva sua dúvida bucal ou financeira..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-colgate-red transition-all"
                />
                <button 
                  onClick={() => sendMessage()}
                  disabled={isTyping || !userInput.trim()}
                  className="bg-colgate-red hover:bg-colgate-dark-red disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl p-2.5 shadow-sm transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
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
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-semibold block uppercase">Link de Afiliado Exclusivo</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap flex items-center">
                      https://colgateinvest.app/?ref={profile.idCode}
                    </div>
                    <button 
                      onClick={() => copyToClipboard(`https://colgateinvest.app/?ref=${profile.idCode}`, "Link de afiliado")}
                      className="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl text-slate-600 transition-colors shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Commission rules list */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-colgate-blue flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Níveis de Comissão Colgate
                </h3>
                <ul className="text-xs space-y-2 text-slate-600">
                  <li className="flex justify-between">
                    <span>🥇 Nível 1 (Indicação Direta):</span>
                    <span className="font-bold text-colgate-red">10% de Bônus</span>
                  </li>
                  <li className="flex justify-between border-t border-slate-100 pt-2">
                    <span>🥈 Nível 2 (Indicação do seu Indicado):</span>
                    <span className="font-bold text-slate-700">3% de Bônus</span>
                  </li>
                  <li className="flex justify-between border-t border-slate-100 pt-2">
                    <span>🥉 Nível 3:</span>
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
                  <Wallet className="w-4 h-4 text-colgate-red" /> Chave PIX de Saque
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
                      onClick={() => {
                        if (!tempPixKey.trim()) {
                          triggerToast('Escreva sua chave PIX antes de salvar.', 'error');
                          return;
                        }
                        const updated = { ...profile, pixKey: tempPixKey, pixType: tempPixType };
                        setProfile(updated);
                        localStorage.setItem('colgate_profile', JSON.stringify(updated));
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
                  <TrendingUp className="w-4 h-4 text-colgate-red" /> Histórico de Transações
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

              {/* Quick Simulator Reset Account */}
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-rose-800">Simulador de Demonstração</h4>
                  <p className="text-[10px] text-rose-600">Reinicie seu saldo para refazer testes.</p>
                </div>
                <button 
                  onClick={() => {
                    const cleanProfile: UserProfile = {
                      username: 'Investidor Colgate',
                      balance: 10.00,
                      totalRecharge: 0.00,
                      totalWithdrawal: 0.00,
                      totalIncome: 0.00,
                      pixKey: '',
                      pixType: 'cpf',
                      idCode: `COLG-${Math.floor(1000 + Math.random() * 9000)}`,
                      registerDate: '08/07/2026'
                    };
                    const cleanTxs: Transaction[] = [{
                      id: 'tx-0',
                      type: 'yield',
                      amount: 10.00,
                      status: 'completed',
                      date: '08/07/2026 12:00',
                      details: 'Bônus Colgate de boas-vindas'
                    }];
                    setProfile(cleanProfile);
                    setActivePlans([]);
                    setTransactions(cleanTxs);
                    saveStateToStorage(cleanProfile, [], cleanTxs);
                    triggerToast('Sua conta do simulador foi reiniciada!', 'info');
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold py-2 px-3.5 rounded-xl transition-all shadow-sm"
                >
                  Reiniciar Conta
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* BOTTOM NAVIGATION TAB BAR */}
      <nav id="bottom-navbar" className="fixed bottom-0 max-w-md w-full bg-white border-t border-slate-150 py-2.5 px-4 grid grid-cols-5 gap-1 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] rounded-t-2xl">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 text-center ${activeTab === 'home' ? 'text-colgate-red' : 'text-slate-400'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-extrabold uppercase tracking-tight">Início</span>
        </button>

        <button 
          onClick={() => setActiveTab('products')}
          className={`flex flex-col items-center gap-1 text-center ${activeTab === 'products' ? 'text-colgate-red' : 'text-slate-400'}`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[9px] font-extrabold uppercase tracking-tight">Produtos</span>
        </button>

        <button 
          onClick={() => setActiveTab('support')}
          className={`flex flex-col items-center gap-1 text-center ${activeTab === 'support' ? 'text-colgate-red' : 'text-slate-400'}`}
        >
          <Headphones className="w-5 h-5" />
          <span className="text-[9px] font-extrabold uppercase tracking-tight">Atendimento</span>
        </button>

        <button 
          onClick={() => setActiveTab('team')}
          className={`flex flex-col items-center gap-1 text-center ${activeTab === 'team' ? 'text-colgate-red' : 'text-slate-400'}`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[9px] font-extrabold uppercase tracking-tight">Equipe</span>
        </button>

        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 text-center ${activeTab === 'profile' ? 'text-colgate-red' : 'text-slate-400'}`}
        >
          <User className="w-5 h-5" />
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
                {rechargeStep === 'input' ? (
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
                      {['20.00', '50.00', '100.00', '500.00', '1500.00', '5000.00'].map(val => (
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

                    <div className="space-y-2 pt-2">
                      <button
                        onClick={handleConfirmRechargeRequest}
                        className="w-full bg-colgate-red hover:bg-colgate-dark-red text-white py-3 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1"
                      >
                        <QrCode className="w-4 h-4" /> Gerar Chave de Pagamento PIX
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

                    {/* PIX Mock QR Code representation */}
                    <div className="bg-slate-50 p-4 rounded-2xl inline-block border border-slate-200 relative">
                      <svg className="w-32 h-32 mx-auto" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="100" height="100" rx="8" fill="white" />
                        <rect x="10" y="10" width="20" height="20" fill="black" />
                        <rect x="14" y="14" width="12" height="12" fill="white" />
                        <rect x="16" y="16" width="8" height="8" fill="black" />

                        <rect x="70" y="10" width="20" height="20" fill="black" />
                        <rect x="74" y="14" width="12" height="12" fill="white" />
                        <rect x="76" y="16" width="8" height="8" fill="black" />

                        <rect x="10" y="70" width="20" height="20" fill="black" />
                        <rect x="14" y="74" width="12" height="12" fill="white" />
                        <rect x="16" y="16" width="8" height="8" fill="black" />

                        {/* Random center pixel points */}
                        <rect x="40" y="20" width="6" height="6" fill="black" />
                        <rect x="50" y="10" width="6" height="10" fill="black" />
                        <rect x="35" y="45" width="10" height="6" fill="black" />
                        <rect x="55" y="40" width="12" height="12" fill="black" />
                        <rect x="45" y="65" width="8" height="8" fill="black" />
                        <rect x="75" y="75" width="10" height="10" fill="black" />
                        <rect x="40" y="80" width="12" height="6" fill="black" />
                        {/* Red PIX Logo center */}
                        <rect x="44" y="44" width="12" height="12" rx="2" fill="#00A3A6" />
                        <circle cx="50" cy="50" r="3" fill="white" />
                      </svg>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-800">PIX Copia e Cola Colgate</p>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[10px] font-semibold text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">
                          colgateinvest_pix_charge_{Math.floor(100000 + Math.random() * 900000)}@pix.colgate.com.br
                        </div>
                        <button
                          onClick={() => {
                            copyToClipboard(`colgateinvest_pix_charge_${Math.floor(100000 + Math.random() * 900000)}@pix.colgate.com.br`, "PIX Copia e Cola");
                            setCopiedPixCode(true);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 p-2 rounded-xl text-slate-600 transition-colors shrink-0"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={handleSimulatePaymentCompletion}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xs shadow-sm transition-all"
                      >
                        Confirmar Pagamento (Simular PIX)
                      </button>
                      <button
                        onClick={() => setRechargeStep('input')}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-xl font-bold text-xs transition-colors"
                      >
                        Voltar
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
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{withdrawError}</span>
                  </div>
                )}

                <div className="bg-blue-50 text-colgate-blue p-3.5 rounded-xl text-[9px] font-semibold leading-relaxed space-y-1">
                  <p className="font-bold uppercase flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-colgate-blue" /> Informações Importantes
                  </p>
                  <p>• O tempo médio de compensação do PIX é de 10 minutos a 2 horas.</p>
                  <p>• Saques solicitados fora do horário comercial (09h às 18h) podem ser creditados no próximo dia útil.</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={handleConfirmWithdrawal}
                    className="w-full bg-colgate-blue hover:bg-blue-800 text-white py-3 rounded-xl font-bold text-xs shadow-sm transition-all"
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
                <p className="text-[10px] text-white/80">{showBuyModal.slogan}</p>
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
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
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
