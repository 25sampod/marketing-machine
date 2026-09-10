import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { inviteCode, userId, email, name, specialty, role } = await request.json();

    if (!inviteCode || !userId || !email) {
      return NextResponse.json({ error: 'Missing inviteCode, userId or email' }, { status: 400 });
    }

    const code = inviteCode.trim();
    const isDefaultCode = code.toLowerCase() === 'archscale' || code.toLowerCase() === 'arch8899';
    const chosenName = (name && typeof name === 'string' && name.trim()) || email.split('@')[0];
    const chosenSpecialty = (specialty && typeof specialty === 'string' && specialty.trim()) || '';
    const chosenRole = (role && typeof role === 'string' && role.trim()) || 'specialist';

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
      // Activate/link user_id and optionally update specialty if provided
      const updates: Record<string, any> = {
        user_id: userId,
        email: userEmail,
        contact: userEmail,
        status: 'active',
      };
      if (chosenName) updates.name = chosenName;
      if (chosenSpecialty) updates.specialty = chosenSpecialty;
      if (chosenRole) updates.role = chosenRole;

      await supabaseAdmin
        .from('team_members')
        .update(updates)
        .eq('id', existingMember.id);

      return NextResponse.json({ success: true, team });
    }

    // 3. Add as new team member with user's customized specialty (not hardcoded)
    const { error: insertErr } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: userId,
        email: userEmail,
        contact: userEmail,
        name: chosenName,
        role: chosenRole,
        specialty: chosenSpecialty,
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
