'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

type Item = {
  disciplina: string
  valor: number | null
}

type Periodo = {
  periodo: string
  itens: Item[]
  media: number | null
  emitido_em: string | null
  file_url: string | null
}

export default function NotasAlunoClient({
  periodos,
}: {
  periodos: Periodo[]
}) {
  const supabase = createClient()
  const [filtro, setFiltro] = useState<string>('')
  const [aDescarregar, setADescarregar] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  // Média global — só faz sentido quando há 2+ períodos
  const mediaGlobal = useMemo(() => {
    if (periodos.length < 2) return null
    const todos: number[] = []
    for (const p of periodos) {
      for (const i of p.itens) {
        if (i.valor !== null) todos.push(i.valor)
      }
    }
    if (todos.length === 0) return null
    return todos.reduce((a, b) => a + b, 0) / todos.length
  }, [periodos])

  const periodosFiltrados = useMemo(() => {
    if (!filtro) return periodos
    return periodos.filter((p) => p.periodo === filtro)
  }, [periodos, filtro])

  async function descarregarBoletim(periodo: string, fileUrl: string) {
    setErro('')
    setADescarregar(periodo)

    const { data, error } = await supabase.storage
      .from('boletins')
      .createSignedUrl(fileUrl, 300)

    if (error || !data?.signedUrl) {
      setErro(
        'Não foi possível abrir o boletim. Contacte a secretaria se persistir.'
      )
      setADescarregar(null)
      return
    }

    window.open(data.signedUrl, '_blank')
    setADescarregar(null)
  }

  if (periodos.length === 0) {
    return (
      <div className="mt-6 bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
        <div className="text-4xl mb-3">📚</div>
        <p className="text-gray-500 text-sm">Ainda não há notas publicadas.</p>
        <p className="mt-1 text-xs text-gray-400">
          Assim que a escola publicar o boletim, aparece aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-6">
      {erro && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {erro}
        </div>
      )}

      {/* MÉDIA GLOBAL — só mostra se houver 2+ períodos */}
      {mediaGlobal !== null && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-blue-100">
                Média global do ano
              </p>
              <p className="mt-1 text-4xl font-bold">
                {mediaGlobal.toFixed(1)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-100">
                {periodos.length} períodos
              </p>
              <p className="text-xs text-blue-100 mt-1">
                {periodos.filter((p) => p.file_url).length} boletim
                {periodos.filter((p) => p.file_url).length !== 1 ? 's' : ''}{' '}
                emitido
                {periodos.filter((p) => p.file_url).length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FILTRO — só aparece se houver 2+ períodos */}
      {periodos.length > 1 && (
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs text-gray-500">Período:</span>
          <button
            onClick={() => setFiltro('')}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              filtro === ''
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Todos
          </button>
          {periodos.map((p) => (
            <button
              key={p.periodo}
              onClick={() => setFiltro(p.periodo)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                filtro === p.periodo
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.periodo.replace('-T', ' — ')}º Trim.
            </button>
          ))}
        </div>
      )}

      {/* LISTA DE PERÍODOS */}
      {periodosFiltrados.map((p) => {
        const corMedia =
          p.media === null
            ? 'text-gray-400'
            : p.media >= 14
            ? 'text-green-700'
            : p.media >= 10
            ? 'text-gray-900'
            : 'text-red-700'

        const temBoletim = !!p.emitido_em && !!p.file_url

        return (
          <div
            key={p.periodo}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden"
          >
            {/* CABEÇALHO DO PERÍODO */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">
                  {p.periodo.split('-T')[1] ?? '?'}º
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {p.periodo.replace('-T', ' — ')}º Trimestre
                  </p>
                  <p className="text-xs text-gray-500">
                    {p.itens.length} disciplina
                    {p.itens.length !== 1 ? 's' : ''}
                    {p.emitido_em && (
                      <>
                        {' '}
                        · boletim emitido em{' '}
                        {new Date(p.emitido_em).toLocaleDateString('pt-PT')}
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Média</p>
                  <p className={`text-xl font-bold ${corMedia}`}>
                    {p.media !== null ? p.media.toFixed(1) : '—'}
                  </p>
                </div>

                {temBoletim && (
                  <button
                    onClick={() => descarregarBoletim(p.periodo, p.file_url!)}
                    disabled={aDescarregar === p.periodo}
                    className="text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium transition inline-flex items-center gap-2"
                  >
                    {aDescarregar === p.periodo ? (
                      'A preparar…'
                    ) : (
                      <>📄 Descarregar boletim</>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* GRELHA DE DISCIPLINAS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-gray-100">
              {p.itens.map((item, i) => {
                const cor =
                  item.valor === null
                    ? 'text-gray-300'
                    : item.valor >= 14
                    ? 'text-green-700'
                    : item.valor >= 10
                    ? 'text-gray-900'
                    : 'text-red-700'

                return (
                  <div key={i} className="bg-white p-4">
                    <p className="text-xs text-gray-500 truncate">
                      {item.disciplina}
                    </p>
                    <p className={`mt-1 text-2xl font-semibold ${cor}`}>
                      {item.valor !== null ? item.valor.toFixed(0) : '—'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {item.valor === null
                        ? 'Sem nota'
                        : item.valor >= 14
                        ? 'Bom'
                        : item.valor >= 10
                        ? 'Suficiente'
                        : 'Insuficiente'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <p className="text-xs text-gray-400 text-center pt-2">
        Só aparecem aqui as notas publicadas pela secretaria.
      </p>
    </div>
  )
}