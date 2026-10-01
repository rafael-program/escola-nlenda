import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from './shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: aluno } = await supabase
    .from('students')
    .select('full_name, classes(name), turmas(name)')
    .eq('id', user.id)
    .single()

  const cls = Array.isArray(aluno?.classes) ? aluno.classes[0] : aluno?.classes
  const tur = Array.isArray(aluno?.turmas) ? aluno.turmas[0] : aluno?.turmas

  const nomeCompleto = aluno?.full_name ?? 'Aluno'
  const iniciais = nomeCompleto
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n.charAt(0))
    .join('')
    .toUpperCase()

  const classeTurma = [
    cls ? String(cls.name) : null,
    tur ? `Turma ${String(tur.name)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <DashboardShell
      nomeCompleto={nomeCompleto}
      iniciais={iniciais}
      classeTurma={classeTurma}
    >
      {children}
    </DashboardShell>
  )
}