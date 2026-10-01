import { createClient } from '@/lib/supabase/server'
import ClassesClient from './client'

export default async function ClassesPage() {
  const supabase = await createClient()

  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, created_at')
    .order('name')

  return <ClassesClient classes={classes ?? []} />
}