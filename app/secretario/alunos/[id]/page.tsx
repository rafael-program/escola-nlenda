import { notFound } from 'next/navigation'
import Link from 'next/link'
import { buscarAlunoDetalhe } from '../actions'
import AlunoDetalheClient from './client'
import { createClient } from '@/lib/supabase/server'

export default async function AlunoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const detalhe = await buscarAlunoDetalhe(id)
  if (!detalhe) notFound()

  const supabase = await createClient()
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name')
    .order('id')

  const { data: turmas } = await supabase
    .from('turmas')
    .select('id, name, class_id')
    .order('name')

  return (
    <div className="min-w-0">
      <Link
        href="/secretario/alunos"
        className="text-sm text-gray-500 hover:text-blue-600 transition"
      >
        ← Voltar aos alunos
      </Link>

      <AlunoDetalheClient
        aluno={detalhe.aluno}
        mesesPagos={detalhe.mesesPagos}
        recibos={detalhe.recibos}
        comprovativos={detalhe.comprovativos}
        classes={(classes ?? []).map((c) => ({
          id: c.id,
          name: String(c.name),
        }))}
        turmas={(turmas ?? []).map((t) => ({
          id: t.id,
          name: String(t.name),
          class_id: t.class_id,
        }))}
      />
    </div>
  )
}