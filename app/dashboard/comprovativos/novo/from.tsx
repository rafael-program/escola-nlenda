'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { enviarComprovativo } from '../actions'

type Mes = {
  chave: string
  label: string
  status: 'pago' | 'pending' | 'rejected' | null
}

export default function NovoComprovativoForm({ meses }: { meses: Mes[] }) {
  const router = useRouter()
  const [mesSelecionado, setMesSelecionado] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [erro, setErro] = useState('')
  const [aCarregar, setACarregar] = useState(false)

 

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

    // Preview só para imagens
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro('')

    if (!mesSelecionado) {
      setErro('Escolha o mês do pagamento.')
      return
    }
    if (!file) {
      setErro('Anexe o comprovativo.')
      return
    }

    setACarregar(true)
    const formData = new FormData()
    formData.append('month', mesSelecionado)
    formData.append('file', file)
    formData.append('notes', notes)

    const r = await enviarComprovativo(formData)

    if (r?.erro) {
      setErro(r.erro)
      setACarregar(false)
      return
    }

    router.push('/dashboard/comprovativos?sucesso=1')
  }

  const mesInfo = meses.find((m) => m.chave === mesSelecionado)

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* COLUNA ESQUERDA — FORM */}
      <div className="lg:col-span-2 space-y-6">

        {/* MÊS */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900">
            1. Mês do pagamento
          </h2>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {meses.map((m) => {
              const bloqueado = m.status === 'pago'
              const ativo = mesSelecionado === m.chave
              const corStatus =
                m.status === 'pago'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : m.status === 'pending'
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : m.status === 'rejected'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'

              return (
                <button
                  key={m.chave}
                  type="button"
                  disabled={bloqueado}
                  onClick={() => setMesSelecionado(m.chave)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-sm transition ${
                    ativo
                      ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-100'
                      : bloqueado
                      ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : corStatus
                  }`}
                >
                  <p className="font-medium">{m.label}</p>
                  <p className="text-xs mt-0.5">
                    {m.status === 'pago'
                      ? '✓ Pago'
                      : m.status === 'pending'
                      ? '⏳ Em análise'
                      : m.status === 'rejected'
                      ? '✗ Rejeitado'
                      : 'Enviar'}
                  </p>
                </button>
              )
            })}
          </div>

          {mesInfo?.status === 'rejected' && (
            <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              Este mês foi rejeitado anteriormente. Ao enviar um novo
              comprovativo, o anterior será substituído.
            </div>
          )}
        </section>

        {/* FICHEIRO */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900">
            2. Comprovativo
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Fotografia (JPG, PNG) ou PDF · Máx. 5 MB
          </p>

          {!file ? (
            <label className="mt-4 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-8 cursor-pointer transition bg-gray-50/50">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl">
                📎
              </div>
              <p className="text-sm font-medium text-gray-700">
                Clique para escolher o ficheiro
              </p>
              <p className="text-xs text-gray-400">
                ou arraste para aqui
              </p>
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

        {/* NOTA */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900">
            3. Nota (opcional)
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="Ex: transferência de 25.000 Kz pelo BAI, ref. 12345"
            className="mt-3 w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm resize-none"
          />
          <p className="mt-1 text-xs text-gray-400 text-right">
            {notes.length}/300
          </p>
        </section>

        {erro && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {erro}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={aCarregar || !mesSelecionado || !file}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition"
          >
            {aCarregar ? 'A enviar…' : 'Enviar comprovativo'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium transition"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* COLUNA DIREITA — RESUMO */}
      <aside className="lg:col-span-1">
        <div className="bg-white border border-gray-200 rounded-xl p-6 lg:sticky lg:top-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Resumo do envio
          </h3>

          <div className="mt-4 space-y-3 text-sm">
            <Linha label="Mês" valor={mesInfo?.label ?? '—'} />
            <Linha
              label="Ficheiro"
              valor={file ? `${(file.size / 1024).toFixed(0)} KB` : '—'}
            />
            <Linha label="Nota" valor={notes ? 'Sim' : '—'} />
          </div>

          <hr className="my-5 border-gray-100" />

          <div className="text-xs text-gray-500 leading-relaxed space-y-2">
            <p>
              <strong className="text-gray-700">Como funciona:</strong>
            </p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Envia o comprovativo</li>
              <li>A secretaria analisa em 48h úteis</li>
              <li>
                Se aprovado, o mês fica{' '}
                <span className="text-green-700 font-medium">verde</span> no
                teu painel
              </li>
              <li>Podes descarregar o comprovativo final</li>
            </ol>
          </div>

          {mesSelecionado && file && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-green-700">
                <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  ✓
                </span>
                Pronto para enviar
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
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium truncate text-right">
        {valor}
      </span>
    </div>
  )
}