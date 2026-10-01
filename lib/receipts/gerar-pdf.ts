import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

type DadosRecibo = {
  numero: string
  codigo_verificacao: string
  alunoNome: string
  classe: string | null
  turma: string | null
  mes: string
  valor: string | null
  dataEmissao: Date
  urlVerificacao: string
}

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

export async function gerarReciboPDF(
  dados: DadosRecibo
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()

  const helv = await pdf.embedFont(StandardFonts.Helvetica)
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const mono = await pdf.embedFont(StandardFonts.Courier)

  const azul = rgb(0.15, 0.35, 0.75)
  const cinza = rgb(0.4, 0.4, 0.4)
  const preto = rgb(0.1, 0.1, 0.1)
  const verde = rgb(0.15, 0.5, 0.2)

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

  // TÍTULO + NÚMERO
  page.drawText('RECIBO DE PAGAMENTO', {
    x: margem,
    y,
    size: 20,
    font: helvBold,
    color: preto,
  })

  const numeroTexto = `Nº ${dados.numero}`
  const numeroWidth = helvBold.widthOfTextAtSize(numeroTexto, 12)
  page.drawText(numeroTexto, {
    x: width - margem - numeroWidth,
    y: y + 5,
    size: 12,
    font: helvBold,
    color: azul,
  })
  y -= 40

  // CAIXA DE VALOR
  const valorMostrar = dados.valor ?? '— Kz'
  page.drawRectangle({
    x: margem,
    y: y - 60,
    width: width - margem * 2,
    height: 60,
    color: rgb(0.95, 0.97, 1),
    borderColor: azul,
    borderWidth: 1,
  })
  page.drawText('VALOR RECEBIDO', {
    x: margem + 16,
    y: y - 22,
    size: 9,
    font: helv,
    color: cinza,
  })
  page.drawText(valorMostrar, {
    x: margem + 16,
    y: y - 48,
    size: 22,
    font: helvBold,
    color: azul,
  })
  y -= 90

  // DADOS
  const linhas: [string, string][] = [
    ['Aluno', dados.alunoNome],
    [
      'Classe / Turma',
      `${dados.classe ?? '—'}${dados.turma ? ` / ${dados.turma}` : ''}`,
    ],
    ['Referente a', formatarMes(dados.mes)],
    [
      'Data de emissão',
      dados.dataEmissao.toLocaleDateString('pt-PT', {
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

  // DECLARAÇÃO
  const declaracao =
    'A Escola Nlenda e Nlenda declara ter recebido o valor acima indicado, ' +
    'referente ao pagamento mensal do aluno identificado. Este recibo é ' +
    'emitido electronicamente e é válido sem assinatura manuscrita.'

  const palavras = declaracao.split(' ')
  const linhasTexto: string[] = []
  let linhaAtual = ''
  const larguraMax = width - margem * 2

  for (const palavra of palavras) {
    const teste = linhaAtual ? `${linhaAtual} ${palavra}` : palavra
    if (helv.widthOfTextAtSize(teste, 10) > larguraMax) {
      linhasTexto.push(linhaAtual)
      linhaAtual = palavra
    } else {
      linhaAtual = teste
    }
  }
  if (linhaAtual) linhasTexto.push(linhaAtual)

  for (const l of linhasTexto) {
    page.drawText(l, { x: margem, y, size: 10, font: helv, color: preto })
    y -= 15
  }

  y -= 30

  // SELO PAGO (com padrão antifalsificação)
  const seloX = margem
  const seloY = y - 50
  const seloW = 160
  const seloH = 50
  page.drawRectangle({
    x: seloX,
    y: seloY,
    width: seloW,
    height: seloH,
    color: rgb(0.85, 0.95, 0.85),
    borderColor: verde,
    borderWidth: 1.5,
  })
  // Padrão de linhas diagonais
  for (let i = 0; i < 30; i++) {
    page.drawLine({
      start: { x: seloX + i * 6, y: seloY },
      end: { x: seloX + i * 6 + seloH, y: seloY + seloH },
      thickness: 0.3,
      color: rgb(0.7, 0.88, 0.72),
    })
  }
  page.drawText('PAGO', {
    x: seloX + 22,
    y: seloY + 18,
    size: 22,
    font: helvBold,
    color: verde,
  })

  // QR CODE + CAIXA DE VERIFICAÇÃO
  const qrDataUrl = await QRCode.toDataURL(dados.urlVerificacao, {
    margin: 0,
    width: 400,
    color: { dark: '#0f172a', light: '#ffffff' },
  })
  const qrImage = await pdf.embedPng(qrDataUrl)

  const qrSize = 90
  const qrX = width - margem - qrSize
  const qrY = seloY - 8

  // Caixa branca com moldura
  page.drawRectangle({
    x: qrX - 8,
    y: qrY - 8,
    width: qrSize + 16,
    height: qrSize + 16,
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

  // Texto do código
  const textoCodigo = 'Código de verificação'
  const textoCodigoW = helv.widthOfTextAtSize(textoCodigo, 7)
  page.drawText(textoCodigo, {
    x: qrX + qrSize / 2 - textoCodigoW / 2,
    y: qrY - 18,
    size: 7,
    font: helv,
    color: cinza,
  })

  const codigoTexto = dados.codigo_verificacao
  const codigoW = mono.widthOfTextAtSize(codigoTexto, 9)
  page.drawText(codigoTexto, {
    x: qrX + qrSize / 2 - codigoW / 2,
    y: qrY - 30,
    size: 9,
    font: mono,
    color: azul,
  })

  // RODAPÉ
  y = margem + 60
  page.drawLine({
    start: { x: margem, y },
    end: { x: width - margem, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  })

  const rodape =
    'Documento emitido automaticamente pelo portal da Escola Nlenda e Nlenda.'
  page.drawText(rodape, {
    x: margem,
    y: margem + 40,
    size: 8,
    font: helv,
    color: cinza,
  })

  page.drawText(
    'Verifique a autenticidade em: ' + dados.urlVerificacao,
    {
      x: margem,
      y: margem + 25,
      size: 7,
      font: helv,
      color: azul,
    }
  )

  return await pdf.save()
}