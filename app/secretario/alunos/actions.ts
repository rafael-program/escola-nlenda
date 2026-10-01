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