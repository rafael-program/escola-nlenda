import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ComprovativosAlunoClient from './client'

export default async function ComprovativosAlunoPage({
  params,
}: {
  params: Promise<{ alunoId: string }>
}) {
  const { alunoId } = await params
  const supabase = await createClient()

  const { data: aluno } = await supabase
    .from('students')
    .select(`
      id, full_name, nome_pai, telefone_pai,
      classes(name)
    `)
    .eq('id', alunoId)
    .maybeSingle()

  if (!aluno) {
    return (
      <div>
        <Link
          href="/secretario/comprovativos"
          className="text-sm text-gray-500 hover:text-blue-600 transition"
        >
          ← Voltar aos comprovativos
        </Link>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm font-medium text-amber-900">
            Aluno não encontrado
          </p>
          <p className="text-xs text-amber-700 mt-1">
            ID: <code className="font-mono">{alunoId}</code>
          </p>
        </div>
      </div>
    )
  }

  const cls = Array.isArray(aluno.classes) ? aluno.classes[0] : aluno.classes

  const { data: comprovativos } = await supabase
    .from('payment_proofs')
    .select(`
      id, month, file_url, file_type, status, rejection_reason,
      notes, valor_declarado, variacao, created_at, reviewed_at,
      servicos(codigo, nome)
    `)
    .eq('student_id', alunoId)
    .order('created_at', { ascending: false })

  const lista = (comprovativos ?? []).map((c) => {
    const srv = Array.isArray(c.servicos) ? c.servicos[0] : c.servicos
    return {
      id: c.id,
      month: c.month,
      file_url: c.file_url,
      file_type: c.file_type,
      status: c.status as 'pending' | 'approved' | 'rejected',
      rejection_reason: c.rejection_reason,
      notes: c.notes,
      valor_declarado:
        c.valor_declarado !== null ? Number(c.valor_declarado) : null,
      variacao: c.variacao as string | null,
      created_at: c.created_at,
      reviewed_at: c.reviewed_at,
      servico_codigo: srv ? String(srv.codigo) : null,
      servico_nome: srv ? String(srv.nome) : null,
    }
  })

  return (
    <div>
      <Link
        href="/secretario/comprovativos"
        className="text-sm text-gray-500 hover:text-blue-600 transition"
      >
        ← Voltar aos comprovativos
      </Link>

      <ComprovativosAlunoClient
        aluno={{
          id: aluno.id,
          full_name: aluno.full_name,
          nome_pai: aluno.nome_pai as string | null,
          telefone_pai: aluno.telefone_pai as string | null,
          classe: cls ? String(cls.name) : null,
        }}
        comprovativos={lista}
      />
    </div>
  )
}