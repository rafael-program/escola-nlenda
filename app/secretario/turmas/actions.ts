'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function criarTurma(formData: FormData) {
  const supabase = await createClient()

  const name = String(formData.get('name') || '').trim()
  const class_id = Number(formData.get('class_id'))

  if (!name) return { erro: 'Indique um nome para a turma.' }
  if (!class_id) return { erro: 'Escolha uma classe.' }

  const { error } = await supabase
    .from('turmas')
    .insert({ name, class_id })

  if (error) {
    if (error.code === '23505') {
      return { erro: 'Já existe uma turma com esse nome nesta classe.' }
    }
    return { erro: error.message }
  }

  revalidatePath('/secretario/turmas')
  return { ok: true }
}

export async function atualizarTurma(id: number, formData: FormData) {
  const supabase = await createClient()

  const name = String(formData.get('name') || '').trim()
  const class_id = Number(formData.get('class_id'))

  if (!name || !class_id) return { erro: 'Preencha todos os campos.' }

  const { error } = await supabase
    .from('turmas')
    .update({ name, class_id })
    .eq('id', id)

  if (error) return { erro: error.message }

  revalidatePath('/secretario/turmas')
  return { ok: true }
}

export async function apagarTurma(id: number) {
  const supabase = await createClient()
  const { error } = await supabase.from('turmas').delete().eq('id', id)
  if (error) return { erro: error.message }

  revalidatePath('/secretario/turmas')
  return { ok: true }
}