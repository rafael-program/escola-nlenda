import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoEscola from '../components/logo-escola'
import BotaoSair from './botao-sair'

const menu = [
  { href: '/dashboard', label: 'Início', icon: '◉' },
  { href: '/dashboard/pagamentos', label: 'Pagamentos', icon: '⇄' },
  { href: '/dashboard/notas', label: 'Notas', icon: '★' },
  { href: '/dashboard/recibos', label: 'Recibos', icon: '🧾' },
  { href: '/dashboard/comprovativos', label: 'Comprovativos', icon: '📎' },
  { href: '/dashboard/comprovativos/novo', label: 'Enviar comprovativo', icon: '+' },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Dados básicos do aluno (para o cabeçalho do menu)
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* MENU LATERAL */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col fixed h-screen">
        {/* Cabeçalho do menu */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
  <LogoEscola tamanho="sm" comTexto subtitulo="Portal do aluno" />
</div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {iniciais}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">
                {nomeCompleto}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {classeTurma || 'Portal do aluno'}
              </p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
            >
              <span className="w-5 text-center text-gray-400">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Rodapé */}
        <div className="border-t border-gray-100 p-3 space-y-1">
          <Link
            href="/"
            className="block w-full text-left px-3 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 transition"
          >
            ← Página inicial
          </Link>
          <BotaoSair />
        </div>
      </aside>

      {/* CONTEÚDO */}
      <main className="flex-1 ml-60">{children}</main>
    </div>
  )
}