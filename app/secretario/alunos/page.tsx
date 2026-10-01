import { createClient } from '@/lib/supabase/server'
import AlunosClient from './client'

export default async function AlunosPage() {
  const supabase = await createClient()

  const [{ data: alunos }, { data: classes }] = await Promise.all([
    supabase
      .from('students')
      .select(`
        id, full_name, birth_date, telefone_pai, nome_pai,
        bi_file_url, certificate_file_url,
        class_id, turma_id,
        classes(name), turmas(name)
      `)
      .order('full_name'),
    supabase.from('classes').select('id, name').order('id'),
  ])

  const alunosNorm = (alunos ?? []).map((a) => {
    const cls = Array.isArray(a.classes) ? a.classes[0] : a.classes
    const tur = Array.isArray(a.turmas) ? a.turmas[0] : a.turmas
    return {
      id: a.id,
      full_name: a.full_name,
      birth_date: a.birth_date,
      telefone_pai: a.telefone_pai,
      nome_pai: a.nome_pai,
      bi_file_url: a.bi_file_url,
      certificate_file_url: a.certificate_file_url,
      class_id: a.class_id,
      turma_id: a.turma_id,
      classe: cls ? String(cls.name) : null,
      turma: tur ? String(tur.name) : null,
    }
  })

  const classesNorm = (classes ?? []).map((c) => ({
    id: c.id,
    name: String(c.name),
  }))

  return <AlunosClient alunos={alunosNorm} classes={classesNorm} />
}