'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function enviarComprovativo(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Sessão expirada. Faça login novamente.' }

  const servicoIdRaw = String(formData.get('servico_id') || '').trim()
  const servicoId = servicoIdRaw ? Number(servicoIdRaw) : null
  const variacao = String(formData.get('variacao') || '').trim() || null
  const notes = String(formData.get('notes') || '').trim() || null
  const file = formData.get('file') as File | null
  const valorRaw = String(formData.get('valor') || '').trim()
  const valor_declarado = valorRaw ? Number(valorRaw) : null

  // 🔑 Ler TODOS os meses
  const months = formData
    .getAll('month')
    .map((m) => String(m).trim())
    .filter((m) => m.length > 0)

  if (!servicoId) return { erro: 'Escolha o serviço.' }
  if (!file || file.size === 0) return { erro: 'Anexe o comprovativo.' }
  if (file.size > 5 * 1024 * 1024) {
    return { erro: 'Ficheiro demasiado grande. Máximo 5 MB.' }
  }
  if (
    !(file.type === 'application/pdf' || file.type.startsWith('image/'))
  ) {
    return { erro: 'Formato não suportado. Envie uma imagem ou PDF.' }
  }
  if (
    valor_declarado !== null &&
    (isNaN(valor_declarado) || valor_declarado <= 0)
  ) {
    return { erro: 'Indique um valor válido (maior que zero).' }
  }

  const { data: servico } = await supabase
    .from('servicos')
    .select('codigo')
    .eq('id', servicoId)
    .single()

  const ehPropina = servico?.codigo === 'propina'

  if (ehPropina && months.length === 0) {
    return { erro: 'Escolha o mês da propina.' }
  }

  const pasta = ehPropina ? 'propina' : `servico-${servicoId}`
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${user.id}/${pasta}-${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from('payment-proofs')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (upErr) return { erro: `Erro ao enviar ficheiro: ${upErr.message}` }

  const file_type = file.type === 'application/pdf' ? 'pdf' : 'image'
  const mesesParaProcessar: (string | null)[] = ehPropina ? months : [null]

  for (const month of mesesParaProcessar) {
    if (ehPropina && month) {
      const { data: existente } = await supabase
        .from('payment_proofs')
        .select('id, status')
        .eq('student_id', user.id)
        .eq('month', month)
        .eq('servico_id', servicoId)
        .maybeSingle()

      if (existente?.status === 'approved') {
        await supabase.storage.from('payment-proofs').remove([path])
        return { erro: `O mês ${month} já está pago e confirmado.` }
      }
      if (existente?.status === 'pending') {
        await supabase.storage.from('payment-proofs').remove([path])
        return { erro: `Já existe comprovativo em análise para ${month}.` }
      }
      if (existente?.status === 'rejected') {
        const { error: updErr } = await supabase
          .from('payment_proofs')
          .update({
            file_url: path,
            file_type,
            notes,
            valor_declarado,
            variacao,
            status: 'pending',
            rejection_reason: null,
            reviewed_by: null,
            reviewed_at: null,
            created_at: new Date().toISOString(),
          })
          .eq('id', existente.id)

        if (updErr) {
          await supabase.storage.from('payment-proofs').remove([path])
          return { erro: updErr.message }
        }
        continue
      }
    }

    const { error: insErr } = await supabase.from('payment_proofs').insert({
      student_id: user.id,
      servico_id: servicoId,
      variacao,
      month: ehPropina ? month : null,
      file_url: path,
      file_type,
      notes,
      valor_declarado,
      status: 'pending',
    })

    if (insErr) {
      await supabase.storage.from('payment-proofs').remove([path])
      return { erro: insErr.message }
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/comprovativos')
  revalidatePath('/dashboard/pagamentos')
  revalidatePath('/secretario/comprovativos')

  return { ok: true }
}