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
        error: 'Erro de Configuração: A variável de ambiente "SUPABASE_SERVICE_ROLE_KEY" não foi cadastrada no painel do Vercel. Por favor, adicione-a nas configurações do seu projeto no Vercel e faça um novo deploy.' 
      }, { status: 500 });
    }

    if (action === 'get-stats') {
      // 1. Fetch all profiles
      const { data: profiles, error: errProf } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('username', { ascending: true });

      if (errProf) throw errProf;

      // 2. Fetch all transactions
      const { data: transactions, error: errTx } = await supabaseAdmin
        .from('transactions')
        .select('*, profiles(username, pix_key, pix_type)')
        .order('created_at', { ascending: false });

      if (errTx) throw errTx;

      // 3. Calculate statistics
      // Total Deposits = sum of 'deposit' transactions that are 'completed'
      const totalDeposited = transactions
        .filter(t => t.type === 'deposit' && t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Total Paid = sum of 'withdrawal' transactions that are 'completed'
      const totalPaid = transactions
        .filter(t => t.type === 'withdrawal' && t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Pending Withdrawals
      const pendingWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending');

      return NextResponse.json({
        success: true,
        stats: {
          totalUsers: profiles.length,
          totalDeposited,
          totalPaid,
          pendingCount: pendingWithdrawals.length
        },
        profiles,
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

      // Fetch user profile current balance
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

      // Update DB Profile
      const { error: updErr } = await supabaseAdmin
        .from('profiles')
        .update({
          balance: updatedBalance,
          total_recharge: updatedTotalRecharge
        })
        .eq('id', userId);

      if (updErr) throw updErr;

      // Record deposit transaction
      const { error: insErr } = await supabaseAdmin.from('transactions').insert([
        {
          user_id: userId,
          type: 'deposit',
          amount: numAmount,
          status: 'completed',
          details: 'Crédito direto via Painel Administrativo'
        }
      ]);

      if (insErr) throw insErr;

      return NextResponse.json({ success: true, message: `Saldo de R$ ${numAmount.toFixed(2)} adicionado com sucesso.` });
    }

    if (action === 'approve-withdrawal') {
      const { transactionId } = params;

      // Retrieve transaction and user profile details
      const { data: tx, error: fetchErr } = await supabaseAdmin
        .from('transactions')
        .select('*, profiles(*)')
        .eq('id', transactionId)
        .single();

      if (fetchErr || !tx) {
        return NextResponse.json({ error: 'Solicitação de saque não encontrada' }, { status: 404 });
      }

      if (tx.status !== 'pending') {
        return NextResponse.json({ error: 'Esta solicitação de saque já foi processada' }, { status: 400 });
      }

      const pixKey = tx.profiles.pix_key;
      const pixType = tx.profiles.pix_type || 'key';

      if (!pixKey) {
        return NextResponse.json({ error: 'Usuário não possui uma chave PIX cadastrada' }, { status: 400 });
      }

      const apiKey = process.env.LYTRON_API_KEY;
      const apiSecret = process.env.LYTRON_API_SECRET;

      if (!apiKey || !apiSecret) {
        return NextResponse.json({ error: 'Chaves da API da LytronPay não configuradas no backend' }, { status: 500 });
      }

      // 1. Trigger the live Payout transfer call via LytronPay
      const payoutPayload = {
        amount: parseFloat(tx.amount),
        pix: {
          type: pixType,
          key: pixKey
        },
        description: `Saque Colgate - ${tx.profiles.username}`,
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
          console.error('LytronPay payout API error details:', resData);
          return NextResponse.json({ error: resData.message || 'Erro ao processar saque na API da LytronPay' }, { status: response.status });
        }

        // 2. Mark the transaction as completed on payout API success
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

      // Revert funds back to user balance on rejection
      const revertedBalance = Number(userProfile.balance) + Number(tx.amount);
      const revertedWithdrawalSum = Math.max(0, Number(userProfile.total_withdrawal) - Number(tx.amount));

      // Update DB user profile
      const { error: updProfErr } = await supabaseAdmin
        .from('profiles')
        .update({
          balance: revertedBalance,
          total_withdrawal: revertedWithdrawalSum
        })
        .eq('id', tx.user_id);

      if (updProfErr) throw updProfErr;

      // Mark transaction status as rejected
      const { error: updTxErr } = await supabaseAdmin
        .from('transactions')
        .update({ status: 'rejected' })
        .eq('id', transactionId);

      if (updTxErr) throw updTxErr;

      return NextResponse.json({ success: true, message: 'Solicitação de saque rejeitada e fundos devolvidos ao saldo do usuário.' });
    }

    return NextResponse.json({ error: 'Ação administrativa inválida' }, { status: 400 });

  } catch (error: any) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
