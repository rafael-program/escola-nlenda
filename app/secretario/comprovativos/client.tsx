'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type AlunoResumo = {
  id: string
  nome: string
  nome_pai: string | null
  telefone: string | null
  classe: string | null
  pendentes: number
  aprovados: number
  rejeitados: number
  total_comprovativos: number
}

type Filtro = 'all' | 'pendentes' | 'rejeitados'

export default function ComprovativosClient({
  alunos,
  totalPendentes,
  totalRejeitados,
  totalAprovados,
}: {
  alunos: AlunoResumo[]
  totalPendentes: number
  totalRejeitados: number
  totalAprovados: number
}) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('all')

  const filtrados = useMemo(() => {
    let lista = alunos

    if (filtro === 'pendentes') {
      lista = lista.filter((a) => a.pendentes > 0)
    } else if (filtro === 'rejeitados') {
      lista = lista.filter((a) => a.rejeitados > 0)
    }

    if (busca.trim()) {
      const q = busca.toLowerCase()
      lista = lista.filter(
        (a) =>
          a.nome.toLowerCase().includes(q) ||
          (a.nome_pai ?? '').toLowerCase().includes(q) ||
          (a.telefone ?? '').includes(q)
      )
    }
    return lista
  }, [alunos, busca, filtro])

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Comprovativos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Comprovativos enviados pelos alunos, agrupados por aluno.
        </p>
      </div>

      {/* RESUMO */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Alunos</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {alunos.length}
          </p>
        </div>
        <div className="bg-white border border-amber-200 bg-amber-50/40 rounded-xl p-4">
          <p className="text-xs text-amber-700">Pendentes</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">
            {totalPendentes}
          </p>
        </div>
        <div className="bg-white border border-green-200 bg-green-50/40 rounded-xl p-4">
          <p className="text-xs text-green-700">Aprovados</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">
            {totalAprovados}
          </p>
        </div>
        <div className="bg-white border border-red-200 bg-red-50/40 rounded-xl p-4">
          <p className="text-xs text-red-700">Rejeitados</p>
          <p className="mt-1 text-2xl font-semibold text-red-700">
            {totalRejeitados}
          </p>
        </div>
      </div>

      {/* FILTROS + PESQUISA */}
      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {(
            [
              { key: 'all', label: 'Todos' },
              { key: 'pendentes', label: 'Só pendentes' },
              { key: 'rejeitados', label: 'Só rejeitados' },
            ] as { key: Filtro; label: string }[]
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

        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Procurar por nome, nome do pai ou telefone…"
          className="flex-1 min-w-[220px] px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
        />
      </div>

      {/* LISTA DE ALUNOS */}
      <div className="mt-6 space-y-3">
        {filtrados.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-gray-500 text-sm">
              {alunos.length === 0
                ? 'Ainda não há comprovativos enviados.'
                : filtro === 'pendentes'
                ? 'Nenhum aluno tem comprovativos pendentes.'
                : filtro === 'rejeitados'
                ? 'Nenhum aluno tem comprovativos rejeitados.'
                : 'Nenhum aluno corresponde à pesquisa.'}
            </p>
          </div>
        ) : (
          filtrados.map((a) => {
            const temUrgente = a.pendentes > 0
            const soRejeitados = a.pendentes === 0 && a.rejeitados > 0

            return (
              <Link
                key={a.id}
                href={`/secretario/comprovativos/${a.id}`}
                className={`block bg-white border rounded-xl p-5 hover:shadow-sm transition group ${
                  temUrgente
                    ? 'border-amber-300 hover:border-amber-400'
                    : soRejeitados
                    ? 'border-red-200 hover:border-red-300'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full text-white text-sm font-semibold flex items-center justify-center shrink-0 ${
                      temUrgente
                        ? 'bg-amber-500'
                        : soRejeitados
                        ? 'bg-red-500'
                        : 'bg-blue-600'
                    }`}
                  >
                    {a.nome
                      .split(' ')
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {a.nome}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {a.classe ?? '—'}
                      {a.nome_pai && ` · Pai: ${a.nome_pai}`}
                      {a.telefone && ` · ${a.telefone}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {a.pendentes > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-medium">
                        ⏳ {a.pendentes} pendente{a.pendentes !== 1 ? 's' : ''}
                      </span>
                    )}
                    {a.rejeitados > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-200 font-medium">
                        ✗ {a.rejeitados} rejeitado{a.rejeitados !== 1 ? 's' : ''}
                      </span>
                    )}
                    {a.pendentes === 0 && a.rejeitados === 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-800 border border-green-200 font-medium">
                        ✓ Tudo em ordem
                      </span>
                    )}
                    <span className="text-gray-300 group-hover:text-blue-600 transition">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}