import { createClient } from '@/lib/supabase/server'
import RelatoriosClient from './client'

export default async function RelatoriosPage() {
  const supabase = await createClient()

  const { data: pagamentos } = await supabase
    .from('pagamentos_servico')
    .select(`
      id, valor_total, forma_pagamento, banco, mes_referencia,
      criado_em, numero_recibo,
      servicos(codigo, nome),
      classes(name),
      students(id, full_name, classes(name))
    `)
    .order('criado_em', { ascending: false })

  const lista = (pagamentos ?? []).map((p) => {
    const srv = Array.isArray(p.servicos) ? p.servicos[0] : p.servicos
    const cls = Array.isArray(p.classes) ? p.classes[0] : p.classes
    const st = Array.isArray(p.students) ? p.students[0] : p.students
    const stCls = st
      ? Array.isArray(st.classes)
        ? st.classes[0]
        : st.classes
      : null

    return {
      id: p.id,
      numero_recibo: String(p.numero_recibo),
      valor_total: Number(p.valor_total),
      forma_pagamento: p.forma_pagamento as 'fisico' | 'banco',
      banco: p.banco as string | null,
      mes_referencia: p.mes_referencia as string | null,
      criado_em: p.criado_em,
      servico_codigo: srv ? String(srv.codigo) : null,
      servico_nome: srv ? String(srv.nome) : '—',
      classe_nome: cls ? String(cls.name) : null,
      aluno_id: st ? String(st.id) : null,
      aluno_nome: st ? String(st.full_name) : '—',
      aluno_classe: stCls ? String(stCls.name) : null,
    }
  })

  return <RelatoriosClient pagamentos={lista} />
}