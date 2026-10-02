'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function criarAluno(formData: FormData) {
  const full_name = String(formData.get('full_name') || '').trim()
  const birth_date = String(formData.get('birth_date') || '').trim() || null
  const nome_pai = String(formData.get('nome_pai') || '').trim() || null
  const telefone_pai = String(formData.get('telefone_pai') || '').trim() || null
  const class_id = formData.get('class_id')
    ? Number(formData.get('class_id'))
    : null
  const turma_id = formData.get('turma_id')
    ? Number(formData.get('turma_id'))
    : null
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '').trim()

  if (!full_name) return { erro: 'Indique o nome completo.' }
  if (!email) return { erro: 'Telefone de acesso é obrigatório.' }
  if (!password || password.length < 6) {
    return { erro: 'Senha com pelo menos 6 caracteres.' }
  }
  if (!telefone_pai || telefone_pai.replace(/\D/g, '').length < 9) {
    return { erro: 'Indique um telefone válido do encarregado.' }
  }

  const supabaseAdmin = admin()

  // 1. Criar utilizador no Auth
  const { data: userData, error: userErr } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

  if (userErr || !userData.user) {
    if (userErr?.message?.includes('already registered')) {
      return { erro: 'Já existe um utilizador com este telefone.' }
    }
    return { erro: userErr?.message ?? 'Erro ao criar utilizador.' }
  }

  const userId = userData.user.id

  // 2. Upload do BI
  let bi_file_url: string | null = null
  const biFile = formData.get('bi_file') as File | null
  if (biFile && biFile.size > 0) {
    const ext = biFile.name.split('.').pop() || 'pdf'
    const path = `${userId}/bi-${Date.now()}.${ext}`
    const { error: upErr } = await supabaseAdmin.storage
      .from('student-documents')
      .upload(path, biFile, { contentType: biFile.type })
    if (upErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return { erro: `Erro ao enviar BI: ${upErr.message}` }
    }
    bi_file_url = path
  }

  // 3. Upload do certificado
  let certificate_file_url: string | null = null
  const certFile = formData.get('certificate_file') as File | null
  if (certFile && certFile.size > 0) {
    const ext = certFile.name.split('.').pop() || 'pdf'
    const path = `${userId}/cert-${Date.now()}.${ext}`
    const { error: upErr } = await supabaseAdmin.storage
      .from('student-documents')
      .upload(path, certFile, { contentType: certFile.type })
    if (upErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return { erro: `Erro ao enviar certificado: ${upErr.message}` }
    }
    certificate_file_url = path
  }

  // 4. Inserir na tabela students
  const { error: insertErr } = await supabaseAdmin.from('students').insert({
    id: userId,
    full_name,
    birth_date,
    nome_pai,
    telefone_pai,
    class_id,
    turma_id,
    bi_file_url,
    certificate_file_url,
  })

  if (insertErr) {
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return { erro: insertErr.message }
  }

  // 5. Inserir perfil
  const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
    id: userId,
    role: 'aluno',
    full_name,
  })

  if (profileErr) {
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return { erro: profileErr.message }
  }

  revalidatePath('/secretario/alunos')
  return { ok: true }
}

export async function apagarAluno(id: string) {
  const supabaseAdmin = admin()
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
  if (error) return { erro: error.message }

  revalidatePath('/secretario/alunos')
  return { ok: true }
}

export async function gerarLinkDocumento(path: string) {
  const supabaseAdmin = admin()
  const { data, error } = await supabaseAdmin.storage
    .from('student-documents')
    .createSignedUrl(path, 60 * 5)
  if (error) return { erro: error.message }
  return { url: data.signedUrl }
}

/**
 * Busca todos os dados do aluno para a página de detalhes:
 * dados pessoais, meses pagos, recibos e comprovativos recentes.
 */
export async function buscarAlunoDetalhe(id: string) {
  const supabaseAdmin = admin()

  const [alunoRes, pagosRes, recibosRes, comprovativosRes] = await Promise.all([
    supabaseAdmin
      .from('students')
      .select(`
        id, full_name, birth_date, nome_pai, telefone_pai,
        bi_file_url, certificate_file_url,
        class_id, turma_id,
        classes(name), turmas(name)
      `)
      .eq('id', id)
      .single(),

    supabaseAdmin
      .from('payment_status')
      .select('month, is_paid')
      .eq('student_id', id)
      .eq('is_paid', true),

    supabaseAdmin
      .from('pagamentos_servico')
      .select(`
        id, numero_recibo, codigo_verificacao, valor_total,
        mes_referencia, criado_em, forma_pagamento, banco,
        servicos(codigo, nome)
      `)
      .eq('student_id', id)
      .order('criado_em', { ascending: false }),

    supabaseAdmin
      .from('payment_proofs')
      .select('id, month, status, created_at, servicos(nome)')
      .eq('student_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!alunoRes.data) return null

  const a = alunoRes.data
  const cls = Array.isArray(a.classes) ? a.classes[0] : a.classes
  const tur = Array.isArray(a.turmas) ? a.turmas[0] : a.turmas

  return {
    aluno: {
      id: a.id,
      full_name: a.full_name,
      birth_date: a.birth_date,
      nome_pai: a.nome_pai,
      telefone_pai: a.telefone_pai,
      bi_file_url: a.bi_file_url,
      certificate_file_url: a.certificate_file_url,
      class_id: a.class_id,
      turma_id: a.turma_id,
      classe: cls ? String(cls.name) : null,
      turma: tur ? String(tur.name) : null,
    },
    mesesPagos: (pagosRes.data ?? []).map((p) => p.month),
    recibos: (recibosRes.data ?? []).map((r) => {
      const srv = Array.isArray(r.servicos) ? r.servicos[0] : r.servicos
      return {
        id: r.id,
        numero_recibo: String(r.numero_recibo),
        codigo_verificacao: String(r.codigo_verificacao),
        valor_total: Number(r.valor_total),
        mes_referencia: r.mes_referencia as string | null,
        criado_em: r.criado_em,
        forma_pagamento: r.forma_pagamento as 'fisico' | 'banco',
        banco: r.banco as string | null,
        servico_codigo: srv ? String(srv.codigo) : null,
        servico_nome: srv ? String(srv.nome) : '—',
      }
    }),
    comprovativos: (comprovativosRes.data ?? []).map((c) => {
      const srv = Array.isArray(c.servicos) ? c.servicos[0] : c.servicos
      return {
        id: c.id,
        month: c.month,
        status: c.status,
        created_at: c.created_at,
        servico_nome: srv ? String(srv.nome) : '—',
      }
    }),
  }
}

/**
 * Edita os dados do aluno (students + profiles).
 */
export async function editarAluno(formData: FormData) {
  const id = String(formData.get('id') || '').trim()
  if (!id) return { erro: 'ID em falta.' }

  const full_name = String(formData.get('full_name') || '').trim()
  const birth_date = String(formData.get('birth_date') || '').trim() || null
  const nome_pai = String(formData.get('nome_pai') || '').trim() || null
  const telefone_pai = String(formData.get('telefone_pai') || '').trim() || null
  const class_id = formData.get('class_id')
    ? Number(formData.get('class_id'))
    : null
  const turma_id = formData.get('turma_id')
    ? Number(formData.get('turma_id'))
    : null

  if (!full_name) return { erro: 'Indique o nome completo.' }

  const supabaseAdmin = admin()

  const { error } = await supabaseAdmin
    .from('students')
    .update({
      full_name,
      birth_date,
      nome_pai,
      telefone_pai,
      class_id,
      turma_id,
    })
    .eq('id', id)

  if (error) return { erro: error.message }

  // Atualizar também o profile
  await supabaseAdmin
    .from('profiles')
    .update({ full_name })
    .eq('id', id)

  revalidatePath('/secretario/alunos')
  revalidatePath(`/secretario/alunos/${id}`)

  return { ok: true }
}

/**
 * Marca um mês da propina como pago (manual, pela secretaria).
 */
export async function adicionarMesPago(
  studentId: string,
  month: string
): Promise<{ erro: string } | { ok: true }> {
  const supabaseAdmin = admin()

  const { error } = await supabaseAdmin
    .from('payment_status')
    .upsert(
      {
        student_id: studentId,
        month,
        is_paid: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,month' }
    )

  if (error) return { erro: error.message }

  revalidatePath(`/secretario/alunos/${studentId}`)
  return { ok: true }
}

/**
 * Desmarca um mês da propina (volta a "não pago").
 */
export async function removerMesPago(
  studentId: string,
  month: string
): Promise<{ erro: string } | { ok: true }> {
  const supabaseAdmin = admin()

  const { error } = await supabaseAdmin
    .from('payment_status')
    .update({ is_paid: false, updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('month', month)

  if (error) return { erro: error.message }

  revalidatePath(`/secretario/alunos/${studentId}`)
  return { ok: true }
}