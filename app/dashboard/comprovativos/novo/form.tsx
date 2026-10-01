'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { enviarComprovativo } from '../actions'

type Servico = {
  id: number
  codigo: string
  nome: string
  descricao: string | null
  tem_multa: boolean
  multa_percentual: number
  tem_urgencia: boolean
  precos: { variacao: string | null; valor: number }[]
}

type Mes = {
  chave: string
  label: string
  curto: string
  status: 'pago' | 'pending' | 'rejected' | null
}

export default function NovoComprovativoForm({
  servicos,
  meses,
  classeNome,
}: {
  servicos: Servico[]
  meses: Mes[]
  classeNome: string
}) {
  const router = useRouter()

  const [servicoId, setServicoId] = useState<number | null>(null)
  const [variacao, setVariacao] = useState<string | null>(null)
  const [mesesSel, setMesesSel] = useState<string[]>([])
  const [valor, setValor] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [erro, setErro] = useState('')
  const [aCarregar, setACarregar] = useState(false)

  const servicoSelecionado = useMemo(
    () => servicos.find((s) => s.id === servicoId) ?? null,
    [servicoId, servicos]
  )

  const ehPropina = servicoSelecionado?.codigo === 'propina'

  const chaveAtual = useMemo(() => {
    const hoje = new Date()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    return `${hoje.getFullYear()}-${mes}`
  }, [])

  const diaAtual = new Date().getDate()

  const valorInfo = useMemo(() => {
    if (!servicoSelecionado) return null

    if (ehPropina) {
      if (mesesSel.length === 0) return null

      const preco = servicoSelecionado.precos.find(
        (p) => (p.variacao ?? null) === null
      )
      if (!preco) return null

      const precoMensal = preco.valor
      const multaPercentual = servicoSelecionado.multa_percentual

      let valorMulta = 0
      const mesesComMulta: string[] = []

      for (const mes of mesesSel) {
        const ehPassado = mes < chaveAtual
        const ehAtual = mes === chaveAtual

        let aplica = false
        if (ehPassado) aplica = true
        else if (ehAtual) aplica = diaAtual > 10

        if (aplica) {
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

    const preco =
      servicoSelecionado.precos.find(
        (p) => (p.variacao ?? null) === (variacao ?? null)
      ) ?? servicoSelecionado.precos[0]

    if (!preco) return null

    return {
      valorBase: preco.valor,
      valorMulta: 0,
      valorTotal: preco.valor,
      comMulta: false,
      mesesComMulta: [],
      mesesCount: 0,
    }
  }, [servicoSelecionado, ehPropina, mesesSel, variacao, chaveAtual, diaAtual])

  function handleFile(f: File | null) {
    setFile(f)
    setErro('')
    if (!f) {
      setPreview(null)
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setErro('Ficheiro demasiado grande (máx. 5 MB).')
      setFile(null)
      return
    }
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }

  function toggleMes(chave: string) {
    setMesesSel((prev) =>
      prev.includes(chave) ? prev.filter((x) => x !== chave) : [...prev, chave]
    )
  }

  function handleMudarServico(id: number) {
    setServicoId(id)
    setVariacao(null)
    setMesesSel([])
    setValor('')
    setErro('')
  }

  function usarTotal() {
    if (valorInfo) setValor(String(valorInfo.valorTotal))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro('')

    if (!servicoSelecionado) {
      setErro('Escolha o serviço.')
      return
    }
    if (ehPropina && mesesSel.length === 0) {
      setErro('Escolha pelo menos um mês.')
      return
    }
    if (servicoSelecionado.tem_urgencia && !variacao) {
      setErro('Escolha Normal ou Urgente.')
      return
    }
    if (servicoSelecionado.codigo === 'uniforme' && !variacao) {
      setErro('Escolha Completo ou Retalho.')
      return
    }
    if (!file) {
      setErro('Anexe o comprovativo.')
      return
    }
    if (!valor || Number(valor) <= 0) {
      setErro('Indique o valor pago.')
      return
    }

    setACarregar(true)

    try {
      const formData = new FormData()
      formData.append('servico_id', String(servicoSelecionado.id))
      if (variacao) formData.append('variacao', variacao)
      formData.append('valor', valor)
      formData.append('notes', notes)
      formData.append('file', file)

      if (ehPropina) {
        mesesSel.forEach((mes) => formData.append('month', mes))
      }

      const r = await enviarComprovativo(formData)

      if (r?.erro) {
        setErro(r.erro)
        setACarregar(false)
        return
      }

      router.push('/dashboard/comprovativos?sucesso=1')
      router.refresh()
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : 'Erro inesperado ao enviar.'
      )
      setACarregar(false)
    }
  }

  const valorNum = Number(valor) || 0
  const emFalta = valorInfo ? valorInfo.valorTotal - valorNum : 0

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 min-w-0"
    >
      <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
        {/* 1. SERVIÇO */}
        <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900">
            1. Que serviço vai pagar?
          </h2>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {servicos.map((s) => {
              const ativo = servicoId === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleMudarServico(s.id)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-sm transition min-w-0 ${
                    ativo
                      ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-100'
                      : 'border-gray-200 text-gray-700 hover:border-blue-300'
                  }`}
                >
                  <p className="font-medium truncate">{s.nome}</p>
                  {s.tem_multa && (
                    <p className="text-[10px] text-amber-700 mt-0.5">
                      Multa {s.multa_percentual}%
                    </p>
                  )}
                  {s.tem_urgencia && (
                    <p className="text-[10px] text-violet-700 mt-0.5">
                      Normal / Urgente
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* 2. VARIAÇÃO */}
        {servicoSelecionado?.tem_urgencia && (
          <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-900">
              2. Tipo de pedido
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { key: 'normal', label: 'Normal' },
                { key: 'urgente', label: 'Urgente' },
              ].map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => {
                    setVariacao(v.key)
                    setValor('')
                  }}
                  className={`px-4 py-2 rounded-lg border text-sm transition ${
                    variacao === v.key
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {servicoSelecionado?.codigo === 'uniforme' && (
          <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-900">
              2. Tipo de uniforme
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { key: 'completo', label: 'Completo' },
                { key: 'retalho', label: 'Retalho' },
              ].map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => {
                    setVariacao(v.key)
                    setValor('')
                  }}
                  className={`px-4 py-2 rounded-lg border text-sm transition ${
                    variacao === v.key
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 3. MESES */}
        {ehPropina && (
          <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-start sm:items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                3. Meses a pagar
              </h2>
              <button
                type="button"
                onClick={() => {
                  const disponiveis = meses
                    .filter((m) => m.status !== 'pago')
                    .map((m) => m.chave)
                  setMesesSel(disponiveis)
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Selecionar todos
              </button>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              Pode pagar vários meses de uma vez. Pode estar em atraso ou
              adiantado.
            </p>

            <div className="mt-4 grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
              {meses.map((m) => {
                const bloqueado =
                  m.status === 'pago' || m.status === 'pending'
                const ativo = mesesSel.includes(m.chave)
                const ehPassado = m.chave < chaveAtual
                const ehAtual = m.chave === chaveAtual

                return (
                  <button
                    key={m.chave}
                    type="button"
                    disabled={bloqueado}
                    onClick={() => toggleMes(m.chave)}
                    className={`py-2 px-1.5 rounded-lg border-2 text-[11px] sm:text-xs font-medium transition flex flex-col items-center min-w-0 ${
                      bloqueado
                        ? m.status === 'pago'
                          ? 'border-green-200 bg-green-50 text-green-700 cursor-not-allowed'
                          : 'border-amber-200 bg-amber-50 text-amber-700 cursor-not-allowed'
                        : ativo
                        ? 'border-blue-600 bg-blue-600 text-white ring-2 ring-blue-200'
                        : ehPassado
                        ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-400'
                        : ehAtual
                        ? 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400'
                        : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}
                  >
                    <span className="truncate w-full text-center">
                      {m.label}
                    </span>
                    {m.status === 'pago' && (
                      <span className="text-[9px] mt-0.5">✓ Pago</span>
                    )}
                    {m.status === 'pending' && (
                      <span className="text-[9px] mt-0.5">⏳ Em análise</span>
                    )}
                    {m.status === 'rejected' && (
                      <span className="text-[9px] mt-0.5">✗ Rejeitado</span>
                    )}
                    {!m.status && ativo && (
                      <span className="text-[9px] mt-0.5">✓ Selecionado</span>
                    )}
                  </button>
                )
              })}
            </div>

            {mesesSel.length > 0 && (
              <p className="mt-3 text-xs text-blue-700 font-medium">
                {mesesSel.length}{' '}
                {mesesSel.length === 1
                  ? 'mês selecionado'
                  : 'meses selecionados'}
              </p>
            )}
          </section>
        )}

        {/* 4. VALOR */}
        {servicoSelecionado && (
          <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-900">
              {ehPropina ? '4' : '3'}. Valor pago
            </h2>

            {valorInfo ? (
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-4 sm:p-5">
                <p className="text-xs uppercase tracking-wide text-blue-700">
                  Valor esperado
                </p>

                <div className="mt-2 space-y-1">
                  {valorInfo.comMulta && (
                    <>
                      <div className="flex justify-between text-sm gap-3">
                        <span className="text-gray-600">
                          Base
                          {valorInfo.mesesCount > 1 && (
                            <span className="text-xs text-gray-400 ml-1">
                              ({valorInfo.mesesCount} meses)
                            </span>
                          )}
                        </span>
                        <span className="text-gray-900 shrink-0">
                          {valorInfo.valorBase.toLocaleString('pt-PT')} Kz
                        </span>
                      </div>
                      <div className="flex justify-between text-sm gap-3">
                        <span className="text-red-600">
                          Multa ({valorInfo.mesesComMulta.length}{' '}
                          {valorInfo.mesesComMulta.length === 1
                            ? 'mês'
                            : 'meses'}
                          )
                        </span>
                        <span className="text-red-600 shrink-0">
                          + {valorInfo.valorMulta.toLocaleString('pt-PT')} Kz
                        </span>
                      </div>
                      <div className="border-t border-blue-200 pt-2 mt-2" />
                    </>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-blue-900">
                      Total a pagar
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-blue-900 shrink-0">
                      {valorInfo.valorTotal.toLocaleString('pt-PT')} Kz
                    </span>
                  </div>
                </div>

                {valorInfo.comMulta && (
                  <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1.5">
                    ⚠ Existem meses em atraso. Aplica-se multa de{' '}
                    {servicoSelecionado.multa_percentual}%.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                Escolha as opções acima para ver o valor esperado.
              </p>
            )}

            {valorInfo && (
              <>
                <button
                  type="button"
                  onClick={usarTotal}
                  className="mt-3 text-xs text-blue-600 hover:underline text-left"
                >
                  Preencher com o total:{' '}
                  {valorInfo.valorTotal.toLocaleString('pt-PT')} Kz
                </button>

                <div className="mt-4">
                  <label className="text-xs text-gray-500 block mb-1">
                    Valor pago (Kz) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      placeholder="Ex: 13500"
                      className="w-full px-3 py-2.5 pr-14 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      Kz
                    </span>
                  </div>
                </div>

                {valorNum > 0 &&
                  valorInfo.valorTotal > 0 &&
                  valorNum < valorInfo.valorTotal && (
                    <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                      ⚠ Pagamento parcial. Falta{' '}
                      <strong>{emFalta.toLocaleString('pt-PT')} Kz</strong>.
                    </div>
                  )}
                {valorNum > 0 && valorNum === valorInfo.valorTotal && (
                  <div className="mt-3 rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-xs text-green-800">
                    ✓ Valor corresponde ao total esperado.
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* 5. COMPROVATIVO */}
        {servicoSelecionado && (
          <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-900">
              {ehPropina ? '5' : '4'}. Comprovativo
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Fotografia (JPG, PNG) ou PDF · Máx. 5 MB
            </p>

            {!file ? (
              <label className="mt-4 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-6 sm:p-8 cursor-pointer transition bg-gray-50/50">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl">
                  📎
                </div>
                <p className="text-sm font-medium text-gray-700 text-center">
                  Clique para escolher o ficheiro
                </p>
                <p className="text-xs text-gray-400">ou arraste para aqui</p>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
              </label>
            ) : (
              <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                {preview ? (
                  <div className="bg-gray-100 flex items-center justify-center max-h-72 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Pré-visualização"
                      className="max-h-72 object-contain"
                    />
                  </div>
                ) : (
                  <div className="bg-gray-50 flex flex-col items-center justify-center py-10">
                    <span className="text-4xl">📄</span>
                    <p className="mt-2 text-sm text-gray-500">Documento PDF</p>
                  </div>
                )}

                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3 bg-white">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFile(null)}
                    className="text-xs text-red-600 hover:underline shrink-0"
                  >
                    Remover
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 6. NOTA */}
        {servicoSelecionado && (
          <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-900">
              {ehPropina ? '6' : '5'}. Nota (opcional)
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Ex: transferência pelo BAI, ref. 12345"
              className="mt-3 w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm resize-none"
            />
            <p className="mt-1 text-xs text-gray-400 text-right">
              {notes.length}/300
            </p>
          </section>
        )}

        {erro && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {erro}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium transition w-full sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={aCarregar}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition w-full sm:w-auto"
          >
            {aCarregar ? 'A enviar…' : 'Enviar comprovativo'}
          </button>
        </div>
      </div>

      {/* RESUMO LATERAL */}
      <aside className="lg:col-span-1 min-w-0">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:sticky lg:top-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Resumo do envio
          </h3>

          <div className="mt-4 space-y-3 text-sm">
            <Linha label="Serviço" valor={servicoSelecionado?.nome ?? '—'} />
            {variacao && (
              <Linha
                label="Tipo"
                valor={variacao.charAt(0).toUpperCase() + variacao.slice(1)}
              />
            )}
            {ehPropina && mesesSel.length > 0 && (
              <Linha
                label="Meses"
                valor={`${mesesSel.length} ${
                  mesesSel.length === 1 ? 'mês' : 'meses'
                }`}
              />
            )}
            <Linha
              label="Valor"
              valor={
                valorNum > 0 ? `${valorNum.toLocaleString('pt-PT')} Kz` : '—'
              }
            />
            <Linha
              label="Ficheiro"
              valor={file ? `${(file.size / 1024).toFixed(0)} KB` : '—'}
            />
          </div>

          {valorInfo && valorNum > 0 && valorNum < valorInfo.valorTotal && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs gap-3">
                <span className="text-gray-500">Saldo em falta</span>
                <span className="font-semibold text-amber-700 shrink-0">
                  {emFalta.toLocaleString('pt-PT')} Kz
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </form>
  )
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3 min-w-0">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 font-medium truncate text-right">
        {valor}
      </span>
    </div>
  )
}