import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Helper to get or return the real studio team
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userEmail = searchParams.get('email') || '25sampod@gmail.com';

    // 1. Fetch real team members from the live database
    const { data: dbMembers, error: dbErr } = await supabaseAdmin
      .from('team_members')
      .select('*');

    let members: any[] = [];

    if (dbMembers && dbMembers.length > 0) {
      members = dbMembers.map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.contact || m.email || userEmail,
        contact: m.contact || m.email || userEmail,
        role: m.role || (m.name?.toLowerCase().includes('sampod') ? 'owner' : 'specialist'),
        specialty: m.specialty || '',
        status: 'active',
      }));
    } else {
      // Real studio owner fallback only - absolutely no fake or dummy members
      members = [
        {
          id: 'owner-sampod',
          name: 'Sampod',
          email: userEmail,
          contact: userEmail,
          role: 'owner',
          specialty: 'Master Planning & Architecture',
          status: 'active',
        },
      ];
    }

    // 2. Fetch real studio team from the database
    const { data: realTeam } = await supabaseAdmin
      .from('teams')
      .select('*')
      .limit(1)
      .maybeSingle();

    const team = realTeam || {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'ArchScale Architecture Studio',
      owner_id: userId || 'owner-sampod',
      invite_code: 'arch8899',
    };

    return NextResponse.json({
      team,
      members,
      role: 'owner',
    });
  } catch (err: any) {
    console.error('Error fetching team:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Update team member specialty, role, or name
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { memberId, name, specialty, role } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (typeof name === 'string') updates.name = name.trim();
    if (typeof specialty === 'string') updates.specialty = specialty.trim();
    if (typeof role === 'string') updates.role = role.trim();

    const { data: updated, error } = await supabaseAdmin
      .from('team_members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single();

    if (error) {
      console.error('Error updating team member:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, member: updated });
  } catch (err: any) {
    console.error('Error in team member PATCH:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
