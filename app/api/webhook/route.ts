import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const cleanKey = (key: string) => {
  if (!key) return '';
  return key.trim().replace(/^['"]|['"]$/g, '');
};

const supabaseAdmin = createClient(
  cleanKey(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'),
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // ── Validate HMAC-SHA256 signature from LytronPay ──────────────────────
    const secretHash = cleanKey(process.env.LYTRON_WEBHOOK_SECRET || '');
    let receivedSig = request.headers.get('transaction-hash') || request.headers.get('x-transaction-hash') || request.headers.get('x-webhook-signature') || request.headers.get('x-signature') || request.headers.get('x-gateway-signature') || '';
    if (receivedSig.startsWith('sha256=')) receivedSig = receivedSig.substring(7);

    if (secretHash && receivedSig) {
      const expectedSig = crypto
        .createHmac('sha256', secretHash)
        .update(rawBody)
        .digest('hex');

      if (expectedSig !== receivedSig) {
        console.warn('Webhook: Invalid signature received');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);

    // ── LytronPay charge.paid event ────────────────────────────────────────
    // The event payload contains txid and status at minimum.
    const txid: string = event.txid || event.id || event.charge_id || '';
    const status: string = (event.status || '').toLowerCase();

    if (!txid) {
      // Unknown event type — acknowledge and ignore
      return NextResponse.json({ received: true });
    }

    // Only process paid/completed events
    if (status !== 'paid' && status !== 'completed' && status !== 'approved') {
      console.log(`Webhook: Ignoring event with status "${status}" for txid "${txid}"`);
      return NextResponse.json({ received: true });
    }

    // ── Find the pending deposit transaction in our DB by txid stored in details ─
    const { data: transactions, error: txErr } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .ilike('details', `%${txid}%`)
      .eq('status', 'pending')
      .eq('type', 'deposit');

    if (txErr) {
      console.error('Webhook: DB query error', txErr.message);
      return NextResponse.json({ received: true }); // ack anyway to stop retries
    }

    if (!transactions || transactions.length === 0) {
      console.log(`Webhook: No pending deposit found for txid "${txid}"`);
      return NextResponse.json({ received: true });
    }

    // Process every matching transaction (should normally be 1)
    for (const tx of transactions) {
      // 1. Mark transaction as completed
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', tx.id);

      // 2. Credit the user's balance
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('balance, total_recharge')
        .eq('id', tx.user_id)
        .single();

      if (profile) {
        await supabaseAdmin
          .from('profiles')
          .update({
            balance: Number(profile.balance) + Number(tx.amount),
            total_recharge: Number(profile.total_recharge) + Number(tx.amount)
          })
          .eq('id', tx.user_id);
      }

      console.log(`Webhook: Credited R$${tx.amount} to user ${tx.user_id} for txid "${txid}"`);
    }

    return NextResponse.json({ received: true, processed: transactions.length });

  } catch (err: any) {
    console.error('Webhook error:', err?.message || err);
    // Always return 200 to prevent LytronPay from retrying endlessly
    return NextResponse.json({ received: true });
  }
}
