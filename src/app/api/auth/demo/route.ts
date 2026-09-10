import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    let email = 'demo@archscale.com';
    let password = 'Hackathon2026!';

    try {
      const body = await request.json();
      if (body.email) email = body.email.toLowerCase().trim();
      if (body.password) password = body.password;
    } catch (e) {
      // default credentials
    }

    // Ensure the demo user exists and is confirmed in Supabase
    try {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const existing = usersData?.users?.find((u: any) => u.email?.toLowerCase() === email);

      if (!existing) {
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name: email === 'demo@archscale.com' ? 'Hackathon Judge' : email.split('@')[0],
            role: 'owner',
          },
        });
      } else {
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password,
          email_confirm: true,
        });
      }
    } catch (adminErr) {
      console.warn('[Demo Auth] Admin auto-provisioning note:', adminErr);
    }

    return NextResponse.json({ success: true, email, password });
  } catch (err: any) {
    console.error('[Demo Auth] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
