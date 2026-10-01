import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib'

type Pagamento = {
  id: number
  numero_recibo: string
  valor_total: number
  forma_pagamento: 'fisico' | 'banco'
  banco: string | null
  mes_referencia: string | null
  criado_em: string
  servico_codigo: string | null
  servico_nome: string
  classe_nome: string | null
  aluno_id: string | null
  aluno_nome: string
  aluno_classe: string | null
}

type Resumo = {
  total: number
  fisico: number
  banco: number
  alunos: number
  recibos: number
  percentFisico: number
  percentBanco: number
}

type Grupo = {
  nome: string
  total: number
  n: number
  extra?: number | string
}

type DadosRelatorio = {
  periodo: string
  dataGeracao: Date
  resumo: Resumo
  porClasse: Grupo[]
  porServico: Grupo[]
  porAluno: Grupo[]
  pagamentos: Pagamento[]
}

const AZUL = rgb(0.15, 0.35, 0.75)
const CINZA = rgb(0.4, 0.4, 0.4)
const PRETO = rgb(0.1, 0.1, 0.1)
const VERDE = rgb(0.15, 0.55, 0.25)
const VIOLETA = rgb(0.4, 0.2, 0.65)
const CINZA_CLARO = rgb(0.95, 0.96, 0.97)
const BRANCO = rgb(1, 1, 1)

function fmt(valor: number): string {
  return `${valor.toLocaleString('pt-PT')} Kz`
}

function novaPaginaComCabecalho(
  pdf: PDFDocument,
  helv: PDFFont,
  helvBold: PDFFont,
  dataGeracao: Date
): { page: PDFPage; y: number } {
  const page = pdf.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()
  const margem = 45
  let y = height - margem

  page.drawText('REPUBLICA DE ANGOLA', {
    x: margem,
    y,
    size: 7,
    font: helv,
    color: CINZA,
  })
  y -= 12

  page.drawText('Escola Nlenda e Nlenda', {
    x: margem,
    y,
    size: 14,
    font: helvBold,
    color: AZUL,
  })
  y -= 16

  page.drawText('Nzetu, Zaire - secretaria@nlenda-nlenda.ao', {
    x: margem,
    y,
    size: 7,
    font: helv,
    color: CINZA,
  })

  const dataTexto = dataGeracao.toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const dataW = helv.widthOfTextAtSize(dataTexto, 8)
  page.drawText(dataTexto, {
    x: width - margem - dataW,
    y: height - margem,
    size: 8,
    font: helv,
    color: CINZA,
  })

  y -= 12
  page.drawLine({
    start: { x: margem, y },
    end: { x: width - margem, y },
    thickness: 1.5,
    color: AZUL,
  })
  y -= 30

  return { page, y }
}

export async function gerarRelatorioPDF(
  dados: DadosRelatorio
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const helv = await pdf.embedFont(StandardFonts.Helvetica)
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  // ─────────────────────────────────────────────────────────
  // PÁGINA 1
  // ─────────────────────────────────────────────────────────
  let { page, y } = novaPaginaComCabecalho(
    pdf,
    helv,
    helvBold,
    dados.dataGeracao
  )
  const { width } = page.getSize()
  const margem = 45
  const larguraUtil = width - margem * 2

  page.drawText('RELATORIO DE PAGAMENTOS', {
    x: margem,
    y,
    size: 20,
    font: helvBold,
    color: PRETO,
  })
  y -= 20
  page.drawText(`Periodo: ${dados.periodo}`, {
    x: margem,
    y,
    size: 11,
    font: helv,
    color: CINZA,
  })
  y -= 35

  // ─────────────────────────────────────────────────────
  // CAIXA DE RESUMO GERAL
  // ─────────────────────────────────────────────────────
  page.drawRectangle({
    x: margem,
    y: y - 90,
    width: larguraUtil,
    height: 90,
    color: rgb(0.95, 0.97, 1),
    borderColor: AZUL,
    borderWidth: 1,
  })

  page.drawText('TOTAL ARRECADADO', {
    x: margem + 15,
    y: y - 22,
    size: 8,
    font: helv,
    color: CINZA,
  })
  page.drawText(fmt(dados.resumo.total), {
    x: margem + 15,
    y: y - 52,
    size: 22,
    font: helvBold,
    color: AZUL,
  })

  // Físico
  page.drawText('FISICO', {
    x: margem + 250,
    y: y - 22,
    size: 8,
    font: helv,
    color: CINZA,
  })
  page.drawText(`${dados.resumo.percentFisico}%`, {
    x: margem + 250,
    y: y - 42,
    size: 14,
    font: helvBold,
    color: VERDE,
  })
  page.drawText(fmt(dados.resumo.fisico), {
    x: margem + 250,
    y: y - 58,
    size: 9,
    font: helv,
    color: PRETO,
  })

  // Banco
  page.drawText('BANCO', {
    x: margem + 380,
    y: y - 22,
    size: 8,
    font: helv,
    color: CINZA,
  })
  page.drawText(`${dados.resumo.percentBanco}%`, {
    x: margem + 380,
    y: y - 42,
    size: 14,
    font: helvBold,
    color: VIOLETA,
  })
  page.drawText(fmt(dados.resumo.banco), {
    x: margem + 380,
    y: y - 58,
    size: 9,
    font: helv,
    color: PRETO,
  })

  y -= 110

  // Contadores
  page.drawText(`Recibos emitidos: ${dados.resumo.recibos}`, {
    x: margem,
    y,
    size: 10,
    font: helv,
    color: PRETO,
  })
  page.drawText(`Alunos distintos: ${dados.resumo.alunos}`, {
    x: margem + 250,
    y,
    size: 10,
    font: helv,
    color: PRETO,
  })
  y -= 30

  // ─────────────────────────────────────────────────────
  // TABELA: POR CLASSE
  // ─────────────────────────────────────────────────────
  y = desenharTabela(
    page,
    'POR CLASSE',
    ['Classe', 'Alunos', 'Recibos', 'Total'],
    dados.porClasse.map((g) => [
      g.nome,
      String(g.extra ?? '-'),
      String(g.n),
      fmt(g.total),
    ]),
    [
      larguraUtil * 0.5,
      larguraUtil * 0.15,
      larguraUtil * 0.15,
      larguraUtil * 0.2,
    ],
    margem,
    y,
    helv,
    helvBold
  )

  y -= 25

  // ─────────────────────────────────────────────────────
  // TABELA: POR SERVIÇO
  // ─────────────────────────────────────────────────────
  y = desenharTabela(
    page,
    'POR SERVICO',
    ['Servico', 'Quantidade', 'Total'],
    dados.porServico.map((g) => [g.nome, String(g.n), fmt(g.total)]),
    [larguraUtil * 0.6, larguraUtil * 0.2, larguraUtil * 0.2],
    margem,
    y,
    helv,
    helvBold
  )

  // ─────────────────────────────────────────────────────────
  // PÁGINA 2
  // ─────────────────────────────────────────────────────────
  ;({ page, y } = novaPaginaComCabecalho(
    pdf,
    helv,
    helvBold,
    dados.dataGeracao
  ))

  // POR ALUNO
  y = desenharTabela(
    page,
    'POR ALUNO',
    ['Aluno', 'Classe', 'Recibos', 'Total pago'],
    dados.porAluno.map((g) => [
      g.nome,
      g.extra ? String(g.extra) : '-',
      String(g.n),
      fmt(g.total),
    ]),
    [
      larguraUtil * 0.4,
      larguraUtil * 0.2,
      larguraUtil * 0.15,
      larguraUtil * 0.25,
    ],
    margem,
    y,
    helv,
    helvBold
  )

  y -= 30

  // ─────────────────────────────────────────────────────
  // DETALHE DOS PAGAMENTOS
  // ─────────────────────────────────────────────────────
  page.drawText('DETALHE DOS PAGAMENTOS', {
    x: margem,
    y,
    size: 12,
    font: helvBold,
    color: AZUL,
  })
  y -= 8
  page.drawLine({
    start: { x: margem, y },
    end: { x: width - margem, y },
    thickness: 0.5,
    color: AZUL,
  })
  y -= 20

  const cols = [margem, margem + 90, margem + 200, margem + 320, margem + 400]
  page.drawText('Recibo', {
    x: cols[0],
    y,
    size: 8,
    font: helvBold,
    color: CINZA,
  })
  page.drawText('Aluno', {
    x: cols[1],
    y,
    size: 8,
    font: helvBold,
    color: CINZA,
  })
  page.drawText('Servico', {
    x: cols[2],
    y,
    size: 8,
    font: helvBold,
    color: CINZA,
  })
  page.drawText('Pagamento', {
    x: cols[3],
    y,
    size: 8,
    font: helvBold,
    color: CINZA,
  })
  const totalHeaderW = helvBold.widthOfTextAtSize('Total', 8)
  page.drawText('Total', {
    x: width - margem - totalHeaderW,
    y,
    size: 8,
    font: helvBold,
    color: CINZA,
  })
  y -= 8
  page.drawLine({
    start: { x: margem, y },
    end: { x: width - margem, y },
    thickness: 0.3,
    color: CINZA,
  })
  y -= 6

  for (const p of dados.pagamentos) {
    if (y < 60) {
      ;({ page, y } = novaPaginaComCabecalho(
        pdf,
        helv,
        helvBold,
        dados.dataGeracao
      ))
      y -= 20
    }

    const servicoTexto =
      p.servico_nome + (p.mes_referencia ? ` - ${p.mes_referencia}` : '')
    const valorTexto = fmt(p.valor_total)
    const valorW = helv.widthOfTextAtSize(valorTexto, 8)

    page.drawText(p.numero_recibo, {
      x: cols[0],
      y,
      size: 8,
      font: helv,
      color: PRETO,
    })
    page.drawText(truncar(p.aluno_nome, 20), {
      x: cols[1],
      y,
      size: 8,
      font: helv,
      color: PRETO,
    })
    page.drawText(truncar(servicoTexto, 22), {
      x: cols[2],
      y,
      size: 8,
      font: helv,
      color: PRETO,
    })
    page.drawText(
      p.forma_pagamento === 'fisico' ? 'Fisico' : `Banco - ${p.banco ?? '-'}`,
      {
        x: cols[3],
        y,
        size: 8,
        font: helv,
        color: CINZA,
      }
    )
    page.drawText(valorTexto, {
      x: width - margem - valorW,
      y,
      size: 8,
      font: helvBold,
      color: PRETO,
    })
    y -= 14
  }

  // Rodapé
  y -= 10
  page.drawLine({
    start: { x: margem, y },
    end: { x: width - margem, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  })
  page.drawText(
    `Total: ${fmt(dados.resumo.total)} - ${dados.resumo.recibos} recibo(s) - ${dados.resumo.alunos} aluno(s)`,
    {
      x: margem,
      y: y - 15,
      size: 9,
      font: helvBold,
      color: AZUL,
    }
  )
  page.drawText(
    'Documento emitido automaticamente pelo portal da Escola Nlenda e Nlenda.',
    {
      x: margem,
      y: y - 30,
      size: 7,
      font: helv,
      color: CINZA,
    }
  )

  return await pdf.save()
}

function desenharTabela(
  page: PDFPage,
  titulo: string,
  cabecalhos: string[],
  linhas: string[][],
  larguras: number[],
  margem: number,
  yInicial: number,
  helv: PDFFont,
  helvBold: PDFFont
): number {
  const { width } = page.getSize()
  let y = yInicial

  page.drawText(titulo, {
    x: margem,
    y,
    size: 12,
    font: helvBold,
    color: AZUL,
  })
  y -= 8
  page.drawLine({
    start: { x: margem, y },
    end: { x: width - margem, y },
    thickness: 0.5,
    color: AZUL,
  })
  y -= 18

  if (linhas.length === 0) {
    page.drawText('Sem dados.', {
      x: margem,
      y,
      size: 9,
      font: helv,
      color: CINZA,
    })
    return y - 15
  }

  let x = margem
  for (let i = 0; i < cabecalhos.length; i++) {
    const h = cabecalhos[i]
    const larg = larguras[i]
    if (i === cabecalhos.length - 1) {
      const w = helvBold.widthOfTextAtSize(h, 8)
      page.drawText(h, {
        x: x + larg - w,
        y,
        size: 8,
        font: helvBold,
        color: CINZA,
      })
    } else {
      page.drawText(h, {
        x,
        y,
        size: 8,
        font: helvBold,
        color: CINZA,
      })
    }
    x += larg
  }
  y -= 6
  page.drawLine({
    start: { x: margem, y },
    end: { x: width - margem, y },
    thickness: 0.3,
    color: CINZA,
  })
  y -= 12

  for (let j = 0; j < linhas.length; j++) {
    const linha = linhas[j]
    const bg = j % 2 === 0 ? BRANCO : CINZA_CLARO

    page.drawRectangle({
      x: margem - 4,
      y: y - 4,
      width: width - margem * 2 + 8,
      height: 14,
      color: bg,
    })

    x = margem
    for (let i = 0; i < linha.length; i++) {
      const valor = linha[i]
      const larg = larguras[i]
      if (i === linha.length - 1) {
        const w = helvBold.widthOfTextAtSize(valor, 9)
        page.drawText(valor, {
          x: x + larg - w,
          y,
          size: 9,
          font: helvBold,
          color: PRETO,
        })
      } else {
        page.drawText(valor, {
          x,
          y,
          size: 9,
          font: helv,
          color: PRETO,
        })
      }
      x += larg
    }
    y -= 14
  }

  return y
}

function truncar(texto: string, max: number): string {
  return texto.length > max ? texto.slice(0, max - 1) + '...' : texto
}