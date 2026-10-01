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

export async function procurarAlunos(query: string) {
  if (!query || query.trim().length < 2) return { alunos: [] }

  const supabaseAdmin = admin()
  const q = query.trim().toLowerCase()

  const { data } = await supabaseAdmin
    .from('students')
    .select(`
      id, full_name, nome_pai, telefone_pai, class_id,
      classes(name), turmas(name)
    `)
    .or(`full_name.ilike.%${q}%,nome_pai.ilike.%${q}%,telefone_pai.ilike.%${q}%`)
    .limit(10)

  return {
    alunos: (data ?? []).map((a) => {
      const cls = Array.isArray(a.classes) ? a.classes[0] : a.classes
      const tur = Array.isArray(a.turmas) ? a.turmas[0] : a.turmas
      return {
        id: a.id,
        full_name: String(a.full_name),
        nome_pai: a.nome_pai as string | null,
        telefone_pai: a.telefone_pai as string | null,
        classe: cls ? String(cls.name) : null,
        turma: tur ? String(tur.name) : null,
        classe_id: (a.class_id as number | null) ?? null,
      }
    }),
  }
}

/**
 * Calcula o valor da propina para um conjunto de meses.
 * Regras:
 * - Mês ATUAL → multa se hoje > dia 10
 * - Mês PASSADO (anterior ao atual) → sempre com multa
 * - Mês FUTURO → sem multa
 */
function calcularPropina(
  meses: string[],
  precoMensal: number,
  multaPercentual: number
): {
  valorBase: number
  valorMulta: number
  valorTotal: number
  mesesComMulta: string[]
} {
  const hoje = new Date()
  const diaAtual = hoje.getDate()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth() + 1
  const chaveAtual = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`

  let valorMulta = 0
  const mesesComMulta: string[] = []

  for (const mes of meses) {
    // Comparar strings "AAAA-MM" — funciona alfabeticamente
    const ehPassado = mes < chaveAtual
    const ehAtual = mes === chaveAtual

    let aplicaMulta = false

    if (ehPassado) {
      // Meses passados → sempre com multa
      aplicaMulta = true
    } else if (ehAtual) {
      // Mês atual → só se passou do dia 10
      aplicaMulta = diaAtual > 10
    }
    // Futuro → sem multa

    if (aplicaMulta) {
      const valorMultaMes = (precoMensal * multaPercentual) / 100
      valorMulta += valorMultaMes
      mesesComMulta.push(mes)
    }
  }

  const valorBase = precoMensal * meses.length
  const valorTotal = Number((valorBase + valorMulta).toFixed(2))
  const valorMultaFinal = Number(valorMulta.toFixed(2))

  return {
    valorBase,
    valorMulta: valorMultaFinal,
    valorTotal,
    mesesComMulta,
  }
}

/**
 * Versão simples de calcularValor — usada para serviços que NÃO são propina.
 */
export async function calcularValor(
  servicoId: number,
  classeId: number,
  variacao: string | null,
  mesReferencia?: string | null
): Promise<
  | { erro: string }
  | {
      valorBase: number
      valorMulta: number
      valorTotal: number
      comMulta: boolean
    }
> {
  const supabaseAdmin = admin()

  let query = supabaseAdmin
    .from('tabela_precos')
    .select('valor')
    .eq('servico_id', servicoId)
    .eq('classe_id', classeId)
    .eq('ano_letivo', '2026')
    .eq('ativo', true)

  if (variacao === null || variacao === undefined) {
    query = query.is('variacao', null)
  } else {
    query = query.eq('variacao', variacao)
  }

  const { data: preco } = await query.maybeSingle()
  if (!preco) {
    return { erro: 'Preço não configurado para este serviço nesta classe.' }
  }

  const valorBase = Number(preco.valor)
  return {
    valorBase,
    valorMulta: 0,
    valorTotal: valorBase,
    comMulta: false,
  }
}

export async function registarPagamento(dados: {
  studentId: string
  servicoId: number
  classeId: number
  variacao: string | null
  mesesReferencia: string[] | null  // ⚠ agora é array
  formaPagamento: 'fisico' | 'banco'
  banco: string | null
  observacao: string | null
}): Promise<{ erro: string } | { ok: true; numero: string; codigo: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Sessão expirada.' }

  const supabaseAdmin = admin()

  // 1. Buscar dados do serviço
  const { data: servico } = await supabaseAdmin
    .from('servicos')
    .select('nome, codigo, tem_multa, multa_percentual')
    .eq('id', dados.servicoId)
    .single()

  if (!servico) return { erro: 'Serviço em falta.' }

  const ehPropina = servico.codigo === 'propina'

  // 2. Calcular valores
  let valorBase = 0
  let valorMulta = 0
  let valorTotal = 0
  let comMulta = false
  let mesParaRecibo: string | null = null

  if (ehPropina) {
    if (!dados.mesesReferencia || dados.mesesReferencia.length === 0) {
      return { erro: 'Escolha pelo menos um mês.' }
    }

    // Preço da propina
    let precoQuery = supabaseAdmin
      .from('tabela_precos')
      .select('valor')
      .eq('servico_id', dados.servicoId)
      .eq('classe_id', dados.classeId)
      .eq('ano_letivo', '2026')
      .eq('ativo', true)

    if (dados.variacao === null) {
      precoQuery = precoQuery.is('variacao', null)
    } else {
      precoQuery = precoQuery.eq('variacao', dados.variacao)
    }

    const { data: preco } = await precoQuery.maybeSingle()
    if (!preco) return { erro: 'Preço da propina não configurado.' }

    const calc = calcularPropina(
      dados.mesesReferencia,
      Number(preco.valor),
      Number(servico.multa_percentual ?? 25)
    )

    valorBase = calc.valorBase
    valorMulta = calc.valorMulta
    valorTotal = calc.valorTotal
    comMulta = calc.mesesComMulta.length > 0

    // Mês para o recibo = primeiro mês pago (ordenado)
    mesParaRecibo = [...dados.mesesReferencia].sort()[0]
  } else {
    // Serviços normais
    const calc = await calcularValor(
      dados.servicoId,
      dados.classeId,
      dados.variacao,
      null
    )
    if ('erro' in calc) return { erro: calc.erro }
    valorBase = calc.valorBase
    valorMulta = calc.valorMulta
    valorTotal = calc.valorTotal
    comMulta = calc.comMulta
  }

  // 3. Buscar dados do aluno e classe
  const [{ data: aluno }, { data: classe }] = await Promise.all([
    supabaseAdmin
      .from('students')
      .select('full_name, nome_pai, telefone_pai, classes(name), turmas(name)')
      .eq('id', dados.studentId)
      .single(),
    supabaseAdmin
      .from('classes')
      .select('name')
      .eq('id', dados.classeId)
      .single(),
  ])

  if (!aluno || !classe) return { erro: 'Dados em falta.' }

  const cls = Array.isArray(aluno.classes) ? aluno.classes[0] : aluno.classes
  const tur = Array.isArray(aluno.turmas) ? aluno.turmas[0] : aluno.turmas

  // 4. Número e código de recibo
  const ano = new Date().getFullYear().toString()
  const { data: ultimo } = await supabaseAdmin
    .from('pagamentos_servico')
    .select('numero_recibo')
    .like('numero_recibo', `REC-${ano}/%`)
    .order('numero_recibo', { ascending: false })
    .limit(1)
    .maybeSingle()

  let proximo = 1
  if (ultimo?.numero_recibo) {
    const match = String(ultimo.numero_recibo).match(/REC-\d+\/(\d+)/)
    if (match) proximo = Number(match[1]) + 1
  }

  const numeroRecibo = `REC-${ano}/${String(proximo).padStart(5, '0')}`
  const codigoVerificacao = `REC-${randomBytes(6).toString('hex').toUpperCase()}`

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'http://localhost:3000')
  const urlVerificacao = `${baseUrl}/verificar/${codigoVerificacao}`

  // Nome do serviço para o recibo
  const servicoNomeFinal = ehPropina
    ? `Propina (${dados.mesesReferencia!.length} ${
        dados.mesesReferencia!.length === 1 ? 'mes' : 'meses'
      })`
    : servico.nome

  const dadosRecibo = {
    numero: numeroRecibo,
    codigo: codigoVerificacao,
    urlVerificacao,
    alunoNome: aluno.full_name,
    nomePai: aluno.nome_pai as string | null,
    telefonePai: aluno.telefone_pai as string | null,
    classe: cls ? String(cls.name) : '—',
    turma: tur ? String(tur.name) : null,
    servicoNome: servicoNomeFinal,
    variacao: dados.variacao,
    mesReferencia: mesParaRecibo,
    valorBase,
    valorMulta,
    valorTotal,
    comMulta,
    formaPagamento: dados.formaPagamento,
    banco: dados.banco,
    dataEmissao: new Date(),
  }

  // 5. Gerar PDFs
  let pdfCoordenacao: Uint8Array
  let pdfEstudante: Uint8Array

  try {
    ;[pdfCoordenacao, pdfEstudante] = await Promise.all([
      gerarReciboServicoPDF(dadosRecibo, 'coordenacao'),
      gerarReciboServicoPDF(dadosRecibo, 'estudante'),
    ])
  } catch (e) {
    console.error('>>> ERRO ao gerar PDF:', e)
    return { erro: `Erro ao gerar PDF: ${(e as Error).message}` }
  }

  // 6. Upload
  const basePath = `${dados.studentId}/${numeroRecibo.replace(/\//g, '-')}`
  const pathCoord = `${basePath}-coordenacao.pdf`
  const pathEst = `${basePath}-estudante.pdf`

  const [upCoord, upEst] = await Promise.all([
    supabaseAdmin.storage
      .from('pagamentos-servico')
      .upload(pathCoord, pdfCoordenacao, {
        contentType: 'application/pdf',
        upsert: true,
      }),
    supabaseAdmin.storage
      .from('pagamentos-servico')
      .upload(pathEst, pdfEstudante, {
        contentType: 'application/pdf',
        upsert: true,
      }),
  ])

  if (upCoord.error || upEst.error) {
    return {
      erro: `Erro ao guardar PDF: ${
        upCoord.error?.message ?? upEst.error?.message
      }`,
    }
  }

  // 7. Insert no pagamentos_servico
  const { error: errInsert } = await supabaseAdmin
    .from('pagamentos_servico')
    .insert({
      student_id: dados.studentId,
      servico_id: dados.servicoId,
      classe_id: dados.classeId,
      variacao: dados.variacao,
      valor_base: valorBase,
      valor_multa: valorMulta,
      valor_total: valorTotal,
      forma_pagamento: dados.formaPagamento,
      banco: dados.banco,
      mes_referencia: mesParaRecibo,
      com_multa: comMulta,
      numero_recibo: numeroRecibo,
      codigo_verificacao: codigoVerificacao,
      file_url: pathEst,
      observacao: dados.observacao,
      registado_por: user.id,
    })

  if (errInsert) {
    await Promise.all([
      supabaseAdmin.storage.from('pagamentos-servico').remove([pathCoord]),
      supabaseAdmin.storage.from('pagamentos-servico').remove([pathEst]),
    ])
    return { erro: errInsert.message }
  }

  // 8. Se for propina, marcar TODOS os meses como pagos
  if (ehPropina && dados.mesesReferencia) {
    const upserts = dados.mesesReferencia.map((mes) => ({
      student_id: dados.studentId,
      month: mes,
      is_paid: true,
      updated_at: new Date().toISOString(),
    }))

    await supabaseAdmin
      .from('payment_status')
      .upsert(upserts, { onConflict: 'student_id,month' })
  }

  revalidatePath('/secretario/caixa')
  revalidatePath('/secretario/pagamentos')
  revalidatePath('/secretario/recibos')
  revalidatePath('/secretario/relatorios')

  return { ok: true, numero: numeroRecibo, codigo: codigoVerificacao }
}