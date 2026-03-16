'use client'

// ── Drop-in replacement for any Kyoto button that currently does:
//    href="https://kyotoasiangrille.cloveronline.com/..."
//
// BEFORE (in your current kyoto page.tsx):
//   <a href="https://kyotoasiangrille.cloveronline.com/menu/all">Order Online Now</a>
//
// AFTER — replace with this component:
//   <OrderButton lang={lang} />
//
// This captures the lead in Supabase FIRST, then optionally
// shows the Clover link as a fallback so nothing breaks.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Lang = 'en' | 'es'
const t = (en: string, es: string, lang: Lang) => lang === 'es' ? es : en

// ── Inline order inquiry modal ────────────────────────────────────────────────
function KyotoOrderModal({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [confirmId, setConfirmId] = useState('')

  const KYOTO_ACCENT = '#c9a84c'
  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async () => {
    if (!form.name || !form.phone) {
      alert(t('Name and phone required.', 'Nombre y teléfono requeridos.', lang))
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('leads').insert([{
        client_slug: 'kyoto',
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        message: form.notes || t('Online order inquiry', 'Consulta de orden en línea', lang),
        source: 'order_button',
        lang,
      }])
      if (error) throw error
      setConfirmId(`KY-${Date.now().toString(36).toUpperCase()}`)
      setDone(true)
    } catch {
      alert(t('Error. Please call (910) 332-3302.', 'Error. Llama al (910) 332-3302.', lang))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#0d0a05', border: `2px solid ${KYOTO_ACCENT}`, width: '100%', maxWidth: '480px', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: KYOTO_ACCENT, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '16px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {done ? t('Order Received!', '¡Pedido Recibido!', lang) : `🍱 ${t('Order from Kyoto', 'Pedir de Kyoto', lang)}`}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '24px' }}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '20px', marginBottom: '0.5rem' }}>
                {t("We'll call you shortly!", '¡Te llamaremos pronto!', lang)}
              </h3>
              <p style={{ color: '#888', fontSize: '13px', marginBottom: '0.5rem' }}>
                {t('Confirmation:', 'Confirmación:', lang)} <span style={{ color: KYOTO_ACCENT, fontWeight: 700 }}>{confirmId}</span>
              </p>
              <p style={{ color: '#555', fontSize: '13px', marginBottom: '2rem' }}>
                {t(`We'll call ${form.phone} to take your order.`, `Te llamaremos al ${form.phone} para tu pedido.`, lang)}
              </p>
              {/* Offer Clover as secondary fallback */}
              <p style={{ color: '#444', fontSize: '12px', marginBottom: '1rem' }}>
                {t('Or order directly:', 'O pedir directamente:', lang)}
              </p>
              <a
                href="https://kyotoasiangrille.cloveronline.com/menu/all"
                target="_blank" rel="noopener noreferrer"
                style={{ color: KYOTO_ACCENT, fontSize: '12px', fontFamily: 'monospace' }}
              >
                kyotoasiangrille.cloveronline.com →
              </a>
              <br /><br />
              <button onClick={onClose} style={{ background: KYOTO_ACCENT, color: '#fff', border: 'none', padding: '10px 28px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {t('Done', 'Listo', lang)}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ color: '#888', fontSize: '13px', lineHeight: 1.5 }}>
                {t(
                  "Leave your name and number — we'll call you to place your order. No account needed.",
                  'Deja tu nombre y número — te llamamos para tomar tu pedido. Sin cuenta requerida.',
                  lang
                )}
              </p>
              {[
                { key: 'name', label: t('Name *', 'Nombre *', lang), type: 'text', ph: t('Your name', 'Tu nombre', lang) },
                { key: 'phone', label: t('Phone *', 'Teléfono *', lang), type: 'tel', ph: '(910) 555-0000' },
                { key: 'email', label: t('Email (optional)', 'Correo (opcional)', lang), type: 'email', ph: 'you@email.com' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', color: '#555', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '5px' }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => f(field.key as keyof typeof form, e.target.value)}
                    placeholder={field.ph}
                    style={{ width: '100%', background: '#070202', border: '1px solid #2a2510', color: '#fff', padding: '10px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', color: '#555', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '5px' }}>
                  {t('What would you like?', '¿Qué deseas pedir?', lang)}
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => f('notes', e.target.value)}
                  placeholder={t('e.g. Dragon Roll x2, Miso Soup, no spice', 'ej. Dragon Roll x2, Sopa Miso, sin picante', lang)}
                  rows={3}
                  style={{ width: '100%', background: '#070202', border: '1px solid #2a2510', color: '#fff', padding: '10px 14px', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={submit}
                disabled={submitting}
                style={{ background: submitting ? '#8a7030' : KYOTO_ACCENT, color: '#fff', border: 'none', padding: '14px', fontWeight: 700, fontSize: '15px', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: submitting ? 'not-allowed' : 'pointer', width: '100%' }}
              >
                {submitting ? t('Sending...', 'Enviando...', lang) : `✓ ${t('REQUEST ORDER CALL', 'SOLICITAR LLAMADA', lang)}`}
              </button>
              <p style={{ color: '#333', fontSize: '11px', textAlign: 'center', fontFamily: 'monospace' }}>
                {t('We call within 15 min during business hours', 'Llamamos en 15 min durante horario de atención', lang)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── The button component — drop this in wherever the Clover link was ──────────
export function OrderButton({ lang = 'en' as Lang }: { lang?: Lang }) {
  const [open, setOpen] = useState(false)
  const KYOTO_ACCENT = '#c9a84c'

  return (
    <>
      {open && <KyotoOrderModal lang={lang} onClose={() => setOpen(false)} />}
      <button
        onClick={() => setOpen(true)}
        style={{
          background: KYOTO_ACCENT,
          color: '#fff',
          border: '2px solid rgba(255,255,255,0.15)',
          padding: '14px 32px',
          fontWeight: 700,
          fontSize: '16px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.15s',
          fontFamily: "'Inter', sans-serif",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#a8863a' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#c9a84c' }}
      >
        🍱 {t('Order Online Now', 'Pedir en Línea', lang)}
      </button>
    </>
  )
}
