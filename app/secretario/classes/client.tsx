'use client'

import { useState, useTransition } from 'react'
import { criarClasse, apagarClasse, atualizarClasse } from './actions'

type Classe = { id: number; name: string; created_at: string }

export default function ClassesClient({ classes }: { classes: Classe[] }) {
  const [erro, setErro] = useState('')
  const [aCarregar, startTransition] = useTransition()
  const [editando, setEditando] = useState<number | null>(null)

  async function handleCriar(formData: FormData) {
    setErro('')
    const r = await criarClasse(formData)
    if (r?.erro) setErro(r.erro)
  }

  function handleApagar(id: number) {
    if (!confirm('Apagar esta classe? Alunos associados ficarão sem classe.')) return
    startTransition(async () => {
      const r = await apagarClasse(id)
      if (r?.erro) alert(r.erro)
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Classes</h1>
      <p className="mt-1 text-sm text-gray-500">
        Crie e gira as classes da escola (ex: 10ª, 11ª, 12ª).
      </p>

      {/* FORMULÁRIO DE CRIAÇÃO */}
      <form
        action={handleCriar}
        className="mt-6 bg-white border border-gray-200 rounded-lg p-5 flex flex-wrap gap-3 items-end"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 block mb-1">Nome da classe</label>
          <input
            name="name"
            required
            placeholder="Ex: 10ª Classe"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
        >
          + Criar classe
        </button>
        {erro && <p className="w-full text-xs text-red-600">{erro}</p>}
      </form>

      {/* LISTA */}
      <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Nome</th>
              <th className="text-left px-5 py-3 font-medium">Criada em</th>
              <th className="text-right px-5 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {classes.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-gray-400 text-sm">
                  Ainda não há classes. Crie a primeira acima.
                </td>
              </tr>
            )}
            {classes.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  {editando === c.id ? (
                    <form
                      action={async (fd) => {
                        const r = await atualizarClasse(c.id, fd)
                        if (r?.erro) setErro(r.erro)
                        else setEditando(null)
                      }}
                      className="flex gap-2"
                    >
                      <input
                        name="name"
                        defaultValue={c.name}
                        className="px-2 py-1 rounded border border-gray-200 text-sm"
                      />
                      <button className="text-xs text-blue-600 hover:underline">
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditando(null)}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <span className="text-gray-900 font-medium">{c.name}</span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-500">
                  {new Date(c.created_at).toLocaleDateString('pt-PT')}
                </td>
                <td className="px-5 py-3 text-right space-x-3">
                  <button
                    onClick={() => setEditando(c.id)}
                    className="text-xs text-gray-600 hover:text-blue-600"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleApagar(c.id)}
                    disabled={aCarregar}
                    className="text-xs text-gray-600 hover:text-red-600"
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
  )
}