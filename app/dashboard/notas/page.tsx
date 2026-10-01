import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotasAlunoClient from './client'

export default async function NotasAlunoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Notas publicadas do aluno
  const { data: notas } = await supabase
    .from('notas')
    .select(`
      id, periodo, valor, disciplina_id,
      disciplinas(name)
    `)
    .eq('student_id', user.id)
    .eq('publicado', true)
    .order('periodo', { ascending: false })

  // Boletins emitidos
  const { data: boletins } = await supabase
    .from('boletins')
    .select('periodo, emitido_em, file_url')
    .eq('student_id', user.id)
    .order('emitido_em', { ascending: false })

  // Agrupar notas por período
  const mapaPeriodos = new Map<
    string,
    { disciplina: string; valor: number | null }[]
  >()
  for (const n of notas ?? []) {
    const d = Array.isArray(n.disciplinas) ? n.disciplinas[0] : n.disciplinas
    if (!mapaPeriodos.has(n.periodo)) mapaPeriodos.set(n.periodo, [])
    mapaPeriodos.get(n.periodo)!.push({
      disciplina: d ? String(d.name) : '—',
      valor: n.valor !== null ? Number(n.valor) : null,
    })
  }

  const periodos = Array.from(mapaPeriodos.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([periodo, itens]) => {
      const boletim = (boletins ?? []).find((b) => b.periodo === periodo)
      const vals = itens
        .filter((i) => i.valor !== null)
        .map((i) => i.valor as number)
      const media =
        vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null

      return {
        periodo,
        itens,
        media,
        emitido_em: boletim?.emitido_em ?? null,
        file_url: boletim?.file_url ?? null,
      }
    })

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Minhas notas</h1>
      <p className="mt-1 text-sm text-gray-500">
        Consulta as notas publicadas e os boletins emitidos pela escola.
      </p>

      <NotasAlunoClient periodos={periodos} />
    </div>
  )
}