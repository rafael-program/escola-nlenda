'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { apagarAluno, gerarLinkDocumento } from './actions'

type Aluno = {
  id: string
  full_name: string
  birth_date: string | null
  telefone_pai: string | null
  nome_pai: string | null
  bi_file_url: string | null
  certificate_file_url: string | null
  class_id: number | null
  turma_id: number | null
  classe: string | null
  turma: string | null
}

type Classe = { id: number; name: string }

export default function AlunosClient({
  alunos,
  classes,
}: {
  alunos: Aluno[]
  classes: Classe[]
}) {
  const [busca, setBusca] = useState('')
  const [filtroClasse, setFiltroClasse] = useState<string>('')
  const [erro, setErro] = useState('')
  const [aCarregar, startTransition] = useTransition()

  const filtrados = useMemo(() => {
    let lista = alunos
    if (filtroClasse)
      lista = lista.filter((a) => String(a.class_id) === filtroClasse)
    if (busca.trim()) {
      const q = busca.toLowerCase()
      lista = lista.filter(
        (a) =>
          a.full_name.toLowerCase().includes(q) ||
          (a.telefone_pai ?? '').includes(q) ||
          (a.nome_pai ?? '').toLowerCase().includes(q)
      )
    }
    return lista
  }, [alunos, busca, filtroClasse])

  function handleApagar(id: string, nome: string) {
    if (!confirm(`Apagar o aluno "${nome}"? Esta ação é irreversível.`))
      return
    startTransition(async () => {
      const r = await apagarAluno(id)
      if (r?.erro) setErro(r.erro)
    })
  }

  async function abrirDocumento(path: string) {
    const r = await gerarLinkDocumento(path)
    if (r?.url) window.open(r.url, '_blank')
    else setErro(r?.erro ?? 'Erro ao abrir documento.')
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Alunos</h1>
          <p className="mt-1 text-sm text-gray-500">
            {alunos.length} aluno{alunos.length !== 1 ? 's' : ''} registado
            {alunos.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <Link
          href="/secretario/alunos/novo"
          className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
        >
          + Novo aluno
        </Link>
      </div>

      {erro && (
        <div className="mt-4 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {erro}
        </div>
      )}

      {/* FILTROS */}
      {alunos.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Procurar por nome, telefone ou nome do pai…"
              className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
            />
            <span className="text-xs text-gray-500">
              {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
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
              Todas ({alunos.length})
            </button>
            {classes.map((c) => {
              const total = alunos.filter((a) => a.class_id === c.id).length
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

      {/* LISTA */}
      {alunos.length === 0 ? (
        <div className="mt-6 bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">
            Ainda não há alunos registados.
          </p>
          <Link
            href="/secretario/alunos/novo"
            className="mt-4 inline-block px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            Criar primeiro aluno
          </Link>
        </div>
      ) : (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Nome</th>
                  <th className="text-left px-5 py-3 font-medium">
                    Classe / Turma
                  </th>
                  <th className="text-left px-5 py-3 font-medium">
                    Encarregado
                  </th>
                  <th className="text-left px-5 py-3 font-medium">
                    Documentos
                  </th>
                  <th className="text-right px-5 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-gray-400 text-sm"
                    >
                      Nenhum aluno corresponde aos filtros.
                    </td>
                  </tr>
                )}
                {filtrados.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center shrink-0">
                          {a.full_name
                            .split(' ')
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {a.full_name}
                          </p>
                          {a.birth_date && (
                            <p className="text-xs text-gray-400">
                              {new Date(a.birth_date).toLocaleDateString(
                                'pt-PT'
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3 text-gray-600">
                      {a.classe ?? '—'}
                      {a.turma && (
                        <span className="text-gray-400"> / {a.turma}</span>
                      )}
                    </td>

                    <td className="px-5 py-3">
                      <p className="text-sm text-gray-900">
                        {a.telefone_pai ?? '—'}
                      </p>
                      {a.nome_pai && (
                        <p className="text-xs text-gray-400 truncate">
                          {a.nome_pai}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        {a.bi_file_url ? (
                          <button
                            onClick={() => abrirDocumento(a.bi_file_url!)}
                            className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition"
                            title="Ver BI"
                          >
                            BI
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                        {a.certificate_file_url ? (
                          <button
                            onClick={() =>
                              abrirDocumento(a.certificate_file_url!)
                            }
                            className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition"
                            title="Ver certificado"
                          >
                            Cert.
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleApagar(a.id, a.full_name)}
                        disabled={aCarregar}
                        className="text-xs text-gray-600 hover:text-red-600 disabled:opacity-50"
                      >
                        Apagar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}