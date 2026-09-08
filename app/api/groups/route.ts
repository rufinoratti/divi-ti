import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(_request: NextRequest) {
  const { data, error } = await supabase.from('grupos').select('*').limit(1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ id: 'default', nombre: 'Grupo', miembros: [] });
  const grupo = data[0];
  const { data: miembros, error: miembrosError } = await supabase.from('miembros').select('*').eq('grupo_id', grupo.id);
  if (miembrosError) return NextResponse.json({ error: miembrosError.message }, { status: 500 });
  return NextResponse.json({ id: grupo.id, nombre: grupo.nombre, miembros: miembros ?? [] });
}
