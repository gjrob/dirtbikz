'use client'

import { useEffect, useRef } from 'react'
import { createClient } from './supabase'

interface RealtimeConfig {
  table: string
  filter?: string
  onInsert?: (payload: Record<string, unknown>) => void
  onUpdate?: (payload: Record<string, unknown>) => void
  onDelete?: (payload: Record<string, unknown>) => void
}

/**
 * Subscribe to Supabase Realtime changes on a table.
 * Automatically cleans up on unmount.
 */
export function useRealtime({ table, filter, onInsert, onUpdate, onDelete }: RealtimeConfig) {
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current
    const channelName = `realtime-${table}-${filter || 'all'}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload.new as Record<string, unknown>)
          }
          if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload.new as Record<string, unknown>)
          }
          if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload.old as Record<string, unknown>)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter, onInsert, onUpdate, onDelete])
}
