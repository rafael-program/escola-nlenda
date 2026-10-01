import { createClient } from '@/lib/supabase/server'
import NotasClient from './client'

export default async function NotasPage() {
  const supabase = await createClient()

  const [{ data: classes }, { data: turmas }, { data: disciplinas }] =
    await Promise.all([
      supabase.from('classes').select('id, name').order('id'),
      supabase.from('turmas').select('id, name, class_id').order('name'),
      supabase
        .from('disciplinas')
        .select('id, name, classes_aplicaveis')
        .order('name'),
    ])

  const classesNorm = (classes ?? []).map((c) => ({
    id: c.id,
    name: String(c.name),
  }))

  const turmasNorm = (turmas ?? []).map((t) => ({
    id: t.id,
    name: String(t.name),
    class_id: t.class_id,
  }))

  const disciplinasNorm = (disciplinas ?? []).map((d) => ({
    id: d.id,
    name: String(d.name),
    classes_aplicaveis: Array.isArray(d.classes_aplicaveis)
      ? (d.classes_aplicaveis as (number | string)[]).map((x) => Number(x))
      : [],
  }))

  return (
    <NotasClient
      classes={classesNorm}
      turmas={turmasNorm}
      disciplinas={disciplinasNorm}
    />
  )
}