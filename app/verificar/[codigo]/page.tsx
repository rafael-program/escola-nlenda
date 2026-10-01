import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
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
  const [ano, mes] = iso.split('-')
  return `${MESES_PT[mes] ?? mes} ${ano}`
}

export default async function VerificarPage({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const { codigo } = await params
  const supabase = adminClient()

 const { data: recibo } = await supabase
  .from('receipts')
  .select(`
    numero, month, valor, emitido_em, codigo_verificacao, validado,
    students(full_name, classes(name), turmas(name))
  `)
  .eq('codigo_verificacao', codigo)
  .eq('validado', true)
  .maybeSingle()

  // Válido
  if (recibo) {
    const aluno = Array.isArray(recibo.students)
      ? recibo.students[0]
      : recibo.students
    const cls = Array.isArray(aluno?.classes)
      ? aluno.classes[0]
      : aluno?.classes
    const tur = Array.isArray(aluno?.turmas)
      ? aluno.turmas[0]
      : aluno?.turmas

    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-green-200 rounded-2xl overflow-hidden shadow-lg">
          {/* Cabeçalho */}
          <div className="bg-green-500 px-6 py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto">
              <span className="text-3xl text-white">✓</span>
            </div>
            <h1 className="mt-3 text-xl font-bold text-white">
              Documento válido
            </h1>
            <p className="text-green-50 text-xs mt-1">
              Recibo emitido pela Escola Nlenda e Nlenda
            </p>
          </div>

          {/* Corpo */}
          <div className="p-6 space-y-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Código de verificação
              </p>
              <p className="mt-1 font-mono text-sm text-gray-900">
                {recibo.codigo_verificacao}
              </p>
            </div>

            <hr className="border-gray-100" />

            <div className="space-y-3 text-sm">
              <Linha label="Recibo" valor={recibo.numero} />
              <Linha
                label="Aluno"
                valor={aluno?.full_name ?? '—'}
              />
              <Linha
                label="Classe / Turma"
                valor={
                  [
                    cls ? String(cls.name) : null,
                    tur ? String(tur.name) : null,
                  ]
                    .filter(Boolean)
                    .join(' / ') || '—'
                }
              />
              <Linha
                label="Referente a"
                valor={formatarMes(recibo.month)}
              />
              {recibo.valor && (
                <Linha
                  label="Valor"
                  valor={`${Number(recibo.valor).toLocaleString('pt-PT')} Kz`}
                />
              )}
              <Linha
                label="Emitido em"
                valor={new Date(recibo.emitido_em).toLocaleDateString(
                  'pt-PT',
                  {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  }
                )}
              />
            </div>

            <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-800 leading-relaxed">
              Este recibo foi emitido eletronicamente e está registado no
              sistema da escola. Se o documento em papel ou PDF apresentar
              dados diferentes dos acima, deve ser considerado inválido.
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Inválido
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-red-200 rounded-2xl overflow-hidden shadow-lg">
        <div className="bg-red-500 px-6 py-6 text-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto">
            <span className="text-3xl text-white">✗</span>
          </div>
          <h1 className="mt-3 text-xl font-bold text-white">
            Documento inválido
          </h1>
          <p className="text-red-50 text-xs mt-1">
            Não foi encontrado nenhum recibo com este código
          </p>
        </div>

        <div className="p-6 space-y-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Código verificado
          </p>
          <p className="font-mono text-sm text-gray-900 break-all">
            {codigo}
          </p>

          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800 leading-relaxed text-left">
            Se tem um documento com este código, contacte imediatamente a
            secretaria da escola pelo email{' '}
            <strong>secretaria@nlenda-nlenda.ao</strong>. Pode tratar-se de
            tentativa de falsificação.
          </div>

          <Link
            href="/"
            className="inline-block mt-2 text-sm text-blue-600 hover:underline"
          >
            ← Voltar à página inicial
          </Link>
        </div>
      </div>
    </main>
  )
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right">{valor}</span>
    </div>
  )
}