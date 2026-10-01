'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Recibo = {
  id: number
  numero_recibo: string
  codigo_verificacao: string
  file_url: string
  valor_total: number
  mes_referencia: string | null
  variacao: string | null
  forma_pagamento: 'fisico' | 'banco'
  banco: string | null
  criado_em: string
  servico_codigo: string | null
  servico_nome: string
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

function formatarMes(iso: string | null): string {
  if (!iso) return ''
  const [ano, mes] = iso.split('-')
  return `${MESES_PT[mes] ?? mes} ${ano}`
}

function titulo(r: Recibo): string {
  if (r.servico_codigo === 'propina' && r.mes_referencia) {
    return `Propina · ${formatarMes(r.mes_referencia)}`
  }
  return r.variacao
    ? `${r.servico_nome} · ${r.variacao.charAt(0).toUpperCase() + r.variacao.slice(1)}`
    : r.servico_nome
}

export default function RecibosAlunoClient({ recibos }: { recibos: Recibo[] }) {
  const supabase = createClient()
  const [aAbrir, setAAbrir] = useState<number | null>(null)
  const [erro, setErro] = useState('')

  const total = useMemo(
    () => recibos.reduce((s, r) => s + r.valor_total, 0),
    [recibos]
  )

  async function descarregar(path: string, id: number) {
    setErro('')
    setAAbrir(id)

    const { data, error } = await supabase.storage
      .from('pagamentos-servico')
      .createSignedUrl(path, 300)

    if (error || !data?.signedUrl) {
      setErro('Não foi possível abrir o recibo.')
      setAAbrir(null)
      return
    }

    window.open(data.signedUrl, '_blank')
    setAAbrir(null)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link
        href="/dashboard"
        className="text-sm text-gray-500 hover:text-blue-600 transition"
      >
        ← Voltar ao painel
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-gray-900">
        Meus recibos
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Todos os recibos dos seus pagamentos à escola.
      </p>

      {erro && (
        <div className="mt-4 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {erro}
        </div>
      )}

      {/* RESUMO */}
      {recibos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">Recibos</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {recibos.length}
            </p>
          </div>
          <div className="bg-white border border-blue-200 bg-blue-50/40 rounded-xl p-4">
            <p className="text-xs text-blue-700">Total pago</p>
            <p className="mt-1 text-2xl font-semibold text-blue-700">
              {total.toLocaleString('pt-PT')}
              <span className="text-sm font-normal"> Kz</span>
            </p>
          </div>
        </div>
      )}

      {/* LISTA */}
      <div className="mt-6 space-y-3">
        {recibos.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">🧾</div>
            <p className="text-gray-500 text-sm">
              Ainda não tem recibos emitidos.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Assim que a secretaria aprovar um pagamento, aparece aqui.
            </p>
          </div>
        ) : (
          recibos.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap gap-4 items-start"
            >
              <div className="w-14 h-14 rounded-lg bg-green-500 text-white flex flex-col items-center justify-center shrink-0">
                <span className="text-[9px] uppercase opacity-80">Recibo</span>
                <span className="text-xs font-semibold">
                  {r.numero_recibo.split('/')[1]?.slice(-3) ?? '—'}
                </span>
              </div>

              <div className="flex-1 min-w-[200px]">
                <p className="font-medium text-gray-900">{titulo(r)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Nº <span className="font-mono">{r.numero_recibo}</span> ·
                  emitido em{' '}
                  {new Date(r.criado_em).toLocaleDateString('pt-PT')}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {r.forma_pagamento === 'fisico'
                    ? 'Físico (à mão)'
                    : `Banco · ${r.banco ?? '—'}`}
                </p>
                <p className="text-[10px] text-gray-400 font-mono mt-1">
                  {r.codigo_verificacao}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <p className="text-lg font-bold text-gray-900">
                  {r.valor_total.toLocaleString('pt-PT')} Kz
                </p>
                <button
                  onClick={() => descarregar(r.file_url, r.id)}
                  disabled={aAbrir === r.id}
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium transition inline-flex items-center gap-1.5"
                >
                  {aAbrir === r.id ? 'A abrir…' : '⬇ Descarregar'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}