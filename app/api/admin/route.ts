import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const cleanKey = (key: string) => {
  if (!key) return '';
  return key.trim().replace(/^['"]|['"]$/g, '');
};

const supabaseUrl = cleanKey(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co');
const supabaseServiceKey = cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key');

// Initialize Supabase with the bypass-RLS Service Role key
const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, username, password, params } = body;

    // Verify Admin Credentials
    const envAdminUser = process.env.ADMIN_USERNAME || 'admin';
    const envAdminPass = process.env.ADMIN_PASSWORD || 'colgate2026admin';

    if (username !== envAdminUser || password !== envAdminPass) {
      return NextResponse.json({ error: 'Credenciais administrativas inválidas' }, { status: 401 });
    }

    if (supabaseServiceKey === 'placeholder-service-key' || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ 
        error: 'Erro de Configuração: A variável de ambiente "SUPABASE_SERVICE_ROLE_KEY" não foi cadastrada no painel do Vercel.' 
      }, { status: 500 });
    }

    if (action === 'get-stats') {
      // 1. Fetch all profiles
      const { data: profiles, error: errProf } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('username', { ascending: true });

      if (errProf) throw errProf;

      // Build a lookup map: user_id -> profile
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

      // 2. Fetch all transactions WITHOUT join (no FK relationship in schema cache)
      const { data: rawTransactions, error: errTx } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (errTx) throw errTx;

      // 3. Merge profile info manually into each transaction
      const transactions = (rawTransactions || []).map((tx: any) => ({
        ...tx,
        profiles: profileMap[tx.user_id] || null
      }));

      // 4. Calculate statistics
      // totalDeposited = only real PIX deposits (excludes manual credits via admin panel)
      const totalDeposited = transactions
        .filter((t: any) =>
          t.type === 'deposit' &&
          t.status === 'completed' &&
          !String(t.details || '').includes('Painel Administrativo')
        )
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      // totalAdminCredit = saldo adicionado manualmente pelo admin (separado)
      const totalAdminCredit = transactions
        .filter((t: any) =>
          t.type === 'deposit' &&
          t.status === 'completed' &&
          String(t.details || '').includes('Painel Administrativo')
        )
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const totalPaid = transactions
        .filter((t: any) => t.type === 'withdrawal' && t.status === 'completed')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const pendingWithdrawals = transactions.filter((t: any) => t.type === 'withdrawal' && t.status === 'pending');

      return NextResponse.json({
        success: true,
        stats: {
          totalUsers: (profiles || []).length,
          totalDeposited,
          totalAdminCredit,
          totalPaid,
          pendingCount: pendingWithdrawals.length
        },
        profiles: profiles || [],
        transactions,
        pendingWithdrawals
      });
    }

    if (action === 'add-balance') {
      const { userId, amount } = params;
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ error: 'Valor inválido para depósito' }, { status: 400 });
      }

      const { data: userProfile, error: getErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (getErr || !userProfile) {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }

      const updatedBalance = Number(userProfile.balance) + numAmount;
      const updatedTotalRecharge = Number(userProfile.total_recharge) + numAmount;

      const { error: updErr } = await supabaseAdmin
        .from('profiles')
        .update({ balance: updatedBalance, total_recharge: updatedTotalRecharge })
        .eq('id', userId);

      if (updErr) throw updErr;

      const { error: insErr } = await supabaseAdmin.from('transactions').insert([{
        user_id: userId,
        type: 'deposit',
        amount: numAmount,
        status: 'completed',
        details: 'Crédito direto via Painel Administrativo'
      }]);

      if (insErr) throw insErr;

      return NextResponse.json({ success: true, message: `Saldo de R$ ${numAmount.toFixed(2)} adicionado com sucesso.` });
    }

    if (action === 'approve-withdrawal') {
      const { transactionId } = params;

      // Fetch transaction (no join)
      const { data: tx, error: fetchErr } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchErr || !tx) {
        return NextResponse.json({ error: 'Solicitação de saque não encontrada' }, { status: 404 });
      }

      if (tx.status !== 'pending') {
        return NextResponse.json({ error: 'Esta solicitação de saque já foi processada' }, { status: 400 });
      }

      // Fetch the associated profile separately
      const { data: userProfile, error: profErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', tx.user_id)
        .single();

      if (profErr || !userProfile) {
        return NextResponse.json({ error: 'Perfil do usuário não encontrado' }, { status: 404 });
      }

      const pixKey = userProfile.pix_key;
      const pixType = userProfile.pix_type || 'cpf';

      if (!pixKey) {
        return NextResponse.json({ error: 'Usuário não possui uma chave PIX cadastrada' }, { status: 400 });
      }

      const apiKey = cleanKey(process.env.LYTRON_API_KEY || '');
      const apiSecret = cleanKey(process.env.LYTRON_API_SECRET || '');

      if (!apiKey || !apiSecret) {
        return NextResponse.json({ error: 'Chaves da API da LytronPay não configuradas no backend' }, { status: 500 });
      }

      const payoutPayload = {
        amount: parseFloat(tx.amount),
        pix: { type: pixType, key: pixKey },
        description: `Saque Colgate - ${userProfile.username}`,
        idempotency_key: `payout-${transactionId}`
      };

      const rawBody = JSON.stringify(payoutPayload);
      const hmac = crypto.createHmac('sha256', apiSecret);
      hmac.update(rawBody);
      const signature = hmac.digest('hex');

      try {
        const response = await fetch('https://api.lytronpay.com/api/v1/payouts', {
          method: 'POST',
          headers: {
            'Api-Access-Key': apiKey,
            'Transaction-Hash': signature,
            'Content-Type': 'application/json'
          },
          body: rawBody
        });

        const resData = await response.json();

        if (!response.ok) {
          console.error('LytronPay payout API error:', resData);
          return NextResponse.json({ error: resData.message || 'Erro ao processar saque na API da LytronPay' }, { status: response.status });
        }

        const { error: updTxErr } = await supabaseAdmin
          .from('transactions')
          .update({ status: 'completed' })
          .eq('id', transactionId);

        if (updTxErr) throw updTxErr;

        return NextResponse.json({ 
          success: true, 
          message: 'Saque aprovado e pago com sucesso via API da LytronPay.',
          payoutId: resData.payoutId 
        });

      } catch (payError: any) {
        console.error('Payout API network failure:', payError);
        return NextResponse.json({ error: 'Falha de comunicação com o gateway de pagamentos.' }, { status: 502 });
      }
    }

    if (action === 'reject-withdrawal') {
      const { transactionId } = params;

      const { data: tx, error: fetchErr } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchErr || !tx) {
        return NextResponse.json({ error: 'Solicitação de saque não encontrada' }, { status: 404 });
      }

      if (tx.status !== 'pending') {
        return NextResponse.json({ error: 'Esta solicitação de saque já foi processada' }, { status: 400 });
      }

      const { data: userProfile, error: getErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', tx.user_id)
        .single();

      if (getErr || !userProfile) {
        return NextResponse.json({ error: 'Perfil do usuário não encontrado' }, { status: 404 });
      }

      const revertedBalance = Number(userProfile.balance) + Number(tx.amount);
      const revertedWithdrawalSum = Math.max(0, Number(userProfile.total_withdrawal) - Number(tx.amount));

      const { error: updProfErr } = await supabaseAdmin
        .from('profiles')
        .update({ balance: revertedBalance, total_withdrawal: revertedWithdrawalSum })
        .eq('id', tx.user_id);

      if (updProfErr) throw updProfErr;

      const { error: updTxErr } = await supabaseAdmin
        .from('transactions')
        .update({ status: 'rejected' })
        .eq('id', transactionId);

      if (updTxErr) throw updTxErr;

      return NextResponse.json({ success: true, message: 'Solicitação de saque rejeitada e fundos devolvidos ao saldo do usuário.' });
    }

    return NextResponse.json({ error: 'Ação administrativa inválida' }, { status: 400 });

  } catch (error: any) {
    console.error('Admin API error:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
