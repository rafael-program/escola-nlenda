'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function BotaoSair() {
  const router = useRouter()
  const supabase = createClient()
  const [aTerminar, setATerminar] = useState(false)

  async function sair() {
    setATerminar(true)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={sair}
      disabled={aTerminar}
      className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
    >
      {aTerminar ? '↩ A sair…' : '↩ Terminar sessão'}
    </button>
  )
}