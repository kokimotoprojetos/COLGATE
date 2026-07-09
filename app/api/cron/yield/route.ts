import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This route is called automatically by Vercel Cron every hour.
// It processes ALL active plans for ALL users and credits yields
// without any user needing to open the app.

const cleanKey = (key: string) => key.trim().replace(/^['"]|['"]$/g, '');

const supabaseAdmin = createClient(
  cleanKey(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'),
  cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'),
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Protect from unauthorized calls — only Vercel Cron or your own secret can call this
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || '';

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();

  try {
    // 1. Fetch ALL active plans across all users
    const { data: plans, error: plansErr } = await supabaseAdmin
      .from('active_plans')
      .select('*');

    if (plansErr) throw plansErr;
    if (!plans || plans.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: 'No active plans found.' });
    }

    let totalPlansProcessed = 0;
    let totalCreditedGlobal = 0;

    // Group plans by user_id for efficient profile updates
    const userPlanMap: Record<string, typeof plans> = {};
    for (const plan of plans) {
      if (!userPlanMap[plan.user_id]) userPlanMap[plan.user_id] = [];
      userPlanMap[plan.user_id].push(plan);
    }

    // 2. For each user, process all their plans
    for (const [userId, userPlans] of Object.entries(userPlanMap)) {
      let userYieldTotal = 0;
      const yieldTransactions: any[] = [];

      for (const plan of userPlans) {
        const lastClaimed = new Date(plan.last_claimed_at).getTime();
        const msSinceLastClaim = now - lastClaimed;
        const fullCyclesDue = Math.floor(msSinceLastClaim / MS_PER_DAY);

        if (fullCyclesDue < 1) continue; // Not yet 24h — skip

        const yieldAmount = parseFloat(plan.daily_income) * fullCyclesDue;
        const newLastClaimed = new Date(lastClaimed + fullCyclesDue * MS_PER_DAY).toISOString();

        // Update the plan's last_claimed_at and accumulate earnings
        await supabaseAdmin
          .from('active_plans')
          .update({
            last_claimed_at: newLastClaimed,
            earnings_claimed: parseFloat(plan.earnings_claimed || 0) + yieldAmount,
            earnings_accumulated: parseFloat(plan.earnings_accumulated || 0) + yieldAmount
          })
          .eq('id', plan.id);

        userYieldTotal += yieldAmount;
        totalPlansProcessed++;

        yieldTransactions.push({
          user_id: userId,
          type: 'yield',
          amount: yieldAmount,
          status: 'completed',
          details: `Rendimento diário automático: ${plan.name} (${fullCyclesDue}x R$ ${parseFloat(plan.daily_income).toFixed(2)})`
        });
      }

      if (userYieldTotal > 0) {
        // Fetch current profile balance
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('balance, total_income')
          .eq('id', userId)
          .single();

        if (profile) {
          await supabaseAdmin
            .from('profiles')
            .update({
              balance: parseFloat(profile.balance) + userYieldTotal,
              total_income: parseFloat(profile.total_income) + userYieldTotal
            })
            .eq('id', userId);
        }

        // Insert yield transaction records
        if (yieldTransactions.length > 0) {
          await supabaseAdmin.from('transactions').insert(yieldTransactions);
        }

        totalCreditedGlobal += userYieldTotal;
      }
    }

    console.log(`[CRON /yield] Processed ${totalPlansProcessed} plans, credited R$ ${totalCreditedGlobal.toFixed(2)} total.`);

    return NextResponse.json({
      ok: true,
      processed: totalPlansProcessed,
      totalCredited: totalCreditedGlobal.toFixed(2),
      ranAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[CRON /yield] Error:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
}
