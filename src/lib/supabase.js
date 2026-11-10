import { createClient } from '@supabase/supabase-js'

// Publishable key: access to exam data is controlled by Supabase Auth and RLS.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://oqigdiwdblppeombecyi.supabase.co',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_RduRHMr2_kRvf4sutewP5w_ynJRms58',
)

export const normalizeName = (name) => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
export async function loginEmail(name) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizeName(name)))
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex}@accounts.bacc.invalid`
}
