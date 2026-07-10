import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const cleanKey = (key: string) => {
  if (!key) return '';
  return key.trim().replace(/^['"]|['"]$/g, '');
};

const supabaseAdmin = createClient(
  cleanKey(process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
  cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // 1. Get the user's id_code to match against referred_by
    const { data: userProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id_code')
      .eq('id', userId)
      .single();

    if (profileErr || !userProfile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    // 2. Fetch all users referred by this user (bypasses RLS via service_role)
    const { data: referrals, error: referralsErr } = await supabaseAdmin
      .from('profiles')
      .select('id, username, created_at')
      .eq('referred_by', userProfile.id_code);

    if (referralsErr) {
      console.error('Error fetching referrals:', referralsErr);
      return NextResponse.json({ error: 'Erro ao buscar indicados' }, { status: 500 });
    }

    if (!referrals || referrals.length === 0) {
      return NextResponse.json({ referrals: [] });
    }

    // 3. Fetch active plans for all referred users
    const referralIds = referrals.map(r => r.id);
    const { data: plansData, error: plansErr } = await supabaseAdmin
      .from('active_plans')
      .select('user_id, price')
      .in('user_id', referralIds);

    if (plansErr) {
      console.error('Error fetching referral plans:', plansErr);
    }

    // 4. Build the response
    const plansByUserId = (plansData || []).reduce((acc: Record<string, number>, curr) => {
      acc[curr.user_id] = (acc[curr.user_id] || 0) + parseFloat(curr.price);
      return acc;
    }, {});

    const formattedReferrals = referrals.map(r => {
      const totalInvested = plansByUserId[r.id] || 0;
      return {
        username: r.username,
        registerDate: new Date(r.created_at).toLocaleDateString('pt-BR'),
        status: totalInvested > 0 ? 'Ativo' : 'Pendente',
        totalInvested
      };
    });

    return NextResponse.json({ referrals: formattedReferrals });

  } catch (error: any) {
    console.error('Referrals API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
