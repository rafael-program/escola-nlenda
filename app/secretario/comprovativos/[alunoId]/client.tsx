'use client'

import { useState, useMemo, useTransition } from 'react'
import {
  aprovarEEmitirRecibo,
  rejeitarComprovativo,
  assinarComprovativo,
} from '../actions'

type Aluno = {
  id: string
  full_name: string
  nome_pai: string | null
  telefone_pai: string | null
  classe: string | null
}

type Comprovativo = {
  id: number
  month: string | null
  file_url: string
  file_type: string | null
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  notes: string | null
  valor_declarado: number | null
  variacao: string | null
  created_at: string
  reviewed_at: string | null
  servico_codigo: string | null
  servico_nome: string | null
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

function titulo(c: Comprovativo): string {
  if (c.servico_codigo === 'propina' && c.month) {
    return `Propina · ${formatarMes(c.month)}`
  }
  if (c.servico_nome) {
    return c.variacao
      ? `${c.servico_nome} · ${c.variacao.charAt(0).toUpperCase() + c.variacao.slice(1)}`
      : c.servico_nome
  }
  return c.month ? formatarMes(c.month) : 'Comprovativo'
}

export default function ComprovativosAlunoClient({
  aluno,
  comprovativos,
}: {
  aluno: Aluno
  comprovativos: Comprovativo[]
}) {
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [aCarregar, startTransition] = useTransition()
  const [rejeitando, setRejeitando] = useState<Comprovativo | null>(null)

  const contagens = useMemo(
    () => ({
      pendentes: comprovativos.filter((c) => c.status === 'pending').length,
      aprovados: comprovativos.filter((c) => c.status === 'approved').length,
      rejeitados: comprovativos.filter((c) => c.status === 'rejected').length,
    }),
    [comprovativos]
  )

  async function abrirFicheiro(path: string) {
    setErro('')
    const r = await assinarComprovativo(path)
    if ('url' in r && r.url) {
      window.open(r.url, '_blank')
    } else if ('erro' in r && r.erro) {
      setErro(r.erro)
    } else {
      setErro('Erro ao abrir ficheiro.')
    }
  }

  function handleAprovar(c: Comprovativo) {
    setErro('')
    setOk('')
    startTransition(async () => {
      const r = await aprovarEEmitirRecibo(
        c.id,
        aluno.id,
        c.month,
        c.valor_declarado !== null ? String(c.valor_declarado) : undefined
      )
      if ('erro' in r && r.erro) {
        setErro(r.erro)
      } else if ('numero' in r) {
        setOk(`Aprovado. Recibo ${r.numero} emitido.`)
        setTimeout(() => setOk(''), 5000)
      }
    })
  }

  function handleRejeitar(c: Comprovativo, motivo: string) {
    setErro('')
    startTransition(async () => {
      const r = await rejeitarComprovativo(c.id, motivo)
      if ('erro' in r && r.erro) {
        setErro(r.erro)
      } else {
        setRejeitando(null)
      }
    })
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
        <div className="flex gap-2 text-xs flex-wrap">
          {contagens.pendentes > 0 && (
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-medium">
              ⏳ {contagens.pendentes} pendente
              {contagens.pendentes !== 1 ? 's' : ''}
            </span>
          )}
          {contagens.aprovados > 0 && (
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 border border-green-200 font-medium">
              ✓ {contagens.aprovados} aprovado
              {contagens.aprovados !== 1 ? 's' : ''}
            </span>
          )}
          {contagens.rejeitados > 0 && (
            <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 border border-red-200 font-medium">
              ✗ {contagens.rejeitados} rejeitado
              {contagens.rejeitados !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {(erro || ok) && (
        <div className="mt-4 space-y-2">
          {erro && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {erro}
            </div>
          )}
          {ok && (
            <div className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              ✓ {ok}
            </div>
          )}
        </div>
      )}

      {/* LISTA */}
      <div className="mt-6 space-y-3">
        {comprovativos.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center text-sm text-gray-400">
            Este aluno ainda não enviou comprovativos.
          </div>
        ) : (
          comprovativos.map((c) => {
            const cores =
              c.status === 'approved'
                ? { borda: 'border-green-200', icon: 'bg-green-600' }
                : c.status === 'pending'
                ? { borda: 'border-amber-200', icon: 'bg-amber-500' }
                : { borda: 'border-red-200', icon: 'bg-red-600' }

            return (
              <div
                key={c.id}
                className={`bg-white border ${cores.borda} rounded-xl p-5 flex flex-wrap gap-4 items-start`}
              >
                <div
                  className={`${cores.icon} w-14 h-14 rounded-lg flex flex-col items-center justify-center text-white shrink-0`}
                >
                  <span className="text-[9px] uppercase opacity-80">
                    {c.servico_codigo === 'propina' ? 'Mês' : 'Serv.'}
                  </span>
                  <span className="text-xs font-semibold">
                    {c.servico_codigo === 'propina' && c.month
                      ? c.month.split('-')[1] +
                        '/' +
                        c.month.split('-')[0].slice(2)
                      : (c.servico_nome ?? '?').charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <p className="font-medium text-gray-900">{titulo(c)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Enviado em{' '}
                    {new Date(c.created_at).toLocaleDateString('pt-PT')}
                  </p>

                  {c.valor_declarado !== null && (
                    <p className="text-sm text-gray-900 mt-2">
                      Valor declarado:{' '}
                      <strong>
                        {c.valor_declarado.toLocaleString('pt-PT')} Kz
                      </strong>
                    </p>
                  )}

                  {c.notes && (
                    <p className="text-xs text-gray-600 mt-1 italic">
                      {'\u201C'}
                      {c.notes}
                      {'\u201D'}
                    </p>
                  )}

                  {c.status === 'approved' && c.reviewed_at && (
                    <p className="text-xs text-green-700 mt-2">
                      ✓ Aprovado em{' '}
                      {new Date(c.reviewed_at).toLocaleDateString('pt-PT')}
                    </p>
                  )}

                  {c.status === 'rejected' && c.rejection_reason && (
                    <p className="text-xs text-red-700 mt-2">
                      ✗ Motivo: {c.rejection_reason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => abrirFicheiro(c.file_url)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition"
                  >
                    {c.file_type === 'pdf' ? '📄 Ver PDF' : '🖼 Ver imagem'}
                  </button>

                  {c.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleAprovar(c)}
                        disabled={aCarregar}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition disabled:opacity-60"
                      >
                        ✓ Aprovar
                      </button>
                      <button
                        onClick={() => setRejeitando(c)}
                        disabled={aCarregar}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-300 hover:bg-red-50 text-red-700 transition disabled:opacity-60"
                      >
                        ✗ Rejeitar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {rejeitando && (
        <ModalRejeitar
          comprovativo={rejeitando}
          aluno={aluno}
          onCancelar={() => setRejeitando(null)}
          onConfirmar={(motivo) => handleRejeitar(rejeitando, motivo)}
          aCarregar={aCarregar}
        />
      )}
    </div>
  )
}

function ModalRejeitar({
  comprovativo,
  aluno,
  onCancelar,
  onConfirmar,
  aCarregar,
}: {
  comprovativo: Comprovativo
  aluno: Aluno
  onCancelar: () => void
  onConfirmar: (motivo: string) => void
  aCarregar: boolean
}) {
  const [motivo, setMotivo] = useState('')
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onCancelar}
    >
      <div
        className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900">
          Rejeitar comprovativo
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Aluno: <strong>{aluno.full_name}</strong> —{' '}
          <strong>{titulo(comprovativo)}</strong>
        </p>

        <label className="mt-4 block text-xs text-gray-500">
          Motivo da rejeição *
        </label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          placeholder="Ex: valor em falta, comprovativo ilegível, mês errado…"
          className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none text-sm resize-none"
        />

        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={onCancelar}
            className="text-sm px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(motivo)}
            disabled={!motivo.trim() || aCarregar}
            className="text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium"
          >
            {aCarregar ? 'A rejeitar…' : 'Confirmar rejeição'}
          </button>
        </div>
      </div>
    </div>
  )
}