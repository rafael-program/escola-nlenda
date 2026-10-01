import { createClient } from '@/lib/supabase/server'
import ComprovativosClient from './client'

export default async function ComprovativosPage() {
  const supabase = await createClient()

  const { data: comprovativos } = await supabase
    .from('payment_proofs')
    .select(`
      id, student_id, month, status,
      students(id, full_name, telefone_pai, nome_pai, classes(name))
    `)
    .order('created_at', { ascending: false })

  const mapaAlunos = new Map<string, {
    id: string
    nome: string
    nome_pai: string | null
    telefone: string | null
    classe: string | null
    pendentes: number
    aprovados: number
    rejeitados: number
    total_comprovativos: number
  }>()

  for (const c of comprovativos ?? []) {
    const st = Array.isArray(c.students) ? c.students[0] : c.students
    if (!st) continue

    const cls = Array.isArray(st.classes) ? st.classes[0] : st.classes

    if (!mapaAlunos.has(st.id)) {
      mapaAlunos.set(st.id, {
        id: st.id,
        nome: String(st.full_name),
        nome_pai: st.nome_pai as string | null,
        telefone: st.telefone_pai as string | null,
        classe: cls ? String(cls.name) : null,
        pendentes: 0,
        aprovados: 0,
        rejeitados: 0,
        total_comprovativos: 0,
      })
    }

    const g = mapaAlunos.get(st.id)!
    g.total_comprovativos += 1
    if (c.status === 'pending') g.pendentes += 1
    else if (c.status === 'approved') g.aprovados += 1
    else if (c.status === 'rejected') g.rejeitados += 1
  }

  const alunos = Array.from(mapaAlunos.values()).sort((a, b) => {
    if (a.pendentes > 0 && b.pendentes === 0) return -1
    if (b.pendentes > 0 && a.pendentes === 0) return 1
    return a.nome.localeCompare(b.nome)
  })

  const totalPendentes = alunos.reduce((s, a) => s + a.pendentes, 0)
  const totalRejeitados = alunos.reduce((s, a) => s + a.rejeitados, 0)
  const totalAprovados = alunos.reduce((s, a) => s + a.aprovados, 0)

  return (
    <ComprovativosClient
      alunos={alunos}
      totalPendentes={totalPendentes}
      totalRejeitados={totalRejeitados}
      totalAprovados={totalAprovados}
    />
  )
}