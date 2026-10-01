'use client'

import { useState, useMemo, useTransition } from 'react'
import { atualizarPreco, toggleServicoAtivo } from './actions'

type Servico = {
  id: number
  codigo: string
  nome: string
  descricao: string | null
  tem_multa: boolean
  multa_percentual: number
  tem_urgencia: boolean
  ativo: boolean
  ordem: number
}

type Classe = { id: number; name: string }

type Preco = {
  id: number
  servico_id: number
  classe_id: number
  variacao: string | null
  valor: number
  ativo: boolean
}

// ─────────────────────────────────────────────────────────
// Categorização visual dos serviços
// ─────────────────────────────────────────────────────────
type Categoria = {
  nome: string
  icone: string
  cor: string
  servicos: string[]
}

const CATEGORIAS: Categoria[] = [
  {
    nome: 'Mensalidades',
    icone: '📅',
    cor: 'blue',
    servicos: ['propina'],
  },
  {
    nome: 'Documentos',
    icone: '📄',
    cor: 'violet',
    servicos: ['declaracao', 'certificado', 'boletim'],
  },
  {
    nome: 'Inscrições',
    icone: '📋',
    cor: 'green',
    servicos: ['matricula', 'reconfirmacao'],
  },
  {
    nome: 'Materiais',
    icone: '👕',
    cor: 'amber',
    servicos: ['uniforme'],
  },
]

function getCategoria(codigo: string): Categoria {
  for (const cat of CATEGORIAS) {
    if (cat.servicos.includes(codigo)) return cat
  }
  return { nome: 'Outros', icone: '📦', cor: 'gray', servicos: [] }
}

function corClasses(cor: string) {
  const mapa: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    violet: {
      bg: 'bg-violet-50',
      text: 'text-violet-700',
      border: 'border-violet-200',
    },
    green: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
    },
    gray: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  }
  return mapa[cor] ?? mapa.gray
}

export default function ServicosClient({
  servicos,
  classes,
  precos,
}: {
  servicos: Servico[]
  classes: Classe[]
  precos: Preco[]
}) {
  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativos' | 'inativos'>(
    'ativos'
  )
  const [servicoAberto, setServicoAberto] = useState<number | null>(
    servicos[0]?.id ?? null
  )
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')
  const [aCarregar, startTransition] = useTransition()

  // Indexação rápida
  const precosPorServico = useMemo(() => {
    const mapa = new Map<number, Preco[]>()
    for (const p of precos) {
      if (!mapa.has(p.servico_id)) mapa.set(p.servico_id, [])
      mapa.get(p.servico_id)!.push(p)
    }
    return mapa
  }, [precos])

  const contagemPorServico = useMemo(() => {
    const m = new Map<number, { total: number; classes: Set<number> }>()
    for (const p of precos) {
      if (!m.has(p.servico_id)) m.set(p.servico_id, { total: 0, classes: new Set() })
      const g = m.get(p.servico_id)!
      g.total += 1
      g.classes.add(p.classe_id)
    }
    return m
  }, [precos])

  // Filtro
  const servicosFiltrados = useMemo(() => {
    let lista = servicos

    if (filtroAtivo === 'ativos') lista = lista.filter((s) => s.ativo)
    else if (filtroAtivo === 'inativos') lista = lista.filter((s) => !s.ativo)

    if (busca.trim()) {
      const q = busca.toLowerCase()
      lista = lista.filter(
        (s) =>
          s.nome.toLowerCase().includes(q) ||
          s.codigo.toLowerCase().includes(q)
      )
    }
    return lista
  }, [servicos, filtroAtivo, busca])

  // Agrupamento por categoria
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, { categoria: Categoria; servicos: Servico[] }>()
    for (const s of servicosFiltrados) {
      const cat = getCategoria(s.codigo)
      if (!mapa.has(cat.nome)) {
        mapa.set(cat.nome, { categoria: cat, servicos: [] })
      }
      mapa.get(cat.nome)!.servicos.push(s)
    }
    return Array.from(mapa.values())
  }, [servicosFiltrados])

  // Resumo geral
  const stats = useMemo(() => {
    const totalServicos = servicos.length
    const ativos = servicos.filter((s) => s.ativo).length
    const totalPrecos = precos.length
    const valores = precos.map((p) => p.valor)
    const min = valores.length > 0 ? Math.min(...valores) : 0
    const max = valores.length > 0 ? Math.max(...valores) : 0
    return { totalServicos, ativos, totalPrecos, min, max }
  }, [servicos, precos])

  function handleToggleAtivo(s: Servico) {
    setErro('')
    setOk('')
    startTransition(async () => {
      const r = await toggleServicoAtivo(s.id, !s.ativo)
      if (r?.erro) setErro(r.erro)
      else {
        setOk(`Serviço "${s.nome}" ${!s.ativo ? 'ativado' : 'desativado'}.`)
        setTimeout(() => setOk(''), 3000)
      }
    })
  }

  function handlePrecoGuardado(novo: number) {
    setOk('Preço atualizado.')
    setTimeout(() => setOk(''), 2000)
  }

  return (
    <div>
      {/* CABEÇALHO */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Serviços e preços</h1>
        <p className="mt-1 text-sm text-gray-500">
          Catálogo dos serviços da escola e tabela de preços por classe.
        </p>
      </div>

      {/* RESUMO */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Serviços ativos</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {stats.ativos}
            <span className="text-sm text-gray-400 font-normal">
              /{stats.totalServicos}
            </span>
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Preços configurados</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {stats.totalPrecos}
          </p>
        </div>
        <div className="bg-white border border-blue-200 bg-blue-50/40 rounded-xl p-4">
          <p className="text-xs text-blue-700">Faixa de preços</p>
          <p className="mt-1 text-lg font-semibold text-blue-700">
            {stats.min.toLocaleString('pt-PT')} –{' '}
            {stats.max.toLocaleString('pt-PT')}
            <span className="text-xs font-normal"> Kz</span>
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Classes</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {classes.length}
          </p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {(
            [
              { key: 'ativos', label: 'Ativos' },
              { key: 'inativos', label: 'Inativos' },
              { key: 'todos', label: 'Todos' },
            ] as { key: typeof filtroAtivo; label: string }[]
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltroAtivo(f.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                filtroAtivo === f.key
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
          placeholder="Procurar serviço…"
          className="flex-1 min-w-[220px] px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
        />
      </div>

      {/* MENSAGENS */}
      {erro && (
        <div className="mt-4 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {erro}
        </div>
      )}
      {ok && (
        <div className="mt-4 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          ✓ {ok}
        </div>
      )}

      {/* SERVIÇOS AGRUPADOS POR CATEGORIA */}
      <div className="mt-6 space-y-8">
        {porCategoria.length === 0 && (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center text-sm text-gray-400">
            Nenhum serviço corresponde aos filtros.
          </div>
        )}

        {porCategoria.map(({ categoria, servicos: lista }) => {
          const cor = corClasses(categoria.cor)
          return (
            <div key={categoria.nome}>
              {/* Título da categoria */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`w-7 h-7 rounded-lg ${cor.bg} ${cor.text} flex items-center justify-center text-sm`}
                >
                  {categoria.icone}
                </span>
                <h2 className="text-sm font-semibold text-gray-900">
                  {categoria.nome}
                </h2>
                <span className="text-xs text-gray-400">
                  {lista.length} serviço{lista.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {lista.map((s) => {
                  const aberto = servicoAberto === s.id
                  const precosServico = precosPorServico.get(s.id) ?? []
                  const contagem = contagemPorServico.get(s.id)

                  const variacoes = Array.from(
                    new Set(precosServico.map((p) => p.variacao ?? 'unico'))
                  )

                  // Ordenar variacoes: unico primeiro, depois normal/completo, depois urgente/retalho
                  variacoes.sort((a, b) => {
                    const ordem = ['unico', 'normal', 'completo', 'urgente', 'retalho']
                    return ordem.indexOf(a) - ordem.indexOf(b)
                  })

                  return (
                    <div
                      key={s.id}
                      className={`bg-white border rounded-xl overflow-hidden transition ${
                        s.ativo
                          ? 'border-gray-200'
                          : 'border-gray-100 opacity-70'
                      }`}
                    >
                      {/* Cabeçalho do serviço */}
                      <button
                        type="button"
                        onClick={() => setServicoAberto(aberto ? null : s.id)}
                        className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition text-left"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-lg flex items-center justify-center text-white font-semibold shrink-0 ${
                              s.ativo ? cor.text.replace('text-', 'bg-') : 'bg-gray-400'
                            }`}
                          >
                            {s.nome.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-gray-900">
                                {s.nome}
                              </p>

                              {s.tem_multa && (
                                <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                  Multa {s.multa_percentual}%
                                </span>
                              )}
                              {s.tem_urgencia && (
                                <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                                  Normal / Urgente
                                </span>
                              )}
                              {!s.ativo && (
                                <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                  Inativo
                                </span>
                              )}
                            </div>
                            {s.descricao && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">
                                {s.descricao}
                              </p>
                            )}
                          </div>

                          {/* Contagem à direita */}
                          <div className="hidden sm:flex flex-col items-end text-right shrink-0">
                            <span className="text-xs text-gray-500">
                              {contagem?.total ?? 0} preço
                              {(contagem?.total ?? 0) !== 1 ? 's' : ''}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {contagem?.classes.size ?? 0} classe
                              {(contagem?.classes.size ?? 0) !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <span className="text-gray-400 text-lg shrink-0">
                          {aberto ? '−' : '+'}
                        </span>
                      </button>

                      {/* Preços */}
                      {aberto && (
                        <div className="border-t border-gray-100">
                          <div className="px-5 py-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                              <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                                Preços por classe · Ano letivo 2026
                              </p>
                              <button
                                onClick={() => handleToggleAtivo(s)}
                                disabled={aCarregar}
                                className={`text-xs px-3 py-1 rounded-full transition ${
                                  s.ativo
                                    ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                    : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                                }`}
                              >
                                {s.ativo ? 'Desativar serviço' : 'Reativar serviço'}
                              </button>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                  <tr>
                                    <th className="text-left px-4 py-2 font-medium">
                                      Classe
                                    </th>
                                    {variacoes.map((v) => (
                                      <th
                                        key={v}
                                        className="text-right px-4 py-2 font-medium"
                                      >
                                        {v === 'unico'
                                          ? 'Valor'
                                          : v.charAt(0).toUpperCase() +
                                            v.slice(1)}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {classes.map((c) => {
                                    const precosClasse = precosServico.filter(
                                      (p) => p.classe_id === c.id
                                    )
                                    if (precosClasse.length === 0) return null

                                    return (
                                      <tr
                                        key={c.id}
                                        className="hover:bg-gray-50"
                                      >
                                        <td className="px-4 py-2 text-gray-700">
                                          {c.name}
                                        </td>
                                        {variacoes.map((v) => {
                                          const p = precosClasse.find(
                                            (x) => (x.variacao ?? 'unico') === v
                                          )
                                          if (!p)
                                            return (
                                              <td
                                                key={v}
                                                className="text-right px-4 py-2 text-gray-300"
                                              >
                                                —
                                              </td>
                                            )
                                          return (
                                            <td
                                              key={v}
                                              className="text-right px-4 py-2"
                                            >
                                              <CelulaPreco
                                                preco={p}
                                                onGuardar={atualizarPreco}
                                                onErro={setErro}
                                                onOk={handlePrecoGuardado}
                                              />
                                            </td>
                                          )
                                        })}
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-8 text-xs text-gray-400 text-center">
        Alterações são guardadas automaticamente ao sair do campo.
      </p>
    </div>
  )
}

/* ---------- Célula de preço com edição inline ---------- */

function CelulaPreco({
  preco,
  onGuardar,
  onErro,
  onOk,
}: {
  preco: Preco
  onGuardar: (
    id: number,
    valor: number
  ) => Promise<{ erro?: string; ok?: boolean }>
  onErro: (msg: string) => void
  onOk: (novo: number) => void
}) {
  const [editando, setEditando] = useState(false)
  const [txt, setTxt] = useState(String(preco.valor))
  const [ultimoValor, setUltimoValor] = useState(preco.valor)
  const [aGravar, setAGravar] = useState(false)
  const [flash, setFlash] = useState(false)

  if (preco.valor !== ultimoValor) {
    setUltimoValor(preco.valor)
    setTxt(String(preco.valor))
  }

  async function commit() {
    setEditando(false)
    const novo = Number(txt.replace(/\s/g, ''))
    if (isNaN(novo) || novo === preco.valor) {
      setTxt(String(preco.valor))
      return
    }

    setAGravar(true)
    const r = await onGuardar(preco.id, novo)
    setAGravar(false)

    if (r?.erro) {
      onErro(r.erro)
      setTxt(String(preco.valor))
    } else {
      onOk(novo)
      setFlash(true)
      setTimeout(() => setFlash(false), 1500)
    }
  }

  if (editando) {
    return (
      <input
        type="text"
        value={txt}
        autoFocus
        onChange={(e) => setTxt(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') {
            setTxt(String(preco.valor))
            setEditando(false)
          }
        }}
        className="w-24 text-right px-2 py-1 rounded border border-blue-400 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
      />
    )
  }

  return (
    <button
      onClick={() => setEditando(true)}
      disabled={aGravar}
      className={`text-right hover:bg-blue-50 px-2 py-1 rounded transition disabled:opacity-50 ${
        flash ? 'bg-green-100 text-green-800' : ''
      }`}
    >
      {preco.valor.toLocaleString('pt-PT')}{' '}
      <span className="text-[10px] text-gray-400">Kz</span>
    </button>
  )
}