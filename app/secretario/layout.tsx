import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoEscola from '../components/logo-escola'

const menu = [
  { href: '/secretario', label: 'Início', icon: '◉' },
  { href: '/secretario/classes', label: 'Classes', icon: '◫' },
  { href: '/secretario/servicos', label: 'Serviços', icon: '◈' },
  { href: '/secretario/turmas', label: 'Turmas', icon: '◪' },
  { href: '/secretario/alunos', label: 'Alunos', icon: '☰' },
  { href: '/secretario/caixa', label: 'Caixa', icon: '▤' },
  { href: '/secretario/pagamentos', label: 'Pagamentos', icon: '⇄' },
  { href: '/secretario/recibos', label: 'Recibos', icon: '🧾' },
  { href: '/secretario/comprovativos', label: 'Comprovativos', icon: '✓' },
  { href: '/secretario/notas', label: 'Notas', icon: '★' },
  { href: '/secretario/relatorios', label: 'Relatórios ', icon: '📊' },
]

export default async function SecretarioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* MENU LATERAL */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col fixed h-screen">
        <div className="px-5 py-5 border-b border-gray-100">
         <LogoEscola
  tamanho="md"
  comTexto
  subtitulo="Secretaria"
/>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
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

        <div className="border-t border-gray-100 p-3">
          <form action="/api/logout" method="post">
            <button className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50">
              ↩ Terminar sessão
            </button>
          </form>
        </div>
      </aside>

      {/* CONTEÚDO */}
      <main className="flex-1 ml-60 p-8">{children}</main>
    </div>
  )
}