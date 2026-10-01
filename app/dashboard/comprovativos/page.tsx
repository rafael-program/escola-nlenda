import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ComprovativosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: comprovativos } = await supabase
    .from('payment_proofs')
    .select('id, month, status, file_url, created_at, servicos(nome)')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 min-w-0">
      <Link
        href="/dashboard"
        className="text-sm text-gray-500 hover:text-blue-600 transition"
      >
        ← Voltar ao painel
      </Link>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Meus comprovativos
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Histórico de comprovativos enviados.
          </p>
        </div>

        <Link
          href="/dashboard/comprovativos/novo"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition w-full sm:w-auto shrink-0"
        >
          + Enviar comprovativo
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {(comprovativos ?? []).length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-500">
              Ainda não enviou nenhum comprovativo.
            </p>
            <Link
              href="/dashboard/comprovativos/novo"
              className="mt-3 inline-block text-sm text-blue-600 hover:underline"
            >
              Enviar o primeiro →
            </Link>
          </div>
        )}

        {(comprovativos ?? []).map((c) => {
          const servico = Array.isArray(c.servicos)
            ? c.servicos[0]
            : c.servicos

          return (
            <div
              key={c.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-start sm:items-center justify-between gap-3 min-w-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {servico?.nome ?? 'Serviço'}
                  {c.month ? ` · ${c.month}` : ''}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Enviado em{' '}
                  {new Date(c.created_at).toLocaleDateString('pt-PT')}
                </p>
              </div>

              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
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
          )
        })}
      </div>
    </div>
  )
}