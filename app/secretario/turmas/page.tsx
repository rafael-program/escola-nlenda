import { createClient } from '@/lib/supabase/server'
import TurmasClient from './client'

export default async function TurmasPage() {
  const supabase = await createClient()

  const [turmasRes, classesRes] = await Promise.all([
    supabase
      .from('turmas')
      .select('id, name, class_id, created_at, classes(name)')
      .order('class_id')
      .order('name'),
    supabase.from('classes').select('id, name').order('name'),
  ])

  // Normalizar classes: o Supabase devolve como array, queremos objeto ou null
  const turmas = (turmasRes.data ?? []).map((t) => {
    const cls = Array.isArray(t.classes) ? t.classes[0] : t.classes
    return {
      id: t.id,
      name: t.name,
      class_id: t.class_id,
      created_at: t.created_at,
      classes: cls ? { name: String(cls.name) } : null,
    }
  })

  const classes = (classesRes.data ?? []).map((c) => ({
    id: c.id,
    name: String(c.name),
  }))

  return <TurmasClient turmas={turmas} classes={classes} />
}