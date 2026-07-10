import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { distributeCommissions } from '../../../lib/commissions';

const cleanKey = (key: string) => {
  if (!key) return '';
  return key.trim().replace(/^['\"]|['\"]$/g, '');
};

const supabaseAdmin = createClient(
  cleanKey(process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
  cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const txid = searchParams.get('txid');

    if (!txid) {
      return NextResponse.json({ error: 'Missing txid parameter' }, { status: 400 });
    }

    const apiKey = process.env.LYTRON_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key for payment gateway not configured in the backend' }, { status: 500 });
    }

    const response = await fetch(`https://api.lytronpay.com/api/v1/charges/${txid}`, {
      method: 'GET',
      headers: {
        'Api-Access-Key': apiKey
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Payment gateway query error details:', data);
      return NextResponse.json({ error: data.message || 'Erro ao consultar status do PIX' }, { status: response.status });
    }

    // Normalize status: LytronPay returns status in Portuguese
    // "pago" → "paid", "pendente" → "pending", etc.
    const rawStatus = (data.status || '').toLowerCase();
    const normalizedStatus =
      rawStatus === 'pago' ? 'paid' :
      rawStatus === 'pendente' ? 'pending' :
      rawStatus === 'expirado' ? 'expired' :
      rawStatus === 'cancelado' ? 'cancelled' :
      rawStatus === 'reembolsado' ? 'refunded' :
      rawStatus;

    // ── If payment is paid, make sure the database is updated and commissions are paid ──
    if (normalizedStatus === 'paid') {
      try {
        const { data: transactions } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .ilike('details', `%${txid}%`)
          .eq('status', 'pending')
          .eq('type', 'deposit');

        if (transactions && transactions.length > 0) {
          for (const tx of transactions) {
            // 1. Mark transaction as completed
            await supabaseAdmin
              .from('transactions')
              .update({ status: 'completed' })
              .eq('id', tx.id);

            // 2. Fetch profile to credit balance and total_recharge
            const { data: profileData } = await supabaseAdmin
              .from('profiles')
              .select('balance, total_recharge')
              .eq('id', tx.user_id)
              .single();

            if (profileData) {
              await supabaseAdmin
                .from('profiles')
                .update({
                  balance: Number(profileData.balance) + Number(tx.amount),
                  total_recharge: Number(profileData.total_recharge) + Number(tx.amount)
                })
                .eq('id', tx.user_id);
            }

            console.log(`[POLLING STATUS] Completed deposit R$ ${tx.amount} for user ${tx.user_id} via polling`);

            // 3. Distribute referral commissions
            await distributeCommissions(supabaseAdmin, tx.user_id, Number(tx.amount));
          }
        }
      } catch (dbErr) {
        console.error('[POLLING STATUS] Failed to auto-complete transaction in DB:', dbErr);
      }
    }

    return NextResponse.json({ ...data, status: normalizedStatus });
  } catch (error: any) {
    console.error('Error querying PIX status:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
