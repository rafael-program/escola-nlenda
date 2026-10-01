import { createClient } from '@/lib/supabase/server'
import RecibosClient from './client'

export default async function RecibosPage() {
  const supabase = await createClient()

  const { data: pagamentos } = await supabase
    .from('pagamentos_servico')
    .select(`
      id, valor_total, mes_referencia, variacao, criado_em,
      student_id,
      servicos(codigo, nome),
      students(id, full_name, telefone_pai, nome_pai, classes(name))
    `)
    .order('criado_em', { ascending: false })

  // Agrupar por aluno
  const mapaAlunos = new Map<string, {
    id: string
    nome: string
    nome_pai: string | null
    telefone: string | null
    classe: string | null
    total: number
    n_recibos: number
    ultimo_pagamento: string
    servicos: Set<string>
  }>()

  for (const p of pagamentos ?? []) {
    const st = Array.isArray(p.students) ? p.students[0] : p.students
    if (!st) continue

    const cls = Array.isArray(st.classes) ? st.classes[0] : st.classes
    const srv = Array.isArray(p.servicos) ? p.servicos[0] : p.servicos

    if (!mapaAlunos.has(st.id)) {
      mapaAlunos.set(st.id, {
        id: st.id,
        nome: String(st.full_name),
        nome_pai: st.nome_pai as string | null,
        telefone: st.telefone_pai as string | null,
        classe: cls ? String(cls.name) : null,
        total: 0,
        n_recibos: 0,
        ultimo_pagamento: p.criado_em,
        servicos: new Set(),
      })
    }

    const g = mapaAlunos.get(st.id)!
    g.total += Number(p.valor_total)
    g.n_recibos += 1
    if (srv) g.servicos.add(String(srv.nome))
  }

  const alunos = Array.from(mapaAlunos.values())
    .map((a) => ({
      ...a,
      servicos: Array.from(a.servicos),
    }))
    .sort((a, b) => b.total - a.total)

  const totalGeral = alunos.reduce((s, a) => s + a.total, 0)
  const totalRecibos = alunos.reduce((s, a) => s + a.n_recibos, 0)

  return (
    <RecibosClient
      alunos={alunos}
      totalGeral={totalGeral}
      totalRecibos={totalRecibos}
    />
  )
}