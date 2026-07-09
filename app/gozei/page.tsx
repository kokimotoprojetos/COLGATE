'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminStats {
  totalUsers: number;
  totalDeposited: number;
  totalAdminCredit: number;
  totalPaid: number;
  pendingCount: number;
}

interface UserProfile {
  id: string;
  username: string;
  balance: number;
  total_recharge: number;
  total_withdrawal: number;
  total_income: number;
  pix_key: string;
  pix_type: string;
  id_code: string;
  created_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  details: string;
  profiles?: {
    username: string;
    pix_key: string;
    pix_type: string;
  };
}

export default function AdminPanel() {
  // Credentials input state
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  // Dashboard loaded state
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalDeposited: 0,
    totalAdminCredit: 0,
    totalPaid: 0,
    pendingCount: 0,
  });
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'withdrawals'>('stats');

  // Search filter
  const [userSearch, setUserSearch] = useState('');

  // Balance addition modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Check persistent authentication on mount
  useEffect(() => {
    const savedUser = sessionStorage.getItem('admin_user');
    const savedPass = sessionStorage.getItem('admin_pass');
    if (savedUser && savedPass) {
      setAdminUser(savedUser);
      setAdminPass(savedPass);
      // Attempt automatic load
      fetchAdminData(savedUser, savedPass);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser.trim() || !adminPass.trim()) {
      setAuthError('Preencha todos os campos.');
      return;
    }
    setAuthError('');
    fetchAdminData(adminUser, adminPass);
  };

  const fetchAdminData = async (user: string, pass: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-stats',
          username: user,
          password: pass
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.error || 'Erro ao realizar login administrativo.');
        sessionStorage.removeItem('admin_user');
        sessionStorage.removeItem('admin_pass');
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setStats(data.stats);
      setProfiles(data.profiles || []);
      setTransactions(data.transactions || []);
      setPendingWithdrawals(data.pendingWithdrawals || []);
      setIsAuthenticated(true);
      
      // Save credentials for page refreshes
      sessionStorage.setItem('admin_user', user);
      sessionStorage.setItem('admin_pass', pass);

    } catch (err: any) {
      console.error(err);
      setAuthError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_pass');
    setAdminUser('');
    setAdminPass('');
    setIsAuthenticated(false);
    triggerToast('Deslogado com sucesso.', 'info');
  };

  const handleAddBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const amt = parseFloat(addAmount);
    if (isNaN(amt) || amt <= 0) {
      triggerToast('Informe um valor de crédito válido.', 'error');
      return;
    }

    setSubmittingAction(true);
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-balance',
          username: adminUser,
          password: adminPass,
          params: {
            userId: selectedUser.id,
            amount: amt
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao adicionar saldo.');
      }

      triggerToast(`Saldo de R$ ${amt.toFixed(2)} adicionado para ${selectedUser.username}!`, 'success');
      setSelectedUser(null);
      setAddAmount('');
      // Reload
      fetchAdminData(adminUser, adminPass);

    } catch (error: any) {
      triggerToast(error.message, 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleApproveWithdrawal = async (txId: string) => {
    if (!confirm('Deseja realmente aprovar e pagar este saque via API da LytronPay?')) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve-withdrawal',
          username: adminUser,
          password: adminPass,
          params: {
            transactionId: txId
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao processar saque.');
      }

      triggerToast(data.message || 'Saque aprovado e pago com sucesso!', 'success');
      fetchAdminData(adminUser, adminPass);

    } catch (error: any) {
      triggerToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectWithdrawal = async (txId: string) => {
    if (!confirm('Deseja realmente rejeitar este saque? O saldo correspondente será devolvido à conta do usuário.')) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject-withdrawal',
          username: adminUser,
          password: adminPass,
          params: {
            transactionId: txId
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao rejeitar saque.');
      }

      triggerToast(data.message || 'Saque rejeitado e saldo estornado!', 'success');
      fetchAdminData(adminUser, adminPass);

    } catch (error: any) {
      triggerToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search
  const filteredProfiles = profiles.filter(p =>
    p.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    (p.id_code && p.id_code.toLowerCase().includes(userSearch.toLowerCase())) ||
    p.id.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* HEADER BAR */}
      <header className="bg-colgate-red text-white py-4 px-6 sticky top-0 z-30 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Icon icon="streamline-color:setting-database-server" className="w-8 h-8" />
          <div>
            <h1 className="text-lg font-extrabold uppercase tracking-wider">Painel Administrativo</h1>
            <p className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Colgate Investimento Oral Care</p>
          </div>
        </div>
        {isAuthenticated && (
          <button 
            onClick={handleLogout}
            className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Icon icon="streamline-color:logout-1" className="w-4 h-4" /> Sair
          </button>
        )}
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* LOGIN SCREEN */}
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
            <div className="bg-colgate-red p-6 text-white text-center">
              <Icon icon="streamline-color:lock-box" className="w-12 h-12 mx-auto text-white" />
              <h2 className="text-lg font-extrabold uppercase mt-2">Acesso Restrito</h2>
              <p className="text-xs text-white/80">Identifique-se para gerenciar os dados da Colgate</p>
            </div>
            
            <form onSubmit={handleLogin} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase block">Nome de Usuário</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                  <Icon icon="streamline-color:user-single-neutral-male" className="w-4 h-4 text-slate-400 mr-2" />
                  <input 
                    type="text" 
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    placeholder="Digite o admin"
                    className="flex-1 bg-transparent text-xs focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase block">Senha Administrativa</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                  <Icon icon="streamline-color:key" className="w-4 h-4 text-slate-400 mr-2" />
                  <input 
                    type="password" 
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    placeholder="Digite a senha"
                    className="flex-1 bg-transparent text-xs focus:outline-none font-bold"
                  />
                </div>
              </div>

              {authError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                  <Icon icon="streamline-color:warning-triangle" className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-colgate-red hover:bg-colgate-dark-red disabled:bg-slate-200 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Icon icon="streamline-color:cloud-refresh" className="w-4 h-4 animate-spin" /> Verificando...
                  </>
                ) : (
                  <>
                    <Icon icon="streamline-color:shield-check" className="w-4 h-4" /> Entrar no Painel
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* ADMIN PORTAL */
          <>
            {/* STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-2 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute right-3 top-3 bg-red-50 text-colgate-red p-1.5 rounded-lg">
                  <Icon icon="streamline-color:user-multiple-group" className="w-5 h-5" />
                </div>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase">Total de Usuários</p>
                <h3 className="text-2xl font-black text-slate-800">{stats.totalUsers}</h3>
              </div>

              <div className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-sm space-y-2 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute right-3 top-3 bg-emerald-50 text-emerald-600 p-1.5 rounded-lg">
                  <Icon icon="streamline-color:bag-dollar" className="w-5 h-5" />
                </div>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase">Depósitos Reais (PIX)</p>
                <h3 className="text-2xl font-black text-emerald-600">R$ {stats.totalDeposited.toFixed(2)}</h3>
                <p className="text-[9px] text-emerald-400 font-semibold">Via LytronPay / webhook</p>
              </div>

              <div className="bg-white border border-violet-100 rounded-3xl p-5 shadow-sm space-y-2 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute right-3 top-3 bg-violet-50 text-violet-600 p-1.5 rounded-lg">
                  <Icon icon="streamline-color:shield-check" className="w-5 h-5" />
                </div>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase">Créditos Admin</p>
                <h3 className="text-2xl font-black text-violet-600">R$ {stats.totalAdminCredit.toFixed(2)}</h3>
                <p className="text-[9px] text-violet-400 font-semibold">Adicionado via painel</p>
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-2 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute right-3 top-3 bg-blue-50 text-colgate-blue p-1.5 rounded-lg">
                  <Icon icon="streamline-color:payment-cash-out-3" className="w-5 h-5" />
                </div>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase">Total Pago (Saques)</p>
                <h3 className="text-2xl font-black text-colgate-blue">R$ {stats.totalPaid.toFixed(2)}</h3>
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-2 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute right-3 top-3 bg-amber-50 text-amber-600 p-1.5 rounded-lg">
                  <Icon icon="streamline-color:warning-triangle" className="w-5 h-5" />
                </div>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase">Saques Pendentes</p>
                <h3 className={`text-2xl font-black ${stats.pendingCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-800'}`}>
                  {stats.pendingCount}
                </h3>
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex bg-slate-200/60 p-1 rounded-2xl max-w-md">
              <button 
                onClick={() => setActiveTab('stats')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'stats' ? 'bg-white text-colgate-red shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Icon icon="streamline-color:dashboard-gauge-1" className="w-4 h-4" /> Geral
              </button>
              <button 
                onClick={() => setActiveTab('users')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'users' ? 'bg-white text-colgate-red shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Icon icon="streamline-color:user-multiple-group" className="w-4 h-4" /> Usuários ({profiles.length})
              </button>
              <button 
                onClick={() => setActiveTab('withdrawals')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 relative ${activeTab === 'withdrawals' ? 'bg-white text-colgate-red shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Icon icon="streamline-color:payment-cash-out-3" className="w-4 h-4" /> Saques
                {pendingWithdrawals.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-colgate-red text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md animate-bounce">
                    {pendingWithdrawals.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB CONTENT: METRICS & RECENT TRANSACTIONS */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold uppercase text-slate-700 flex items-center gap-1.5">
                    <Icon icon="streamline-color:money-exchange-envelope" className="w-5 h-5" /> Histórico de Transações Recentes
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase text-[9px] font-extrabold">
                          <th className="pb-3 font-extrabold">Usuário</th>
                          <th className="pb-3 font-extrabold">Tipo</th>
                          <th className="pb-3 font-extrabold">Valor</th>
                          <th className="pb-3 font-extrabold">Status</th>
                          <th className="pb-3 font-extrabold">Detalhes</th>
                          <th className="pb-3 font-extrabold">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 15).map(tx => (
                          <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 font-bold text-slate-800">{tx.profiles?.username || 'Desconhecido'}</td>
                            <td className="py-3 uppercase font-extrabold text-[10px]">
                              {tx.type === 'deposit' && <span className="text-emerald-600 bg-emerald-50 py-0.5 px-2 rounded-full">Depósito</span>}
                              {tx.type === 'withdrawal' && <span className="text-colgate-blue bg-blue-50 py-0.5 px-2 rounded-full">Saque</span>}
                              {tx.type === 'investment' && <span className="text-purple-600 bg-purple-50 py-0.5 px-2 rounded-full">Ativação</span>}
                              {tx.type === 'yield' && <span className="text-amber-600 bg-amber-50 py-0.5 px-2 rounded-full">Rendimento</span>}
                            </td>
                            <td className="py-3 font-bold text-slate-800">R$ {tx.amount.toFixed(2)}</td>
                            <td className="py-3">
                              {tx.status === 'completed' && <span className="text-green-600 font-bold uppercase text-[9px] bg-green-50 px-2 py-0.5 rounded-md">Pago/Ok</span>}
                              {tx.status === 'pending' && <span className="text-amber-500 font-bold uppercase text-[9px] bg-amber-50 px-2 py-0.5 rounded-md animate-pulse">Pendente</span>}
                              {tx.status === 'rejected' && <span className="text-rose-600 font-bold uppercase text-[9px] bg-rose-50 px-2 py-0.5 rounded-md">Rejeitado</span>}
                            </td>
                            <td className="py-3 text-slate-400 max-w-[200px] truncate">{tx.details || '-'}</td>
                            <td className="py-3 text-slate-500 font-medium">
                              {new Date(tx.created_at).toLocaleString('pt-BR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: USERS LIST */}
            {activeTab === 'users' && (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <h3 className="text-sm font-extrabold uppercase text-slate-700 flex items-center gap-1.5">
                    <Icon icon="streamline-color:user-multiple-group" className="w-5 h-5" /> Todos os Usuários Registrados
                  </h3>
                  
                  {/* Search bar */}
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 max-w-sm">
                    <Icon icon="streamline-color:search-1" className="w-4 h-4 text-slate-400 mr-2" />
                    <input 
                      type="text" 
                      placeholder="Pesquisar por nome ou código..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="bg-transparent text-xs focus:outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase text-[9px] font-extrabold">
                        <th className="pb-3 font-extrabold">Código ID</th>
                        <th className="pb-3 font-extrabold">Nome</th>
                        <th className="pb-3 font-extrabold">Saldo Atual</th>
                        <th className="pb-3 font-extrabold">Depósitos</th>
                        <th className="pb-3 font-extrabold">Saques</th>
                        <th className="pb-3 font-extrabold">Rendimentos</th>
                        <th className="pb-3 font-extrabold text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProfiles.map(u => (
                        <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 font-mono font-bold text-slate-700">{u.id_code || 'COLG-NEW'}</td>
                          <td className="py-3 font-bold text-slate-800">
                            <div className="flex flex-col">
                              <span>{u.username}</span>
                              <span className="text-[9px] text-slate-400 font-semibold font-mono truncate max-w-[150px]">{u.id}</span>
                            </div>
                          </td>
                          <td className="py-3 font-bold text-slate-900 bg-red-50/20">R$ {Number(u.balance).toFixed(2)}</td>
                          <td className="py-3 font-semibold text-emerald-600">R$ {Number(u.total_recharge).toFixed(2)}</td>
                          <td className="py-3 font-semibold text-colgate-blue">R$ {Number(u.total_withdrawal).toFixed(2)}</td>
                          <td className="py-3 font-semibold text-amber-600">R$ {Number(u.total_income).toFixed(3)}</td>
                          <td className="py-3 text-center">
                            <button
                              onClick={() => setSelectedUser(u)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] py-1.5 px-3 rounded-lg shadow-sm transition-colors flex items-center gap-1 mx-auto"
                            >
                              <Icon icon="streamline-color:cash-bag" className="w-3.5 h-3.5" /> Adicionar Saldo
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: PENDING WITHDRAWALS */}
            {activeTab === 'withdrawals' && (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold uppercase text-slate-700 flex items-center gap-1.5">
                  <Icon icon="streamline-color:payment-cash-out-3" className="w-5 h-5 animate-pulse text-amber-500" /> Solicitações de Saques Pendentes
                </h3>

                {pendingWithdrawals.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <Icon icon="streamline-color:shield-check" className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Nenhum saque pendente de aprovação!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase text-[9px] font-extrabold">
                          <th className="pb-3 font-extrabold">Usuário</th>
                          <th className="pb-3 font-extrabold">Valor Solicitado</th>
                          <th className="pb-3 font-extrabold">Chave PIX</th>
                          <th className="pb-3 font-extrabold">Solicitado em</th>
                          <th className="pb-3 font-extrabold text-center">Ações de Aprovação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingWithdrawals.map(w => (
                          <tr key={w.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 font-bold text-slate-800">
                              <div className="flex flex-col">
                                <span>{w.profiles?.username || 'Desconhecido'}</span>
                                <span className="text-[8px] text-slate-400 font-mono">{w.user_id}</span>
                              </div>
                            </td>
                            <td className="py-4 font-black text-red-600 text-sm">R$ {w.amount.toFixed(2)}</td>
                            <td className="py-4">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-slate-700 select-all">{w.profiles?.pix_key || '-'}</span>
                                <span className="text-[9px] font-bold text-colgate-blue uppercase bg-blue-50 self-start px-2 py-0.5 rounded-full mt-0.5">
                                  {w.profiles?.pix_type || 'CPF'}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 text-slate-500 font-semibold">
                              {new Date(w.created_at).toLocaleString('pt-BR')}
                            </td>
                            <td className="py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleApproveWithdrawal(w.id)}
                                  disabled={loading}
                                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-extrabold text-[10px] py-2 px-3 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                                >
                                  <Icon icon="streamline-color:check-circle" className="w-3.5 h-3.5" /> Aprovar e Pagar
                                </button>
                                <button
                                  onClick={() => handleRejectWithdrawal(w.id)}
                                  disabled={loading}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:bg-slate-50 disabled:text-slate-400 font-extrabold text-[10px] py-2 px-3 rounded-lg transition-all flex items-center gap-1.5"
                                >
                                  <Icon icon="streamline-color:delete-1" className="w-3.5 h-3.5" /> Rejeitar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* BALANCE CREATOR DIALOG MODAL */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
              <div className="bg-emerald-600 p-4 text-white text-center">
                <Icon icon="streamline-color:cash-bag" className="w-10 h-10 mx-auto text-white" />
                <h3 className="text-base font-bold mt-1">Crédito Administrativo</h3>
                <p className="text-[10px] text-white/80">Adicione saldo manualmente ao sorriso do investidor</p>
              </div>

              <form onSubmit={handleAddBalanceSubmit} className="p-5 space-y-4">
                <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
                  <p className="text-slate-400 font-semibold uppercase text-[8px]">Investidor Selecionado</p>
                  <p className="font-extrabold text-slate-800">{selectedUser.username}</p>
                  <p className="text-[9px] text-slate-400 font-mono">ID: {selectedUser.id}</p>
                  <p className="text-[10px] font-bold text-slate-700 pt-1">Saldo Atual: R$ {Number(selectedUser.balance).toFixed(2)}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Valor do Crédito (R$)</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                    <span className="font-bold text-slate-400 text-xs mr-1">R$</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      step="0.01"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      className="flex-1 bg-transparent focus:outline-none text-slate-800 text-sm font-black"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white py-3 rounded-xl font-bold text-xs shadow-sm transition-all"
                  >
                    {submittingAction ? 'Processando Crédito...' : 'Confirmar Adição de Saldo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST SYSTEM FEEDBACK */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] bg-slate-900 text-white py-3.5 px-5 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800"
          >
            {toast.type === 'success' && <Icon icon="streamline-color:check-circle" className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <Icon icon="streamline-color:warning-triangle" className="w-5 h-5 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Icon icon="streamline-color:help-question-1" className="w-5 h-5 text-blue-400 shrink-0" />}
            <span className="text-xs font-bold leading-relaxed">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
