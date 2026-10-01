import { createClient } from '@/lib/supabase/server'
import ServicosClient from './client'

export default async function ServicosPage() {
  const supabase = await createClient()

  const [{ data: servicos }, { data: classes }, { data: precos }] =
    await Promise.all([
      supabase.from('servicos').select('*').order('ordem'),
      supabase.from('classes').select('id, name').order('id'),
      supabase
        .from('tabela_precos')
        .select('id, servico_id, classe_id, variacao, valor, ativo')
        .eq('ano_letivo', '2026'),
    ])

  const servicosNorm = (servicos ?? []).map((s) => ({
    id: s.id,
    codigo: String(s.codigo),
    nome: String(s.nome),
    descricao: (s.descricao as string | null) ?? null,
    tem_multa: Boolean(s.tem_multa),
    multa_percentual: Number(s.multa_percentual ?? 25),
    tem_urgencia: Boolean(s.tem_urgencia),
    ativo: Boolean(s.ativo),
    ordem: Number(s.ordem ?? 0),
  }))

  const classesNorm = (classes ?? []).map((c) => ({
    id: c.id,
    name: String(c.name),
  }))

  const precosNorm = (precos ?? []).map((p) => ({
    id: p.id,
    servico_id: p.servico_id,
    classe_id: p.classe_id,
    variacao: p.variacao as string | null,
    valor: Number(p.valor),
    ativo: Boolean(p.ativo),
  }))

  return (
    <ServicosClient
      servicos={servicosNorm}
      classes={classesNorm}
      precos={precosNorm}
    />
  )
}