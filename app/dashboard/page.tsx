import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ──────────────────────────────────────────────────────────
  // 1. Dados do aluno + classe/turma
  // ──────────────────────────────────────────────────────────
  const { data: aluno } = await supabase
    .from('students')
    .select(`
      id, full_name, birth_date, telefone_pai, nome_pai,
      class_id, turma_id,
      classes(name), turmas(name)
    `)
    .eq('id', user.id)
    .single()

  if (!aluno) redirect('/login')

  const cls = Array.isArray(aluno.classes) ? aluno.classes[0] : aluno.classes
  const tur = Array.isArray(aluno.turmas) ? aluno.turmas[0] : aluno.turmas

  // ──────────────────────────────────────────────────────────
  // 2. Comprovativos + Pagamentos + Recibos (em paralelo)
  // ──────────────────────────────────────────────────────────
  const [comprovativosRes, estadosRes, recibosRes] = await Promise.all([
    supabase
      .from('payment_proofs')
      .select(`
        id, month, status, file_url, created_at, rejection_reason,
        valor_declarado, variacao,
        servicos(codigo, nome)
      `)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),

    supabase
      .from('payment_status')
      .select('month, is_paid, proof_id, updated_at')
      .eq('student_id', user.id)
      .order('month', { ascending: false }),

    supabase
      .from('receipts')
      .select('month, numero, file_url, emitido_em')
      .eq('student_id', user.id)
      .order('emitido_em', { ascending: false })
      .limit(20),
  ])

  const comprovativosNorm = (comprovativosRes.data ?? []).map((c) => {
    const srv = Array.isArray(c.servicos) ? c.servicos[0] : c.servicos
    return {
      id: c.id,
      month: c.month,
      status: c.status as 'pending' | 'approved' | 'rejected',
      file_url: c.file_url,
      created_at: c.created_at,
      rejection_reason: c.rejection_reason,
      valor_declarado:
        c.valor_declarado !== null ? Number(c.valor_declarado) : null,
      variacao: c.variacao as string | null,
      servico_codigo: srv ? String(srv.codigo) : null,
      servico_nome: srv ? String(srv.nome) : null,
    }
  })

  const recibosNorm = (recibosRes.data ?? []).map((r) => ({
    month: r.month,
    numero: r.numero,
    file_url: r.file_url,
    emitido_em: r.emitido_em,
  }))

  // ──────────────────────────────────────────────────────────
  // 3. Notas publicadas + boletins
  // ──────────────────────────────────────────────────────────
  const [notasRes, boletinsRes] = await Promise.all([
    supabase
      .from('notas')
      .select('periodo, valor, disciplina_id, disciplinas(name)')
      .eq('student_id', user.id)
      .eq('publicado', true)
      .order('periodo', { ascending: false }),

    supabase
      .from('boletins')
      .select('periodo, emitido_em')
      .eq('student_id', user.id)
      .order('emitido_em', { ascending: false }),
  ])

  const notasNorm = (notasRes.data ?? []).map((n) => {
    const d = Array.isArray(n.disciplinas) ? n.disciplinas[0] : n.disciplinas
    return {
      periodo: n.periodo,
      valor: n.valor !== null ? Number(n.valor) : null,
      disciplina: d ? String(d.name) : '—',
    }
  })

  return (
    <DashboardClient
      aluno={{
        id: aluno.id,
        full_name: aluno.full_name,
        birth_date: aluno.birth_date,
        telefone_pai: aluno.telefone_pai,
        nome_pai: aluno.nome_pai,
        classe: cls ? String(cls.name) : null,
        turma: tur ? String(tur.name) : null,
      }}
      estados={estadosRes.data ?? []}
      comprovativos={comprovativosNorm}
      recibos={recibosNorm}
      notas={notasNorm}
      boletins={boletinsRes.data ?? []}
    />
  )
}