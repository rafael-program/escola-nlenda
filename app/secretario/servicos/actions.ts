'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function atualizarPreco(
  precoId: number,
  novoValor: number
) {
  if (novoValor <= 0) return { erro: 'O valor tem de ser maior que zero.' }

  const { error } = await admin()
    .from('tabela_precos')
    .update({ valor: novoValor })
    .eq('id', precoId)

  if (error) return { erro: error.message }

  revalidatePath('/secretario/servicos')
  return { ok: true }
}

export async function toggleServicoAtivo(
  servicoId: number,
  ativo: boolean
) {
  const { error } = await admin()
    .from('servicos')
    .update({ ativo })
    .eq('id', servicoId)

  if (error) return { erro: error.message }

  revalidatePath('/secretario/servicos')
  return { ok: true }
}

export async function atualizarServico(
  servicoId: number,
  dados: {
    nome?: string
    descricao?: string
    tem_multa?: boolean
    multa_percentual?: number
    tem_urgencia?: boolean
  }
) {
  const { error } = await admin()
    .from('servicos')
    .update(dados)
    .eq('id', servicoId)

  if (error) return { erro: error.message }

  revalidatePath('/secretario/servicos')
  return { ok: true }
}