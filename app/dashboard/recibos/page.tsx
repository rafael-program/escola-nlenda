import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RecibosAlunoClient from './client'

export default async function RecibosAlunoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: pagamentos } = await supabase
    .from('pagamentos_servico')
    .select(`
      id, numero_recibo, codigo_verificacao, file_url,
      valor_total, mes_referencia, variacao, forma_pagamento, banco,
      criado_em,
      servicos(codigo, nome)
    `)
    .eq('student_id', user.id)
    .order('criado_em', { ascending: false })

  const lista = (pagamentos ?? []).map((p) => {
    const srv = Array.isArray(p.servicos) ? p.servicos[0] : p.servicos
    return {
      id: p.id,
      numero_recibo: String(p.numero_recibo),
      codigo_verificacao: String(p.codigo_verificacao),
      file_url: String(p.file_url),
      valor_total: Number(p.valor_total),
      mes_referencia: p.mes_referencia as string | null,
      variacao: p.variacao as string | null,
      forma_pagamento: p.forma_pagamento as 'fisico' | 'banco',
      banco: p.banco as string | null,
      criado_em: p.criado_em,
      servico_codigo: srv ? String(srv.codigo) : null,
      servico_nome: srv ? String(srv.nome) : '—',
    }
  })

  return <RecibosAlunoClient recibos={lista} />
}