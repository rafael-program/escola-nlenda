'use client'

import { useState, useMemo } from 'react'
import { procurarAlunos, registarPagamento } from './actions'

type Servico = {
  id: number
  codigo: string
  nome: string
  tem_multa: boolean
  multa_percentual: number
  tem_urgencia: boolean
}

type Preco = {
  servico_id: number
  classe_id: number
  variacao: string | null
  valor: number
}

type Aluno = {
  id: string
  full_name: string
  nome_pai: string | null
  telefone_pai: string | null
  classe: string | null
  turma: string | null
  classe_id: number | null
}

type MesPago = { student_id: string; month: string }
type Mes = { key: string; label: string; curto: string }
type Opcao = { key: string; label: string }

const MESES: Mes[] = [
  { key: '09', label: 'Setembro', curto: 'Set' },
  { key: '10', label: 'Outubro', curto: 'Out' },
  { key: '11', label: 'Novembro', curto: 'Nov' },
  { key: '12', label: 'Dezembro', curto: 'Dez' },
  { key: '01', label: 'Janeiro', curto: 'Jan' },
  { key: '02', label: 'Fevereiro', curto: 'Fev' },
  { key: '03', label: 'Março', curto: 'Mar' },
  { key: '04', label: 'Abril', curto: 'Abr' },
  { key: '05', label: 'Maio', curto: 'Mai' },
  { key: '06', label: 'Junho', curto: 'Jun' },
  { key: '07', label: 'Julho', curto: 'Jul' },
]

const OPCOES_URGENCIA: Opcao[] = [
  { key: 'normal', label: 'Normal' },
  { key: 'urgente', label: 'Urgente' },
]

const OPCOES_UNIFORME: Opcao[] = [
  { key: 'completo', label: 'Completo' },
  { key: 'retalho', label: 'Retalho' },
]

/**
 * Verifica se um mês (formato "AAAA-MM") já está em atraso com multa.
 *
 * Regra: a multa só se aplica depois do dia 10 do mês seguinte.
 * Ex.: mês 2026-09 → tolerância até 10/10/2026; multa a partir de 11/10/2026.
 */
function mesTemMulta(chave: string, hoje: Date = new Date()): boolean {
  const [anoStr, mesStr] = chave.split('-')
  const ano = Number(anoStr)
  const mes = Number(mesStr)

  const mesSeguinte = mes === 12 ? 1 : mes + 1
  const anoSeguinte = mes === 12 ? ano + 1 : ano
  const dataLimite = new Date(
    anoSeguinte,
    mesSeguinte - 1,
    10,
    23,
    59,
    59,
    999
  )

  return hoje > dataLimite
}

function categoria(codigo: string): { icone: string; cor: string } {
  const mapa: Record<string, { icone: string; cor: string }> = {
    propina: { icone: '📅', cor: 'blue' },
    matricula: { icone: '📋', cor: 'green' },
    reconfirmacao: { icone: '🔄', cor: 'green' },
    declaracao: { icone: '📄', cor: 'violet' },
    certificado: { icone: '🎓', cor: 'violet' },
    boletim: { icone: '📊', cor: 'violet' },
    uniforme: { icone: '👕', cor: 'amber' },
  }
  return mapa[codigo] ?? { icone: '📦', cor: 'gray' }
}

function corServico(cor: string, ativo: boolean) {
  if (!ativo)
    return 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
  const mapa: Record<string, string> = {
    blue: 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-100',
    green:
      'border-green-600 bg-green-50 text-green-900 ring-2 ring-green-100',
    violet:
      'border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-100',
    amber:
      'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-100',
    gray: 'border-gray-600 bg-gray-50 text-gray-900 ring-2 ring-gray-100',
  }
  return mapa[cor] ?? mapa.gray
}

export default function CaixaClient({
  servicos,
  precos,
  mesesPagos,
}: {
  servicos: Servico[]
  precos: Preco[]
  mesesPagos: MesPago[]
}) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Aluno[]>([])
  const [procurando, setProcurando] = useState(false)
  const [aluno, setAluno] = useState<Aluno | null>(null)

  const [servicoId, setServicoId] = useState<number | null>(null)
  const [variacao, setVariacao] = useState<string | null>(null)
  const [mesesSel, setMesesSel] = useState<string[]>([])
  const [formaPagamento, setFormaPagamento] = useState<'fisico' | 'banco'>(
    'fisico'
  )
  const [banco, setBanco] = useState<string>('BAI')
  const [observacao, setObservacao] = useState('')

  const [aGravar, setAGravar] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState<{
    numero: string
    codigo: string
  } | null>(null)

  const servicoSelecionado = useMemo(
    () => servicos.find((s) => s.id === servicoId) ?? null,
    [servicoId, servicos]
  )

  const anoAtual = new Date().getFullYear()

  const mesesPagosDoAluno = useMemo(() => {
    if (!aluno) return new Set<string>()
    return new Set(
      mesesPagos.filter((m) => m.student_id === aluno.id).map((m) => m.month)
    )
  }, [aluno, mesesPagos])

  // Calcula valor localmente (instantâneo)
  const valorInfo = useMemo(() => {
    if (!aluno?.classe_id || !servicoSelecionado) return null

    if (servicoSelecionado.codigo === 'propina') {
      if (mesesSel.length === 0) return null

      const preco = precos.find(
        (p) =>
          p.servico_id === servicoSelecionado.id &&
          p.classe_id === aluno.classe_id &&
          (p.variacao ?? null) === null
      )
      if (!preco) return null

      const precoMensal = preco.valor
      const multaPercentual = servicoSelecionado.multa_percentual

      let valorMulta = 0
      const mesesComMulta: string[] = []

      for (const mes of mesesSel) {
        if (mesTemMulta(mes)) {
          valorMulta += (precoMensal * multaPercentual) / 100
          mesesComMulta.push(mes)
        }
      }

      const valorBase = precoMensal * mesesSel.length
      const valorTotal = Number((valorBase + valorMulta).toFixed(2))

      return {
        valorBase,
        valorMulta: Number(valorMulta.toFixed(2)),
        valorTotal,
        comMulta: mesesComMulta.length > 0,
        mesesComMulta,
        mesesCount: mesesSel.length,
      }
    }

    const preco = precos.find(
      (p) =>
        p.servico_id === servicoSelecionado.id &&
        p.classe_id === aluno.classe_id &&
        (p.variacao ?? null) === (variacao ?? null)
    )
    if (!preco) return null

    return {
      valorBase: preco.valor,
      valorMulta: 0,
      valorTotal: preco.valor,
      comMulta: false,
      mesesComMulta: [],
      mesesCount: 0,
    }
  }, [aluno, servicoSelecionado, variacao, mesesSel, precos])

  const prontoParaRegistar =
    !!aluno &&
    !!servicoSelecionado &&
    !!valorInfo &&
    (servicoSelecionado.codigo !== 'propina' || mesesSel.length > 0) &&
    (!servicoSelecionado.tem_urgencia || !!variacao) &&
    (servicoSelecionado.codigo !== 'uniforme' || !!variacao)

  async function handleProcurar() {
    setProcurando(true)
    setErro('')
    try {
      const r = await procurarAlunos(query)
      setResultados(r.alunos)
    } catch {
      setErro('Erro ao procurar alunos.')
    }
    setProcurando(false)
  }

  function selecionarAluno(a: Aluno) {
    setAluno(a)
    setResultados([])
    setQuery('')
    setServicoId(null)
    setVariacao(null)
    setMesesSel([])
  }

  function resetar() {
    setSucesso(null)
    setAluno(null)
    setServicoId(null)
    setVariacao(null)
    setMesesSel([])
    setObservacao('')
  }

  async function handleRegistar() {
    if (!prontoParaRegistar) return

    setAGravar(true)
    setErro('')

    const r = await registarPagamento({
      studentId: aluno!.id,
      servicoId: servicoSelecionado!.id,
      classeId: aluno!.classe_id!,
      variacao,
      mesesReferencia:
        servicoSelecionado?.codigo === 'propina' ? mesesSel : null,
      formaPagamento,
      banco: formaPagamento === 'banco' ? banco : null,
      observacao: observacao || null,
    })

    setAGravar(false)

    if ('erro' in r) {
      setErro(r.erro)
      return
    }

    setSucesso({ numero: r.numero, codigo: r.codigo })
    setTimeout(resetar, 8000)
  }

  function handleMudarServico(id: number) {
    setServicoId(id)
    setVariacao(null)
    setMesesSel([])
  }

  function toggleMes(chave: string) {
    setMesesSel((prev) =>
      prev.includes(chave) ? prev.filter((x) => x !== chave) : [...prev, chave]
    )
  }

  function selecionarTodosMesesDisponiveis() {
    const disponiveis = MESES.map((m) => {
      const mesNum = Number(m.key)
      const ano = mesNum >= 9 ? anoAtual : anoAtual + 1
      return `${ano}-${m.key}`
    }).filter((chave) => !mesesPagosDoAluno.has(chave))

    setMesesSel(disponiveis)
  }

  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Caixa
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Registe o pagamento presencial e emita o recibo.
          </p>
        </div>
      </div>

      {/* SUCESSO */}
      {sucesso && (
        <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 sm:p-6 flex items-start gap-3 sm:gap-4 animate-fade-in">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500 text-white flex items-center justify-center text-lg sm:text-xl shrink-0">
            ✓
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-semibold text-green-900">
              Pagamento registado com sucesso
            </p>
            <p className="mt-1 text-xs sm:text-sm text-green-700 break-words">
              Recibo <strong>{sucesso.numero}</strong> · Código{' '}
              <strong className="font-mono break-all">{sucesso.codigo}</strong>
            </p>
          </div>
          <button
            onClick={resetar}
            className="text-xs text-green-700 hover:text-green-900 underline shrink-0"
          >
            Novo
          </button>
        </div>
      )}

      {erro && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3 flex items-center gap-2">
          <span className="text-lg">⚠</span>
          <span className="min-w-0">{erro}</span>
        </div>
      )}

      {/* PASSO 1 — ALUNO */}
      <section className="mt-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <span
            className={`w-8 h-8 rounded-full text-sm font-semibold flex items-center justify-center shrink-0 ${
              aluno ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'
            }`}
          >
            {aluno ? '✓' : '1'}
          </span>
          <h2 className="text-sm font-semibold text-gray-900">
            Escolher aluno
          </h2>
          {aluno && (
            <button
              onClick={() => {
                setAluno(null)
                setServicoId(null)
                setVariacao(null)
                setMesesSel([])
              }}
              className="ml-auto text-xs text-gray-500 hover:text-blue-600"
            >
              Trocar aluno
            </button>
          )}
        </div>

        <div className="p-4 sm:p-6">
          {!aluno ? (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 min-w-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    🔍
                  </span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleProcurar()}
                    placeholder="Nome do aluno, nome do pai ou telefone…"
                    className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                  />
                </div>
                <button
                  onClick={handleProcurar}
                  disabled={procurando || query.length < 2}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition w-full sm:w-auto"
                >
                  {procurando ? 'A procurar…' : 'Procurar'}
                </button>
              </div>

              {resultados.length > 0 && (
                <div className="mt-4 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-80 overflow-y-auto animate-fade-in">
                  {resultados.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => selecionarAluno(a)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center shrink-0">
                        {a.full_name
                          .split(' ')
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {a.full_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {a.classe ?? '—'}
                          {a.turma ? ` / ${a.turma}` : ''}
                          {a.nome_pai ? ` · Pai: ${a.nome_pai}` : ''}
                          {a.telefone_pai ? ` · ${a.telefone_pai}` : ''}
                        </p>
                      </div>
                      <span className="text-gray-300">→</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-4 bg-blue-50 border border-blue-100 rounded-lg p-4 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center shrink-0">
                {aluno.full_name
                  .split(' ')
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">
                  {aluno.full_name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {aluno.classe ?? '—'}
                  {aluno.turma ? ` / ${aluno.turma}` : ''}
                  {aluno.nome_pai ? ` · Pai: ${aluno.nome_pai}` : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* PASSO 2 — SERVIÇO */}
      {aluno && (
        <section className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden animate-fade-up">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <span
              className={`w-8 h-8 rounded-full text-sm font-semibold flex items-center justify-center shrink-0 ${
                servicoSelecionado
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {servicoSelecionado ? '✓' : '2'}
            </span>
            <h2 className="text-sm font-semibold text-gray-900">
              Escolher serviço
            </h2>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {servicos.map((s) => {
                const cat = categoria(s.codigo)
                const ativo = servicoId === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => handleMudarServico(s.id)}
                    className={`px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl border-2 text-sm transition text-left min-w-0 ${corServico(
                      cat.cor,
                      ativo
                    )}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base sm:text-lg shrink-0">
                        {cat.icone}
                      </span>
                      <p className="font-medium truncate">{s.nome}</p>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {s.tem_multa && (
                        <span className="text-[10px] text-amber-700">
                          Multa {s.multa_percentual}%
                        </span>
                      )}
                      {s.tem_urgencia && (
                        <span className="text-[10px] text-violet-700">
                          Normal / Urgente
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {servicoSelecionado?.tem_urgencia && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-3">
                  Tipo de pedido
                </label>
                <div className="flex flex-wrap gap-2">
                  {OPCOES_URGENCIA.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => setVariacao(v.key)}
                      className={`px-5 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                        variacao === v.key
                          ? 'border-violet-600 bg-violet-50 text-violet-900'
                          : 'border-gray-200 text-gray-700 hover:border-violet-300'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {servicoSelecionado?.codigo === 'uniforme' && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-3">
                  Tipo de uniforme
                </label>
                <div className="flex flex-wrap gap-2">
                  {OPCOES_UNIFORME.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => setVariacao(v.key)}
                      className={`px-5 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                        variacao === v.key
                          ? 'border-amber-600 bg-amber-50 text-amber-900'
                          : 'border-gray-200 text-gray-700 hover:border-amber-300'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* MESES — MULTI-SELEÇÃO */}
            {servicoSelecionado?.tem_multa && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Meses a pagar
                  </label>
                  <button
                    type="button"
                    onClick={selecionarTodosMesesDisponiveis}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Selecionar todos os disponíveis
                  </button>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-2">
                  {MESES.map((m) => {
                    const mesNum = Number(m.key)
                    const ano = mesNum >= 9 ? anoAtual : anoAtual + 1
                    const chave = `${ano}-${m.key}`
                    const jaPago = mesesPagosDoAluno.has(chave)
                    const ativo = mesesSel.includes(chave)
                    const temMulta = mesTemMulta(chave)

                    return (
                      <button
                        key={m.key}
                        type="button"
                        disabled={jaPago}
                        onClick={() => toggleMes(chave)}
                        title={
                          jaPago
                            ? `${m.label} · já pago`
                            : temMulta
                            ? `${m.label} · atraso (com multa)`
                            : `${m.label} · dentro do prazo (sem multa)`
                        }
                        className={`relative py-2 px-1 rounded-lg border-2 text-xs font-medium transition flex flex-col items-center ${
                          jaPago
                            ? 'border-green-200 bg-green-50 text-green-700 cursor-not-allowed'
                            : ativo
                            ? 'border-blue-600 bg-blue-600 text-white ring-2 ring-blue-200'
                            : temMulta
                            ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-400'
                            : 'border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}
                      >
                        <span>{m.curto}</span>
                        {jaPago && <span className="text-[9px] mt-0.5">✓</span>}
                        {!jaPago && ativo && (
                          <span className="text-[9px] mt-0.5">✓</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                  <strong className="text-red-600">Vermelho:</strong> meses em
                  atraso — a multa só se aplica após o dia 10 do mês
                  seguinte.{' '}
                  <strong className="text-gray-600">Cinzento:</strong> dentro
                  do prazo, sem multa.{' '}
                  <strong className="text-green-600">Verde ✓:</strong> já
                  pagos.
                </p>

                {mesesSel.length > 0 && (
                  <p className="mt-2 text-xs text-blue-700 font-medium">
                    {mesesSel.length}{' '}
                    {mesesSel.length === 1
                      ? 'mês selecionado'
                      : 'meses selecionados'}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* PASSO 3 — VALOR + PAGAMENTO */}
      {aluno && servicoSelecionado && (
        <section className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden animate-fade-up">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center shrink-0">
              3
            </span>
            <h2 className="text-sm font-semibold text-gray-900">
              Valor e forma de pagamento
            </h2>
          </div>

          <div className="p-4 sm:p-6">
            {valorInfo ? (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6">
                {valorInfo.comMulta && (
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm gap-3">
                      <span className="text-gray-600">
                        Valor base
                        {valorInfo.mesesCount > 1 && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({valorInfo.mesesCount} meses)
                          </span>
                        )}
                      </span>
                      <span className="text-gray-900 font-medium shrink-0">
                        {valorInfo.valorBase.toLocaleString('pt-PT')} Kz
                      </span>
                    </div>
                    <div className="flex justify-between text-sm gap-3">
                      <span className="text-red-600 flex items-center gap-1">
                        <span>⚠</span>
                        <span>
                          Multa por atraso ({valorInfo.mesesComMulta.length}{' '}
                          {valorInfo.mesesComMulta.length === 1
                            ? 'mês'
                            : 'meses'}
                          )
                        </span>
                      </span>
                      <span className="text-red-600 font-medium shrink-0">
                        + {valorInfo.valorMulta.toLocaleString('pt-PT')} Kz
                      </span>
                    </div>
                    <div className="border-t border-blue-200 pt-3" />
                  </div>
                )}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-blue-900 uppercase tracking-wide">
                    Total a pagar
                  </span>
                  <span className="text-2xl sm:text-4xl font-bold text-blue-900 break-words">
                    {valorInfo.valorTotal.toLocaleString('pt-PT')}
                    <span className="text-base sm:text-lg font-normal ml-1">
                      Kz
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 sm:p-5 text-sm text-amber-800">
                <p className="font-medium mb-1">
                  ⚠ Falta informação para calcular o valor.
                </p>
                <p className="text-xs">
                  {servicoSelecionado.codigo === 'propina' &&
                    mesesSel.length === 0 &&
                    '· Selecione pelo menos um mês acima. '}
                  {servicoSelecionado.tem_urgencia &&
                    !variacao &&
                    '· Escolha Normal ou Urgente. '}
                  {servicoSelecionado.codigo === 'uniforme' &&
                    !variacao &&
                    '· Escolha Completo ou Retalho.'}
                </p>
              </div>
            )}

            {valorInfo && (
              <>
                <div className="mt-6">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-3">
                    Forma de pagamento
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <button
                      onClick={() => setFormaPagamento('fisico')}
                      className={`px-3 py-3 sm:px-5 sm:py-4 rounded-xl border-2 text-sm transition text-left min-w-0 ${
                        formaPagamento === 'fisico'
                          ? 'border-green-600 bg-green-50 text-green-900 ring-2 ring-green-100'
                          : 'border-gray-200 text-gray-700 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💵</span>
                        <p className="font-semibold">Físico</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Dinheiro à mão
                      </p>
                    </button>
                    <button
                      onClick={() => setFormaPagamento('banco')}
                      className={`px-3 py-3 sm:px-5 sm:py-4 rounded-xl border-2 text-sm transition text-left min-w-0 ${
                        formaPagamento === 'banco'
                          ? 'border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-100'
                          : 'border-gray-200 text-gray-700 hover:border-violet-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏦</span>
                        <p className="font-semibold">Banco</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Transferência
                      </p>
                    </button>
                  </div>
                </div>

                {formaPagamento === 'banco' && (
                  <div className="mt-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-3">
                      Banco
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['BAI', 'SOL'].map((b) => (
                        <button
                          key={b}
                          onClick={() => setBanco(b)}
                          className={`px-5 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                            banco === b
                              ? 'border-violet-600 bg-violet-50 text-violet-900'
                              : 'border-gray-200 text-gray-700 hover:border-violet-300'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">
                    Observação (opcional)
                  </label>
                  <input
                    type="text"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Ex: pagamento antecipado de 3 meses"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                  />
                </div>

                <div className="mt-6">
                  <button
                    onClick={handleRegistar}
                    disabled={!prontoParaRegistar || aGravar}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white text-sm sm:text-base font-semibold transition shadow-lg shadow-blue-500/20 disabled:shadow-none"
                  >
                    {aGravar ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        A registar…
                      </span>
                    ) : (
                      <>📄 Registar pagamento e emitir recibo</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  )
}