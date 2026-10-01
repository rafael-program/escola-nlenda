'use client'

import { useState, useTransition, useRef, useMemo } from 'react'
import { criarTurma, apagarTurma, atualizarTurma } from './actions'

type Turma = {
  id: number
  name: string
  class_id: number
  created_at: string
  classes: { name: string } | null
}

type Classe = { id: number; name: string }

export default function TurmasClient({
  turmas,
  classes,
}: {
  turmas: Turma[]
  classes: Classe[]
}) {
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [aCarregar, startTransition] = useTransition()
  const [editando, setEditando] = useState<number | null>(null)
  const [filtroClasse, setFiltroClasse] = useState<string>('')
  const [busca, setBusca] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  const porClasse = useMemo(() => {
    const mapa = new Map<number, { classe: string; turmas: Turma[] }>()
    for (const t of turmas) {
      if (!mapa.has(t.class_id)) {
        mapa.set(t.class_id, { classe: t.classes?.name ?? '—', turmas: [] })
      }
      mapa.get(t.class_id)!.turmas.push(t)
    }
    return Array.from(mapa.entries()).sort((a, b) =>
      a[1].classe.localeCompare(b[1].classe)
    )
  }, [turmas])

  const turmasFiltradas = useMemo(() => {
    let lista = turmas
    if (filtroClasse) lista = lista.filter((t) => String(t.class_id) === filtroClasse)
    if (busca.trim()) {
      const q = busca.toLowerCase()
      lista = lista.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.classes?.name ?? '').toLowerCase().includes(q)
      )
    }
    return lista
  }, [turmas, filtroClasse, busca])

  async function handleCriar(formData: FormData) {
    setErro('')
    setOk('')

    const name = String(formData.get('name') || '').trim()
    const class_id = formData.get('class_id')

    if (!name) { setErro('Indique o nome da turma.'); return }
    if (!class_id) { setErro('Escolha uma classe.'); return }

    const r = await criarTurma(formData)

    if (r?.erro) {
      setErro(r.erro)
    } else {
      setOk(`Turma "${name}" criada.`)
      formRef.current?.reset()
      setTimeout(() => setOk(''), 3000)
    }
  }

  function handleApagar(id: number, nome: string) {
    if (!confirm(`Apagar a turma "${nome}"?`)) return
    startTransition(async () => {
      const r = await apagarTurma(id)
      if (r?.erro) setErro(r.erro)
    })
  }

  return (
    <div>
      {/* CABEÇALHO */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Turmas</h1>
        <p className="mt-1 text-sm text-gray-500">
          {turmas.length} turma{turmas.length !== 1 ? 's' : ''} em {porClasse.length} classe{porClasse.length !== 1 ? 's' : ''}.
        </p>
      </div>

      {classes.length === 0 && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          Ainda não há classes. <a href="/secretario/classes" className="underline font-medium">Crie primeiro uma classe</a>.
        </div>
      )}

      {/* FORMULÁRIO */}
      <form
        ref={formRef}
        action={handleCriar}
        className="mt-6 bg-white border border-gray-200 rounded-xl p-5"
      >
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Classe</label>
            <select
              name="class_id"
              required
              className="px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
            >
              <option value="">Escolher…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500 block mb-1">Nome da turma</label>
            <input
              name="name"
              required
              placeholder="Ex: A, B, C"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={classes.length === 0}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition"
          >
            + Criar turma
          </button>
        </div>

        {erro && (
          <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {erro}
          </div>
        )}
        {ok && (
          <div className="mt-3 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            {ok}
          </div>
        )}
      </form>

      {/* PESQUISA E FILTROS */}
      {turmas.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Procurar turma…"
              className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
            />
            <span className="text-xs text-gray-500">
              {turmasFiltradas.length} resultado{turmasFiltradas.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-xs text-gray-500">Classe:</span>
            <button
              onClick={() => setFiltroClasse('')}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                filtroClasse === ''
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Todas ({turmas.length})
            </button>
            {classes.map((c) => {
              const total = turmas.filter((t) => t.class_id === c.id).length
              if (total === 0) return null
              return (
                <button
                  key={c.id}
                  onClick={() => setFiltroClasse(String(c.id))}
                  className={`text-xs px-3 py-1 rounded-full border transition ${
                    filtroClasse === String(c.id)
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {c.name} ({total})
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* LISTA — cartões agrupados */}
      <div className="mt-6 space-y-5">
        {turmasFiltradas.length === 0 && turmas.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            Nenhuma turma corresponde à pesquisa.
          </div>
        )}

        {porClasse.map(([classId, grupo]) => {
          const visiveis = turmasFiltradas.filter((t) => t.class_id === classId)
          if (visiveis.length === 0) return null
          return (
            <div
              key={classId}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">
                    {grupo.classe.charAt(0).toUpperCase()}
                  </span>
                  <p className="font-medium text-gray-900 text-sm">
                    {grupo.classe}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {visiveis.length} turma{visiveis.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {visiveis.map((t) =>
                  editando === t.id ? (
                    <form
                      key={t.id}
                      action={async (fd) => {
                        const r = await atualizarTurma(t.id, fd)
                        if (r?.erro) setErro(r.erro)
                        else setEditando(null)
                      }}
                      className="border border-blue-300 rounded-lg p-3 space-y-2 col-span-2"
                    >
                      <input
                        name="name"
                        defaultValue={t.name}
                        className="w-full px-2 py-1 rounded border border-gray-200 text-sm"
                        autoFocus
                      />
                      <select
                        name="class_id"
                        defaultValue={t.class_id}
                        className="w-full px-2 py-1 rounded border border-gray-200 text-xs bg-white"
                      >
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setEditando(null)}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Cancelar
                        </button>
                        <button className="text-xs text-blue-600 hover:underline font-medium">
                          Guardar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div
                      key={t.id}
                      className="group border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-700 text-sm font-semibold flex items-center justify-center">
                          {t.name}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition flex gap-1">
                          <button
                            onClick={() => setEditando(t.id)}
                            title="Editar"
                            className="text-gray-400 hover:text-blue-600 text-xs p-1"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleApagar(t.id, t.name)}
                            disabled={aCarregar}
                            title="Apagar"
                            className="text-gray-400 hover:text-red-600 text-xs p-1"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(t.created_at).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}