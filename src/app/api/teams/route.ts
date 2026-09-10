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
        role: m.name?.toLowerCase().includes('sampod') ? 'owner' : 'specialist',
        specialty: m.specialty || 'Architecture Specialist',
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
