import { createClient } from '@/lib/supabase/server'
import CaixaClient from './client'

export default async function CaixaPage() {
  const supabase = await createClient()

  const [{ data: servicos }, { data: precos }, { data: mesesPagos }] =
    await Promise.all([
      supabase
        .from('servicos')
        .select('id, codigo, nome, tem_multa, multa_percentual, tem_urgencia, ordem')
        .eq('ativo', true)
        .order('ordem'),
      supabase
        .from('tabela_precos')
        .select('servico_id, classe_id, variacao, valor')
        .eq('ano_letivo', '2026')
        .eq('ativo', true),
      supabase
        .from('payment_status')
        .select('student_id, month')
        .eq('is_paid', true),
    ])

  const servicosNorm = (servicos ?? []).map((s) => ({
    id: s.id,
    codigo: String(s.codigo),
    nome: String(s.nome),
    tem_multa: Boolean(s.tem_multa),
    multa_percentual: Number(s.multa_percentual ?? 25),
    tem_urgencia: Boolean(s.tem_urgencia),
  }))

  const precosNorm = (precos ?? []).map((p) => ({
    servico_id: p.servico_id,
    classe_id: p.classe_id,
    variacao: p.variacao as string | null,
    valor: Number(p.valor),
  }))

  return (
    <div className="max-w-5xl mx-auto">
      <CaixaClient
        servicos={servicosNorm}
        precos={precosNorm}
        mesesPagos={mesesPagos ?? []}
      />
    </div>
  )
}