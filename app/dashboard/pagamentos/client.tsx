'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type Mes = {
  chave: string
  label: string
  mesCurto: string
  status: 'pago' | 'pendente' | 'rejeitado' | 'falta'
}

type EstadoServico = 'pago' | 'pendente' | 'rejeitado' | 'nao_pago'

type ServicoComEstado = {
  id: number
  codigo: string
  nome: string
  descricao: string | null
  tem_urgencia: boolean
  estado: EstadoServico
  valor_pago: number | null
  numero_recibo: string | null
  data_pagamento: string | null
  variacao: string | null
}

type HistoricoItem = {
  id: number
  servico_nome: string
  servico_codigo: string | null
  variacao: string | null
  valor_total: number
  mes_referencia: string | null
  numero_recibo: string
  criado_em: string
}

const MESES_LABEL: Record<string, string> = {
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
  if (!iso) return '—'
  const [ano, mes] = iso.split('-')
  return `${MESES_LABEL[mes] ?? mes} ${ano}`
}

function tituloVariacao(v: string | null): string {
  if (!v) return ''
  return v.charAt(0).toUpperCase() + v.slice(1)
}

function iconeServico(codigo: string | null): string {
  const mapa: Record<string, string> = {
    matricula: '📋',
    reconfirmacao: '🔄',
    declaracao: '📄',
    certificado: '🎓',
    boletim: '📊',
    uniforme: '👕',
  }
  return mapa[codigo ?? ''] ?? '📦'
}

export default function PagamentosAlunoClient({
  meses,
  anoLetivo,
  pagos,
  pendentes,
  rejeitados,
  emFalta,
  classeNome,
  valorPropina,
  saldoDevedorPropina,
  servicos,
  historico,
  totalPago,
}: {
  meses: Mes[]
  anoLetivo: string
  pagos: number
  pendentes: number
  rejeitados: number
  emFalta: number
  classeNome: string
  valorPropina: number
  saldoDevedorPropina: number
  servicos: ServicoComEstado[]
  historico: HistoricoItem[]
  totalPago: number
}) {
  const [filtro, setFiltro] = useState<'todos' | 'pagos' | 'pendentes' | 'falta'>(
    'todos'
  )

  const total = meses.length
  const percentagem = total > 0 ? Math.round((pagos / total) * 100) : 0

  const mesesFiltrados = useMemo(() => {
    if (filtro === 'todos') return meses
    if (filtro === 'pagos') return meses.filter((m) => m.status === 'pago')
    if (filtro === 'pendentes')
      return meses.filter((m) => m.status === 'pendente')
    return meses.filter((m) => m.status === 'falta')
  }, [meses, filtro])

  const servicosPagos = servicos.filter((s) => s.estado === 'pago')
  const servicosPendentes = servicos.filter(
    (s) => s.estado === 'pendente' || s.estado === 'rejeitado'
  )
  const servicosNaoPagos = servicos.filter((s) => s.estado === 'nao_pago')

  const emDia = emFalta === 0 && rejeitados === 0
  const temPendentes = pendentes > 0

  return (
    <div className="mt-4 space-y-6">
      {/* BANNER DE SITUAÇÃO */}
      <div
        className={`rounded-2xl p-6 border-2 ${
          emDia
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
            : temPendentes
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
            : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0 ${
              emDia
                ? 'bg-green-500 text-white'
                : temPendentes
                ? 'bg-amber-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {emDia ? '✓' : temPendentes ? '⏳' : '⚠'}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`font-semibold text-lg ${
                emDia
                  ? 'text-green-900'
                  : temPendentes
                  ? 'text-amber-900'
                  : 'text-red-900'
              }`}
            >
              {emDia
                ? 'Situação regularizada'
                : temPendentes
                ? 'Comprovativos em análise'
                : 'Existem pagamentos em falta'}
            </p>
            <p
              className={`text-sm mt-0.5 ${
                emDia
                  ? 'text-green-700'
                  : temPendentes
                  ? 'text-amber-700'
                  : 'text-red-700'
              }`}
            >
              {emDia
                ? `Todas as propinas do ano letivo ${anoLetivo} estão em ordem.`
                : temPendentes
                ? 'A secretaria está a analisar os comprovativos enviados.'
                : `Faltam ${emFalta} mês${emFalta !== 1 ? 'es' : ''} de propina.`}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Propinas pagas</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">
            {pagos}
            <span className="text-sm text-gray-400 font-normal">/{total}</span>
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Em falta</p>
          <p className="mt-1 text-2xl font-semibold text-red-700">{emFalta}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Serviços pagos</p>
          <p className="mt-1 text-2xl font-semibold text-blue-700">
            {servicosPagos.length}
            <span className="text-sm text-gray-400 font-normal">
              /{servicos.length}
            </span>
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 text-white">
          <p className="text-xs opacity-90">Total pago</p>
          <p className="mt-1 text-2xl font-bold">
            {totalPago.toLocaleString('pt-PT')}
          </p>
          <p className="text-xs opacity-80 mt-0.5">Kz</p>
        </div>
      </div>

      {/* BARRA DE PROPINA */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Propina mensal · {classeNome}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {valorPropina > 0
                ? `${valorPropina.toLocaleString('pt-PT')} Kz por mês`
                : 'Preço não definido'}
            </p>
          </div>
          {saldoDevedorPropina > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Saldo a pagar</p>
              <p className="text-lg font-semibold text-red-700">
                {saldoDevedorPropina.toLocaleString('pt-PT')} Kz
              </p>
            </div>
          )}
        </div>

        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
            style={{ width: `${percentagem}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <span className="text-green-700">✓ {pagos} pagos</span>
          {pendentes > 0 && (
            <span className="text-amber-700">⏳ {pendentes} em análise</span>
          )}
          {rejeitados > 0 && (
            <span className="text-red-700">✗ {rejeitados} rejeitados</span>
          )}
          <span className="text-gray-500">· {emFalta} em falta</span>
        </div>
      </div>

      {/* GRELHA DE MESES */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-900">
            Propinas por mês
          </h2>
          <div className="flex gap-1">
            {(['todos', 'pagos', 'pendentes', 'falta'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                  filtro === f
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f === 'todos'
                  ? 'Todos'
                  : f === 'pagos'
                  ? 'Pagos'
                  : f === 'pendentes'
                  ? 'Em análise'
                  : 'Em falta'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-gray-100">
          {mesesFiltrados.map((m) => {
            const cores =
              m.status === 'pago'
                ? {
                    bg: 'bg-green-50 hover:bg-green-100',
                    badge: 'bg-green-500 text-white',
                    label: '✓ Pago',
                    textoCor: 'text-green-900',
                  }
                : m.status === 'pendente'
                ? {
                    bg: 'bg-amber-50 hover:bg-amber-100',
                    badge: 'bg-amber-500 text-white',
                    label: '⏳ Em análise',
                    textoCor: 'text-amber-900',
                  }
                : m.status === 'rejeitado'
                ? {
                    bg: 'bg-red-50 hover:bg-red-100',
                    badge: 'bg-red-500 text-white',
                    label: '✗ Rejeitado',
                    textoCor: 'text-red-900',
                  }
                : {
                    bg: 'bg-white hover:bg-gray-50',
                    badge: 'bg-gray-200 text-gray-600',
                    label: 'Sem comprovativo',
                    textoCor: 'text-gray-700',
                  }

            return (
              <Link
                key={m.chave}
                href={`/dashboard/comprovativos/novo?mes=${m.chave}`}
                className={`${cores.bg} p-4 transition group`}
              >
                <p className={`text-sm font-medium ${cores.textoCor}`}>
                  {m.label}
                </p>
                <span
                  className={`mt-2 inline-block text-[10px] font-semibold rounded-full px-2 py-0.5 ${cores.badge}`}
                >
                  {cores.label}
                </span>
                {m.status === 'falta' && (
                  <p className="mt-1 text-[10px] text-gray-400 group-hover:text-blue-600">
                    Enviar →
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* SERVIÇOS */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Outros serviços
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Matrícula, uniforme, certificado e outros
          </p>
        </div>

        {servicosPagos.length > 0 && (
          <div className="border-b border-gray-100">
            <p className="px-5 pt-4 pb-2 text-[10px] uppercase tracking-wider text-gray-400 font-medium">
              ✓ Pagos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
              {servicosPagos.map((s) => (
                <div
                  key={s.id}
                  className="bg-green-50 hover:bg-green-100 p-4 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-green-900 flex items-center gap-1.5">
                        <span>{iconeServico(s.codigo)}</span>
                        {s.nome}
                        {s.variacao && (
                          <span className="text-green-700 text-xs">
                            · {tituloVariacao(s.variacao)}
                          </span>
                        )}
                      </p>
                      {s.data_pagamento && (
                        <p className="text-[10px] text-green-700 mt-0.5">
                          {new Date(s.data_pagamento).toLocaleDateString(
                            'pt-PT'
                          )}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-green-900">
                        {s.valor_pago?.toLocaleString('pt-PT')} Kz
                      </p>
                      {s.numero_recibo && (
                        <p className="text-[10px] text-green-700 font-mono mt-0.5">
                          {s.numero_recibo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {servicosPendentes.length > 0 && (
          <div className="border-b border-gray-100">
            <p className="px-5 pt-4 pb-2 text-[10px] uppercase tracking-wider text-gray-400 font-medium">
              Em análise / Rejeitados
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
              {servicosPendentes.map((s) => {
                const pendente = s.estado === 'pendente'
                return (
                  <div
                    key={s.id}
                    className={`${pendente ? 'bg-amber-50' : 'bg-red-50'} p-4`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium flex items-center gap-1.5 ${
                            pendente ? 'text-amber-900' : 'text-red-900'
                          }`}
                        >
                          <span>{iconeServico(s.codigo)}</span>
                          {s.nome}
                          {s.variacao && (
                            <span
                              className={
                                pendente ? 'text-amber-700' : 'text-red-700'
                              }
                            >
                              · {tituloVariacao(s.variacao)}
                            </span>
                          )}
                        </p>
                        <p
                          className={`text-[10px] mt-0.5 ${
                            pendente ? 'text-amber-700' : 'text-red-700'
                          }`}
                        >
                          {pendente ? '⏳ Aguarda validação' : '✗ Reenviar'}
                        </p>
                      </div>
                      <Link
                        href="/dashboard/comprovativos"
                        className={`text-[11px] underline shrink-0 ${
                          pendente ? 'text-amber-800' : 'text-red-800'
                        }`}
                      >
                        Ver →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {servicosNaoPagos.length > 0 && (
          <div>
            <p className="px-5 pt-4 pb-2 text-[10px] uppercase tracking-wider text-gray-400 font-medium">
              Por pagar
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
              {servicosNaoPagos.map((s) => (
                <Link
                  key={s.id}
                  href="/dashboard/comprovativos/novo"
                  className="bg-white hover:bg-gray-50 p-4 transition group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                        <span>{iconeServico(s.codigo)}</span>
                        {s.nome}
                      </p>
                      {s.descricao && (
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                          {s.descricao}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 group-hover:text-blue-600 shrink-0">
                      Pagar →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* HISTÓRICO */}
      {historico.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Histórico de pagamentos
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {historico.length} pagamento
                {historico.length !== 1 ? 's' : ''} aprovado
                {historico.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {historico.map((h) => (
              <div
                key={h.id}
                className="px-5 py-4 flex flex-wrap gap-4 items-center hover:bg-gray-50"
              >
                <div className="w-12 h-12 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-xl shrink-0">
                  {iconeServico(h.servico_codigo)}
                </div>

                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium text-gray-900">
                    {h.servico_nome}
                    {h.mes_referencia && (
                      <span className="text-gray-500">
                        {' '}
                        · {formatarMes(h.mes_referencia)}
                      </span>
                    )}
                    {h.variacao && (
                      <span className="text-gray-500">
                        {' '}
                        · {tituloVariacao(h.variacao)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Recibo <span className="font-mono">{h.numero_recibo}</span>{' '}
                    · {new Date(h.criado_em).toLocaleDateString('pt-PT')}
                  </p>
                </div>

                <p className="text-lg font-bold text-gray-900">
                  {h.valor_total.toLocaleString('pt-PT')}{' '}
                  <span className="text-xs font-normal text-gray-500">Kz</span>
                </p>
              </div>
            ))}
          </div>

          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-gray-500 font-medium">
              Total pago
            </span>
            <span className="text-lg font-bold text-gray-900">
              {totalPago.toLocaleString('pt-PT')}{' '}
              <span className="text-xs font-normal text-gray-500">Kz</span>
            </span>
          </div>
        </div>
      )}

      {/* DADOS BANCÁRIOS */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
          🏦 Dados para pagamento
        </h2>
        <p className="mt-1 text-xs text-blue-800">
          Use estes dados para transferência ou depósito. Depois envie o
          comprovativo pelo portal.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-[10px] uppercase tracking-wide text-blue-700 font-medium">
              Banco
            </p>
            <p className="font-medium text-blue-900 mt-1">BAI</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-[10px] uppercase tracking-wide text-blue-700 font-medium">
              IBAN
            </p>
            <p className="font-mono text-xs text-blue-900 mt-1 break-all">
              AO06 0040 0000 5640 2025 1014 3
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-[10px] uppercase tracking-wide text-blue-700 font-medium">
              Titular
            </p>
            <p className="font-medium text-blue-900 mt-1">
              Escola Nlenda e Nlenda
            </p>
          </div>
        </div>
      </div>

      {/* CTA FINAL */}
      <div className="flex justify-center pt-2">
        <Link
          href="/dashboard/comprovativos/novo"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold transition shadow-lg shadow-blue-500/20"
        >
          📤 Enviar novo comprovativo
        </Link>
      </div>
    </div>
  )
}