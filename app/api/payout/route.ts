import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const cleanKey = (key: string) => {
  if (!key) return '';
  return key.trim().replace(/^['\"]|['\"]$/g, '');
};

const supabaseAdmin = createClient(
  cleanKey(process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
  cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Map internal PIX type names to Lytron Pay API type names
const mapPixType = (type: string): string => {
  const map: Record<string, string> = {
    cpf: 'cpf',
    cnpj: 'cnpj',
    email: 'email',
    telefone: 'phone',
    aleatoria: 'evp',   // Chave aleatória = EVP na Lytron
    evp: 'evp',
    random: 'evp',
  };
  return map[type?.toLowerCase()] || 'cpf';
};

export async function POST(request: Request) {
  try {
    const { amount, pixKey, pixType, userName, userId, transactionId } = await request.json();

    const apiKey = process.env.LYTRON_API_KEY;
    const apiSecret = process.env.LYTRON_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'API keys not configured' }, { status: 500 });
    }

    if (!amount || !pixKey || !pixType) {
      return NextResponse.json({ error: 'Missing required fields: amount, pixKey, pixType' }, { status: 400 });
    }

    // ── Security: verify the transaction belongs to the user ──────────────
    if (transactionId && userId) {
      const { data: txCheck, error: txCheckErr } = await supabaseAdmin
        .from('transactions')
        .select('user_id, status, type')
        .eq('id', transactionId)
        .single();

      if (txCheckErr || !txCheck) {
        return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
      }
      if (txCheck.user_id !== userId) {
        console.warn(`Security: payout attempt for transaction ${transactionId} by wrong user ${userId}`);
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
      }
      if (txCheck.type !== 'withdrawal') {
        return NextResponse.json({ error: 'Tipo de transação inválido' }, { status: 400 });
      }
    }


    const lytronPixType = mapPixType(pixType);

    const payload = {
      amount: parseFloat(amount),
      pix: {
        type: lytronPixType,
        key: pixKey.trim()
      },
      description: `Saque Colgate Invest - ${userName || 'Usuário'}`,
      deduct_fee: false,
      idempotency_key: transactionId ? `saque_${transactionId}` : `saque_${userId}_${Date.now()}`
    };

    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', apiSecret).update(rawBody).digest('hex');

    console.log(`Payout request: R$${amount} via ${lytronPixType} key: ${pixKey}`);

    const response = await fetch('https://api.lytronpay.com/api/v1/payouts', {
      method: 'POST',
      headers: {
        'Api-Access-Key': apiKey,
        'Transaction-Hash': signature,
        'Content-Type': 'application/json',
        'Idempotency-Key': payload.idempotency_key
      },
      body: rawBody
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Lytron payout error:', data);

      // Update transaction to failed in DB
      if (transactionId) {
        await supabaseAdmin
          .from('transactions')
          .update({ status: 'failed', details: `Saque falhou: ${data.message || 'Erro na Lytron'}` })
          .eq('id', transactionId);
      }

      return NextResponse.json({ error: data.message || 'Erro ao processar saque' }, { status: response.status });
    }

    // Update transaction status to processing
    if (transactionId) {
      await supabaseAdmin
        .from('transactions')
        .update({
          status: 'completed',
          details: `Saque enviado via Lytron | payoutId: ${data.payoutId} | status: ${data.status}`
        })
        .eq('id', transactionId);
    }

    console.log(`Payout created: payoutId=${data.payoutId} status=${data.status}`);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Payout route error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
