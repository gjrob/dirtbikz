// SOURCE: shared/lib/events.ts — update both if changing
// BTV CANONICAL EVENT EMITTER
// Single emit function — Supabase today, Kafka-ready tomorrow.
// Every client uses this. Never write events directly to DB.

import { createClient } from '@supabase/supabase-js'

export const EventType = {
  QR_SCAN:            'qr.scan',
  PAGE_VIEW:          'page.view',
  CHAT_MESSAGE:       'chat.message',
  RAFFLE_ENTRY:       'raffle.entry',
  RESERVATION:        'reservation.created',
  OVERLAY_IMPRESSION: 'overlay.impression',
  STATUS_CHANGED:     'status.changed',
  HEART_LINGER:       'heart.linger',
} as const

export type EventType = typeof EventType[keyof typeof EventType]

export interface CanonicalEvent {
  event_type: EventType
  client_slug: string
  session_id?: string
  device_type?: string
  payload: Record<string, unknown>
  occurred_at?: string
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function emit(event: CanonicalEvent): Promise<void> {
  try {
    const supabase = getSupabase()
    await supabase.from('canonical_events').insert({
      ...event,
      occurred_at: new Date().toISOString(),
      // KAFKA SWAP POINT — change only here when ready
    })
  } catch (err) {
    console.warn('[BTV] emit failed silently:', err)
  }
}

export async function emitServer(event: CanonicalEvent): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await supabase.from('canonical_events').insert({
      ...event,
      occurred_at: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('[BTV] emitServer failed silently:', err)
  }
}
