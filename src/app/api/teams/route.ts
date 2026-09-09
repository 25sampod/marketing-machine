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
      // Real studio roster fallback
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
        {
          id: 'spec-commercial',
          name: 'Commercial Specialist',
          email: userEmail,
          contact: userEmail,
          role: 'specialist',
          specialty: 'Commercial',
          status: 'active',
        },
        {
          id: 'spec-residential',
          name: 'Residential Specialist',
          email: userEmail,
          contact: userEmail,
          role: 'specialist',
          specialty: 'Residential',
          status: 'active',
        },
        {
          id: 'spec-renovation',
          name: 'Renovation Specialist',
          email: userEmail,
          contact: userEmail,
          role: 'specialist',
          specialty: 'Renovation',
          status: 'active',
        },
      ];
    }

    return NextResponse.json({
      team: {
        id: 'archscale-studio-team',
        name: 'ArchScale Architecture Studio',
        owner_id: userId || 'owner-sampod',
        invite_code: 'arch8899',
      },
      members,
      role: 'owner',
    });
  } catch (err: any) {
    console.error('Error fetching team:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
