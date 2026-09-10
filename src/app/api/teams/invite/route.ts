import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { teamId, email, name, role = 'specialist', specialty = 'Commercial' } = await request.json();

    if (!teamId || !email) {
      return NextResponse.json({ error: 'Missing teamId or email' }, { status: 400 });
    }

    // Check if user already exists in auth.users
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    // Check if already in team
    const { data: existingMember } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('email', email)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'User is already invited or a member of this team' }, { status: 400 });
    }

    const { data: newMember, error } = await supabaseAdmin
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: existingUser?.id || null,
        email: email.trim().toLowerCase(),
        contact: email.trim().toLowerCase(),
        name: name || email.split('@')[0],
        role,
        specialty,
        status: existingUser?.id ? 'active' : 'pending',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, member: newMember });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
