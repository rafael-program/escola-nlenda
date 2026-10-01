'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'

type Aluno = {
  id: string
  full_name: string
  class_id: number | null
  classe: string | null
}

type Estado = {
  student_id: string
  month: string
  is_paid: boolean
  proof_id: number | null
}

type Comprovativo = {
  id: number
  student_id: string
  month: string
  status: 'pending' | 'approved' | 'rejected'
}

type Classe = { id: number; name: string }

type PagamentoServico = {
  student_id: string
  valor_total: number
  mes_referencia: string | null
}

// Meses do ano letivo: Set a Jul
const MESES = [
  { key: '09', label: 'Set' },
  { key: '10', label: 'Out' },
  { key: '11', label: 'Nov' },
  { key: '12', label: 'Dez' },
  { key: '01', label: 'Jan' },
  { key: '02', label: 'Fev' },
  { key: '03', label: 'Mar' },
  { key: '04', label: 'Abr' },
  { key: '05', label: 'Mai' },
  { key: '06', label: 'Jun' },
  { key: '07', label: 'Jul' },
]

type EstadoCelula = 'pago' | 'pendente' | 'rejeitado' | 'falta'

export default function PagamentosClient({
  alunos,
  estados,
  comprovativos,
  classes,
  pagamentosServico,
}: {
  alunos: Aluno[]
  estados: Estado[]
  comprovativos: Comprovativo[]
  classes: Classe[]
  pagamentosServico: PagamentoServico[]
}) {
  const [anoLetivo, setAnoLetivo] = useState('2026')
  const [filtroClasse, setFiltroClasse] = useState<string>('')
  const [busca, setBusca] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<
    'todos' | 'regulares' | 'em_divida'
  >('todos')

  // Indexação rápida
  const mapaEstados = useMemo(() => {
    const m = new Map<string, Estado>()
    for (const e of estados) m.set(`${e.student_id}|${e.month}`, e)
    return m
  }, [estados])

  const mapaComprovativos = useMemo(() => {
    const m = new Map<string, Comprovativo>()
    for (const c of comprovativos) m.set(`${c.student_id}|${c.month}`, c)
    return m
  }, [comprovativos])

  // Total pago por aluno (soma de todos os pagamentos de serviço)
  const totalPagoPorAluno = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of pagamentosServico) {
      m.set(p.student_id, (m.get(p.student_id) ?? 0) + p.valor_total)
    }
    return m
  }, [pagamentosServico])

  const getEstado = useCallback(
    (alunoId: string, mes: string): EstadoCelula => {
      const chave = `${alunoId}|${anoLetivo}-${mes}`
      const est = mapaEstados.get(chave)
      const comp = mapaComprovativos.get(chave)

      if (est?.is_paid) return 'pago'
      if (comp?.status === 'approved') return 'pago'
      if (comp?.status === 'pending') return 'pendente'
      if (comp?.status === 'rejected') return 'rejeitado'
      return 'falta'
    },
    [anoLetivo, mapaEstados, mapaComprovativos]
  )

  // Alunos filtrados + info extra
  const alunosComEstado = useMemo(() => {
    return alunos.map((a) => {
      const pagos = MESES.filter((m) => getEstado(a.id, m.key) === 'pago').length
      const total = totalPagoPorAluno.get(a.id) ?? 0
      const regular = pagos === MESES.length

      return { ...a, pagos, total, regular }
    })
  }, [alunos, getEstado, totalPagoPorAluno])

  const alunosFiltrados = useMemo(() => {
    let lista = alunosComEstado

    if (filtroClasse)
      lista = lista.filter((a) => String(a.class_id) === filtroClasse)

    if (filtroEstado === 'regulares') lista = lista.filter((a) => a.regular)
    else if (filtroEstado === 'em_divida') lista = lista.filter((a) => !a.regular)

    if (busca.trim()) {
      const q = busca.toLowerCase()
      lista = lista.filter((a) => a.full_name.toLowerCase().includes(q))
    }
    return lista
  }, [alunosComEstado, filtroClasse, filtroEstado, busca])

  // Estatísticas
  const stats = useMemo(() => {
    let pagos = 0
    let pendentes = 0
    let faltas = 0
    let rejeitados = 0

    for (const a of alunosFiltrados) {
      for (const m of MESES) {
        const e = getEstado(a.id, m.key)
        if (e === 'pago') pagos++
        else if (e === 'pendente') pendentes++
        else if (e === 'rejeitado') rejeitados++
        else faltas++
      }
    }

    const total = alunosFiltrados.length * MESES.length
    const taxa = total > 0 ? Math.round((pagos / total) * 100) : 0
    const totalArrecadado = alunosFiltrados.reduce((s, a) => s + a.total, 0)
    const regulares = alunosFiltrados.filter((a) => a.regular).length
    const emDivida = alunosFiltrados.length - regulares

    return {
      pagos,
      pendentes,
      faltas,
      rejeitados,
      total,
      taxa,
      totalArrecadado,
      regulares,
      emDivida,
    }
  }, [alunosFiltrados, getEstado])

  // Exportar CSV
  function exportarCSV() {
    const linhas: string[][] = [
      ['Aluno', 'Classe', 'Meses Pagos', 'Total Pago (Kz)', 'Estado', ...MESES.map((m) => m.label)],
    ]

    for (const a of alunosFiltrados) {
      const mesEstados = MESES.map((m) => {
        const e = getEstado(a.id, m.key)
        return e === 'pago'
          ? 'Pago'
          : e === 'pendente'
          ? 'Em análise'
          : e === 'rejeitado'
          ? 'Rejeitado'
          : '—'
      })

      linhas.push([
        a.full_name,
        a.classe ?? '—',
        String(a.pagos),
        String(a.total),
        a.regular ? 'Regular' : 'Em dívida',
        ...mesEstados,
      ])
    }

    const csv = linhas
      .map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pagamentos-${anoLetivo}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pagamentos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Estado dos pagamentos por aluno e por mês.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportarCSV}
            className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium transition"
          >
            ⬇ Exportar CSV
          </button>
          <Link
            href="/secretario/comprovativos"
            className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
          >
            Comprovativos →
          </Link>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Alunos regulares</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">
            {stats.regulares}
            <span className="text-sm text-gray-400 font-normal">
              /{alunosFiltrados.length}
            </span>
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Alunos em dívida</p>
          <p className="mt-1 text-2xl font-semibold text-red-700">
            {stats.emDivida}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Pendentes</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">
            {stats.pendentes}
          </p>
        </div>
        <div className="bg-white border border-blue-200 bg-blue-50/40 rounded-xl p-4">
          <p className="text-xs text-blue-700">Total arrecadado</p>
          <p className="mt-1 text-lg font-semibold text-blue-700">
            {stats.totalArrecadado.toLocaleString('pt-PT')}
            <span className="text-xs font-normal"> Kz</span>
          </p>
        </div>
      </div>

      {/* BARRA DE PROGRESSO GLOBAL */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Taxa de pagamento global</span>
          <span className="font-semibold text-gray-900">{stats.taxa}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
            style={{ width: `${stats.taxa}%` }}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <span className="text-green-700">✓ {stats.pagos} pagos</span>
          <span className="text-amber-700">⏳ {stats.pendentes} pendentes</span>
          <span className="text-red-700">✗ {stats.rejeitados} rejeitados</span>
          <span className="text-gray-500">· {stats.faltas} em falta</span>
        </div>
      </div>

      {/* FILTROS */}
      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 flex-wrap">
          {(
            [
              { key: 'todos', label: 'Todos' },
              { key: 'regulares', label: '✓ Regulares' },
              { key: 'em_divida', label: '⚠ Em dívida' },
            ] as { key: typeof filtroEstado; label: string }[]
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                filtroEstado === f.key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Procurar aluno…"
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
        />

        <select
          value={filtroClasse}
          onChange={(e) => setFiltroClasse(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
        >
          <option value="">Todas as classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={anoLetivo}
          onChange={(e) => setAnoLetivo(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
        >
          <option value="2025">2025 / 2026</option>
          <option value="2026">2026 / 2027</option>
        </select>
      </div>

      {/* LEGENDA */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
        <Legenda cor="bg-green-500" label="Pago" />
        <Legenda cor="bg-amber-500" label="Pendente" />
        <Legenda cor="bg-red-500" label="Rejeitado" />
        <Legenda cor="bg-gray-200" label="Sem comprovativo" />
      </div>

      {/* TABELA MATRIZ */}
      <div className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide sticky left-0 bg-gray-50 z-10 min-w-[220px]">
                  Aluno
                </th>
                {MESES.map((m) => (
                  <th
                    key={m.key}
                    className="text-center px-2 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-12"
                  >
                    {m.label}
                  </th>
                ))}
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alunosFiltrados.length === 0 && (
                <tr>
                  <td
                    colSpan={MESES.length + 2}
                    className="px-4 py-10 text-center text-gray-400 text-sm"
                  >
                    Nenhum aluno corresponde aos filtros.
                  </td>
                </tr>
              )}
              {alunosFiltrados.map((a) => (
                <tr
                  key={a.id}
                  className={`hover:bg-gray-50 ${
                    !a.regular ? 'bg-red-50/20' : ''
                  }`}
                >
                  <td className="px-4 py-2 sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full text-[10px] font-semibold flex items-center justify-center shrink-0 ${
                          a.regular
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {a.full_name
                          .split(' ')
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {a.full_name}
                        </p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                          {a.classe ?? '—'}
                          {!a.regular && (
                            <span className="text-red-600 font-medium">
                              · em dívida
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>

                  {MESES.map((m) => {
                    const estado = getEstado(a.id, m.key)
                    const mes = `${anoLetivo}-${m.key}`
                    const comp = mapaComprovativos.get(`${a.id}|${mes}`)
                    return (
                      <td key={m.key} className="text-center px-1 py-2">
                        <Celula estado={estado} comprovativoId={comp?.id} />
                      </td>
                    )
                  })}

                  <td className="text-center px-4 py-2">
                    <p className="text-xs font-semibold text-gray-900">
                      {a.pagos}/{MESES.length}
                    </p>
                    {a.total > 0 && (
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {a.total.toLocaleString('pt-PT')} Kz
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {alunosFiltrados.length > 0 && (
        <p className="mt-3 text-xs text-gray-400 text-center">
          {alunosFiltrados.length} aluno
          {alunosFiltrados.length !== 1 ? 's' : ''} · {MESES.length} meses do
          ano letivo {anoLetivo}/{Number(anoLetivo) + 1}
        </p>
      )}
    </div>
  )
}

/* ---------- Auxiliares ---------- */

function Legenda({ cor, label }: { cor: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded ${cor}`}></span>
      {label}
    </span>
  )
}

function Celula({
  estado,
  comprovativoId,
}: {
  estado: EstadoCelula
  comprovativoId?: number
}) {
  const estilos: Record<EstadoCelula, string> = {
    pago: 'bg-green-500 hover:bg-green-600 text-white',
    pendente: 'bg-amber-500 hover:bg-amber-600 text-white',
    rejeitado: 'bg-red-500 hover:bg-red-600 text-white',
    falta: 'bg-gray-100 text-gray-300 hover:bg-gray-200',
  }
  const simbolos: Record<EstadoCelula, string> = {
    pago: '✓',
    pendente: '…',
    rejeitado: '✗',
    falta: '·',
  }

  if (estado === 'pago' || estado === 'pendente' || estado === 'rejeitado') {
    return (
      <Link
        href={
          comprovativoId
            ? `/secretario/comprovativos?focus=${comprovativoId}`
            : '/secretario/comprovativos'
        }
        className={`w-7 h-7 rounded inline-flex items-center justify-center text-xs font-bold transition ${estilos[estado]}`}
        title={
          estado === 'pago'
            ? 'Pago'
            : estado === 'pendente'
            ? 'Pendente de aprovação'
            : 'Rejeitado'
        }
      >
        {simbolos[estado]}
      </Link>
    )
  }

  return (
    <span
      className={`w-7 h-7 rounded inline-flex items-center justify-center text-xs transition ${estilos.falta}`}
      title="Sem comprovativo"
    >
      {simbolos.falta}
    </span>
  )
}