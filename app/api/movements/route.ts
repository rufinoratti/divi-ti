import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function mapMovement(db: any): any {
  return {
    ...db,
    kind: db.tipo === 'prestamo' ? 'loan' : 'expense',
    paidBy: db.pagado_por,
    recipient: db.receptor,
    description: db.descripcion,
    amount: db.monto,
    category: db.categoria,
    participants: db.participantes,
    createdAt: db.creado_en,
  };
}

function mapMovementForDb(movement: any): any {
  return {
    tipo: movement.kind === 'loan' ? 'prestamo' : 'gasto',
    descripcion: movement.description,
    monto: movement.amount,
    pagado_por: movement.paidBy,
    receptor: movement.recipient ?? null,
    categoria: movement.category,
    participantes: JSON.stringify(movement.participants ?? []),
    grupo_id: 'default',
  };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const groupId = url.searchParams.get('grupo_id') ?? 'default';
  const { data, error } = await supabase.from('movimientos').select('*').eq('grupo_id', groupId).order('creado_en', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(mapMovement));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { data, error } = await supabase.from('movimientos').insert(mapMovementForDb(body)).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapMovement(data), { status: 201 });
}
