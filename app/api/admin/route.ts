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
  // ==== Segurança ==== //
  // 1. CORS - permite somente nosso domínio
  const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || '*';
  const origin = request.headers.get('origin') || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };

  // Helper para respostas JSON padrão (inclui CORS e Content-Type)
  const jsonResponse = (payload: any, status: number = 200) => {
    const headers = {
      'Content-Type': 'application/json',
      ...corsHeaders,
    } as any;
    return new Response(JSON.stringify(payload), { status, headers });
  };

  // 2. Rate limiting simples (5 req/min por IP)
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  // Global map stored on module level (persist across invocations in Vercel Edge)
  // Use a simple in‑memory map for rate limiting; cast to any to avoid TS errors
  if ((global as any).rateLimiter === undefined) {
    (global as any).rateLimiter = new Map();
  }
  const limiter = (global as any).rateLimiter;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 min
  const max = 5;
  let entry = limiter.get(ip);
  if (!entry) {
    entry = { count: 1, start: now };
    limiter.set(ip, entry);
  } else {
    if (now - entry.start > windowMs) {
      entry.count = 1;
      entry.start = now;
    } else {
      entry.count++;
    }
  }
  if (entry.count > max) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { action, params } = body;

    // 3. Verificação de credenciais administrativas
    const adminToken = process.env.ADMIN_TOKEN;
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    let isAuthorized = false;

    // Se um token Bearer for fornecido, valida contra o token cadastrado
    if (token && adminToken) {
      if (token === adminToken) {
        isAuthorized = true;
      }
    } else {
      // Caso contrário, valida usando username/password fornecidos no corpo da requisição
      const { username, password } = body as any;
      const envAdminUser = process.env.ADMIN_USERNAME || 'admin';
      const envAdminPass = process.env.ADMIN_PASSWORD || 'colgate2026admin';
      if (username === envAdminUser && password === envAdminPass) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Credenciais administrativas inválidas' }), { status: 401, headers: corsHeaders });
    }

    if (supabaseServiceKey === 'placeholder-service-key' || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: 'Erro de Configuração: A variável de ambiente "SUPABASE_SERVICE_ROLE_KEY" não foi cadastrada no painel do Vercel.' }, 500);
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

      return jsonResponse({
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
        return jsonResponse({ error: 'Valor inválido para depósito' }, 400);
      }

      const { data: userProfile, error: getErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (getErr || !userProfile) {
        return jsonResponse({ error: 'Usuário não encontrado' }, 404);
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

      return jsonResponse({ success: true, message: `Saldo de R$ ${numAmount.toFixed(2)} adicionado com sucesso.` });
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
        return jsonResponse({ error: 'Solicitação de saque não encontrada' }, 404);
      }

      if (tx.status !== 'pending') {
        return jsonResponse({ error: 'Esta solicitação de saque já foi processada' }, 400);
      }

      // Fetch the associated profile separately
      const { data: userProfile, error: profErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', tx.user_id)
        .single();

      if (profErr || !userProfile) {
        return jsonResponse({ error: 'Perfil do usuário não encontrado' }, 404);
      }

      const pixKey = userProfile.pix_key;
      const pixType = userProfile.pix_type || 'cpf';
      const pixTypeMap: Record<string, string> = { cpf: 'cpf', email: 'email', telefone: 'phone', aleatoria: 'evp' };
      const mappedPixType = pixTypeMap[pixType] || pixType;

      if (!pixKey) {
        return jsonResponse({ error: 'Usuário não possui uma chave PIX cadastrada' }, 400);
      }

      const apiKey = cleanKey(process.env.LYTRON_API_KEY || '');
      const apiSecret = cleanKey(process.env.LYTRON_API_SECRET || '');

      if (!apiKey || !apiSecret) {
        return jsonResponse({ error: 'Chaves da API de pagamento não configuradas no backend' }, 500);
      }

      const grossAmount = parseFloat(tx.amount);
      const fee = grossAmount * 0.12;
      const netAmount = grossAmount - fee;

      const payoutPayload = {
        amount: netAmount,
        pix: { type: mappedPixType, key: pixKey },
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
          console.error('Payment payout API error:', resData);
          return jsonResponse({ error: resData.message || 'Erro ao processar saque na API de pagamento' }, response.status);
        }

        const { error: updTxErr } = await supabaseAdmin
          .from('transactions')
          .update({ status: 'completed' })
          .eq('id', transactionId);

        if (updTxErr) throw updTxErr;

        return jsonResponse({ 
          success: true, 
          message: `Saque de R$ ${grossAmount.toFixed(2)} aprovado. Taxa de 12% (R$ ${fee.toFixed(2)}) aplicada. Enviado R$ ${netAmount.toFixed(2)} via pagamento.`,
          payoutId: resData.payoutId,
          grossAmount,
          fee,
          netAmount
        });

      } catch (payError: any) {
        console.error('Payout API network failure:', payError);
        return jsonResponse({ error: 'Falha de comunicação com o gateway de pagamentos.' }, 502);
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
        return jsonResponse({ error: 'Solicitação de saque não encontrada' }, 404);
      }

      if (tx.status !== 'pending') {
        return jsonResponse({ error: 'Esta solicitação de saque já foi processada' }, 400);
      }

      const { data: userProfile, error: getErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', tx.user_id)
        .single();

      if (getErr || !userProfile) {
        return jsonResponse({ error: 'Perfil do usuário não encontrado' }, 404);
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

      return jsonResponse({ success: true, message: 'Solicitação de saque rejeitada e fundos devolvidos ao saldo do usuário.' });
    }

    return jsonResponse({ error: 'Ação administrativa inválida' }, 400);

  } catch (error: any) {
    console.error('Admin API error:', error?.message || error);
    return jsonResponse({ error: error?.message || 'Internal Server Error' }, 500);
  }
}
