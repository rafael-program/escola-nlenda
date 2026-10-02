'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  editarAluno,
  apagarAluno,
  gerarLinkDocumento,
  adicionarMesPago,
  removerMesPago,
} from '../actions'

type Aluno = {
  id: string
  full_name: string
  birth_date: string | null
  nome_pai: string | null
  telefone_pai: string | null
  bi_file_url: string | null
  certificate_file_url: string | null
  class_id: number | null
  turma_id: number | null
  classe: string | null
  turma: string | null
}

type Classe = { id: number; name: string }
type Turma = { id: number; name: string; class_id: number | null }

type Recibo = {
  id: number
  numero_recibo: string
  codigo_verificacao: string
  valor_total: number
  mes_referencia: string | null
  criado_em: string
  forma_pagamento: 'fisico' | 'banco'
  banco: string | null
  servico_codigo: string | null
  servico_nome: string
}

type Comprovativo = {
  id: number
  month: string | null
  status: string
  created_at: string
  servico_nome: string
}

const MESES: { key: string; label: string; curto: string }[] = [
  { key: '09', label: 'Setembro', curto: 'Set' },
  { key: '10', label: 'Outubro', curto: 'Out' },
  { key: '11', label: 'Novembro', curto: 'Nov' },
  { key: '12', label: 'Dezembro', curto: 'Dez' },
  { key: '01', label: 'Janeiro', curto: 'Jan' },
  { key: '02', label: 'Fevereiro', curto: 'Fev' },
  { key: '03', label: 'Março', curto: 'Mar' },
  { key: '04', label: 'Abril', curto: 'Abr' },
  { key: '05', label: 'Maio', curto: 'Mai' },
  { key: '06', label: 'Junho', curto: 'Jun' },
  { key: '07', label: 'Julho', curto: 'Jul' },
]

/**
 * Verifica se um mês (formato "AAAA-MM") já está em atraso com multa.
 * Regra: multa só após o dia 10 do mês seguinte.
 */
function mesTemMulta(chave: string, hoje: Date = new Date()): boolean {
  const [anoStr, mesStr] = chave.split('-')
  const ano = Number(anoStr)
  const mes = Number(mesStr)
  const mesSeguinte = mes === 12 ? 1 : mes + 1
  const anoSeguinte = mes === 12 ? ano + 1 : ano
  const dataLimite = new Date(
    anoSeguinte,
    mesSeguinte - 1,
    10,
    23,
    59,
    59,
    999
  )
  return hoje > dataLimite
}

function formatarMes(chave: string): string {
  const [ano, mes] = chave.split('-')
  const m = MESES.find((x) => x.key === mes)
  return `${m?.label ?? mes} ${ano}`
}

export default function AlunoDetalheClient({
  aluno,
  mesesPagos,
  recibos,
  comprovativos,
  classes,
  turmas,
}: {
  aluno: Aluno
  mesesPagos: string[]
  recibos: Recibo[]
  comprovativos: Comprovativo[]
  classes: Classe[]
  turmas: Turma[]
}) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [erro, setErro] = useState('')
  const [aCarregar, startTransition] = useTransition()
  const [mesesPagosLocal, setMesesPagosLocal] = useState(
    () => new Set(mesesPagos)
  )

  // Form state (edição)
  const [form, setForm] = useState({
    full_name: aluno.full_name,
    birth_date: aluno.birth_date ?? '',
    nome_pai: aluno.nome_pai ?? '',
    telefone_pai: aluno.telefone_pai ?? '',
    class_id: aluno.class_id ? String(aluno.class_id) : '',
    turma_id: aluno.turma_id ? String(aluno.turma_id) : '',
  })

  const anoAtual = new Date().getFullYear()
  const mesesDoAno = useMemo(
    () =>
      MESES.map((m) => {
        const mesNum = Number(m.key)
        const ano = mesNum >= 9 ? anoAtual : anoAtual + 1
        return { ...m, chave: `${ano}-${m.key}` }
      }),
    [anoAtual]
  )

  const turmasDaClasse = useMemo(
    () =>
      form.class_id
        ? turmas.filter((t) => String(t.class_id) === form.class_id)
        : [],
    [turmas, form.class_id]
  )

  const iniciais = aluno.full_name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const mesesEmFalta = mesesDoAno.filter(
    (m) => mesTemMulta(m.chave) && !mesesPagosLocal.has(m.chave)
  )

  async function abrirDocumento(path: string) {
    const r = await gerarLinkDocumento(path)
    if ('url' in r && typeof r.url === 'string') {
      window.open(r.url, '_blank')
    } else if ('erro' in r && typeof r.erro === 'string') {
      setErro(r.erro)
    } else {
      setErro('Erro ao abrir documento.')
    }
  }

  function handleGuardar() {
    setErro('')
    const fd = new FormData()
    fd.set('id', aluno.id)
    Object.entries(form).forEach(([k, v]) => fd.set(k, v))

    startTransition(async () => {
      const r = await editarAluno(fd)
      if ('erro' in r && typeof r.erro === 'string') {
        setErro(r.erro)
      } else {
        setEditando(false)
        router.refresh()
      }
    })
  }

  function handleApagar() {
    if (
      !confirm(
        `Apagar o aluno "${aluno.full_name}"? Todos os dados associados serão removidos.`
      )
    )
      return
    startTransition(async () => {
      const r = await apagarAluno(aluno.id)
      if ('erro' in r && typeof r.erro === 'string') {
        setErro(r.erro)
      } else {
        router.push('/secretario/alunos')
      }
    })
  }

  function handleAdicionarMes(chave: string) {
    setMesesPagosLocal((prev) => new Set([...prev, chave]))
    startTransition(async () => {
      const r = await adicionarMesPago(aluno.id, chave)
      if ('erro' in r && typeof r.erro === 'string') {
        setErro(r.erro)
        // Reverter em caso de erro
        setMesesPagosLocal((prev) => {
          const next = new Set(prev)
          next.delete(chave)
          return next
        })
      }
    })
  }

  function handleRemoverMes(chave: string) {
    if (!confirm(`Marcar ${formatarMes(chave)} como não pago?`)) return
    setMesesPagosLocal((prev) => {
      const next = new Set(prev)
      next.delete(chave)
      return next
    })
    startTransition(async () => {
      const r = await removerMesPago(aluno.id, chave)
      if ('erro' in r && typeof r.erro === 'string') {
        setErro(r.erro)
        // Reverter em caso de erro
        setMesesPagosLocal((prev) => new Set([...prev, chave]))
      }
    })
  }

  return (
    <div className="mt-4 min-w-0">
      {/* CABEÇALHO */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-600 text-white text-lg font-semibold flex items-center justify-center shrink-0">
              {iniciais}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                {aluno.full_name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {aluno.classe ?? '—'}
                {aluno.turma ? ` · Turma ${aluno.turma}` : ''}
              </p>
              {aluno.telefone_pai && (
                <p className="text-sm text-gray-500 mt-0.5">
                  📞 {aluno.telefone_pai}
                  {aluno.nome_pai ? ` · ${aluno.nome_pai}` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => setEditando((e) => !e)}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium transition"
            >
              {editando ? 'Cancelar' : '✏ Editar'}
            </button>
            <button
              onClick={handleApagar}
              disabled={aCarregar}
              className="px-4 py-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium transition disabled:opacity-50"
            >
              Apagar
            </button>
          </div>
        </div>

        {erro && (
          <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {erro}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 min-w-0">
        {/* COLUNA ESQUERDA — Dados + Estado propina */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {/* DADOS PESSOAIS */}
          <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-900">
              Dados pessoais
            </h2>

            {!editando ? (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <Info label="Nome completo" valor={aluno.full_name} />
                <Info
                  label="Data de nascimento"
                  valor={
                    aluno.birth_date
                      ? new Date(aluno.birth_date).toLocaleDateString('pt-PT')
                      : '—'
                  }
                />
                <Info label="Nome do pai" valor={aluno.nome_pai ?? '—'} />
                <Info label="Telefone" valor={aluno.telefone_pai ?? '—'} />
                <Info label="Classe" valor={aluno.classe ?? '—'} />
                <Info label="Turma" valor={aluno.turma ?? '—'} />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo
                  label="Nome completo"
                  value={form.full_name}
                  onChange={(v) => setForm({ ...form, full_name: v })}
                  required
                />
                <Campo
                  label="Data de nascimento"
                  type="date"
                  value={form.birth_date}
                  onChange={(v) => setForm({ ...form, birth_date: v })}
                />
                <Campo
                  label="Nome do pai"
                  value={form.nome_pai}
                  onChange={(v) => setForm({ ...form, nome_pai: v })}
                />
                <Campo
                  label="Telefone"
                  value={form.telefone_pai}
                  onChange={(v) => setForm({ ...form, telefone_pai: v })}
                />
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Classe
                  </label>
                  <select
                    value={form.class_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        class_id: e.target.value,
                        turma_id: '',
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
                  >
                    <option value="">— Sem classe —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Turma
                  </label>
                  <select
                    value={form.turma_id}
                    onChange={(e) =>
                      setForm({ ...form, turma_id: e.target.value })
                    }
                    disabled={!form.class_id}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">— Sem turma —</option>
                    {turmasDaClasse.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 flex gap-2 justify-end mt-2">
                  <button
                    onClick={() => setEditando(false)}
                    className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardar}
                    disabled={aCarregar}
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium"
                  >
                    {aCarregar ? 'A guardar…' : 'Guardar alterações'}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ESTADO DA PROPINA */}
          <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-start sm:items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Estado da propina · {anoAtual}/{anoAtual + 1}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Marque ou desmarque meses como pagos.
                </p>
              </div>
              {mesesEmFalta.length > 0 && (
                <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                  {mesesEmFalta.length} em atraso
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {mesesDoAno.map((m) => {
                const pago = mesesPagosLocal.has(m.chave)
                const atrasado = mesTemMulta(m.chave) && !pago

                return (
                  <button
                    key={m.chave}
                    onClick={() =>
                      pago
                        ? handleRemoverMes(m.chave)
                        : handleAdicionarMes(m.chave)
                    }
                    disabled={aCarregar}
                    title={
                      pago
                        ? 'Clique para marcar como não pago'
                        : atrasado
                        ? 'Clique para marcar como pago (em atraso)'
                        : 'Clique para marcar como pago'
                    }
                    className={`py-2.5 px-2 rounded-lg border-2 text-xs font-medium transition flex flex-col items-center ${
                      pago
                        ? 'border-green-500 bg-green-50 text-green-800'
                        : atrasado
                        ? 'border-red-300 bg-red-50 text-red-700 hover:border-red-500'
                        : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}
                  >
                    <span>{m.label}</span>
                    <span className="text-[9px] mt-0.5">
                      {pago
                        ? '✓ Pago'
                        : atrasado
                        ? '⚠ Em atraso'
                        : '· Por pagar'}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded border-2 border-green-500 bg-green-50 inline-block" />
                Pago
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded border-2 border-red-300 bg-red-50 inline-block" />
                Em atraso (após dia 10 do mês seguinte)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded border-2 border-gray-200 inline-block" />
                Dentro do prazo
              </span>
            </div>
          </section>
        </div>

        {/* COLUNA DIREITA — Documentos + Recibos + Comprovativos */}
        <div className="lg:col-span-1 space-y-4 min-w-0">
          {/* DOCUMENTOS */}
          <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-900">Documentos</h2>
            <div className="mt-4 space-y-2">
              {aluno.bi_file_url ? (
                <button
                  onClick={() => abrirDocumento(aluno.bi_file_url!)}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition text-sm flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2">
                    📄 <span>Bilhete de Identidade</span>
                  </span>
                  <span className="text-gray-400">→</span>
                </button>
              ) : (
                <p className="text-xs text-gray-400 py-2">BI não anexado</p>
              )}

              {aluno.certificate_file_url ? (
                <button
                  onClick={() => abrirDocumento(aluno.certificate_file_url!)}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition text-sm flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2">
                    📜 <span>Certificado</span>
                  </span>
                  <span className="text-gray-400">→</span>
                </button>
              ) : (
                <p className="text-xs text-gray-400 py-2">
                  Certificado não anexado
                </p>
              )}
            </div>
          </section>

          {/* RECIBOS */}
          <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Recibos recentes
              </h2>
              <a
                href={`/secretario/recibos/${aluno.id}`}
                className="text-xs text-blue-600 hover:underline"
              >
                Ver todos →
              </a>
            </div>
            {recibos.length === 0 ? (
              <p className="mt-3 text-xs text-gray-400">
                Sem recibos emitidos.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {recibos.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-gray-500">
                        {r.numero_recibo}
                      </p>
                      <p className="text-xs text-gray-900 truncate">
                        {r.servico_nome}
                        {r.mes_referencia && (
                          <span className="text-gray-400">
                            {' '}
                            · {formatarMes(r.mes_referencia)}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-gray-900 shrink-0">
                      {r.valor_total.toLocaleString('pt-PT')} Kz
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* COMPROVATIVOS RECENTES */}
          <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-900">
              Comprovativos recentes
            </h2>
            {comprovativos.length === 0 ? (
              <p className="mt-3 text-xs text-gray-400">
                Sem comprovativos enviados.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {comprovativos.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-gray-900 truncate">
                        {c.servico_nome}
                        {c.month && (
                          <span className="text-gray-400">
                            {' '}
                            · {formatarMes(c.month)}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(c.created_at).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                        c.status === 'approved'
                          ? 'bg-green-50 text-green-700'
                          : c.status === 'rejected'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {c.status === 'approved'
                        ? 'Aprovado'
                        : c.status === 'rejected'
                        ? 'Rejeitado'
                        : 'Em análise'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

/* ---------- Auxiliares ---------- */

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
        {label}
      </p>
      <p className="text-gray-900 mt-0.5">{valor}</p>
    </div>
  )
}

function Campo({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
      />
    </div>
  )
}