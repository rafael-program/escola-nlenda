import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SecretarioShell from './shell'

export default async function SecretarioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <SecretarioShell>{children}</SecretarioShell>
}