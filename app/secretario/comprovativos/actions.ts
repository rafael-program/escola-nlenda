'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { gerarReciboServicoPDF } from '@/lib/receipts/gerar-recibo-servico'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function assinarComprovativo(path: string) {
  const { data, error } = await admin().storage
    .from('payment-proofs')
    .createSignedUrl(path, 60 * 10)
  if (error) return { erro: error.message }
  return { url: data.signedUrl }
}

export async function rejeitarComprovativo(proofId: number, motivo: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Sessão expirada.' }

  if (!motivo.trim()) return { erro: 'Indique o motivo da rejeição.' }

  const { error } = await admin()
    .from('payment_proofs')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: motivo.trim(),
    })
    .eq('id', proofId)

  if (error) return { erro: error.message }

  revalidatePath('/secretario/comprovativos')
  return { ok: true }
}

export async function aprovarEEmitirRecibo(
  proofId: number,
  studentId: string,
  month: string | null,
  valor?: string,
  servicoId?: number,
  variacao?: string
): Promise<
  { erro: string } | { ok: true; numero: string; codigo: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Sessão expirada.' }

  const supabaseAdmin = admin()

  // ─────────────────────────────────────────────────────
  // 1. Ler dados do comprovativo
  // ─────────────────────────────────────────────────────
  const { data: prova } = await supabaseAdmin
    .from('payment_proofs')
    .select('servico_id, variacao, month, status')
    .eq('id', proofId)
    .single()

  if (!prova) return { erro: 'Comprovativo não encontrado.' }

  const srvId = servicoId ?? prova.servico_id ?? null
  const varFinal = variacao ?? prova.variacao ?? null
  const mesFinal = month ?? prova.month ?? null

  if (!srvId) return { erro: 'Serviço em falta.' }

  // ─────────────────────────────────────────────────────
  // 2. Verificar se já existe pagamento para este comprovativo
  //    (idempotência — duplo clique, retry, etc.)
  // ─────────────────────────────────────────────────────
  let queryExistente = supabaseAdmin
    .from('pagamentos_servico')
    .select('numero_recibo, codigo_verificacao, file_url, file_url_coordenacao')
    .eq('student_id', studentId)
    .eq('servico_id', srvId)

  if (mesFinal === null) {
    queryExistente = queryExistente.is('mes_referencia', null)
  } else {
    queryExistente = queryExistente.eq('mes_referencia', mesFinal)
  }

  const { data: pagamentoExistente } = await queryExistente.maybeSingle()

  if (pagamentoExistente) {
    // Já existe pagamento — só marcar o comprovativo como aprovado
    await supabaseAdmin
      .from('payment_proofs')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', proofId)

    // Buscar código do serviço para eventual upsert em payment_status
    const { data: srv } = await supabaseAdmin
      .from('servicos')
      .select('codigo')
      .eq('id', srvId)
      .single()

    if (srv?.codigo === 'propina' && mesFinal) {
      await supabaseAdmin.from('payment_status').upsert(
        {
          student_id: studentId,
          month: mesFinal,
          is_paid: true,
          proof_id: proofId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,month' }
      )
    }

    revalidatePath('/secretario/comprovativos')
    revalidatePath('/secretario/pagamentos')
    revalidatePath('/secretario/recibos')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/comprovativos')

    return {
      ok: true,
      numero: pagamentoExistente.numero_recibo,
      codigo: pagamentoExistente.codigo_verificacao,
    }
  }

  // ─────────────────────────────────────────────────────
  // 3. Ler aluno + serviço
  // ─────────────────────────────────────────────────────
  const [{ data: aluno }, { data: servico }] = await Promise.all([
    supabaseAdmin
      .from('students')
      .select(
        'full_name, nome_pai, telefone_pai, class_id, classes(name), turmas(name)'
      )
      .eq('id', studentId)
      .single(),
    supabaseAdmin
      .from('servicos')
      .select('nome, codigo')
      .eq('id', srvId)
      .single(),
  ])

  if (!aluno || !servico) return { erro: 'Dados em falta.' }

  const valorNumerico = valor ? Number(valor) : 0
  const cls = Array.isArray(aluno.classes) ? aluno.classes[0] : aluno.classes
  const tur = Array.isArray(aluno.turmas) ? aluno.turmas[0] : aluno.turmas

  // ─────────────────────────────────────────────────────
  // 4. Gerar número de recibo único (baseado no MAX existente)
  // ─────────────────────────────────────────────────────
  const ano = new Date().getFullYear().toString()

  async function gerarNumeroRecibo(): Promise<string> {
    for (let tentativa = 0; tentativa < 10; tentativa++) {
      const { data: ultimo } = await supabaseAdmin
        .from('pagamentos_servico')
        .select('numero_recibo')
        .like('numero_recibo', `REC-${ano}/%`)
        .order('numero_recibo', { ascending: false })
        .limit(1)
        .maybeSingle()

      const proximo = ultimo
        ? Number(ultimo.numero_recibo.split('/')[1]) + 1 + tentativa
        : 1 + tentativa

      const numero = `REC-${ano}/${String(proximo).padStart(5, '0')}`

      const { data: existe } = await supabaseAdmin
        .from('pagamentos_servico')
        .select('id')
        .eq('numero_recibo', numero)
        .maybeSingle()

      if (!existe) return numero
    }
    throw new Error('Não foi possível gerar número de recibo único.')
  }

  let numeroRecibo: string
  try {
    numeroRecibo = await gerarNumeroRecibo()
  } catch (e) {
    return { erro: (e as Error).message }
  }

  // ─────────────────────────────────────────────────────
  // 5. Código de verificação — aleatório criptográfico
  //    (não depende do numeroRecibo → sem colisões)
  // ─────────────────────────────────────────────────────
  const hex = randomBytes(6).toString('hex').toUpperCase()
  const partes = hex.match(/.{1,4}/g) ?? []
  const codigoVerificacao = `REC-${partes.join('-')}`

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'http://localhost:3000')
  const urlVerificacao = `${baseUrl}/verificar/${codigoVerificacao}`

  const dadosReciboBase = {
    numero: numeroRecibo,
    codigo: codigoVerificacao,
    urlVerificacao,
    alunoNome: aluno.full_name,
    nomePai: aluno.nome_pai as string | null,
    telefonePai: aluno.telefone_pai as string | null,
    classe: cls ? String(cls.name) : '—',
    turma: tur ? String(tur.name) : null,
    servicoNome: servico.nome,
    variacao: varFinal,
    mesReferencia: mesFinal,
    mesesReferencia: mesFinal ? [mesFinal] : null,
    valorBase: valorNumerico,
    valorMulta: 0,
    valorTotal: valorNumerico,
    comMulta: false,
    formaPagamento: 'banco' as const,
    banco: null,
    dataEmissao: new Date(),
  }

  // ─────────────────────────────────────────────────────
  // 6. Gerar os 2 PDFs (via coordenação + via aluno)
  // ─────────────────────────────────────────────────────
  let pdfCoordenacao: Uint8Array
  let pdfEstudante: Uint8Array

  try {
    ;[pdfCoordenacao, pdfEstudante] = await Promise.all([
      gerarReciboServicoPDF(dadosReciboBase, 'coordenacao'),
      gerarReciboServicoPDF(dadosReciboBase, 'estudante'),
    ])
  } catch (e) {
    console.error('>>> ERRO ao gerar PDF:', e)
    return { erro: `Erro ao gerar PDF: ${(e as Error).message}` }
  }

  // ─────────────────────────────────────────────────────
  // 7. Upload dos 2 PDFs
  // ─────────────────────────────────────────────────────
  const basePath = `${studentId}/${numeroRecibo.replace(/\//g, '-')}`
  const pathCoord = `${basePath}-coordenacao.pdf`
  const pathEst = `${basePath}-estudante.pdf`

  const [upCoord, upEst] = await Promise.all([
    supabaseAdmin.storage
      .from('pagamentos-servico')
      .upload(pathCoord, pdfCoordenacao, {
        contentType: 'application/pdf',
        upsert: false,
      }),
    supabaseAdmin.storage
      .from('pagamentos-servico')
      .upload(pathEst, pdfEstudante, {
        contentType: 'application/pdf',
        upsert: false,
      }),
  ])

  if (upCoord.error || upEst.error) {
    console.error('>>> ERRO UPLOAD:', upCoord.error, upEst.error)
    return {
      erro: `Erro ao guardar PDF: ${
        upCoord.error?.message ?? upEst.error?.message
      }`,
    }
  }

  // ─────────────────────────────────────────────────────
  // 8. INSERT em pagamentos_servico (com as DUAS vias)
  // ─────────────────────────────────────────────────────
  const { error: errInsert } = await supabaseAdmin
    .from('pagamentos_servico')
    .insert({
      student_id: studentId,
      servico_id: srvId,
      classe_id: aluno.class_id,
      variacao: varFinal,
      valor_base: valorNumerico,
      valor_multa: 0,
      valor_total: valorNumerico,
      forma_pagamento: 'banco',
      banco: null,
      mes_referencia: mesFinal,
      com_multa: false,
      numero_recibo: numeroRecibo,
      codigo_verificacao: codigoVerificacao,
      file_url: pathEst,
      file_url_coordenacao: pathCoord,
      observacao: 'Aprovado via portal',
      registado_por: user.id,
    })

  if (errInsert) {
    console.error('>>> ERRO INSERT pagamentos_servico:', errInsert)
    // Limpar os PDFs órfãos
    await Promise.all([
      supabaseAdmin.storage.from('pagamentos-servico').remove([pathCoord]),
      supabaseAdmin.storage.from('pagamentos-servico').remove([pathEst]),
    ])
    return { erro: `Erro ao registar pagamento: ${errInsert.message}` }
  }

  // ─────────────────────────────────────────────────────
  // 9. Marcar comprovativo como aprovado
  // ─────────────────────────────────────────────────────
  const { error: errProof } = await supabaseAdmin
    .from('payment_proofs')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq('id', proofId)

  if (errProof) {
    console.error('>>> ERRO UPDATE payment_proofs:', errProof)
    return { erro: errProof.message }
  }

  // ─────────────────────────────────────────────────────
  // 10. Se for propina — marcar mês como pago
  // ─────────────────────────────────────────────────────
  if (servico.codigo === 'propina' && mesFinal) {
    await supabaseAdmin.from('payment_status').upsert(
      {
        student_id: studentId,
        month: mesFinal,
        is_paid: true,
        proof_id: proofId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,month' }
    )
  }

  revalidatePath('/secretario/comprovativos')
  revalidatePath('/secretario/pagamentos')
  revalidatePath('/secretario/recibos')
  revalidatePath('/secretario/fecho')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/comprovativos')
  revalidatePath('/dashboard/recibos')

  return { ok: true, numero: numeroRecibo, codigo: codigoVerificacao }
}