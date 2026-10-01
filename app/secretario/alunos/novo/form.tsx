'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { criarAluno } from '../actions'

type Classe = { id: number; name: string }
type Turma = { id: number; name: string; class_id: number }

const SENHA_PADRAO = 'Nlendaylenda'

/**
 * Converte um telefone como "+244 923 456 789" ou "923456789"
 * no formato usado internamente para o email do Supabase Auth.
 * Ex: "923456789" → "923456789@escola.local"
 */
function telefoneParaEmail(telefone: string): string {
  const limpo = telefone.replace(/\D/g, '')
  return `${limpo}@escola.local`
}

export default function NovoAlunoForm({
  classes,
  turmas,
}: {
  classes: Classe[]
  turmas: Turma[]
}) {
  const router = useRouter()
  const [erro, setErro] = useState('')
  const [aCarregar, setACarregar] = useState(false)

  // Campos controlados
  const [nome, setNome] = useState('')
  const [nomePai, setNomePai] = useState('')
  const [telefonePai, setTelefonePai] = useState('')
  const [password, setPassword] = useState(SENHA_PADRAO)

  const [classId, setClassId] = useState('')
  const [turmaId, setTurmaId] = useState('')

  const [biFile, setBiFile] = useState<File | null>(null)
  const [certFile, setCertFile] = useState<File | null>(null)

  const turmasFiltradas = useMemo(
    () => (classId ? turmas.filter((t) => String(t.class_id) === classId) : []),
    [classId, turmas]
  )

  const classeSelecionada = useMemo(
    () => classes.find((c) => String(c.id) === classId)?.name ?? null,
    [classId, classes]
  )

  const turmaSelecionada = useMemo(
    () => turmasFiltradas.find((t) => String(t.id) === turmaId)?.name ?? null,
    [turmaId, turmasFiltradas]
  )

  const emailInterno = useMemo(
    () => (telefonePai ? telefoneParaEmail(telefonePai) : ''),
    [telefonePai]
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro('')

    if (!nome.trim()) {
      setErro('Indique o nome do aluno.')
      return
    }
    if (!telefonePai.trim() || telefonePai.replace(/\D/g, '').length < 9) {
      setErro('Indique um telefone válido do pai/encarregado.')
      return
    }
    if (!password || password.length < 6) {
      setErro('A senha inicial precisa de pelo menos 6 caracteres.')
      return
    }

    setACarregar(true)

    const formData = new FormData(e.currentTarget)
    formData.set('email', emailInterno)
    formData.set('password', password)
    formData.set('telefone_pai', telefonePai)
    formData.set('nome_pai', nomePai)

    const r = await criarAluno(formData)

    if (r?.erro) {
      setErro(r.erro)
      setACarregar(false)
      return
    }

    router.push('/secretario/alunos')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* COLUNA ESQUERDA */}
      <div className="lg:col-span-2 space-y-6">
        {/* DADOS DO ALUNO */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900">
            Dados do aluno
          </h2>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 block mb-1">
                Nome completo *
              </label>
              <input
                name="full_name"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Rafael Domingos"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Data de nascimento
              </label>
              <input
                type="date"
                name="birth_date"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>
          </div>
        </section>

        {/* ENCARREGADO */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900">
            Encarregado (pai / mãe / tutor)
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Estes dados servem para contacto e para acesso ao portal.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Nome do encarregado
              </label>
              <input
                name="nome_pai"
                value={nomePai}
                onChange={(e) => setNomePai(e.target.value)}
                placeholder="Ex: Sr. Manuel Domingos"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Telefone do encarregado *
              </label>
              <input
                name="telefone_pai"
                required
                value={telefonePai}
                onChange={(e) => setTelefonePai(e.target.value)}
                placeholder="+244 9XX XXX XXX"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
              />
            </div>
          </div>
        </section>

        {/* TURMA */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900">Turma</h2>
          <p className="mt-1 text-xs text-gray-500">
            Escolha a classe e a turma onde o aluno vai ficar.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Classe</label>
              <select
                name="class_id"
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value)
                  setTurmaId('')
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
              >
                <option value="">— Sem classe —</option>
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
                name="turma_id"
                value={turmaId}
                onChange={(e) => setTurmaId(e.target.value)}
                disabled={!classId || turmasFiltradas.length === 0}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">
                  {!classId
                    ? 'Escolha primeiro a classe'
                    : turmasFiltradas.length === 0
                    ? 'Sem turmas nesta classe'
                    : '— Sem turma —'}
                </option>
                {turmasFiltradas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* DOCUMENTOS */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900">Documentos</h2>
          <p className="mt-1 text-xs text-gray-500">
            Apenas PDF. Máximo 5 MB por ficheiro.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileInput
              name="bi_file"
              label="BI (PDF)"
              file={biFile}
              onChange={setBiFile}
            />
            <FileInput
              name="certificate_file"
              label="Certificado / Declaração (PDF)"
              file={certFile}
              onChange={setCertFile}
            />
          </div>
        </section>

        {/* ACESSO AO PORTAL */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900">
            Acesso ao portal
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            O encarregado entra com o telefone e a senha padrão da escola.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Telefone de acesso
              </label>
              <input
                type="text"
                value={telefonePai}
                readOnly
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 outline-none text-sm cursor-not-allowed"
                placeholder="Preencha o telefone do encarregado acima"
              />
              <p className="mt-1 text-[10px] text-gray-400">
                O acesso é feito pelo telefone. Não é preciso email.
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Senha inicial
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  name="password"
                  value={password}
                  readOnly
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-blue-50 text-blue-900 font-mono outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SENHA_PADRAO)
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs text-gray-600"
                >
                  Copiar
                </button>
              </div>
              <p className="mt-1 text-[10px] text-gray-400">
                <strong>Senha padrão para todos os alunos:</strong>{' '}
                {SENHA_PADRAO}. Entregue ao encarregado — ele pode alterá-la
                depois.
              </p>
            </div>
          </div>
        </section>

        {erro && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {erro}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={aCarregar}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition"
          >
            {aCarregar ? 'A criar…' : 'Criar aluno'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium transition"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* COLUNA DIREITA — RESUMO */}
      <aside className="lg:col-span-1">
        <div className="bg-white border border-gray-200 rounded-xl p-6 lg:sticky lg:top-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Resumo
          </h3>

          <div className="mt-4 space-y-3 text-sm">
            <ResumoLinha label="Nome" valor={nome || '—'} />
            <ResumoLinha label="Encarregado" valor={nomePai || '—'} />
            <ResumoLinha label="Telefone" valor={telefonePai || '—'} />
            <ResumoLinha label="Classe" valor={classeSelecionada ?? '—'} />
            <ResumoLinha label="Turma" valor={turmaSelecionada ?? '—'} />
          </div>

          <hr className="my-4 border-gray-100" />

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Documentos
          </h3>
          <div className="mt-3 space-y-2 text-sm">
            <DocLinha label="BI" file={biFile} />
            <DocLinha label="Certificado" file={certFile} />
          </div>

          <hr className="my-4 border-gray-100" />

          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Acesso
          </h3>
          <div className="mt-3 space-y-2 text-sm">
            <ResumoLinha label="Telefone" valor={telefonePai || '—'} />
            <ResumoLinha label="Senha" valor="Nlendaylenda" />
          </div>

          <div className="mt-6 text-xs text-gray-400 leading-relaxed">
            Ao criar o aluno, será criado um utilizador no portal com o
            telefone indicado e a senha padrão da escola. O encarregado entra
            no portal com esses dados.
          </div>
        </div>
      </aside>
    </form>
  )
}

/* ---------- Auxiliares ---------- */

function FileInput({
  name,
  label,
  file,
  onChange,
}: {
  name: string
  label: string
  file: File | null
  onChange: (f: File | null) => void
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <label className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-400 cursor-pointer transition bg-white">
        <span className="text-sm text-gray-600 truncate">
          {file ? file.name : 'Escolher ficheiro…'}
        </span>
        <span className="text-xs font-medium text-blue-600 shrink-0">
          Procurar
        </span>
        <input
          type="file"
          name={name}
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            if (f && f.size > 5 * 1024 * 1024) {
              alert('Ficheiro demasiado grande (máx. 5 MB).')
              e.target.value = ''
              onChange(null)
              return
            }
            onChange(f)
          }}
        />
      </label>
    </div>
  )
}

function ResumoLinha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium truncate text-right">
        {valor}
      </span>
    </div>
  )
}

function DocLinha({ label, file }: { label: string; file: File | null }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span
        className={file ? 'text-green-600 text-xs' : 'text-gray-300 text-xs'}
      >
        {file ? `${(file.size / 1024).toFixed(0)} KB` : 'Não anexado'}
      </span>
    </div>
  )
}