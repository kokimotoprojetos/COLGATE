import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const cleanKey = (key: string) => {
  if (!key) return '';
  return key.trim().replace(/^['\"]|['\"]$/g, '');
};

const supabaseAdmin = createClient(
  cleanKey(process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
  cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // ── Validate HMAC-SHA256 signature from LytronPay ──────────────────────
    // LytronPay sends the signature in X-Signature header (pure hex)
    // and optionally in X-Gateway-Signature as "sha256=<hex>"
    const webhookSecret = cleanKey(process.env.LYTRON_WEBHOOK_SECRET || '');
    // Strip "whsec_" prefix if present (some gateways use this format)
    const secretKey = webhookSecret.replace(/^whsec_/, '');

    const xSignature = request.headers.get('x-signature') || '';
    const xGatewaySignature = request.headers.get('x-gateway-signature') || '';
    // xGatewaySignature comes as "sha256=<hex>", extract the hex part
    const gatewayHex = xGatewaySignature.startsWith('sha256=')
      ? xGatewaySignature.substring(7)
      : xGatewaySignature;

    const receivedSig = xSignature || gatewayHex;

    if (secretKey && receivedSig) {
      const expectedSig = crypto
        .createHmac('sha256', secretKey)
        .update(rawBody)
        .digest('hex');

      if (expectedSig !== receivedSig) {
        console.warn('Webhook: Invalid signature received');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      console.log('Webhook: Signature validated successfully');
    } else {
      console.log('Webhook: No signature to validate, proceeding');
    }

    const event = JSON.parse(rawBody);
    console.log('Webhook event received:', JSON.stringify(event));

    // ── LytronPay event payload ────────────────────────────────────────────
    const txid: string = event.txid || event.id || event.charge_id || '';
    const rawStatus: string = event.status || '';
    // LytronPay returns status in Portuguese ("pago", "pendente", etc.)
    // and also in English ("paid", "completed", "approved")
    const status = rawStatus.toLowerCase();

    const isPaid =
      status === 'paid' ||
      status === 'pago' ||       // Portuguese: paid
      status === 'completed' ||
      status === 'approved' ||
      event.event === 'charge.paid'; // Fallback: trust the event type

    if (!txid) {
      console.log('Webhook: No txid found in payload, ignoring');
      return NextResponse.json({ received: true });
    }

    if (!isPaid) {
      console.log(`Webhook: Ignoring event with status "${status}" / event "${event.event}" for txid "${txid}"`);
      return NextResponse.json({ received: true });
    }

    // ── Find the pending deposit transaction in our DB by txid in details ──
    const { data: transactions, error: txErr } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .ilike('details', `%${txid}%`)
      .eq('status', 'pending')
      .eq('type', 'deposit');

    if (txErr) {
      console.error('Webhook: DB query error', txErr.message);
      return NextResponse.json({ received: true }); // ack to stop retries
    }

    if (!transactions || transactions.length === 0) {
      console.log(`Webhook: No pending deposit found for txid "${txid}" — may have been handled by polling already`);
      return NextResponse.json({ received: true });
    }

    // Process every matching transaction (should normally be 1)
    for (const tx of transactions) {
      // 1. Mark transaction as completed
      const { error: updateTxErr } = await supabaseAdmin
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', tx.id);

      if (updateTxErr) {
        console.error(`Webhook: Failed to update transaction ${tx.id}:`, updateTxErr.message);
        continue;
      }

      // 2. Credit the user's balance
      const { data: profileData, error: profileQueryErr } = await supabaseAdmin
        .from('profiles')
        .select('balance, total_recharge')
        .eq('id', tx.user_id)
        .single();

      if (profileQueryErr || !profileData) {
        console.error(`Webhook: Failed to fetch profile for user ${tx.user_id}:`, profileQueryErr?.message);
        continue;
      }

      const { error: profileUpdateErr } = await supabaseAdmin
        .from('profiles')
        .update({
          balance: Number(profileData.balance) + Number(tx.amount),
          total_recharge: Number(profileData.total_recharge) + Number(tx.amount)
        })
        .eq('id', tx.user_id);

      if (profileUpdateErr) {
        console.error(`Webhook: Failed to update balance for user ${tx.user_id}:`, profileUpdateErr.message);
        continue;
      }

      console.log(`Webhook: ✅ Credited R$${tx.amount} to user ${tx.user_id} for txid "${txid}"`);
    }

    return NextResponse.json({ received: true, processed: transactions.length });

  } catch (err: any) {
    console.error('Webhook error:', err?.message || err);
    // Always return 200 to prevent LytronPay from retrying endlessly
    return NextResponse.json({ received: true });
  }
}
