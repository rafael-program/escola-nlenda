'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Comprovativo = {
  id: number
  month: string | null
  status: 'pending' | 'approved' | 'rejected'
  file_url: string
  file_type: string | null
  rejection_reason: string | null
  created_at: string
  reviewed_at: string | null
  notes: string | null
  valor_declarado: number | null
  variacao: string | null
  servico_codigo: string | null
  servico_nome: string | null
  recibo_numero: string | null
  recibo_url: string | null
  recibo_emitido_em: string | null
}

const MESES_PT: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro',
}

function formatarMes(iso: string): string {
  const partes = iso.split('-')
  const ano = partes[0]
  const mes = partes[1]
  return `${MESES_PT[mes] ?? mes} ${ano}`
}

function titulo(c: Comprovativo): string {
  if (c.servico_codigo === 'propina' && c.month) {
    return `Propina · ${formatarMes(c.month)}`
  }
  if (c.servico_nome) {
    return c.variacao
      ? `${c.servico_nome} · ${
          c.variacao.charAt(0).toUpperCase() + c.variacao.slice(1)
        }`
      : c.servico_nome
  }
  return c.month ? formatarMes(c.month) : 'Comprovativo'
}

type Filtro = 'all' | 'pending' | 'approved' | 'rejected'

export default function ComprovativosAlunoClient({
  comprovativos,
}: {
  comprovativos: Comprovativo[]
}) {
  const supabase = createClient()
  const [filtro, setFiltro] = useState<Filtro>('all')
  const [erro, setErro] = useState('')
  const [aAbrir, setAAbrir] = useState<number | null>(null)

  const contagens = useMemo(
    () => ({
      all: comprovativos.length,
      pending: comprovativos.filter((c) => c.status === 'pending').length,
      approved: comprovativos.filter((c) => c.status === 'approved').length,
      rejected: comprovativos.filter((c) => c.status === 'rejected').length,
    }),
    [comprovativos]
  )

  const filtrados = useMemo(() => {
    if (filtro === 'all') return comprovativos
    return comprovativos.filter((c) => c.status === filtro)
  }, [comprovativos, filtro])

  async function abrirRecibo(path: string, id: number) {
    setErro('')
    setAAbrir(id)

    const { data, error } = await supabase.storage
      .from('pagamentos-servico')
      .createSignedUrl(path, 300)

    if (error || !data?.signedUrl) {
      setErro('Não foi possível abrir o recibo.')
      setAAbrir(null)
      return
    }

    window.open(data.signedUrl, '_blank')
    setAAbrir(null)
  }

  return (
    <div className="mt-6">
      {erro && (
        <div className="mb-4 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {erro}
        </div>
      )}

      {comprovativos.length > 0 && (
        <div className="flex gap-2 items-center flex-wrap">
          {(
            [
              { key: 'all', label: 'Todos' },
              { key: 'pending', label: 'Em análise' },
              { key: 'approved', label: 'Aprovados' },
              { key: 'rejected', label: 'Rejeitados' },
            ] as { key: Filtro; label: string }[]
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-2 ${
                filtro === f.key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
              <span
                className={`text-[10px] font-semibold rounded-full px-1.5 ${
                  filtro === f.key ? 'bg-white/25' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {contagens[f.key]}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {filtrados.length === 0 && (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">
              {comprovativos.length === 0
                ? 'Ainda não enviou nenhum comprovativo.'
                : 'Nada por aqui.'}
            </p>
            {comprovativos.length === 0 && (
              <Link
                href="/dashboard/comprovativos/novo"
                className="mt-4 inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
              >
                Enviar o primeiro
              </Link>
            )}
          </div>
        )}

        {filtrados.map((c) => {
          const cores =
            c.status === 'approved'
              ? {
                  bg: 'bg-green-50',
                  border: 'border-green-200',
                  icon: 'bg-green-500',
                  text: 'text-green-800',
                  label: 'Aprovado',
                }
              : c.status === 'pending'
              ? {
                  bg: 'bg-amber-50',
                  border: 'border-amber-200',
                  icon: 'bg-amber-500',
                  text: 'text-amber-800',
                  label: 'Em análise',
                }
              : {
                  bg: 'bg-red-50',
                  border: 'border-red-200',
                  icon: 'bg-red-500',
                  text: 'text-red-800',
                  label: 'Rejeitado',
                }

          const letraOuMes = c.month
            ? `${c.month.split('-')[1]}/${c.month.split('-')[0].slice(2)}`
            : (c.servico_nome ?? '?').charAt(0).toUpperCase()

          return (
            <div
              key={c.id}
              className={`${cores.bg} ${cores.border} border rounded-xl overflow-hidden`}
            >
              <div className="p-5 flex flex-wrap gap-4 items-start">
                <div
                  className={`${cores.icon} w-14 h-14 rounded-lg flex flex-col items-center justify-center text-white shrink-0`}
                >
                  <span className="text-[10px] uppercase opacity-80">
                    {c.servico_codigo === 'propina' ? 'Mês' : 'Serv.'}
                  </span>
                  <span className="text-xs font-semibold">{letraOuMes}</span>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900">{titulo(c)}</p>
                    <span
                      className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${cores.text} bg-white/70`}
                    >
                      {cores.label}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    Enviado em{' '}
                    {new Date(c.created_at).toLocaleDateString('pt-PT')}
                  </p>

                  {c.valor_declarado != null && (
                    <p className="text-xs text-gray-700 mt-1">
                      Valor:{' '}
                      <strong>
                        {Number(c.valor_declarado).toLocaleString('pt-PT')} Kz
                      </strong>
                    </p>
                  )}

                  {c.notes && (
                    <p className="text-xs text-gray-600 mt-2 italic">
                      {'\u201C'}
                      {c.notes}
                      {'\u201D'}
                    </p>
                  )}

                  {c.status === 'approved' && c.recibo_numero && (
                    <p className="text-xs text-green-800 mt-2">
                      ✓ Recibo <strong>{c.recibo_numero}</strong>
                      {c.recibo_emitido_em && (
                        <>
                          {' '}
                          emitido em{' '}
                          {new Date(c.recibo_emitido_em).toLocaleDateString(
                            'pt-PT'
                          )}
                        </>
                      )}
                    </p>
                  )}

                  {c.status === 'approved' && !c.recibo_numero && (
                    <p className="text-xs text-gray-400 mt-2 italic">
                      Recibo em processamento…
                    </p>
                  )}

                  {c.status === 'rejected' && c.rejection_reason && (
                    <p className="text-xs text-red-700 mt-2">
                      ✗ Motivo: {c.rejection_reason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {c.status === 'approved' && c.recibo_url && (
                    <button
                      onClick={() => abrirRecibo(c.recibo_url!, c.id)}
                      disabled={aAbrir === c.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-medium transition inline-flex items-center gap-1.5"
                    >
                      {aAbrir === c.id ? 'A abrir…' : '⬇ Descarregar recibo'}
                    </button>
                  )}

                  {c.status === 'rejected' && (
                    <Link
                      href="/dashboard/comprovativos/novo"
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition"
                    >
                      Reenviar
                    </Link>
                  )}

                  {c.status === 'pending' && (
                    <span className="text-xs text-amber-700 italic">
                      Aguarda validação
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}