import { SupabaseClient } from '@supabase/supabase-js';

export async function distributeCommissions(
  supabaseAdmin: SupabaseClient,
  depositorUserId: string,
  depositAmount: number
) {
  try {
    console.log(`[COMMISSIONS] Processing commissions for deposit of R$ ${depositAmount} by user ${depositorUserId}`);

    // 1. Fetch depositor profile
    const { data: depositorProfile, error: depErr } = await supabaseAdmin
      .from('profiles')
      .select('username, referred_by')
      .eq('id', depositorUserId)
      .single();

    if (depErr || !depositorProfile) {
      console.error(`[COMMISSIONS] Failed to fetch depositor profile for ${depositorUserId}:`, depErr?.message);
      return;
    }

    const depositorUsername = depositorProfile.username || 'Afiliado';
    const l1ReferredBy = depositorProfile.referred_by;

    // ──────── LEVEL 1 (23%) ────────
    if (l1ReferredBy && l1ReferredBy.trim() !== '') {
      const { data: l1Profile, error: l1Err } = await supabaseAdmin
        .from('profiles')
        .select('id, balance, referral_earnings, referred_by')
        .eq('id_code', l1ReferredBy.trim())
        .single();

      if (l1Err || !l1Profile) {
        console.error(`[COMMISSIONS] Failed to find Level 1 inviter with code ${l1ReferredBy}:`, l1Err?.message);
        return;
      }

      const l1Commission = Number((depositAmount * 0.23).toFixed(2));
      const newL1Balance = Number(l1Profile.balance) + l1Commission;
      const newL1Earnings = Number(l1Profile.referral_earnings || 0) + l1Commission;

      // Update Level 1 balance and earnings
      await supabaseAdmin
        .from('profiles')
        .update({ balance: newL1Balance, referral_earnings: newL1Earnings })
        .eq('id', l1Profile.id);

      // Record transaction
      await supabaseAdmin.from('transactions').insert([{
        user_id: l1Profile.id,
        type: 'commission',
        amount: l1Commission,
        status: 'completed',
        details: `Comissão Nível 1 (23%) - Compra de Plano de ${depositorUsername}`
      }]);

      console.log(`[COMMISSIONS] Level 1 (23%) credited: R$ ${l1Commission} to user ${l1Profile.id}`);

      // ──────── LEVEL 2 (4%) ────────
      const l2ReferredBy = l1Profile.referred_by;
      if (l2ReferredBy && l2ReferredBy.trim() !== '') {
        const { data: l2Profile, error: l2Err } = await supabaseAdmin
          .from('profiles')
          .select('id, balance, referral_earnings, referred_by')
          .eq('id_code', l2ReferredBy.trim())
          .single();

        if (!l2Err && l2Profile) {
          const l2Commission = Number((depositAmount * 0.04).toFixed(2));
          const newL2Balance = Number(l2Profile.balance) + l2Commission;
          const newL2Earnings = Number(l2Profile.referral_earnings || 0) + l2Commission;

          await supabaseAdmin
            .from('profiles')
            .update({ balance: newL2Balance, referral_earnings: newL2Earnings })
            .eq('id', l2Profile.id);

          await supabaseAdmin.from('transactions').insert([{
            user_id: l2Profile.id,
            type: 'commission',
            amount: l2Commission,
            status: 'completed',
            details: `Comissão Nível 2 (4%) - Compra de Plano de ${depositorUsername}`
          }]);

          console.log(`[COMMISSIONS] Level 2 (4%) credited: R$ ${l2Commission} to user ${l2Profile.id}`);

          // ──────── LEVEL 3 (1%) ────────
          const l3ReferredBy = l2Profile.referred_by;
          if (l3ReferredBy && l3ReferredBy.trim() !== '') {
            const { data: l3Profile, error: l3Err } = await supabaseAdmin
              .from('profiles')
              .select('id, balance, referral_earnings')
              .eq('id_code', l3ReferredBy.trim())
              .single();

            if (!l3Err && l3Profile) {
              const l3Commission = Number((depositAmount * 0.01).toFixed(2));
              const newL3Balance = Number(l3Profile.balance) + l3Commission;
              const newL3Earnings = Number(l3Profile.referral_earnings || 0) + l3Commission;

              await supabaseAdmin
                .from('profiles')
                .update({ balance: newL3Balance, referral_earnings: newL3Earnings })
                .eq('id', l3Profile.id);

              await supabaseAdmin.from('transactions').insert([{
                user_id: l3Profile.id,
                type: 'commission',
                amount: l3Commission,
                status: 'completed',
                details: `Comissão Nível 3 (1%) - Compra de Plano de ${depositorUsername}`
              }]);

              console.log(`[COMMISSIONS] Level 3 (1%) credited: R$ ${l3Commission} to user ${l3Profile.id}`);
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[COMMISSIONS] Unhandled error during commission distribution:', err?.message || err);
  }
}
