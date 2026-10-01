'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
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
  { href: '/secretario/relatorios', label: 'Relatórios', icon: '📊' },
]

export default function SecretarioShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [aberto, setAberto] = useState(false)
  const pathname = usePathname()

  // Bloqueia scroll do body quando o drawer está aberto em mobile
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [aberto])

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Overlay (mobile) */}
      {aberto && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setAberto(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200
          flex flex-col z-40 transition-transform duration-300
          ${aberto ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:z-10
        `}
      >
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2">
          <LogoEscola tamanho="md" comTexto subtitulo="Secretaria" />

          <button
            type="button"
            onClick={() => setAberto(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Fechar menu"
          >
            ×
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menu.map((item) => {
            const ativo =
              item.href === '/secretario'
                ? pathname === '/secretario'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setAberto(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                  ativo
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <span
                  className={`w-5 text-center ${
                    ativo ? 'text-blue-500' : 'text-gray-400'
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Rodapé */}
        <div className="border-t border-gray-100 p-3">
          <form action="/api/logout" method="post">
            <button className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50">
              ↩ Terminar sessão
            </button>
          </form>
        </div>
      </aside>

      {/* Header mobile */}
      <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-700"
          aria-label="Abrir menu"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="font-medium text-sm text-gray-900 truncate">
          Secretaria
        </span>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 lg:ml-64 min-w-0">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}