'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function criarClasse(formData: FormData) {
  const supabase = await createClient()

  const name = String(formData.get('name') || '').trim()
  if (!name) return { erro: 'Indique um nome para a classe.' }

  const { error } = await supabase.from('classes').insert({ name })

  if (error) {
    if (error.code === '23505') return { erro: 'Já existe uma classe com esse nome.' }
    return { erro: error.message }
  }

  revalidatePath('/secretario/classes')
  return { ok: true }
}

export async function atualizarClasse(id: number, formData: FormData) {
  const supabase = await createClient()
  const name = String(formData.get('name') || '').trim()
  if (!name) return { erro: 'Indique um nome.' }

  const { error } = await supabase.from('classes').update({ name }).eq('id', id)
  if (error) return { erro: error.message }

  revalidatePath('/secretario/classes')
  return { ok: true }
}

export async function apagarClasse(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('classes').delete().eq('id', id)
  if (error) return { erro: error.message }

  revalidatePath('/secretario/classes')
  return { ok: true }
}