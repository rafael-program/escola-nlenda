'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function guardarNota(
  student_id: string,
  disciplina_id: number,
  periodo: string,
  valor: number | null
) {
  const supabase = await createClient()

  if (valor === null) {
    const { error } = await supabase
      .from('notas')
      .delete()
      .eq('student_id', student_id)
      .eq('disciplina_id', disciplina_id)
      .eq('periodo', periodo)
    if (error) return { erro: error.message }
    return { ok: true }
  }

  if (valor < 0 || valor > 20) {
    return { erro: 'Nota tem de estar entre 0 e 20.' }
  }

  const { error } = await supabase
    .from('notas')
    .upsert(
      {
        student_id,
        disciplina_id,
        periodo,
        valor,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,disciplina_id,periodo' }
    )

  if (error) return { erro: error.message }
  return { ok: true }
}

/**
 * Verifica se a situação financeira do aluno está regularizada
 * para o ano letivo até ao mês corrente.
 */
export async function verificarSituacaoFinanceira(
  student_id: string,
  anoLetivo: string
) {
  const supabaseAdmin = admin()

  const hoje = new Date()
  const anoBase = Number(anoLetivo)
  const mesAtual = hoje.getMonth() + 1
  const anoAtual = hoje.getFullYear()

  const meses: string[] = []
  const ordemLetiva = ['09', '10', '11', '12', '01', '02', '03', '04', '05', '06', '07']

  for (const m of ordemLetiva) {
    const mesNum = Number(m)
    const anoRef = mesNum >= 9 ? anoBase : anoBase + 1

    if (anoRef < anoAtual || (anoRef === anoAtual && mesNum <= mesAtual)) {
      meses.push(`${anoRef}-${m}`)
    }
  }

  const { data: estados } = await supabaseAdmin
    .from('payment_status')
    .select('month, is_paid')
    .eq('student_id', student_id)
    .in('month', meses)

  const pagos = new Set(
    (estados ?? []).filter((e) => e.is_paid).map((e) => e.month)
  )

  const meses_em_falta = meses.filter((m) => !pagos.has(m))

  return {
    regular: meses_em_falta.length === 0,
    meses_em_falta,
    total_meses: meses.length,
    pagos: meses.length - meses_em_falta.length,
  }
}

/**
 * Gera o código de verificação do boletim.
 */
function gerarCodigoBoletim(periodo: string): string {
  const base = `${periodo}-${Date.now()}-${Math.random()}`
  const hash = Buffer.from(base)
    .toString('base64')
    .replace(/[^A-Z0-9]/gi, '')
    .slice(0, 12)
    .toUpperCase()
  const partes = hash.match(/.{1,4}/g) ?? []
  return `BLT-${partes.join('-')}`
}

/**
 * Gera o próximo número sequencial de boletim no formato "ANO/Bnnnn".
 */
async function gerarNumeroBoletim(ano: string): Promise<string> {
  const supabaseAdmin = admin()
  const { count } = await supabaseAdmin
    .from('boletins')
    .select('*', { count: 'exact', head: true })
    .like('numero', `${ano}/B%`)
  const proximo = (count ?? 0) + 1
  return `${ano}/B${String(proximo).padStart(4, '0')}`
}

/**
 * Gera o PDF do boletim de um aluno para um período.
 */
async function gerarBoletimPDF(dados: {
  numero: string
  alunoNome: string
  classe: string | null
  turma: string | null
  periodo: string
  notas: { disciplina: string; valor: number | null }[]
  media: number | null
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()

  const helv = await pdf.embedFont(StandardFonts.Helvetica)
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const azul = rgb(0.15, 0.35, 0.75)
  const cinza = rgb(0.4, 0.4, 0.4)
  const preto = rgb(0.1, 0.1, 0.1)
  const verde = rgb(0.15, 0.5, 0.2)
  const vermelho = rgb(0.75, 0.15, 0.15)

  const margem = 50
  let y = height - margem

  // CABEÇALHO
  page.drawText('REPÚBLICA DE ANGOLA', {
    x: margem,
    y,
    size: 8,
    font: helv,
    color: cinza,
  })
  y -= 14
  page.drawText('Escola Nlenda e Nlenda', {
    x: margem,
    y,
    size: 18,
    font: helvBold,
    color: azul,
  })
  y -= 20
  page.drawText('Nzetu, Zaire · secretaria@nlenda-nlenda.ao', {
    x: margem,
    y,
    size: 8,
    font: helv,
    color: cinza,
  })
  y -= 30
  page.drawLine({
    start: { x: margem, y },
    end: { x: width - margem, y },
    thickness: 1.5,
    color: azul,
  })
  y -= 40

  // TÍTULO
  page.drawText('BOLETIM DE NOTAS', {
    x: margem,
    y,
    size: 20,
    font: helvBold,
    color: preto,
  })

  const numTxt = `Nº ${dados.numero}`
  const numW = helvBold.widthOfTextAtSize(numTxt, 12)
  page.drawText(numTxt, {
    x: width - margem - numW,
    y: y + 5,
    size: 12,
    font: helvBold,
    color: azul,
  })
  y -= 40

  // DADOS DO ALUNO
  const linhas: [string, string][] = [
    ['Aluno', dados.alunoNome],
    [
      'Classe / Turma',
      `${dados.classe ?? '—'}${dados.turma ? ` / ${dados.turma}` : ''}`,
    ],
    ['Período', `${dados.periodo.replace('-T', ' — ')}º Trimestre`],
    [
      'Data de emissão',
      new Date().toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    ],
  ]

  for (const [label, valor] of linhas) {
    page.drawText(label.toUpperCase(), {
      x: margem,
      y,
      size: 8,
      font: helv,
      color: cinza,
    })
    page.drawText(valor, {
      x: margem,
      y: y - 16,
      size: 12,
      font: helvBold,
      color: preto,
    })
    y -= 42
  }

  y -= 10

  // TABELA DE NOTAS
  page.drawLine({
    start: { x: margem, y },
    end: { x: width - margem, y },
    thickness: 0.7,
    color: cinza,
  })
  y -= 16

  page.drawText('DISCIPLINA', {
    x: margem,
    y,
    size: 9,
    font: helvBold,
    color: cinza,
  })
  page.drawText('NOTA', {
    x: margem + 380,
    y,
    size: 9,
    font: helvBold,
    color: cinza,
  })
  y -= 14

  page.drawLine({
    start: { x: margem, y },
    end: { x: width - margem, y },
    thickness: 0.4,
    color: cinza,
  })
  y -= 8

  for (const n of dados.notas) {
    const cor =
      n.valor === null
        ? cinza
        : n.valor >= 14
        ? verde
        : n.valor >= 10
        ? preto
        : vermelho

    page.drawText(n.disciplina, {
      x: margem,
      y,
      size: 11,
      font: helv,
      color: preto,
    })
    page.drawText(n.valor !== null ? n.valor.toFixed(0) : '—', {
      x: margem + 380,
      y,
      size: 11,
      font: helvBold,
      color: cor,
    })
    y -= 20
  }

  page.drawLine({
    start: { x: margem, y },
    end: { x: width - margem, y },
    thickness: 0.7,
    color: cinza,
  })
  y -= 30

  // MÉDIA
  page.drawRectangle({
    x: margem,
    y: y - 45,
    width: 180,
    height: 45,
    color: rgb(0.95, 0.97, 1),
    borderColor: azul,
    borderWidth: 1,
  })
  page.drawText('MÉDIA FINAL', {
    x: margem + 12,
    y: y - 16,
    size: 8,
    font: helv,
    color: cinza,
  })
  page.drawText(dados.media !== null ? dados.media.toFixed(1) : '—', {
    x: margem + 12,
    y: y - 38,
    size: 20,
    font: helvBold,
    color: azul,
  })

  // ASSINATURAS
  y -= 130
  page.drawText('O(A) Diretor(a) Pedagógico(a)', {
    x: margem + 30,
    y,
    size: 9,
    font: helv,
    color: cinza,
  })
  page.drawText('O(A) Encarregado(a) de Educação', {
    x: width - margem - 180,
    y,
    size: 9,
    font: helv,
    color: cinza,
  })
  page.drawLine({
    start: { x: margem, y: y + 20 },
    end: { x: margem + 180, y: y + 20 },
    thickness: 0.5,
    color: cinza,
  })
  page.drawLine({
    start: { x: width - margem - 180, y: y + 20 },
    end: { x: width - margem, y: y + 20 },
    thickness: 0.5,
    color: cinza,
  })

  // RODAPÉ
  y = margem + 40
  page.drawLine({
    start: { x: margem, y },
    end: { x: width - margem, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  })
  page.drawText(
    'Documento emitido automaticamente pelo portal da Escola Nlenda e Nlenda.',
    { x: margem, y: margem + 20, size: 7, font: helv, color: cinza }
  )

  return await pdf.save()
}

/**
 * Emite o boletim individual de um aluno.
 * Só é permitido se a situação financeira estiver regularizada.
 * Gera o PDF, faz upload para o bucket "boletins" e registra na tabela.
 */
export async function emitirBoletim(student_id: string, periodo: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Sessão expirada.' }

  const supabaseAdmin = admin()

  // 1. Verificar situação financeira
  const anoLetivo = periodo.split('-')[0]
  const situacao = await verificarSituacaoFinanceira(student_id, anoLetivo)

  if (!situacao.regular) {
    return {
      erro: `Situação financeira irregular. Faltam ${situacao.meses_em_falta.length} mês(es).`,
      meses_em_falta: situacao.meses_em_falta,
    }
  }

  // 2. Buscar dados do aluno
  const { data: aluno } = await supabaseAdmin
    .from('students')
    .select('full_name, classes(name), turmas(name)')
    .eq('id', student_id)
    .single()

  if (!aluno) return { erro: 'Aluno não encontrado.' }

  const cls = Array.isArray(aluno.classes) ? aluno.classes[0] : aluno.classes
  const tur = Array.isArray(aluno.turmas) ? aluno.turmas[0] : aluno.turmas

  // 3. Buscar notas do período
  const { data: notas } = await supabaseAdmin
    .from('notas')
    .select('valor, disciplinas(name)')
    .eq('student_id', student_id)
    .eq('periodo', periodo)

  if (!notas || notas.length === 0) {
    return { erro: 'Este aluno ainda não tem notas lançadas neste período.' }
  }

  const notasNorm = notas.map((n) => {
    const d = Array.isArray(n.disciplinas) ? n.disciplinas[0] : n.disciplinas
    return {
      disciplina: d ? String(d.name) : '—',
      valor: n.valor !== null ? Number(n.valor) : null,
    }
  })

  const vals = notasNorm
    .filter((n) => n.valor !== null)
    .map((n) => n.valor as number)
  const media =
    vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null

  // 4. Verificar se já existe boletim (manter número e código)
  const { data: boletimExistente } = await supabaseAdmin
    .from('boletins')
    .select('numero, codigo_verificacao')
    .eq('student_id', student_id)
    .eq('periodo', periodo)
    .maybeSingle()

  const ano = periodo.split('-')[0]
  const numero =
    boletimExistente?.numero ?? (await gerarNumeroBoletim(ano))
  const codigo_verificacao =
    boletimExistente?.codigo_verificacao ?? gerarCodigoBoletim(periodo)

  // 5. Gerar PDF
  const pdfBytes = await gerarBoletimPDF({
    numero,
    alunoNome: aluno.full_name,
    classe: cls ? String(cls.name) : null,
    turma: tur ? String(tur.name) : null,
    periodo,
    notas: notasNorm,
    media,
  })

  // 6. Upload para o bucket boletins
  const path = `${student_id}/${periodo}-boletim.pdf`
  const { error: errUpload } = await supabaseAdmin.storage
    .from('boletins')
    .upload(path, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (errUpload) {
    return { erro: `Erro ao guardar boletim: ${errUpload.message}` }
  }

  // 7. Registar na tabela
  const { error: errBoletim } = await supabaseAdmin
    .from('boletins')
    .upsert(
      {
        student_id,
        periodo,
        emitido_em: new Date().toISOString(),
        emitido_por: user.id,
        file_url: path,
        numero,
        codigo_verificacao,
      },
      { onConflict: 'student_id,periodo' }
    )

  if (errBoletim) return { erro: errBoletim.message }

  // 8. Publicar as notas deste aluno neste período
  const { error: errNotas } = await supabaseAdmin
    .from('notas')
    .update({ publicado: true })
    .eq('student_id', student_id)
    .eq('periodo', periodo)

  if (errNotas) return { erro: errNotas.message }

  revalidatePath('/secretario/notas')
  revalidatePath('/dashboard/notas')
  revalidatePath('/dashboard')
  return { ok: true, numero }
}