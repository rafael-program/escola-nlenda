'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type AlunoResumo = {
  id: string
  nome: string
  nome_pai: string | null
  telefone: string | null
  classe: string | null
  total: number
  n_recibos: number
  ultimo_pagamento: string
  servicos: string[]
}

export default function RecibosClient({
  alunos,
  totalGeral,
  totalRecibos,
}: {
  alunos: AlunoResumo[]
  totalGeral: number
  totalRecibos: number
}) {
  const [busca, setBusca] = useState('')

  const filtrados = useMemo(() => {
    if (!busca.trim()) return alunos
    const q = busca.toLowerCase()
    return alunos.filter(
      (a) =>
        a.nome.toLowerCase().includes(q) ||
        (a.nome_pai ?? '').toLowerCase().includes(q) ||
        (a.telefone ?? '').includes(q)
    )
  }, [alunos, busca])

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Recibos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Todos os recibos emitidos, agrupados por aluno.
        </p>
      </div>

      {/* RESUMO */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Alunos com recibos</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {alunos.length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total de recibos</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {totalRecibos}
          </p>
        </div>
        <div className="bg-white border border-blue-200 bg-blue-50/40 rounded-xl p-4">
          <p className="text-xs text-blue-700">Valor total pago</p>
          <p className="mt-1 text-2xl font-semibold text-blue-700">
            {totalGeral.toLocaleString('pt-PT')}
            <span className="text-sm font-normal"> Kz</span>
          </p>
        </div>
      </div>

      {/* PESQUISA */}
      <div className="mt-6">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Procurar por nome, nome do pai ou telefone…"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
        />
      </div>

      {/* LISTA DE ALUNOS */}
      <div className="mt-6 space-y-3">
        {filtrados.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <div className="text-4xl mb-3">🧾</div>
            <p className="text-gray-500 text-sm">
              {alunos.length === 0
                ? 'Ainda não há recibos emitidos.'
                : 'Nenhum aluno corresponde à pesquisa.'}
            </p>
          </div>
        ) : (
          filtrados.map((a) => (
            <Link
              key={a.id}
              href={`/secretario/recibos/${a.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition group"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center shrink-0">
                  {a.nome
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {a.nome}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {a.classe ?? '—'}
                    {a.nome_pai && ` · Pai: ${a.nome_pai}`}
                    {a.telefone && ` · ${a.telefone}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {a.servicos.slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                      >
                        {s}
                      </span>
                    ))}
                    {a.servicos.length > 4 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        +{a.servicos.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                {/* Valores */}
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-gray-900">
                    {a.total.toLocaleString('pt-PT')}{' '}
                    <span className="text-xs font-normal text-gray-500">Kz</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {a.n_recibos} recibo{a.n_recibos !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Último:{' '}
                    {new Date(a.ultimo_pagamento).toLocaleDateString('pt-PT')}
                  </p>
                </div>

                {/* Seta */}
                <span className="text-gray-300 group-hover:text-blue-600 transition shrink-0">
                  →
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}