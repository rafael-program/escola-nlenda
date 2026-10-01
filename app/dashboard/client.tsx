'use client'

import { useMemo } from 'react'
import Link from 'next/link'

type Aluno = {
  id: string
  full_name: string
  birth_date: string | null
  telefone_pai: string | null
  nome_pai: string | null
  classe: string | null
  turma: string | null
}

type Estado = {
  month: string
  is_paid: boolean
  proof_id: number | null
  updated_at: string | null
}

type Comprovativo = {
  id: number
  month: string | null
  status: 'pending' | 'approved' | 'rejected'
  file_url: string
  created_at: string
  rejection_reason: string | null
  valor_declarado: number | null
  variacao: string | null
  servico_codigo: string | null
  servico_nome: string | null
}

type Recibo = {
  month: string | null
  numero: string
  file_url: string
  emitido_em: string
}

type Nota = {
  periodo: string
  valor: number | null
  disciplina: string
}

type Boletim = {
  periodo: string
  emitido_em: string
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

function formatarMes(iso: string): string {
  const partes = iso.split('-')
  const ano = partes[0]
  const mes = partes[1]
  return `${MESES_LABEL[mes] ?? mes} ${ano}`
}

function tituloComprovativo(c: Comprovativo): string {
  if (c.servico_codigo === 'propina' && c.month) {
    return `Propina · ${formatarMes(c.month)}`
  }
  if (c.servico_nome) {
    return c.variacao
      ? `${c.servico_nome} · ${
          c.variacao.charAt(0).toUpperCase() + c.variacao.slice(1)
        }`
      : c.servico_nome
  }
  return c.month ? formatarMes(c.month) : 'Comprovativo'
}

export default function DashboardClient({
  aluno,
  estados,
  comprovativos,
  recibos,
  notas,
  boletins,
}: {
  aluno: Aluno
  estados: Estado[]
  comprovativos: Comprovativo[]
  recibos: Recibo[]
  notas: Nota[]
  boletins: Boletim[]
}) {
  // ─────────────────────────────────────────────────────────
  // RESUMO
  // ─────────────────────────────────────────────────────────
  const resumo = useMemo(() => {
    const pagos = estados.filter((e) => e.is_paid).length
    const pendentes = comprovativos.filter((c) => c.status === 'pending').length
    const rejeitados = comprovativos.filter(
      (c) => c.status === 'rejected'
    ).length
    return { pagos, pendentes, rejeitados }
  }, [estados, comprovativos])

  // ─────────────────────────────────────────────────────────
  // MAPA DE RECIBOS POR MÊS
  // ─────────────────────────────────────────────────────────
  const mapaRecibos = useMemo(() => {
    const m = new Map<string, Recibo>()
    for (const r of recibos) {
      if (r.month) m.set(r.month, r)
    }
    return m
  }, [recibos])

  // ─────────────────────────────────────────────────────────
  // NOTAS AGRUPADAS POR PERÍODO
  // ─────────────────────────────────────────────────────────
  const notasPorPeriodo = useMemo(() => {
    const mapa = new Map<string, Nota[]>()
    for (const n of notas) {
      if (!mapa.has(n.periodo)) mapa.set(n.periodo, [])
      mapa.get(n.periodo)!.push(n)
    }
    return Array.from(mapa.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 2)
  }, [notas])

  // ─────────────────────────────────────────────────────────
  // ALERTA PRINCIPAL
  // ─────────────────────────────────────────────────────────
  const alerta = useMemo(() => {
    const rejeitado = comprovativos.find((c) => c.status === 'rejected')
    if (rejeitado) return { tipo: 'rejeitado' as const, comp: rejeitado }
    const pendente = comprovativos.find((c) => c.status === 'pending')
    if (pendente) return { tipo: 'pendente' as const, comp: pendente }
    return null
  }, [comprovativos])

  // ─────────────────────────────────────────────────────────
  // ÚLTIMOS 4 COMPROVATIVOS
  // ─────────────────────────────────────────────────────────
  const ultimosComprovativos = useMemo(
    () => comprovativos.slice(0, 4),
    [comprovativos]
  )

  function mediaPeriodo(itens: Nota[]): string {
    const vals = itens
      .filter((n) => n.valor !== null)
      .map((n) => n.valor as number)
    if (vals.length === 0) return '—'
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* BOAS-VINDAS */}
      <h1 className="text-2xl font-semibold text-gray-900">
        Olá, {aluno.full_name.split(' ')[0]}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Aqui pode consultar as notas, enviar comprovativos e acompanhar a sua
        situação financeira.
      </p>

      {/* ALERTA */}
      {alerta && (
        <div
          className={`mt-6 rounded-xl border p-5 flex flex-wrap gap-4 items-start ${
            alerta.tipo === 'rejeitado'
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex-1 min-w-[200px]">
            <p
              className={`text-xs font-semibold uppercase tracking-wide ${
                alerta.tipo === 'rejeitado' ? 'text-red-700' : 'text-amber-700'
              }`}
            >
              {alerta.tipo === 'rejeitado'
                ? 'Comprovativo rejeitado'
                : 'Comprovativo em análise'}
            </p>
            <p
              className={`mt-1 text-sm ${
                alerta.tipo === 'rejeitado' ? 'text-red-900' : 'text-amber-900'
              }`}
            >
              <strong>{tituloComprovativo(alerta.comp)}</strong>
              {alerta.tipo === 'rejeitado' && alerta.comp.rejection_reason && (
                <>
                  {' '}
                  — motivo: {alerta.comp.rejection_reason}. Por favor, envie
                  novamente.
                </>
              )}
              {alerta.tipo === 'pendente' &&
                ' — aguarda aprovação da secretaria.'}
            </p>
          </div>
          {alerta.tipo === 'rejeitado' && (
            <Link
              href="/dashboard/comprovativos/novo"
              className="text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition"
            >
              Enviar novo
            </Link>
          )}
        </div>
      )}

      {/* RESUMO */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ResumoCard
          label="Meses pagos"
          valor={resumo.pagos}
          cor="green"
          href="/dashboard/pagamentos"
        />
        <ResumoCard
          label="Em análise"
          valor={resumo.pendentes}
          cor="amber"
          href="/dashboard/comprovativos"
        />
        <ResumoCard
          label="Rejeitados"
          valor={resumo.rejeitados}
          cor="red"
          href="/dashboard/comprovativos"
        />
      </div>

      {/* AÇÕES RÁPIDAS */}
      <h2 className="mt-10 text-sm font-semibold text-gray-900 uppercase tracking-wide">
        Ações rápidas
      </h2>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
        <AcaoCard
          href="/dashboard/comprovativos/novo"
          titulo="Enviar comprovativo"
          descricao="Anexe a foto ou PDF de qualquer pagamento à escola."
          cor="blue"
        />
        <AcaoCard
          href="/dashboard/notas"
          titulo="Ver notas"
          descricao="Consulte o boletim dos períodos publicados."
          cor="green"
        />
        <AcaoCard
          href="/dashboard/pagamentos"
          titulo="Estado dos pagamentos"
          descricao="Veja os meses pagos e em falta."
          cor="gray"
        />
      </div>

      {/* ÚLTIMOS COMPROVATIVOS */}
      <h2 className="mt-10 text-sm font-semibold text-gray-900 uppercase tracking-wide">
        Últimos comprovativos
      </h2>
      {ultimosComprovativos.length === 0 ? (
        <div className="mt-3 bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">
            Ainda não enviou nenhum comprovativo.
          </p>
          <Link
            href="/dashboard/comprovativos/novo"
            className="mt-4 inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            Enviar o primeiro
          </Link>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ultimosComprovativos.map((c) => {
            const reciboDoMes = c.month ? mapaRecibos.get(c.month) : null

            const cores =
              c.status === 'approved'
                ? {
                    bg: 'bg-green-50',
                    border: 'border-green-200',
                    icon: 'bg-green-500',
                    text: 'text-green-800',
                    label: 'Aprovado',
                  }
                : c.status === 'pending'
                ? {
                    bg: 'bg-amber-50',
                    border: 'border-amber-200',
                    icon: 'bg-amber-500',
                    text: 'text-amber-800',
                    label: 'Em análise',
                  }
                : {
                    bg: 'bg-red-50',
                    border: 'border-red-200',
                    icon: 'bg-red-500',
                    text: 'text-red-800',
                    label: 'Rejeitado',
                  }

            return (
              <div
                key={c.id}
                className={`${cores.bg} ${cores.border} border rounded-xl p-4`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`${cores.icon} w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0`}
                  >
                    <span className="text-xs font-semibold">
                      {c.servico_codigo === 'propina' && c.month
                        ? c.month.split('-')[1] +
                          '/' +
                          c.month.split('-')[0].slice(2)
                        : (c.servico_nome ?? '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {tituloComprovativo(c)}
                      </p>
                      <span
                        className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${cores.text} bg-white/70`}
                      >
                        {cores.label}
                      </span>
                    </div>

                    {c.valor_declarado !== null && (
                      <p className="text-xs text-gray-700 mt-1">
                        {c.valor_declarado.toLocaleString('pt-PT')} Kz
                      </p>
                    )}

                    <p className="text-[10px] text-gray-500 mt-1">
                      {new Date(c.created_at).toLocaleDateString('pt-PT')}
                    </p>

                    {reciboDoMes && c.status === 'approved' && (
                      <Link
                        href="/dashboard/comprovativos"
                        className="text-[11px] text-green-700 hover:underline mt-1 inline-block"
                      >
                        Recibo {reciboDoMes.numero} →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {comprovativos.length > 4 && (
            <Link
              href="/dashboard/comprovativos"
              className="bg-white border border-dashed border-gray-300 rounded-xl p-4 flex items-center justify-center text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition"
            >
              Ver todos ({comprovativos.length}) →
            </Link>
          )}
        </div>
      )}

      {/* ÚLTIMAS NOTAS */}
      <h2 className="mt-10 text-sm font-semibold text-gray-900 uppercase tracking-wide">
        Últimas notas
      </h2>
      {notasPorPeriodo.length === 0 ? (
        <div className="mt-3 bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-400 text-sm">
          Ainda não há notas publicadas.
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {notasPorPeriodo.map(([periodo, itens]) => (
            <div
              key={periodo}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-medium text-gray-900">
                  {periodo.replace('-T', ' — ')}º Trimestre
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    Média:{' '}
                    <strong className="text-gray-900">
                      {mediaPeriodo(itens)}
                    </strong>
                  </span>
                  {boletins.some((b) => b.periodo === periodo) && (
                    <span className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
                      ✓ Boletim
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-gray-100">
                {itens.map((n, i) => (
                  <div key={i} className="bg-white p-4">
                    <p className="text-xs text-gray-500 truncate">
                      {n.disciplina}
                    </p>
                    <p
                      className={`mt-1 text-lg font-semibold ${
                        n.valor === null
                          ? 'text-gray-300'
                          : n.valor >= 14
                          ? 'text-green-700'
                          : n.valor >= 10
                          ? 'text-gray-900'
                          : 'text-red-700'
                      }`}
                    >
                      {n.valor !== null ? n.valor.toFixed(0) : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {notasPorPeriodo.length > 0 && (
            <Link
              href="/dashboard/notas"
              className="inline-block text-sm text-blue-600 hover:underline"
            >
              Ver todas as notas →
            </Link>
          )}
        </div>
      )}

      <p className="mt-10 text-xs text-gray-400 text-center">
        Escola Nlenda e Nlenda · Portal do aluno
      </p>
    </div>
  )
}

/* ---------- Auxiliares ---------- */

function ResumoCard({
  label,
  valor,
  cor,
  href,
}: {
  label: string
  valor: number
  cor: 'green' | 'amber' | 'red'
  href: string
}) {
  const cores: Record<string, string> = {
    green: 'text-green-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
  }
  return (
    <Link
      href={href}
      className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition"
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${cores[cor]}`}>{valor}</p>
    </Link>
  )
}

function AcaoCard({
  href,
  titulo,
  descricao,
  cor,
}: {
  href: string
  titulo: string
  descricao: string
  cor: 'blue' | 'green' | 'gray'
}) {
  const cores: Record<string, string> = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    gray: 'bg-gray-700 hover:bg-gray-800',
  }
  return (
    <Link
      href={href}
      className={`${cores[cor]} text-white rounded-xl p-5 transition block`}
    >
      <p className="font-semibold">{titulo}</p>
      <p className="mt-1 text-sm opacity-90 leading-relaxed">{descricao}</p>
    </Link>
  )
}