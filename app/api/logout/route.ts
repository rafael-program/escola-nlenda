import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Redireciona para a página inicial após terminar sessão
  return NextResponse.redirect(new URL('/', request.url), {
    status: 303, // 303 força o browser a fazer GET após POST
  })
}

// Ajuda a debug: se alguém abrir /api/logout no browser (GET), também sai
export async function GET(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', request.url))
}