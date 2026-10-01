import { NextResponse } from 'next/server'
import { verificarSituacaoFinanceira } from '@/app/secretario/notas/actions'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const student_id = searchParams.get('student_id')
  const anoLetivo = searchParams.get('anoLetivo')

  if (!student_id || !anoLetivo) {
    return NextResponse.json({ erro: 'Parâmetros em falta.' }, { status: 400 })
  }

  const r = await verificarSituacaoFinanceira(student_id, anoLetivo)
  return NextResponse.json(r)
}