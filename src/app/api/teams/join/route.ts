import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { inviteCode, userId, email } = await request.json();

    if (!inviteCode || !userId || !email) {
      return NextResponse.json({ error: 'Missing inviteCode, userId or email' }, { status: 400 });
    }

    // 1. Find team with matching invite code
    const { data: team, error: teamErr } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('invite_code', inviteCode.trim())
      .single();

    if (teamErr || !team) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // 2. Check if already a member
    const { data: existingMember } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('team_id', team.id)
      .eq('email', email.trim().toLowerCase())
      .single();

    if (existingMember) {
      // Just activate/link user_id
      await supabaseAdmin
        .from('team_members')
        .update({ user_id: userId, status: 'active' })
        .eq('id', existingMember.id);

      return NextResponse.json({ success: true, team });
    }

    // 3. Add as new team member
    const { error: insertErr } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: userId,
        email: email.trim().toLowerCase(),
        name: email.split('@')[0],
        role: 'specialist',
        specialty: 'Commercial',
        status: 'active',
      });

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, team });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
