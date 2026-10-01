'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LogoEscola from '../components/logo-escola'
import { createClient } from '@/lib/supabase/client'

/**
 * Converte o que o utilizador escreveu em "email interno":
 * - Se contém "@" → é email (secretaria)
 * - Se só tem dígitos → é telefone (aluno/pai) → {dígitos}@escola.local
 *
 * ⚠ Regra alinhada com o criarAluno: NÃO adiciona "244" automaticamente.
 * Se o telefone tiver 244 no início, é removido para ficar normalizado.
 */
function identificarCredencial(input: string): string | null {
  const texto = input.trim()
  if (!texto) return null

  // Se tem "@", assume email normal
  if (texto.includes('@')) return texto

  // Se é só dígitos (com +, espaços, hífen), trata como telefone
  const limpo = texto.replace(/\D/g, '')
  if (limpo.length >= 9) {
    // Remove o 244 se estiver presente no início (normaliza)
    const semPais = limpo.startsWith('244') && limpo.length > 9
      ? limpo.slice(3)
      : limpo
    return `${semPais}@escola.local`
  }

  return null
}

export default function Login() {
  const router = useRouter()
  const supabase = createClient()

  const [credencial, setCredencial] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [aCarregar, setACarregar] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    const email = identificarCredencial(credencial)

    if (!email) {
      setErro('Escreva o email da secretaria ou o telefone do encarregado.')
      return
    }

    setACarregar(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      // Log temporário para diagnóstico
      console.error('>>> ERRO LOGIN:', {
        emailTentado: email,
        erro: error?.message,
        status: error?.status,
      })
      setErro('Credenciais incorretas. Verifique os dados e tente novamente.')
      setACarregar(false)
      return
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    await new Promise((resolve) => setTimeout(resolve, 400))

    const destino =
      perfil?.role === 'secretario' ? '/secretario' : '/dashboard'

    router.push(destino)
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col">
      <header className="px-6 py-5">
        <Link href="/">
          <LogoEscola tamanho="sm" comTexto />
        </Link>
      </header>

      <section className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="max-w-sm w-full">
          <h1 className="text-2xl font-semibold tracking-tight">
            Entrar no portal
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Secretaria entra com o email. Encarregados e alunos entram com o
            número de telefone.
          </p>

          <form onSubmit={entrar} className="mt-8 space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Email ou telefone
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={credencial}
                onChange={(e) => setCredencial(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                placeholder="Ex: secretaria@escola.ao ou 923 456 789"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Senha</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                placeholder="••••••••"
              />
            </div>

            {erro && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={aCarregar}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition"
            >
              {aCarregar ? 'A entrar…' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-xs text-gray-400 text-center">
            <p>Esqueceu-se da senha? Fale com a secretaria.</p>
          </div>
        </div>
      </section>

      <footer className="px-6 py-5">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-gray-400">
          <span>+244 923 318 758 · 962 125 122</span>
          <span>secretaria@nlenda-nlenda.ao</span>
        </div>
      </footer>
    </main>
  )
}