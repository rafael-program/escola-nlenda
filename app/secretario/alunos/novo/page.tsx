import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import NovoAlunoForm from './form'

export default async function NovoAlunoPage() {
  const supabase = await createClient()

  const [{ data: classes }, { data: turmas }] = await Promise.all([
    supabase.from('classes').select('id, name').order('name'),
    supabase.from('turmas').select('id, name, class_id').order('name'),
  ])

  const classesNorm = (classes ?? []).map((c) => ({
    id: c.id,
    name: String(c.name),
  }))

  const turmasNorm = (turmas ?? []).map((t) => ({
    id: t.id,
    name: String(t.name),
    class_id: t.class_id,
  }))

  return (
    <div>
      <Link
        href="/secretario/alunos"
        className="text-sm text-gray-500 hover:text-blue-600 transition"
      >
        ← Voltar aos alunos
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-gray-900">Novo aluno</h1>
      <p className="mt-1 text-sm text-gray-500">
        Preencha os dados, anexe o BI e o certificado, e defina o acesso ao portal.
      </p>

      <NovoAlunoForm classes={classesNorm} turmas={turmasNorm} />
    </div>
  )
}