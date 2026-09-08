import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(_request: NextRequest) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return NextResponse.json({ error: error.message }, { status: 401 });
  if (!session) return NextResponse.json({ error: 'No session' }, { status: 401 });
  return NextResponse.json({ session: { user: { id: session.user.id, email: session.user.email } } });
}
