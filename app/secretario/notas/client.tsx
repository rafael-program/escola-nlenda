'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { guardarNota, emitirBoletim, verificarSituacaoFinanceira } from './actions'
import BoletimIndividual from './boletim-individual'
import type { Aluno, Classe, Turma, Disciplina, Nota, Situacao } from './tipos'

export default function NotasClient({
  classes,
  turmas,
  disciplinas,
}: {
  classes: Classe[]
  turmas: Turma[]
  disciplinas: Disciplina[]
}) {
  const supabase = createClient()

  const [classId, setClassId] = useState('')
  const [turmaId, setTurmaId] = useState('')
  const [periodo, setPeriodo] = useState('2026-T1')

  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [notas, setNotas] = useState<Nota[]>([])
  const [situacoes, setSituacoes] = useState<Record<string, Situacao>>({})
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(null)

  const [aCarregarDados, setACarregarDados] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [aGravar, startTransition] = useTransition()

  const turmasFiltradas = useMemo(
    () => (classId ? turmas.filter((t) => String(t.class_id) === classId) : []),
    [classId, turmas]
  )

  // ──────────────────────────────────────────────────────────
  // Descobrir a classe da turma selecionada
  // ──────────────────────────────────────────────────────────
  const classeSelecionada = useMemo(() => {
    if (!turmaId) return null
    const turma = turmas.find((t) => String(t.id) === turmaId)
    return turma ? turma.class_id : null
  }, [turmaId, turmas])

  // ──────────────────────────────────────────────────────────
  // Filtrar disciplinas aplicáveis à classe
  // ──────────────────────────────────────────────────────────
  const disciplinasAplicaveis = useMemo(() => {
    if (!classeSelecionada) return disciplinas
    return disciplinas.filter(
      (d) =>
        d.classes_aplicaveis.length === 0 ||
        d.classes_aplicaveis.includes(classeSelecionada)
    )
  }, [disciplinas, classeSelecionada])

  // Carregar alunos + notas + situação financeira
  useEffect(() => {
    if (!turmaId) return

    let ativo = true
    const anoLetivo = periodo.split('-')[0]

    async function carregar() {
      setACarregarDados(true)
      setErro('')

      // 1. Alunos (com classe e turma para o boletim)
      const { data: alunosData } = await supabase
        .from('students')
        .select('id, full_name, classes(name), turmas(name)')
        .eq('turma_id', Number(turmaId))
        .order('full_name')

      if (!ativo) return
      const listaAlunos: Aluno[] = (alunosData ?? []).map((a) => {
        const cls = Array.isArray(a.classes) ? a.classes[0] : a.classes
        const tur = Array.isArray(a.turmas) ? a.turmas[0] : a.turmas
        return {
          id: a.id,
          full_name: a.full_name,
          classe: cls ? String(cls.name) : null,
          turma: tur ? String(tur.name) : null,
        }
      })
      setAlunos(listaAlunos)

      if (listaAlunos.length === 0) {
        setNotas([])
        setSituacoes({})
        setACarregarDados(false)
        return
      }

      // 2. Notas
      const ids = listaAlunos.map((a) => a.id)
      const { data: notasData } = await supabase
        .from('notas')
        .select('student_id, disciplina_id, valor, publicado')
        .eq('periodo', periodo)
        .in('student_id', ids)

      if (!ativo) return
      setNotas(
        (notasData ?? []).map((n) => ({
          student_id: n.student_id,
          disciplina_id: n.disciplina_id,
          valor: n.valor !== null ? Number(n.valor) : null,
          publicado: n.publicado ?? false,
        }))
      )

      // 3. Situação financeira (em paralelo)
      const situacoesArr = await Promise.all(
        listaAlunos.map(async (a) => {
          const r = await verificarSituacaoFinanceira(a.id, anoLetivo)
          return [a.id, r] as [string, Situacao]
        })
      )

      if (!ativo) return
      setSituacoes(Object.fromEntries(situacoesArr))
      setACarregarDados(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [turmaId, periodo, supabase])

  function getNota(studentId: string, disciplinaId: number): number | null {
    const n = notas.find(
      (x) => x.student_id === studentId && x.disciplina_id === disciplinaId
    )
    return n?.valor ?? null
  }

  function getPublicado(studentId: string, disciplinaId: number): boolean {
    const n = notas.find(
      (x) => x.student_id === studentId && x.disciplina_id === disciplinaId
    )
    return n?.publicado ?? false
  }

  async function handleGuardar(
    studentId: string,
    disciplinaId: number,
    valorTexto: string
  ) {
    setErro('')
    setOk('')

    const limpo = valorTexto.replace(',', '.').trim()
    const valor = limpo === '' ? null : Number(limpo)

    if (valor !== null && (isNaN(valor) || valor < 0 || valor > 20)) {
      setErro('Nota inválida (0 a 20).')
      return
    }

    setNotas((prev) => {
      const outras = prev.filter(
        (x) => !(x.student_id === studentId && x.disciplina_id === disciplinaId)
      )
      if (valor === null) return outras
      return [
        ...outras,
        {
          student_id: studentId,
          disciplina_id: disciplinaId,
          valor,
          publicado: false,
        },
      ]
    })

    const r = await guardarNota(studentId, disciplinaId, periodo, valor)
    if (r?.erro) setErro(r.erro)
  }

  function handleEmitirBoletim(alunoId: string, nome: string) {
    setErro('')
    setOk('')
    startTransition(async () => {
      const r = await emitirBoletim(alunoId, periodo)
      if (r?.erro) {
        setErro(`Boletim de "${nome}" não emitido. ${r.erro}`)
      } else {
        setOk(`Boletim de "${nome}" emitido com sucesso.`)
        setNotas((prev) =>
          prev.map((n) =>
            n.student_id === alunoId ? { ...n, publicado: true } : n
          )
        )
        setTimeout(() => setOk(''), 4000)
      }
    })
  }

  function mediaAluno(studentId: string): string {
    const vals = notas
      .filter((n) => n.student_id === studentId && n.valor !== null)
      .map((n) => n.valor as number)
    if (vals.length === 0) return '—'
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  }

  function boletimEmitido(studentId: string): boolean {
    const notasAluno = notas.filter((n) => n.student_id === studentId)
    return notasAluno.length > 0 && notasAluno.every((n) => n.publicado)
  }

  const alunosRegulares = alunos.filter((a) => situacoes[a.id]?.regular).length
  const alunosIrregulares = alunos.length - alunosRegulares

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Notas e Boletins</h1>
      <p className="mt-1 text-sm text-gray-500">
        Lance as notas. Só é possível emitir o boletim de alunos com situação
        financeira regularizada.
      </p>

      {/* FILTROS */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Classe</label>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value)
                setTurmaId('')
                setAlunos([])
                setNotas([])
                setSituacoes({})
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
            >
              <option value="">Escolher…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Turma</label>
            <select
              value={turmaId}
              onChange={(e) => {
                setTurmaId(e.target.value)
                setAlunos([])
                setNotas([])
                setSituacoes({})
              }}
              disabled={!classId || turmasFiltradas.length === 0}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">
                {!classId
                  ? 'Escolha a classe'
                  : turmasFiltradas.length === 0
                  ? 'Sem turmas'
                  : 'Escolher…'}
              </option>
              {turmasFiltradas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Período</label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
            >
              <option value="2026-T1">2026 — 1º Trimestre</option>
              <option value="2026-T2">2026 — 2º Trimestre</option>
              <option value="2026-T3">2026 — 3º Trimestre</option>
            </select>
          </div>
        </div>

        {alunos.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <span className="text-green-700">
              ✓ {alunosRegulares} aluno{alunosRegulares !== 1 ? 's' : ''} com
              situação regular
            </span>
            {alunosIrregulares > 0 && (
              <span className="text-red-700">
                ✗ {alunosIrregulares} aluno{alunosIrregulares !== 1 ? 's' : ''}{' '}
                com situação irregular
              </span>
            )}
          </div>
        )}

        {erro && (
          <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {erro}
          </div>
        )}
        {ok && (
          <div className="mt-3 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            ✓ {ok}
          </div>
        )}
      </div>

      {/* GRELHA */}
      {!turmaId ? (
        <div className="mt-6 bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-400 text-sm">
          Escolha uma classe e uma turma para começar.
        </div>
      ) : aCarregarDados ? (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm">
          A carregar notas e situação financeira…
        </div>
      ) : alunos.length === 0 ? (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-800 text-sm">
          Não há alunos nesta turma. Atribua alunos em{' '}
          <a href="/secretario/alunos" className="underline font-medium">
            Alunos
          </a>
          .
        </div>
      ) : (
        <>
          <div className="mt-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide sticky left-0 bg-gray-50 z-10 min-w-[220px]">
                      Aluno
                    </th>
                    {disciplinasAplicaveis.map((d) => (
                      <th
                        key={d.id}
                        className="text-center px-2 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide min-w-[80px]"
                      >
                        {d.name.slice(0, 8)}
                      </th>
                    ))}
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Média
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide min-w-[200px]">
                      Boletim
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {alunos.map((a) => {
                    const sit = situacoes[a.id]
                    const emitido = boletimEmitido(a.id)
                    return (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 sticky left-0 bg-white z-10">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold flex items-center justify-center shrink-0">
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
                              <p className="text-[10px] text-gray-400">
                                {sit
                                  ? sit.regular
                                    ? '✓ Regular'
                                    : `✗ ${sit.meses_em_falta.length} mês(es) em falta`
                                  : '—'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {disciplinasAplicaveis.map((d) => (
                          <td key={d.id} className="px-1 py-1.5 text-center">
                            <CelulaNota
                              valor={getNota(a.id, d.id)}
                              publicado={getPublicado(a.id, d.id)}
                              onGuardar={(v) => handleGuardar(a.id, d.id, v)}
                            />
                          </td>
                        ))}

                        <td className="text-center px-4 py-2">
                          <span className="text-sm font-semibold text-gray-700">
                            {mediaAluno(a.id)}
                          </span>
                        </td>

                        <td className="text-center px-4 py-2">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            <button
                              onClick={() => setAlunoSelecionado(a)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium transition"
                            >
                              Ver boletim
                            </button>

                            {emitido ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-100 rounded-full px-3 py-1">
                                ✓ Emitido
                              </span>
                            ) : !sit?.regular ? (
                              <button
                                disabled
                                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed"
                                title={`Meses em falta: ${sit?.meses_em_falta?.join(', ') ?? '—'}`}
                              >
                                Irregular
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEmitirBoletim(a.id, a.full_name)}
                                disabled={aGravar}
                                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium transition"
                              >
                                📄 Emitir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-400 text-center">
            {alunos.length} aluno{alunos.length !== 1 ? 's' : ''} ·{' '}
            {disciplinasAplicaveis.length} disciplina
            {disciplinasAplicaveis.length !== 1 ? 's' : ''} ·{' '}
            {classeSelecionada &&
              classes.find((c) => c.id === classeSelecionada)?.name}
          </p>
        </>
      )}

      {/* MODAL DO BOLETIM INDIVIDUAL */}
      {alunoSelecionado && (
        <BoletimIndividual
          aluno={alunoSelecionado}
          disciplinas={disciplinasAplicaveis}
          periodo={periodo}
          onFechar={() => setAlunoSelecionado(null)}
        />
      )}
    </div>
  )
}

/* ---------- Célula de nota ---------- */

function CelulaNota({
  valor,
  publicado,
  onGuardar,
}: {
  valor: number | null
  publicado: boolean
  onGuardar: (v: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [txt, setTxt] = useState(valor !== null ? String(valor) : '')
  const [ultimoValor, setUltimoValor] = useState(valor)

  if (valor !== ultimoValor) {
    setUltimoValor(valor)
    setTxt(valor !== null ? String(valor) : '')
  }

  function commit() {
    setEditando(false)
    if (txt !== (valor !== null ? String(valor) : '')) {
      onGuardar(txt)
    }
  }

  const cor =
    valor === null
      ? ''
      : valor >= 14
      ? 'text-green-700 bg-green-50'
      : valor >= 10
      ? 'text-gray-900 bg-gray-50'
      : 'text-red-700 bg-red-50'

  if (editando) {
    return (
      <input
        type="text"
        value={txt}
        autoFocus
        onChange={(e) => setTxt(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setTxt(valor !== null ? String(valor) : '')
            setEditando(false)
          }
        }}
        className="w-14 text-center px-1 py-1 rounded border border-blue-400 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
      />
    )
  }

  return (
    <button
      onClick={() => setEditando(true)}
      className={`w-14 h-8 rounded text-sm font-medium transition hover:ring-2 hover:ring-blue-200 relative ${cor} ${
        valor === null ? 'text-gray-300 hover:bg-gray-50' : ''
      }`}
    >
      {valor !== null ? valor.toFixed(0) : '—'}
      {publicado && (
        <span
          className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500"
          title="Publicada"
        ></span>
      )}
    </button>
  )
}