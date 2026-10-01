'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { guardarNota, emitirBoletim } from './actions'
import type { Aluno, Disciplina, Situacao, NotaLocal } from './tipos'

export default function BoletimIndividual({
  aluno,
  disciplinas,
  periodo,
  onFechar,
}: {
  aluno: Aluno
  disciplinas: Disciplina[]
  periodo: string
  onFechar: () => void
}) {
  const supabase = createClient()
  const [notas, setNotas] = useState<NotaLocal[]>([])
  const [situacao, setSituacao] = useState<Situacao | null>(null)
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    let ativo = true

    async function carregar() {
      setACarregar(true)

      const { data: notasData } = await supabase
        .from('notas')
        .select('disciplina_id, valor, publicado')
        .eq('student_id', aluno.id)
        .eq('periodo', periodo)

      if (!ativo) return
      setNotas(
        (notasData ?? []).map((n) => ({
          disciplina_id: n.disciplina_id,
          valor: n.valor !== null ? Number(n.valor) : null,
          publicado: n.publicado ?? false,
        }))
      )

      try {
        const r = await fetch(
          `/api/situacao-financeira?student_id=${aluno.id}&anoLetivo=${periodo.split('-')[0]}`
        )
        const data = (await r.json()) as Situacao
        if (ativo) setSituacao(data)
      } catch {
        if (ativo) setSituacao(null)
      }

      setACarregar(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [aluno.id, periodo, supabase])

  function getNota(disciplinaId: number): number | null {
    return notas.find((n) => n.disciplina_id === disciplinaId)?.valor ?? null
  }

  function getPublicado(disciplinaId: number): boolean {
    return (
      notas.find((n) => n.disciplina_id === disciplinaId)?.publicado ?? false
    )
  }

  async function handleGuardar(disciplinaId: number, valorTexto: string) {
    setErro('')
    setOk('')
    const limpo = valorTexto.replace(',', '.').trim()
    const valor = limpo === '' ? null : Number(limpo)

    if (valor !== null && (isNaN(valor) || valor < 0 || valor > 20)) {
      setErro('Nota inválida (0 a 20).')
      return
    }

    setNotas((prev) => {
      const outras = prev.filter((n) => n.disciplina_id !== disciplinaId)
      if (valor === null) return outras
      return [
        ...outras,
        { disciplina_id: disciplinaId, valor, publicado: false },
      ]
    })

    const r = await guardarNota(aluno.id, disciplinaId, periodo, valor)
    if (r?.erro) setErro(r.erro)
  }

  async function handleEmitir() {
    setErro('')
    setOk('')
    const r = await emitirBoletim(aluno.id, periodo)
    if (r?.erro) {
      setErro(r.erro)
    } else {
      setOk('Boletim emitido com sucesso.')
      setNotas((prev) => prev.map((n) => ({ ...n, publicado: true })))
    }
  }

  function media(): string {
    const vals = notas
      .filter((n) => n.valor !== null)
      .map((n) => n.valor as number)
    if (vals.length === 0) return '—'
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  }

  const emitido = notas.length > 0 && notas.every((n) => n.publicado)
  const temNotas = notas.some((n) => n.valor !== null)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl">

          {/* BARRA SUPERIOR */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
            <button
              onClick={onFechar}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              ← Voltar à turma
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium"
              >
                🖨 Imprimir / PDF
              </button>
              {!emitido && situacao?.regular && temNotas && (
                <button
                  onClick={handleEmitir}
                  className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  📄 Emitir boletim
                </button>
              )}
              {emitido && (
                <span className="text-sm px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 font-medium">
                  ✓ Boletim emitido
                </span>
              )}
            </div>
          </div>

          {(erro || ok) && (
            <div className="px-6 pt-4 print:hidden">
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

          {aCarregar ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              A carregar…
            </div>
          ) : (
            <div className="p-8 print:p-0">
              {/* Cabeçalho institucional */}
              <div className="text-center border-b-2 border-gray-900 pb-4">
                <p className="text-xs uppercase tracking-widest text-gray-500">
                  República de Angola
                </p>
                <h1 className="mt-1 text-2xl font-bold text-gray-900">
                  Escola Nlenda e Nlenda
                </h1>
                <p className="text-sm text-gray-600 mt-1">Boletim de Notas</p>
              </div>

              {/* Dados do aluno */}
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Aluno
                  </p>
                  <p className="font-medium text-gray-900">{aluno.full_name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Período
                  </p>
                  <p className="font-medium text-gray-900">
                    {periodo.replace('-T', ' — ')}º Trimestre
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Classe / Turma
                  </p>
                  <p className="font-medium text-gray-900">
                    {aluno.classe ?? '—'}
                    {aluno.turma ? ` / ${aluno.turma}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Situação financeira
                  </p>
                  <p
                    className={`font-medium ${
                      situacao?.regular ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {situacao
                      ? situacao.regular
                        ? '✓ Regularizada'
                        : `✗ ${situacao.meses_em_falta.length} mês(es) em falta`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Tabela de notas */}
              <table className="mt-8 w-full text-sm border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-600 uppercase tracking-wide border-b border-gray-200">
                      Disciplina
                    </th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-600 uppercase tracking-wide border-b border-gray-200 w-32">
                      Nota
                    </th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-600 uppercase tracking-wide border-b border-gray-200 w-40 print:hidden">
                      Lançar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {disciplinas.map((d) => {
                    const nota = getNota(d.id)
                    const publicado = getPublicado(d.id)
                    return (
                      <tr key={d.id}>
                        <td className="px-4 py-2.5 text-gray-900">
                          {d.name}
                          {publicado && (
                            <span className="ml-2 text-[10px] text-blue-600 font-medium">
                              ✓ publicado
                            </span>
                          )}
                        </td>
                        <td className="text-center px-4 py-2.5">
                          <span
                            className={`font-semibold ${
                              nota === null
                                ? 'text-gray-300'
                                : nota >= 14
                                ? 'text-green-700'
                                : nota >= 10
                                ? 'text-gray-900'
                                : 'text-red-700'
                            }`}
                          >
                            {nota !== null ? nota.toFixed(0) : '—'}
                          </span>
                        </td>
                        <td className="text-center px-4 py-2 print:hidden">
                          <input
                            type="text"
                            defaultValue={nota !== null ? String(nota) : ''}
                            onBlur={(e) => {
                              const atual = nota !== null ? String(nota) : ''
                              if (e.target.value !== atual) {
                                handleGuardar(d.id, e.target.value)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                ;(e.target as HTMLInputElement).blur()
                              }
                            }}
                            placeholder="—"
                            className="w-16 text-center px-2 py-1 rounded border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Média final */}
              <div className="mt-6 flex justify-end">
                <div className="border border-gray-900 rounded-lg px-6 py-3 flex items-center gap-4">
                  <span className="text-xs uppercase tracking-wide text-gray-600">
                    Média final
                  </span>
                  <span className="text-2xl font-bold text-gray-900">
                    {media()}
                  </span>
                </div>
              </div>

              {/* Assinaturas */}
              <div className="mt-12 grid grid-cols-2 gap-8 text-xs text-gray-600">
                <div className="text-center">
                  <div className="border-t border-gray-400 pt-2 mt-12">
                    O(A) Diretor(a) Pedagógico(a)
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-gray-400 pt-2 mt-12">
                    O(A) Encarregado(a) de Educação
                  </div>
                </div>
              </div>

              <p className="mt-8 text-center text-[10px] text-gray-400">
                Documento emitido em{' '}
                {new Date().toLocaleDateString('pt-PT', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}