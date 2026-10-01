import { PDFDocument, PDFImage } from 'pdf-lib'
import { readFile } from 'fs/promises'
import path from 'path'

/**
 * Lê o logótipo e embute-o no PDF.
 *
 * Estratégia dupla:
 *  1. Tenta ler de `public/logo.png` com fs (rápido, funciona em dev e em
 *     deploys Node.js tradicionais).
 *  2. Se falhar (serverless sem filesystem, ex.: Vercel Edge), faz fetch
 *     ao próprio site público.
 *
 * Devolve `null` se nenhuma das vias funcionar — o recibo é gerado sem
 * logótipo, mas não quebra.
 */
export async function embedLogo(pdf: PDFDocument): Promise<PDFImage | null> {
  // ── Tentativa 1: filesystem ──
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    const logoBytes = await readFile(logoPath)
    return await pdf.embedPng(logoBytes)
  } catch {
    // silencioso — vamos tentar fetch
  }

  // ── Tentativa 2: fetch HTTP ──
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : 'http://localhost:3000')

    const res = await fetch(`${baseUrl}/logo.png`, {
      cache: 'force-cache',
    })

    if (!res.ok) {
      console.warn(
        '[embed-logo] logo.png não acessível em:',
        `${baseUrl}/logo.png`
      )
      return null
    }

    const bytes = await res.arrayBuffer()
    return await pdf.embedPng(bytes)
  } catch (e) {
    console.error('[embed-logo] Não foi possível carregar o logótipo:', e)
    return null
  }
}