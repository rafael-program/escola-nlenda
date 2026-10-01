'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Aluno = {
  id: string
  full_name: string
  nome_pai: string | null
  telefone_pai: string | null
  classe: string | null
}

type Recibo = {
  id: number
  numero_recibo: string
  codigo_verificacao: string
  file_url: string
  valor_base: number
  valor_multa: number
  valor_total: number
  forma_pagamento: 'fisico' | 'banco'
  banco: string | null
  mes_referencia: string | null
  variacao: string | null
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

export default function RecibosAlunoClient({
  aluno,
  recibos,
}: {
  aluno: Aluno
  recibos: Recibo[]
}) {
  const supabase = createClient()
  const [aAbrir, setAAbrir] = useState<number | null>(null)
  const [erro, setErro] = useState('')

  const total = recibos.reduce((s, r) => s + r.valor_total, 0)

  async function descarregar(
    path: string,
    id: number,
    tipo: 'estudante' | 'coordenacao'
  ) {
    setErro('')
    setAAbrir(id)

    const caminho =
      tipo === 'coordenacao'
        ? path.replace('-estudante.pdf', '-coordenacao.pdf')
        : path

    const { data, error } = await supabase.storage
      .from('pagamentos-servico')
      .createSignedUrl(caminho, 300)

    if (error || !data?.signedUrl) {
      setErro('Não foi possível abrir o recibo.')
      setAAbrir(null)
      return
    }

    window.open(data.signedUrl, '_blank')
    setAAbrir(null)
  }

  return (
    <div className="mt-6">
      {/* CABEÇALHO DO ALUNO */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-wrap items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-600 text-white text-base font-semibold flex items-center justify-center shrink-0">
          {aluno.full_name
            .split(' ')
            .slice(0, 2)
            .map((n) => n[0])
            .join('')
            .toUpperCase()}
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-xl font-semibold text-gray-900">
            {aluno.full_name}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {aluno.classe ?? '—'}
            {aluno.nome_pai && ` · Pai: ${aluno.nome_pai}`}
            {aluno.telefone_pai && ` · ${aluno.telefone_pai}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total pago</p>
          <p className="text-2xl font-bold text-blue-700">
            {total.toLocaleString('pt-PT')}
            <span className="text-sm font-normal"> Kz</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {recibos.length} recibo{recibos.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {erro && (
        <div className="mt-4 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {erro}
        </div>
      )}

      {/* LISTA DE RECIBOS */}
      <div className="mt-6 space-y-3">
        {recibos.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center text-sm text-gray-400">
            Este aluno ainda não tem recibos.
          </div>
        ) : (
          recibos.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap gap-4 items-start"
            >
              {/* Ícone */}
              <div className="w-14 h-14 rounded-lg bg-green-500 text-white flex flex-col items-center justify-center shrink-0">
                <span className="text-[9px] uppercase opacity-80">Recibo</span>
                <span className="text-xs font-semibold">
                  {r.numero_recibo.split('/')[1]?.slice(-3) ?? '—'}
                </span>
              </div>

              {/* Info */}
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

              {/* Valor + ações */}
              <div className="flex flex-col items-end gap-2">
                <p className="text-lg font-bold text-gray-900">
                  {r.valor_total.toLocaleString('pt-PT')} Kz
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => descarregar(r.file_url, r.id, 'estudante')}
                    disabled={aAbrir === r.id}
                    className="text-[11px] px-2.5 py-1 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-700 transition disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    ⬇ Estudante
                  </button>
                  <button
                    onClick={() => descarregar(r.file_url, r.id, 'coordenacao')}
                    disabled={aAbrir === r.id}
                    className="text-[11px] px-2.5 py-1 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-700 transition disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    ⬇ Coordenação
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}