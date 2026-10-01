'use client'

import { useState, useMemo } from 'react'

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

type FiltroTipo = 'dia' | 'semana' | 'mes' | 'ano' | 'todos'

function hojeISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function mesAtualISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function RelatoriosClient({
  pagamentos,
}: {
  pagamentos: Pagamento[]
}) {
  const [filtro, setFiltro] = useState<FiltroTipo>('dia')
  const [dataDia, setDataDia] = useState(hojeISO())
  const [mesRef, setMesRef] = useState(mesAtualISO())
  const [anoRef, setAnoRef] = useState(String(new Date().getFullYear()))
  const [aGerar, setAGerar] = useState(false)

  const filtrados = useMemo(() => {
    return pagamentos.filter((p) => {
      const d = new Date(p.criado_em)
      const ano = d.getFullYear()
      const mes = `${ano}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const dia = `${mes}-${String(d.getDate()).padStart(2, '0')}`

      if (filtro === 'dia') return dia === dataDia
      if (filtro === 'mes') return mes === mesRef
      if (filtro === 'ano') return String(ano) === anoRef

      if (filtro === 'semana') {
        const hoje = new Date()
        const diff = (hoje.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
        return diff >= 0 && diff < 7
      }
      return true
    })
  }, [pagamentos, filtro, dataDia, mesRef, anoRef])

  const resumo = useMemo(() => {
    const total = filtrados.reduce((s, p) => s + p.valor_total, 0)
    const fisico = filtrados
      .filter((p) => p.forma_pagamento === 'fisico')
      .reduce((s, p) => s + p.valor_total, 0)
    const banco = filtrados
      .filter((p) => p.forma_pagamento === 'banco')
      .reduce((s, p) => s + p.valor_total, 0)
    const alunos = new Set(filtrados.map((p) => p.aluno_id)).size
    const percentFisico = total > 0 ? Math.round((fisico / total) * 100) : 0
    const percentBanco = total > 0 ? Math.round((banco / total) * 100) : 0
    return {
      total,
      fisico,
      banco,
      alunos,
      recibos: filtrados.length,
      percentFisico,
      percentBanco,
    }
  }, [filtrados])

  const porClasse = useMemo(() => {
    const mapa = new Map<string, { total: number; alunos: Set<string>; n: number }>()
    for (const p of filtrados) {
      const chave = p.aluno_classe ?? 'Sem classe'
      if (!mapa.has(chave)) mapa.set(chave, { total: 0, alunos: new Set(), n: 0 })
      const g = mapa.get(chave)!
      g.total += p.valor_total
      g.n += 1
      if (p.aluno_id) g.alunos.add(p.aluno_id)
    }
    return Array.from(mapa.entries())
      .map(([classe, v]) => ({
        classe,
        total: v.total,
        alunos: v.alunos.size,
        recibos: v.n,
      }))
      .sort((a, b) => b.total - a.total)
  }, [filtrados])

  const porAluno = useMemo(() => {
    const mapa = new Map<
      string,
      { nome: string; classe: string | null; total: number; n: number }
    >()
    for (const p of filtrados) {
      const chave = p.aluno_id ?? p.aluno_nome
      if (!mapa.has(chave)) {
        mapa.set(chave, {
          nome: p.aluno_nome,
          classe: p.aluno_classe,
          total: 0,
          n: 0,
        })
      }
      const g = mapa.get(chave)!
      g.total += p.valor_total
      g.n += 1
    }
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total)
  }, [filtrados])

  const porServico = useMemo(() => {
    const mapa = new Map<string, { nome: string; total: number; n: number }>()
    for (const p of filtrados) {
      const chave = p.servico_codigo ?? 'outro'
      if (!mapa.has(chave)) {
        mapa.set(chave, { nome: p.servico_nome, total: 0, n: 0 })
      }
      const g = mapa.get(chave)!
      g.total += p.valor_total
      g.n += 1
    }
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total)
  }, [filtrados])

  function descricaoPeriodo(): string {
    if (filtro === 'dia') return dataDia
    if (filtro === 'mes') return mesRef
    if (filtro === 'ano') return anoRef
    if (filtro === 'semana') return 'Últimos 7 dias'
    return 'Todo o histórico'
  }

  function descricaoPeriodoArquivo(): string {
    if (filtro === 'dia') return dataDia
    if (filtro === 'mes') return mesRef
    if (filtro === 'ano') return anoRef
    if (filtro === 'semana') return 'semana'
    return 'completo'
  }

  async function baixarRelatorio() {
    setAGerar(true)
    try {
      const { gerarRelatorioPDF } = await import(
        '@/lib/relatorios/gerar-relatorio-pdf'
      )

      const pdfBytes = await gerarRelatorioPDF({
        periodo: descricaoPeriodo(),
        dataGeracao: new Date(),
        resumo,
        porClasse: porClasse.map((c) => ({
          nome: c.classe,
          total: c.total,
          n: c.recibos,
          extra: c.alunos,
        })),
        porServico: porServico.map((s) => ({
          nome: s.nome,
          total: s.total,
          n: s.n,
        })),
        porAluno: porAluno.map((a) => ({
          nome: a.nome,
          total: a.total,
          n: a.n,
          extra: a.classe ?? '—',
        })),
        pagamentos: filtrados,
      })

      const blob = new Blob([new Uint8Array(pdfBytes)], {
        type: 'application/pdf',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `relatorio-${descricaoPeriodoArquivo()}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Erro ao gerar PDF:', e)
      alert('Erro ao gerar relatório PDF.')
    } finally {
      setAGerar(false)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Relatórios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Somatórios por dia, mês, classe, aluno e serviço.
          </p>
        </div>
        <button
          onClick={baixarRelatorio}
          disabled={filtrados.length === 0 || aGerar}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition shadow-sm"
        >
          {aGerar ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              A gerar…
            </>
          ) : (
            <>⬇ Baixar relatório PDF</>
          )}
        </button>
      </div>

      {/* FILTROS */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          {(
            [
              { key: 'dia', label: 'Por dia' },
              { key: 'semana', label: 'Últimos 7 dias' },
              { key: 'mes', label: 'Por mês' },
              { key: 'ano', label: 'Por ano' },
              { key: 'todos', label: 'Tudo' },
            ] as { key: FiltroTipo; label: string }[]
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                filtro === f.key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {filtro === 'dia' && (
            <input
              type="date"
              value={dataDia}
              onChange={(e) => setDataDia(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
            />
          )}
          {filtro === 'mes' && (
            <input
              type="month"
              value={mesRef}
              onChange={(e) => setMesRef(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
            />
          )}
          {filtro === 'ano' && (
            <select
              value={anoRef}
              onChange={(e) => setAnoRef(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          )}
          <span className="text-xs text-gray-500">
            {filtrados.length} pagamento{filtrados.length !== 1 ? 's' : ''}{' '}
            encontrado{filtrados.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 text-white">
          <p className="text-xs opacity-90">Total arrecadado</p>
          <p className="mt-1 text-2xl font-bold">
            {resumo.total.toLocaleString('pt-PT')}
          </p>
          <p className="text-xs opacity-80 mt-0.5">Kz</p>
        </div>
        <div className="bg-white border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-700">💵 Físico</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">
            {resumo.fisico.toLocaleString('pt-PT')}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {resumo.percentFisico}% do total
          </p>
        </div>
        <div className="bg-white border border-violet-200 rounded-xl p-4">
          <p className="text-xs text-violet-700">🏦 Banco</p>
          <p className="mt-1 text-2xl font-semibold text-violet-700">
            {resumo.banco.toLocaleString('pt-PT')}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {resumo.percentBanco}% do total
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Recibos emitidos</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {resumo.recibos}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {resumo.alunos} aluno{resumo.alunos !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* BARRA DE COMPOSIÇÃO */}
      {resumo.total > 0 && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span>Composição por forma de pagamento</span>
            <span className="font-semibold text-gray-900">
              {resumo.total.toLocaleString('pt-PT')} Kz
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
              style={{ width: `${resumo.percentFisico}%` }}
              title={`Físico · ${resumo.percentFisico}%`}
            />
            <div
              className="h-full bg-gradient-to-r from-violet-400 to-violet-500 transition-all duration-500"
              style={{ width: `${resumo.percentBanco}%` }}
              title={`Banco · ${resumo.percentBanco}%`}
            />
          </div>
          <div className="mt-2 flex gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-green-500"></span>
              Físico
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-violet-500"></span>
              Banco
            </span>
          </div>
        </div>
      )}

      {/* POR CLASSE + POR SERVIÇO */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Por classe</h2>
          </div>
          {porClasse.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              Sem dados no período.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">Classe</th>
                  <th className="text-center px-3 py-2 font-medium">Alunos</th>
                  <th className="text-right px-5 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {porClasse.map((c) => (
                  <tr key={c.classe} className="hover:bg-gray-50">
                    <td className="px-5 py-2.5 text-gray-900">{c.classe}</td>
                    <td className="px-3 py-2.5 text-center text-gray-500">
                      {c.alunos}
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-900">
                      {c.total.toLocaleString('pt-PT')} Kz
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Por serviço</h2>
          </div>
          {porServico.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              Sem dados no período.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">Serviço</th>
                  <th className="text-center px-3 py-2 font-medium">Qtd</th>
                  <th className="text-right px-5 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {porServico.map((s) => (
                  <tr key={s.nome} className="hover:bg-gray-50">
                    <td className="px-5 py-2.5 text-gray-900">{s.nome}</td>
                    <td className="px-3 py-2.5 text-center text-gray-500">
                      {s.n}
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-900">
                      {s.total.toLocaleString('pt-PT')} Kz
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* POR ALUNO */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Por aluno</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Total pago por cada aluno no período
            </p>
          </div>
          <span className="text-xs text-gray-500">
            {porAluno.length} aluno{porAluno.length !== 1 ? 's' : ''}
          </span>
        </div>
        {porAluno.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">
            Sem dados no período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-2 font-medium">Aluno</th>
                  <th className="text-left px-5 py-2 font-medium">Classe</th>
                  <th className="text-center px-5 py-2 font-medium">Recibos</th>
                  <th className="text-right px-5 py-2 font-medium">Total pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {porAluno.map((a) => (
                  <tr key={a.nome} className="hover:bg-gray-50">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold flex items-center justify-center shrink-0">
                          {a.nome
                            .split(' ')
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()}
                        </div>
                        <span className="text-gray-900 truncate">{a.nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-gray-500">
                      {a.classe ?? '—'}
                    </td>
                    <td className="px-5 py-2.5 text-center text-gray-500">
                      {a.n}
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-900">
                      {a.total.toLocaleString('pt-PT')} Kz
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td
                    colSpan={3}
                    className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase"
                  >
                    Total
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900">
                    {resumo.total.toLocaleString('pt-PT')} Kz
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}