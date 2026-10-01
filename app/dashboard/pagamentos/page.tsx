import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PagamentosAlunoClient from './client'

const MESES = [
  { key: '09', label: 'Setembro' },
  { key: '10', label: 'Outubro' },
  { key: '11', label: 'Novembro' },
  { key: '12', label: 'Dezembro' },
  { key: '01', label: 'Janeiro' },
  { key: '02', label: 'Fevereiro' },
  { key: '03', label: 'Março' },
  { key: '04', label: 'Abril' },
  { key: '05', label: 'Maio' },
  { key: '06', label: 'Junho' },
  { key: '07', label: 'Julho' },
]

type EstadoServico = 'pago' | 'pendente' | 'rejeitado' | 'nao_pago'

export default async function PagamentosAlunoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hoje = new Date()
  const mesAtual = hoje.getMonth() + 1
  const anoBase = mesAtual >= 9 ? hoje.getFullYear() : hoje.getFullYear() - 1

  const [
    estadosRes,
    comprovativosRes,
    pagamentosServicoRes,
    alunoRes,
    servicosRes,
  ] = await Promise.all([
    supabase
      .from('payment_status')
      .select('month, is_paid')
      .eq('student_id', user.id),
    supabase
      .from('payment_proofs')
      .select(`
        id, month, status, servico_id, variacao,
        valor_declarado, created_at,
        servicos(codigo, nome)
      `)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('pagamentos_servico')
      .select(`
        id, valor_total, mes_referencia, numero_recibo, criado_em,
        variacao, servico_id,
        servicos(codigo, nome)
      `)
      .eq('student_id', user.id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('students')
      .select('class_id, classes(name)')
      .eq('id', user.id)
      .single(),
    supabase
      .from('servicos')
      .select('id, codigo, nome, descricao, tem_urgencia, ordem')
      .eq('ativo', true)
      .order('ordem'),
  ])

  const aluno = alunoRes.data
  const cls = Array.isArray(aluno?.classes) ? aluno?.classes[0] : aluno?.classes
  const classeNome = cls?.name ? String(cls.name) : '—'
  const classId = aluno?.class_id ? Number(aluno.class_id) : null

  let valorPropina = 0
  if (classId) {
    const { data: servicoPropina } = await supabase
      .from('servicos')
      .select('id')
      .eq('codigo', 'propina')
      .maybeSingle()

    if (servicoPropina) {
      const { data: preco } = await supabase
        .from('tabela_precos')
        .select('valor')
        .eq('servico_id', servicoPropina.id)
        .eq('classe_id', classId)
        .eq('ano_letivo', '2026')
        .eq('ativo', true)
        .is('variacao', null)
        .maybeSingle()

      if (preco) valorPropina = Number(preco.valor)
    }
  }

  const mapaPagos = new Map(
    (estadosRes.data ?? [])
      .filter((e) => e.is_paid)
      .map((e) => [e.month, true])
  )

  const mapaComprovativos = new Map<string, string>()
  for (const c of comprovativosRes.data ?? []) {
    const srv = Array.isArray(c.servicos) ? c.servicos[0] : c.servicos
    const codigo = srv ? String(srv.codigo) : null
    if (codigo === 'propina' && c.month) {
      mapaComprovativos.set(c.month, c.status)
    }
  }

  const meses = MESES.map((m) => {
    const mesNum = Number(m.key)
    const ano = mesNum >= 9 ? anoBase : anoBase + 1
    const chave = `${ano}-${m.key}`

    let status: 'pago' | 'pendente' | 'rejeitado' | 'falta' = 'falta'
    if (mapaPagos.has(chave)) status = 'pago'
    else if (mapaComprovativos.get(chave) === 'pending') status = 'pendente'
    else if (mapaComprovativos.get(chave) === 'rejected') status = 'rejeitado'

    return {
      chave,
      label: `${m.label} ${ano}`,
      mesCurto: m.label.slice(0, 3),
      status,
    }
  })

  const pagos = meses.filter((m) => m.status === 'pago').length
  const pendentes = meses.filter((m) => m.status === 'pendente').length
  const rejeitados = meses.filter((m) => m.status === 'rejeitado').length
  const emFalta = meses.length - pagos - pendentes - rejeitados

  const servicosComEstado: {
    id: number
    codigo: string
    nome: string
    descricao: string | null
    tem_urgencia: boolean
    estado: EstadoServico
    valor_pago: number | null
    numero_recibo: string | null
    data_pagamento: string | null
    variacao: string | null
  }[] = (servicosRes.data ?? [])
    .filter((s) => s.codigo !== 'propina')
    .map((s) => {
      const pagamento = (pagamentosServicoRes.data ?? []).find((p) => {
        return p.servico_id === s.id
      })

      const comprovativo = (comprovativosRes.data ?? []).find((c) => {
        return (
          c.servico_id === s.id &&
          (c.status === 'pending' || c.status === 'rejected')
        )
      })

      let estado: EstadoServico = 'nao_pago'
      if (pagamento) estado = 'pago'
      else if (comprovativo?.status === 'pending') estado = 'pendente'
      else if (comprovativo?.status === 'rejected') estado = 'rejeitado'

      return {
        id: s.id,
        codigo: String(s.codigo),
        nome: String(s.nome),
        descricao: s.descricao as string | null,
        tem_urgencia: Boolean(s.tem_urgencia),
        estado,
        valor_pago: pagamento ? Number(pagamento.valor_total) : null,
        numero_recibo: pagamento ? String(pagamento.numero_recibo) : null,
        data_pagamento: pagamento ? pagamento.criado_em : null,
        variacao:
          (pagamento?.variacao as string | null) ??
          (comprovativo?.variacao as string | null) ??
          null,
      }
    })

  const historico = (pagamentosServicoRes.data ?? []).map((p) => {
    const srv = Array.isArray(p.servicos) ? p.servicos[0] : p.servicos
    return {
      id: p.id,
      servico_nome: srv ? String(srv.nome) : '—',
      servico_codigo: srv ? String(srv.codigo) : null,
      variacao: p.variacao as string | null,
      valor_total: Number(p.valor_total),
      mes_referencia: p.mes_referencia as string | null,
      numero_recibo: String(p.numero_recibo),
      criado_em: p.criado_em,
    }
  })

  const totalPago = historico.reduce((soma, h) => soma + h.valor_total, 0)
  const saldoDevedorPropina = valorPropina * emFalta

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-blue-600 transition"
        >
          ← Voltar ao painel
        </Link>

        <PagamentosAlunoClient
          meses={meses}
          anoLetivo={`${anoBase}/${anoBase + 1}`}
          pagos={pagos}
          pendentes={pendentes}
          rejeitados={rejeitados}
          emFalta={emFalta}
          classeNome={classeNome}
          valorPropina={valorPropina}
          saldoDevedorPropina={saldoDevedorPropina}
          servicos={servicosComEstado}
          historico={historico}
          totalPago={totalPago}
        />
      </div>
    </main>
  )
}