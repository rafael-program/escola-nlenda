import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import RecibosAlunoClient from './client'

export default async function RecibosAlunoPage({
  params,
}: {
  params: Promise<{ alunoId: string }>
}) {
  const { alunoId } = await params
  const supabase = await createClient()

  // Dados do aluno
  const { data: aluno } = await supabase
    .from('students')
    .select(`
      id, full_name, nome_pai, telefone_pai,
      classes(name)
    `)
    .eq('id', alunoId)
    .maybeSingle()

  if (!aluno) notFound()

  const cls = Array.isArray(aluno.classes) ? aluno.classes[0] : aluno.classes

  // Recibos do aluno
  const { data: pagamentos } = await supabase
    .from('pagamentos_servico')
    .select(`
      id, numero_recibo, codigo_verificacao, file_url,
      valor_base, valor_multa, valor_total,
      forma_pagamento, banco, mes_referencia, variacao,
      criado_em,
      servicos(codigo, nome)
    `)
    .eq('student_id', alunoId)
    .order('criado_em', { ascending: false })

  const lista = (pagamentos ?? []).map((p) => {
    const srv = Array.isArray(p.servicos) ? p.servicos[0] : p.servicos
    return {
      id: p.id,
      numero_recibo: String(p.numero_recibo),
      codigo_verificacao: String(p.codigo_verificacao),
      file_url: String(p.file_url),
      valor_base: Number(p.valor_base),
      valor_multa: Number(p.valor_multa),
      valor_total: Number(p.valor_total),
      forma_pagamento: p.forma_pagamento as 'fisico' | 'banco',
      banco: p.banco as string | null,
      mes_referencia: p.mes_referencia as string | null,
      variacao: p.variacao as string | null,
      criado_em: p.criado_em,
      servico_codigo: srv ? String(srv.codigo) : null,
      servico_nome: srv ? String(srv.nome) : '—',
    }
  })

  return (
    <div>
      <Link
        href="/secretario/recibos"
        className="text-sm text-gray-500 hover:text-blue-600 transition"
      >
        ← Voltar aos recibos
      </Link>

      <RecibosAlunoClient
        aluno={{
          id: aluno.id,
          full_name: aluno.full_name,
          nome_pai: aluno.nome_pai as string | null,
          telefone_pai: aluno.telefone_pai as string | null,
          classe: cls ? String(cls.name) : null,
        }}
        recibos={lista}
      />
    </div>
  )
}