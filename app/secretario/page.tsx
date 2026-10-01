import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function PainelSecretaria() {
  const supabase = await createClient()

  // Fim do mês atual (para somar receita)
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const mesAtualISO = `${ano}-${mes}`

  const [
    { count: totalClasses },
    { count: totalAlunos },
    { count: pendentes },
    { count: pagos },
    { count: totalRecibos },
    { data: pagamentosMes },
    { data: comprovativosRecentes },
    { data: alunosRecentes },
  ] = await Promise.all([
    supabase.from('classes').select('*', { count: 'exact', head: true }),
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase
      .from('payment_proofs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('payment_status')
      .select('*', { count: 'exact', head: true })
      .eq('is_paid', true),
    supabase
      .from('pagamentos_servico')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('pagamentos_servico')
      .select('valor_total')
      .gte('criado_em', `${mesAtualISO}-01`)
      .lte('criado_em', `${mesAtualISO}-31`),
    supabase
      .from('payment_proofs')
      .select(`
        id, month, status, created_at,
        students(full_name),
        servicos(nome)
      `)
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('students')
      .select(`
        id, full_name, created_at,
        classes(name)
      `)
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  // Total arrecadado no mês
  const totalMes = (pagamentosMes ?? []).reduce(
    (s, p) => s + Number(p.valor_total),
    0
  )

  // Saudação
  const hora = agora.getHours()
  const saudacao =
    hora < 12 ? 'Bom dia' : hora < 19 ? 'Boa tarde' : 'Boa noite'

  const dataHoje = agora.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Cards
  const cards = [
    {
      label: 'Classes',
      valor: totalClasses ?? 0,
      sub: 'ativas',
      href: '/secretario/classes',
      icon: '◫',
      cor: 'blue',
    },
    {
      label: 'Alunos',
      valor: totalAlunos ?? 0,
      sub: 'matriculados',
      href: '/secretario/alunos',
      icon: '☰',
      cor: 'violet',
    },
    {
      label: 'Comprovativos pendentes',
      valor: pendentes ?? 0,
      sub: 'a validar',
      href: '/secretario/comprovativos',
      icon: '⏳',
      cor: pendentes && pendentes > 0 ? 'amber' : 'gray',
    },
    {
      label: 'Recibos emitidos',
      valor: totalRecibos ?? 0,
      sub: 'no total',
      href: '/secretario/recibos',
      icon: '🧾',
      cor: 'green',
    },
  ]

  return (
    <div className="min-w-0">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
            {saudacao}, Secretaria
          </h1>
          <p className="mt-1 text-sm text-gray-500 capitalize">{dataHoje}</p>
        </div>

        <Link
          href="/secretario/caixa"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow-sm w-full sm:w-auto shrink-0"
        >
          💵 Registar pagamento
        </Link>
      </div>

      {/* ALERTA DE PENDENTES */}
      {pendentes && pendentes > 0 ? (
        <Link
          href="/secretario/comprovativos"
          className="mt-6 flex items-center justify-between gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 sm:p-5 hover:shadow-sm transition group"
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
              {pendentes}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-amber-900 text-sm sm:text-base">
                {pendentes} comprovativo{pendentes !== 1 ? 's' : ''} pendente
                {pendentes !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Aguardam validação da secretaria.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline text-amber-700 text-sm font-medium group-hover:translate-x-1 transition shrink-0">
            Analisar →
          </span>
        </Link>
      ) : (
        <div className="mt-6 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <span className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm shrink-0">
            ✓
          </span>
          <p className="text-sm text-green-800">
            Sem comprovativos pendentes. Está tudo em ordem.
          </p>
        </div>
      )}

      {/* CARDS PRINCIPAIS */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-blue-300 hover:shadow-md transition group min-w-0"
          >
            <div className="flex items-start justify-between">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-sm sm:text-base ${corClasses(
                  c.cor
                )}`}
              >
                {c.icon}
              </div>
              <span className="text-gray-300 group-hover:text-blue-500 transition">
                →
              </span>
            </div>
            <p className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-semibold text-gray-900">
              {c.valor}
            </p>
            <p className="mt-1 text-xs sm:text-sm font-medium text-gray-700 leading-tight">
              {c.label}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
              {c.sub}
            </p>
          </Link>
        ))}
      </div>

      {/* RECEITA + AÇÕES RÁPIDAS */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* CARD DE RECEITA DO MÊS */}
        <div className="lg:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 sm:p-6 text-white">
          <p className="text-xs uppercase tracking-wider text-blue-100">
            Arrecadado este mês
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold break-words">
            {totalMes.toLocaleString('pt-PT')}
            <span className="text-base sm:text-lg font-normal ml-1">Kz</span>
          </p>
          <p className="mt-3 text-xs text-blue-100">
            {agora.toLocaleDateString('pt-PT', {
              month: 'long',
              year: 'numeric',
            })}
          </p>

          <div className="mt-6 pt-6 border-t border-white/20 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-blue-100">Pagamentos confirmados</span>
              <span className="font-semibold">{pagos ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-100">Recibos emitidos</span>
              <span className="font-semibold">{totalRecibos ?? 0}</span>
            </div>
          </div>

          <Link
            href="/secretario/relatorios"
            className="mt-6 inline-flex items-center gap-1 text-xs text-white hover:underline"
          >
            Ver relatórios →
          </Link>
        </div>

        {/* AÇÕES RÁPIDAS */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900">
            Ações rápidas
          </h2>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <AcaoRapida
              href="/secretario/caixa"
              icon="💵"
              label="Nova caixa"
              cor="green"
            />
            <AcaoRapida
              href="/secretario/alunos/novo"
              icon="👤"
              label="Novo aluno"
              cor="blue"
            />
            <AcaoRapida
              href="/secretario/comprovativos"
              icon="📄"
              label="Comprovativos"
              cor="amber"
            />
            <AcaoRapida
              href="/secretario/notas"
              icon="★"
              label="Lançar notas"
              cor="violet"
            />
          </div>

          {/* ÚLTIMOS ALUNOS + ÚLTIMOS COMPROVATIVOS */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Alunos recentes */}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-2">
                Últimos alunos
              </p>
              {alunosRecentes && alunosRecentes.length > 0 ? (
                <div className="space-y-2">
                  {alunosRecentes.map((a) => {
                    const cls = Array.isArray(a.classes)
                      ? a.classes[0]
                      : a.classes
                    return (
                      <Link
                        key={a.id}
                        href={`/secretario/alunos`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold flex items-center justify-center shrink-0">
                          {a.full_name
                            .split(' ')
                            .slice(0, 2)
                            .map((n: string) => n[0])
                            .join('')
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {a.full_name}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {cls ? String(cls.name) : 'Sem classe'}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-4">
                  Ainda não há alunos.
                </p>
              )}
            </div>

            {/* Comprovativos recentes */}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-2">
                Comprovativos recentes
              </p>
              {comprovativosRecentes && comprovativosRecentes.length > 0 ? (
                <div className="space-y-2">
                  {comprovativosRecentes.map((c) => {
                    const st = Array.isArray(c.students)
                      ? c.students[0]
                      : c.students
                    const srv = Array.isArray(c.servicos)
                      ? c.servicos[0]
                      : c.servicos
                    const cor =
                      c.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : c.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'

                    return (
                      <Link
                        key={c.id}
                        href={`/secretario/comprovativos`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition"
                      >
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${cor}`}
                        >
                          {c.status === 'pending'
                            ? '⏳'
                            : c.status === 'approved'
                            ? '✓'
                            : '✗'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {st ? String(st.full_name) : '—'}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {srv ? String(srv.nome) : '—'}
                            {c.month && ` · ${c.month}`}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-4">
                  Sem comprovativos recentes.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-10 text-xs text-gray-400 text-center">
        Escola Nlenda e Nlenda · Painel da Secretaria
      </p>
    </div>
  )
}

/* ---------- Auxiliares ---------- */

function corClasses(cor: string) {
  const mapa: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
    gray: 'bg-gray-100 text-gray-500',
  }
  return mapa[cor] ?? mapa.gray
}

function AcaoRapida({
  href,
  icon,
  label,
  cor,
}: {
  href: string
  icon: string
  label: string
  cor: 'blue' | 'violet' | 'green' | 'amber'
}) {
  const cores: Record<string, string> = {
    blue: 'text-blue-700 hover:border-blue-300 hover:bg-blue-50',
    violet: 'text-violet-700 hover:border-violet-300 hover:bg-violet-50',
    green: 'text-green-700 hover:border-green-300 hover:bg-green-50',
    amber: 'text-amber-700 hover:border-amber-300 hover:bg-amber-50',
  }
  return (
    <Link
      href={href}
      className={`bg-white border border-gray-200 rounded-xl p-3 sm:p-4 flex flex-col items-center text-center gap-2 transition min-w-0 ${cores[cor]}`}
    >
      <span className="text-xl sm:text-2xl">{icon}</span>
      <span className="text-[11px] sm:text-xs font-medium leading-tight">
        {label}
      </span>
    </Link>
  )
}