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

const PLANS_CATALOG = [
  { id: 'colgate-total-12', name: 'VIP 1', price: 25.00, dailyIncome: 5.50, cycleDays: 30 },
  { id: 'colgate-luminous-white', name: 'VIP 2', price: 50.00, dailyIncome: 11.00, cycleDays: 30 },
  { id: 'colgate-plax-fresh', name: 'VIP 3', price: 150.00, dailyIncome: 33.00, cycleDays: 30 },
  { id: 'colgate-ortho-care', name: 'VIP 4', price: 500.00, dailyIncome: 110.00, cycleDays: 30 },
  { id: 'colgate-sorriso-vip', name: 'VIP 5', price: 1500.00, dailyIncome: 330.00, cycleDays: 30 }
];

export async function POST(request: Request) {
  try {
    const { userId, planId } = await request.json();

    if (!userId || !planId) {
      return NextResponse.json({ error: 'Missing userId or planId' }, { status: 400 });
    }

    const plan = PLANS_CATALOG.find(p => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });
    }

    // 1. Fetch user profile
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();

    if (profErr || !profile) {
      return NextResponse.json({ error: 'Perfil do usuário não encontrado' }, { status: 404 });
    }

    const balance = parseFloat(profile.balance);
    if (balance < plan.price) {
      return NextResponse.json({ error: 'Saldo insuficiente para adquirir este plano.' }, { status: 400 });
    }

    const newBalance = balance - plan.price;

    // 2. Add active plan in DB
    const { data: planData, error: planError } = await supabaseAdmin
      .from('active_plans')
      .insert([
        {
          user_id: userId,
          plan_id: plan.id,
          name: plan.name,
          price: plan.price,
          daily_income: plan.dailyIncome,
          cycle_days: plan.cycleDays
        }
      ])
      .select()
      .single();

    if (planError || !planData) {
      console.error('Error saving active plan:', planError);
      return NextResponse.json({ error: 'Erro ao ativar plano no banco de dados.' }, { status: 500 });
    }

    // 3. Deduct balance from profile
    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', userId);

    if (updateErr) {
      console.error('Error updating user balance:', updateErr);
      return NextResponse.json({ error: 'Erro ao deduzir saldo.' }, { status: 500 });
    }

    // 4. Insert transaction record
    const { data: txData, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert([
        {
          user_id: userId,
          type: 'investment',
          amount: plan.price,
          status: 'completed',
          details: `Compra do plano: ${plan.name}`
        }
      ])
      .select()
      .single();

    if (txError) {
      console.error('Error inserting investment transaction:', txError);
    }

    // 5. Distribute referral commissions securely
    await distributeCommissions(supabaseAdmin, userId, plan.price);

    console.log(`[BUY PLAN] User ${userId} purchased ${plan.name} for R$ ${plan.price}`);

    return NextResponse.json({
      success: true,
      balance: newBalance,
      planData,
      transactionId: txData?.id || null
    });

  } catch (error: any) {
    console.error('Buy plan error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
