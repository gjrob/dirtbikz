// components/VenueStatus.tsx
// CLAUDE.md: Real-time open/closed from Supabase venue_status table
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Status {
  is_open: boolean
  specials_text: string
  happy_hour_active: boolean
}

export default function VenueStatus({ lang = 'en' }: { lang?: 'en' | 'es' }) {
  const [status, setStatus] = useState<Status | null>(null)

  useEffect(() => {
    // Initial fetch
    supabase
      .from('venue_status')
      .select('*')
      .eq('client_slug', 'kyoto')
      .single()
      .then(({ data }) => { if (data) setStatus(data) })

    // Real-time subscription
    const channel = supabase
      .channel('venue-status-kyoto')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'venue_status', filter: 'client_slug=eq.kyoto' },
        ({ new: next }) => setStatus(next as Status)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (!status) return null

  const open   = { en: 'Open Now',   es: 'Abierto Ahora'  }
  const closed = { en: 'Closed',     es: 'Cerrado'        }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      padding: '6px 14px', borderRadius: '20px',
      background: status.is_open ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)',
      border: `1px solid ${status.is_open ? '#4caf50' : '#f44336'}`,
      fontSize: '13px', fontWeight: 500,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: status.is_open ? '#4caf50' : '#f44336',
        animation: status.is_open ? 'pulse 2s infinite' : 'none',
      }} />
      {status.is_open ? open[lang] : closed[lang]}
      {status.specials_text && (
        <span style={{ opacity: 0.7, fontSize: '12px' }}>· {status.specials_text}</span>
      )}
    </div>
  )
}
