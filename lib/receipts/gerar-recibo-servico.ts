import {
  PDFDocument,
  StandardFonts,
  rgb,
  PDFPage,
  PDFFont,
  PDFImage,
} from 'pdf-lib'
import QRCode from 'qrcode'
import { embedLogo } from './embed-logo'

type DadosRecibo = {
  numero: string
  codigo: string
  urlVerificacao: string
  alunoNome: string
  nomePai: string | null
  telefonePai: string | null
  classe: string
  turma: string | null
  servicoNome: string
  variacao: string | null
  mesReferencia: string | null
  mesesReferencia?: string[] | null
  valorBase: number
  valorMulta: number
  valorTotal: number
  comMulta: boolean
  formaPagamento: 'fisico' | 'banco'
  banco: string | null
  dataEmissao: Date
}

// ⚠ Acentos OK — Helvetica (WinAnsi) suporta Latin-1
const MESES_PT: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro',
}

function formatarMes(iso: string): string {
  const [ano, mes] = iso.split('-')
  return `${MESES_PT[mes] ?? mes} ${ano}`
}

function fmt(valor: number): string {
  return `${valor.toLocaleString('pt-PT')} Kz`
}

async function desenharVia(
  page: PDFPage,
  dados: DadosRecibo,
  destinatario: 'coordenacao' | 'estudante',
  helv: PDFFont,
  helvBold: PDFFont,
  qrImage: PDFImage,
  logo: PDFImage | null
) {
  const largura = page.getSize().width
  const altura = page.getSize().height
  const margem = 50
  const larguraUtil = largura - margem * 2
  let y = altura - margem

  const azul = rgb(0.15, 0.35, 0.75)
  const cinza = rgb(0.4, 0.4, 0.4)
  const preto = rgb(0.1, 0.1, 0.1)
  const vermelho = rgb(0.75, 0.15, 0.15)

  // ─────────────────────────────────────────────
  // CABEÇALHO
  // ─────────────────────────────────────────────
  page.drawText('REPÚBLICA DE ANGOLA', {
    x: margem,
    y,
    size: 8,
    font: helv,
    color: cinza,
  })
  y -= 14

  if (logo) {
    const logoH = 40
    const logoW = (logo.width / logo.height) * logoH
    page.drawImage(logo, {
      x: margem,
      y: y - logoH + 10,
      width: logoW,
      height: logoH,
    })
    page.drawText("Nlenda Y'Nlenda", {
      x: margem + logoW + 14,
      y: y - 2,
      size: 16,
      font: helvBold,
      color: azul,
    })
    page.drawText('Escola Primária Privada', {
      x: margem + logoW + 14,
      y: y - 17,
      size: 9,
      font: helv,
      color: cinza,
    })
    y -= logoH + 10
  } else {
    page.drawText("Nlenda Y'Nlenda", {
      x: margem,
      y,
      size: 18,
      font: helvBold,
      color: azul,
    })
    y -= 18
    page.drawText('Escola Primária Privada', {
      x: margem,
      y,
      size: 9,
      font: helv,
      color: cinza,
    })
    y -= 14
  }

  page.drawText('Nzetu, Zaire - 923 318 758 - secretaria@nlenda-nlenda.ao', {
    x: margem,
    y,
    size: 8,
    font: helv,
    color: cinza,
  })

  // Destinatário no canto superior direito
  const destTxt =
    destinatario === 'coordenacao' ? 'VIA DA COORDENAÇÃO' : 'VIA DO ESTUDANTE'
  const destW = helvBold.widthOfTextAtSize(destTxt, 9)
  page.drawText(destTxt, {
    x: largura - margem - destW,
    y: altura - margem + 4,
    size: 9,
    font: helvBold,
    color: azul,
  })

  y -= 22
  page.drawLine({
    start: { x: margem, y },
    end: { x: largura - margem, y },
    thickness: 1.5,
    color: azul,
  })
  y -= 40

  // ─────────────────────────────────────────────
  // TÍTULO
  // ─────────────────────────────────────────────
  page.drawText('RECIBO DE PAGAMENTO', {
    x: margem,
    y,
    size: 22,
    font: helvBold,
    color: preto,
  })
  const numTxt = `Nº ${dados.numero}`
  const numW = helvBold.widthOfTextAtSize(numTxt, 12)
  page.drawText(numTxt, {
    x: largura - margem - numW,
    y: y + 5,
    size: 12,
    font: helvBold,
    color: azul,
  })
  y -= 50

  // ─────────────────────────────────────────────
  // CAIXA DE VALOR
  // ─────────────────────────────────────────────
  const alturaCaixa = dados.comMulta ? 100 : 80
  page.drawRectangle({
    x: margem,
    y: y - alturaCaixa,
    width: larguraUtil,
    height: alturaCaixa,
    color: rgb(0.95, 0.97, 1),
    borderColor: azul,
    borderWidth: 1.5,
  })

  let yLinha = y - 24
  if (dados.comMulta) {
    page.drawText('Valor base', {
      x: margem + 20,
      y: yLinha,
      size: 11,
      font: helv,
      color: cinza,
    })
    const vw = helv.widthOfTextAtSize(fmt(dados.valorBase), 11)
    page.drawText(fmt(dados.valorBase), {
      x: largura - margem - 20 - vw,
      y: yLinha,
      size: 11,
      font: helv,
      color: preto,
    })
    yLinha -= 22

    page.drawText('Multa por atraso', {
      x: margem + 20,
      y: yLinha,
      size: 11,
      font: helv,
      color: vermelho,
    })
    const mw = helv.widthOfTextAtSize(fmt(dados.valorMulta), 11)
    page.drawText(fmt(dados.valorMulta), {
      x: largura - margem - 20 - mw,
      y: yLinha,
      size: 11,
      font: helv,
      color: vermelho,
    })
    yLinha -= 24
  } else {
    yLinha -= 6
  }

  page.drawText('TOTAL PAGO', {
    x: margem + 20,
    y: yLinha - 4,
    size: 11,
    font: helvBold,
    color: azul,
  })
  const totalTxt = fmt(dados.valorTotal)
  const totalW = helvBold.widthOfTextAtSize(totalTxt, 22)
  page.drawText(totalTxt, {
    x: largura - margem - 20 - totalW,
    y: yLinha - 12,
    size: 22,
    font: helvBold,
    color: azul,
  })

  y = y - alturaCaixa - 40

  // ─────────────────────────────────────────────
  // DADOS DO RECIBO
  // ─────────────────────────────────────────────
  const linhas: [string, string][] = [
    ['Aluno', dados.alunoNome],
    [
      'Classe / Turma',
      `${dados.classe}${dados.turma ? ' / ' + dados.turma : ''}`,
    ],
    ['Encarregado', dados.nomePai ?? '-'],
    ['Telefone', dados.telefonePai ?? '-'],
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
      y: y - 18,
      size: 12,
      font: helvBold,
      color: preto,
    })
    y -= 42
  }

  // ─────────────────────────────────────────────
  // MESES PAGOS (lista) — só para propina
  // ─────────────────────────────────────────────
  const meses =
    dados.mesesReferencia && dados.mesesReferencia.length > 0
      ? dados.mesesReferencia
      : dados.mesReferencia
      ? [dados.mesReferencia]
      : []

  if (meses.length > 0) {
    page.drawText('MESES PAGOS', {
      x: margem,
      y,
      size: 8,
      font: helv,
      color: cinza,
    })
    y -= 16

    if (meses.length === 1) {
      page.drawText(formatarMes(meses[0]), {
        x: margem,
        y,
        size: 12,
        font: helvBold,
        color: preto,
      })
      y -= 36
    } else {
      // Grelha 3 colunas, ordenada cronologicamente
      const mesesOrdenados = [...meses].sort()
      const cols = 3
      const larguraCol = larguraUtil / cols
      const alturaLinha = 20

      mesesOrdenados.forEach((mes, i) => {
        const col = i % cols
        const linha = Math.floor(i / cols)
        const xMes = margem + col * larguraCol
        const yMes = y - linha * alturaLinha

        page.drawText(formatarMes(mes), {
          x: xMes,
          y: yMes,
          size: 11,
          font: helvBold,
          color: preto,
        })
      })

      const totalLinhas = Math.ceil(mesesOrdenados.length / cols)
      y -= totalLinhas * alturaLinha + 20
    }
  }

  // ─────────────────────────────────────────────
  // SERVIÇO E PAGAMENTO
  // ─────────────────────────────────────────────
  const detalhes: [string, string][] = [
    ['Serviço', dados.servicoNome],
    [
      'Forma de pagamento',
      dados.formaPagamento === 'fisico'
        ? 'Físico (à mão)'
        : `Banco - ${dados.banco ?? 'Transferência'}`,
    ],
    [
      'Data de emissão',
      dados.dataEmissao.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    ],
  ]

  for (const [label, valor] of detalhes) {
    page.drawText(label.toUpperCase(), {
      x: margem,
      y,
      size: 8,
      font: helv,
      color: cinza,
    })
    page.drawText(valor, {
      x: margem,
      y: y - 18,
      size: 12,
      font: helvBold,
      color: preto,
    })
    y -= 42
  }

  // ─────────────────────────────────────────────
  // QR CODE
  // ─────────────────────────────────────────────
  const qrSize = 100
  const qrX = largura - margem - qrSize
  const qrY = margem + 90

  page.drawRectangle({
    x: qrX - 10,
    y: qrY - 10,
    width: qrSize + 20,
    height: qrSize + 20,
    color: rgb(1, 1, 1),
    borderColor: azul,
    borderWidth: 1,
  })
  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  })

  const textoCodigo = 'Código de verificação'
  page.drawText(textoCodigo, {
    x: qrX + qrSize / 2 - helv.widthOfTextAtSize(textoCodigo, 8) / 2,
    y: qrY - 24,
    size: 8,
    font: helv,
    color: cinza,
  })
  page.drawText(dados.codigo, {
    x: qrX + qrSize / 2 - helvBold.widthOfTextAtSize(dados.codigo, 10) / 2,
    y: qrY - 38,
    size: 10,
    font: helvBold,
    color: azul,
  })

  // Assinatura
  const yAssinatura = margem + 60
  page.drawLine({
    start: { x: margem, y: yAssinatura },
    end: { x: margem + 200, y: yAssinatura },
    thickness: 0.5,
    color: cinza,
  })
  page.drawText('O(A) Diretor(a) Pedagógico(a)', {
    x: margem,
    y: yAssinatura - 14,
    size: 8,
    font: helv,
    color: cinza,
  })

  // Rodapé
  page.drawText(
    'Documento emitido eletronicamente. Verifique a autenticidade em:',
    { x: margem, y: margem + 30, size: 7, font: helv, color: cinza }
  )
  page.drawText(dados.urlVerificacao, {
    x: margem,
    y: margem + 18,
    size: 7,
    font: helv,
    color: azul,
  })
}

export async function gerarReciboServicoPDF(
  dados: DadosRecibo,
  destinatario: 'coordenacao' | 'estudante'
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const logo = await embedLogo(pdf)
  const page = pdf.addPage([595.28, 841.89])

  const helv = await pdf.embedFont(StandardFonts.Helvetica)
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const qrDataUrl = await QRCode.toDataURL(dados.urlVerificacao, {
    margin: 0,
    width: 400,
    color: { dark: '#0f172a', light: '#ffffff' },
  })
  const qrImage = await pdf.embedPng(qrDataUrl)

  await desenharVia(page, dados, destinatario, helv, helvBold, qrImage, logo)

  return await pdf.save()
}