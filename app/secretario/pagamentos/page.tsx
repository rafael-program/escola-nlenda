import { createClient } from '@/lib/supabase/server'
import PagamentosClient from './client'

export default async function PagamentosPage() {
  const supabase = await createClient()

  const [
    { data: alunos },
    { data: estados },
    { data: comprovativos },
    { data: classes },
    { data: pagamentosServico },
  ] = await Promise.all([
    supabase
      .from('students')
      .select('id, full_name, class_id, classes(name)')
      .order('full_name'),
    supabase
      .from('payment_status')
      .select('student_id, month, is_paid, proof_id'),
    supabase.from('payment_proofs').select('id, student_id, month, status'),
    supabase.from('classes').select('id, name').order('id'),
    supabase
      .from('pagamentos_servico')
      .select('student_id, valor_total, mes_referencia')
      .eq('com_multa', false),
  ])

  const alunosNorm = (alunos ?? []).map((a) => {
    const cls = Array.isArray(a.classes) ? a.classes[0] : a.classes
    return {
      id: a.id,
      full_name: a.full_name,
      class_id: a.class_id,
      classe: cls ? String(cls.name) : null,
    }
  })

  const estadosNorm = (estados ?? []).map((e) => ({
    student_id: e.student_id,
    month: e.month,
    is_paid: e.is_paid ?? false,
    proof_id: e.proof_id,
  }))

  const comprovativosNorm = (comprovativos ?? []).map((c) => ({
    id: c.id,
    student_id: c.student_id,
    month: c.month,
    status: c.status as 'pending' | 'approved' | 'rejected',
  }))

  const classesNorm = (classes ?? []).map((c) => ({
    id: c.id,
    name: String(c.name),
  }))

  const pagamentosServicoNorm = (pagamentosServico ?? []).map((p) => ({
    student_id: p.student_id,
    valor_total: Number(p.valor_total),
    mes_referencia: p.mes_referencia as string | null,
  }))

  return (
    <PagamentosClient
      alunos={alunosNorm}
      estados={estadosNorm}
      comprovativos={comprovativosNorm}
      classes={classesNorm}
      pagamentosServico={pagamentosServicoNorm}
    />
  )
}