import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NovoComprovativoForm from './form'

const MESES = [
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

type ServicoComPreco = {
  id: number
  codigo: string
  nome: string
  descricao: string | null
  tem_multa: boolean
  multa_percentual: number
  tem_urgencia: boolean
  precos: { variacao: string | null; valor: number }[]
}

export default async function NovoComprovativoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Data atual
  const hoje = new Date()
  const mesAtual = hoje.getMonth() + 1
  const anoBase = mesAtual >= 9 ? hoje.getFullYear() : hoje.getFullYear() - 1

  // 1. Dados do aluno (classe)
  const { data: aluno } = await supabase
    .from('students')
    .select('class_id, classes(name)')
    .eq('id', user.id)
    .single()

  const cls = Array.isArray(aluno?.classes)
    ? aluno?.classes?.[0]
    : aluno?.classes
  const classeNome = cls?.name ? String(cls.name) : '—'
  const classId = aluno?.class_id ? Number(aluno.class_id) : null

  // 2. Serviços ativos + preços da classe do aluno
  const { data: servicosRaw } = await supabase
    .from('servicos')
    .select('id, codigo, nome, descricao, tem_multa, multa_percentual, tem_urgencia, ordem')
    .eq('ativo', true)
    .order('ordem')

  const { data: precosRaw } = classId
    ? await supabase
        .from('tabela_precos')
        .select('servico_id, variacao, valor')
        .eq('classe_id', classId)
        .eq('ano_letivo', '2026')
        .eq('ativo', true)
    : { data: [] }

  const servicos: ServicoComPreco[] = (servicosRaw ?? []).map((s) => ({
    id: s.id,
    codigo: String(s.codigo),
    nome: String(s.nome),
    descricao: s.descricao as string | null,
    tem_multa: Boolean(s.tem_multa),
    multa_percentual: Number(s.multa_percentual ?? 25),
    tem_urgencia: Boolean(s.tem_urgencia),
    precos: (precosRaw ?? [])
      .filter((p) => p.servico_id === s.id)
      .map((p) => ({
        variacao: p.variacao as string | null,
        valor: Number(p.valor),
      })),
  }))

  // 3. Estados dos meses (para propina)
  const { data: existentes } = await supabase
    .from('payment_proofs')
    .select('month, servico_id, status')
    .eq('student_id', user.id)

  const { data: pagos } = await supabase
    .from('payment_status')
    .select('month')
    .eq('student_id', user.id)
    .eq('is_paid', true)

  const pagosSet = new Set((pagos ?? []).map((p) => p.month))

  const servicoPropina = servicos.find((s) => s.codigo === 'propina')

  const meses = MESES.map((m) => {
    const mesNum = Number(m.key)
    const ano = mesNum >= 9 ? anoBase : anoBase + 1
    const chave = `${ano}-${m.key}`

    let status: 'pago' | 'pending' | 'rejected' | null = null
    if (pagosSet.has(chave)) {
      status = 'pago'
    } else {
      const prova = (existentes ?? []).find(
        (e) =>
          e.month === chave &&
          (!servicoPropina || e.servico_id === servicoPropina.id)
      )
      if (prova) status = prova.status as 'pending' | 'rejected'
    }

    return {
      chave,
      label: `${m.label} ${ano}`,
      curto: m.curto,
      status,
    }
  })

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link
        href="/dashboard"
        className="text-sm text-gray-500 hover:text-blue-600 transition"
      >
        ← Voltar ao painel
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-gray-900">
        Enviar comprovativo
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Escolha o serviço, anexe o comprovativo e a secretaria valida em 48h.
      </p>

      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">
        <strong>Dados bancários:</strong> BAI · IBAN{' '}
        <span className="font-mono">AO06 0040 0000 5640 2025 1014 3</span> ·
        Titular: Escola Nlenda YNlenda
      </div>

      <NovoComprovativoForm
        servicos={servicos}
        meses={meses}
        classeNome={classeNome}
      />
    </div>
  )
}