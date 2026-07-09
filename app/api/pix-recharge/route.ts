import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function POST(request: Request) {
  try {
    const { amount, name, email, cpf, userId } = await request.json();

    const apiKey = process.env.LYTRON_API_KEY;
    const apiSecret = process.env.LYTRON_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'API keys for payment gateway not configured in the backend' }, { status: 500 });
    }

    const payload = {
      amount: parseFloat(amount),
      description: "Recarga de saldo Colgate Invest",
      customer: {
        name: "angela maria cardoso vieira",
        email: email || "investidor@colgate.com",
        document: {
          type: "cpf",
          number: "43444695772"
        }
      }
    };

    const rawBody = JSON.stringify(payload);

    const hmac = crypto.createHmac('sha256', apiSecret);
    hmac.update(rawBody);
    const signature = hmac.digest('hex');

    const response = await fetch('https://api.lytronpay.com/api/v1/charges', {
      method: 'POST',
      headers: {
        'Api-Access-Key': apiKey,
        'Transaction-Hash': signature,
        'Content-Type': 'application/json'
      },
      body: rawBody
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Payment gateway error details:', data);
      return NextResponse.json({ error: data.message || 'Erro ao gerar PIX' }, { status: response.status });
    }

    // ── Save a PENDING transaction in DB so the webhook can find and confirm it ──
    const txid = data.txid || data.id || data.charge_id || '';
    if (userId && txid) {
      const { error: txErr } = await supabaseAdmin.from('transactions').insert([{
        user_id: userId,
        type: 'deposit',
        amount: parseFloat(amount),
        status: 'pending',
        details: `PIX pendente - txid: ${txid}`
      }]);
      if (txErr) {
        console.error('Error saving pending deposit transaction:', txErr.message);
      } else {
        console.log(`Pending deposit saved for user ${userId}, txid: ${txid}`);
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error generating PIX charge:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
