import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { inviteCode, userId, email } = await request.json();

    if (!inviteCode || !userId || !email) {
      return NextResponse.json({ error: 'Missing inviteCode, userId or email' }, { status: 400 });
    }

    const code = inviteCode.trim();
    const isDefaultCode = code.toLowerCase() === 'archscale' || code.toLowerCase() === 'arch8899';

    // 1. Find team with matching invite code or studio alias
    let { data: team, error: teamErr } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('invite_code', code)
      .maybeSingle();

    if (!team && isDefaultCode) {
      const { data: defaultTeam } = await supabaseAdmin
        .from('teams')
        .select('*')
        .limit(1)
        .maybeSingle();
      team = defaultTeam;
    }

    if (!team) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    const userEmail = email.trim().toLowerCase();

    // 2. Check if already a member by email or user_id
    const { data: existingMembers } = await supabaseAdmin
      .from('team_members')
      .select('id, email, contact, user_id')
      .eq('team_id', team.id);

    const existingMember = existingMembers?.find(
      (m: any) => m.email?.toLowerCase() === userEmail || m.contact?.toLowerCase() === userEmail || m.user_id === userId
    );

    if (existingMember) {
      // Activate/link user_id
      await supabaseAdmin
        .from('team_members')
        .update({ user_id: userId, email: userEmail, contact: userEmail, status: 'active' })
        .eq('id', existingMember.id);

      return NextResponse.json({ success: true, team });
    }

    // 3. Add as new team member (including contact field to satisfy NOT NULL constraint)
    const { error: insertErr } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: userId,
        email: userEmail,
        contact: userEmail,
        name: email.split('@')[0],
        role: 'specialist',
        specialty: 'Architecture Specialist',
        status: 'active',
      });

    if (insertErr) {
      console.error('[Join Team] Error inserting member:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, team });
  } catch (err: any) {
    console.error('[Join Team] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
