'use client'

import { useEffect, useState, useCallback } from 'react'

interface VinLookup {
  id: string
  vin: string
  valid: boolean
  make: string | null
  model: string | null
  year: number | null
  vehicle_type: string | null
  body_class: string | null
  engine_info: string | null
  msrp_cents: number | null
  listed_price_cents: number | null
  price_flag: string
  price_deviation_pct: number | null
  reviewed_by: string | null
  reviewed_at: string | null
  override_reason: string | null
  created_at: string
  sellers: { business_name: string; email: string } | null
  products: { name: string; price_cents: number } | null
}

interface LookupResult {
  valid: boolean
  make: string | null
  model: string | null
  year: number | null
  vehicle_type: string | null
  body_class: string | null
  engine_info: string | null
  msrp: number | null
  price_flag: string
  price_deviation_pct: number | null
  flags: string[]
}

function fmt(cents: number) { return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 }) }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }

const FLAG_COLORS: Record<string, string> = {
  normal: '#22c55e', underpriced: '#f59e0b', overpriced: '#3b82f6', suspicious: '#ef4444',
}

const css = {
  page: { padding: '32px', minHeight: '100vh' } as React.CSSProperties,
  title: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '3px', color: '#fff', marginBottom: '24px' } as React.CSSProperties,
  lookupBox: { background: '#141414', border: '1px solid rgba(255,107,53,0.15)', borderRadius: '8px', padding: '20px', marginBottom: '24px' } as React.CSSProperties,
  input: { background: '#0a0a0a', border: '1px solid rgba(255,107,53,0.2)', borderRadius: '4px', padding: '10px 14px', color: '#fff', fontSize: '15px', fontFamily: 'monospace', letterSpacing: '2px', width: '260px', outline: 'none', textTransform: 'uppercase' as const } as React.CSSProperties,
  inputSmall: { background: '#0a0a0a', border: '1px solid rgba(255,107,53,0.2)', borderRadius: '4px', padding: '8px 12px', color: '#fff', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' as const } as React.CSSProperties,
  btnPrimary: { background: '#ff6b35', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.95rem', letterSpacing: '2px', cursor: 'pointer' } as React.CSSProperties,
  btnGhost: { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer' } as React.CSSProperties,
  btnSuccess: { background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: 'none', borderRadius: '4px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer' } as React.CSSProperties,
  resultCard: { background: '#0f0f0f', border: '1px solid rgba(255,107,53,0.12)', borderRadius: '8px', padding: '20px', marginTop: '16px' } as React.CSSProperties,
  tableWrap: { background: '#0f0f0f', border: '1px solid rgba(255,107,53,0.12)', borderRadius: '8px', overflow: 'auto' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, minWidth: '1100px' } as React.CSSProperties,
  th: { padding: '12px 14px', textAlign: 'left' as const, fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: 'rgba(255,107,53,0.7)', borderBottom: '1px solid rgba(255,107,53,0.1)', background: 'rgba(255,107,53,0.04)', whiteSpace: 'nowrap' as const },
  td: { padding: '12px 14px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#fff' },
  badge: (color: string): React.CSSProperties => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px', background: color + '22', color }),
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' } as React.CSSProperties,
  statCard: { background: '#141414', border: '1px solid rgba(255,107,53,0.15)', borderRadius: '8px', padding: '14px 18px' } as React.CSSProperties,
  statNum: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', color: '#ff6b35', lineHeight: 1 } as React.CSSProperties,
  statLabel: { fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginTop: '4px' },
  filterRow: { display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' as const, alignItems: 'center' } as React.CSSProperties,
  filterBtn: (active: boolean): React.CSSProperties => ({ padding: '6px 14px', borderRadius: '4px', border: 'none', background: active ? '#ff6b35' : 'rgba(255,255,255,0.06)', color: active ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px', cursor: 'pointer' }),
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
  modal: { background: '#111', border: '1px solid rgba(255,107,53,0.2)', borderTop: '3px solid #ff6b35', borderRadius: '10px', padding: '32px', width: '100%', maxWidth: '480px' } as React.CSSProperties,
}

export default function AdminVinDashboard() {
  const [lookups, setLookups] = useState<VinLookup[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  // Manual VIN lookup
  const [vin, setVin] = useState('')
  const [listedPrice, setListedPrice] = useState('')
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null)
  const [lookingUp, setLookingUp] = useState(false)

  // Batch verify
  const [batching, setBatching] = useState(false)
  const [batchResult, setBatchResult] = useState<{ verified: number; flagged: number; total: number } | null>(null)

  // Override modal
  const [overrideTarget, setOverrideTarget] = useState<VinLookup | null>(null)
  const [overrideFlag, setOverrideFlag] = useState('normal')
  const [overrideReason, setOverrideReason] = useState('')
  const [overriding, setOverriding] = useState(false)

  const loadLookups = useCallback(async () => {
    setLoading(true)
    const url = filter === 'all' ? '/api/admin/vin-lookup' : `/api/admin/vin-lookup?flag=${filter}`
    const res = await fetch(url)
    if (res.ok) setLookups(await res.json())
    setLoading(false)
  }, [filter])

  useEffect(() => { loadLookups() }, [loadLookups])

  async function doLookup(e: React.FormEvent) {
    e.preventDefault()
    setLookingUp(true)
    setLookupResult(null)

    const res = await fetch('/api/admin/vin-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vin,
        listed_price_cents: listedPrice ? Math.round(parseFloat(listedPrice) * 100) : undefined,
      }),
    })

    const data = await res.json()
    setLookingUp(false)

    if (res.ok) {
      setLookupResult(data)
      loadLookups()
    } else {
      setLookupResult({ valid: false, make: null, model: null, year: null, vehicle_type: null, body_class: null, engine_info: null, msrp: null, price_flag: 'normal', price_deviation_pct: null, flags: [data.error || 'Lookup failed'] })
    }
  }

  async function doBatchVerify() {
    setBatching(true)
    setBatchResult(null)
    const res = await fetch('/api/admin/vin-lookup/batch', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setBatchResult(data)
      loadLookups()
    }
    setBatching(false)
  }

  async function doOverride() {
    if (!overrideTarget) return
    setOverriding(true)
    await fetch(`/api/admin/vin-lookup/${overrideTarget.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewed_by: 'admin',
        override_reason: overrideReason,
        override_flag: overrideFlag,
      }),
    })
    setOverriding(false)
    setOverrideTarget(null)
    setOverrideReason('')
    loadLookups()
  }

  const stats = {
    total: lookups.length,
    flagged: lookups.filter(l => l.price_flag !== 'normal').length,
    suspicious: lookups.filter(l => l.price_flag === 'suspicious').length,
    underpriced: lookups.filter(l => l.price_flag === 'underpriced').length,
    invalid: lookups.filter(l => !l.valid).length,
    reviewed: lookups.filter(l => l.reviewed_by).length,
  }

  return (
    <div style={css.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ ...css.title, marginBottom: 0 }}>VIN Verification & Fraud Prevention</h1>
        <button onClick={doBatchVerify} disabled={batching} style={{ ...css.btnPrimary, opacity: batching ? 0.7 : 1 }}>
          {batching ? 'Verifying...' : 'Batch Verify All'}
        </button>
      </div>

      {/* Batch result */}
      {batchResult && (
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: '#22c55e' }}>
          Batch complete: {batchResult.verified}/{batchResult.total} verified, {batchResult.flagged} flagged
        </div>
      )}

      {/* Manual VIN Lookup */}
      <div style={css.lookupBox}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
          Manual VIN Lookup
        </div>
        <form onSubmit={doLookup} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <input style={css.input} value={vin} onChange={e => setVin(e.target.value.toUpperCase())} maxLength={17} placeholder="Enter 17-char VIN" required />
          </div>
          <div>
            <input style={{ ...css.input, width: '140px', fontFamily: 'inherit', letterSpacing: 'normal', textTransform: 'none' as const }} value={listedPrice} onChange={e => setListedPrice(e.target.value)} type="number" step="0.01" placeholder="Listed $ (opt)" />
          </div>
          <button type="submit" disabled={lookingUp} style={{ ...css.btnPrimary, opacity: lookingUp ? 0.7 : 1 }}>
            {lookingUp ? 'Checking...' : 'Decode VIN'}
          </button>
        </form>

        {lookupResult && (
          <div style={css.resultCard}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: lookupResult.valid ? '#22c55e' : '#ef4444' }}>
                  {lookupResult.valid ? 'VALID VIN' : 'INVALID VIN'}
                </div>
              </div>
              {lookupResult.make && (
                <>
                  <div>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Vehicle</span>
                    <div style={{ fontSize: '14px', color: '#fff' }}>{lookupResult.year} {lookupResult.make} {lookupResult.model}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Type</span>
                    <div style={{ fontSize: '14px', color: '#fff' }}>{lookupResult.vehicle_type || '—'}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Engine</span>
                    <div style={{ fontSize: '14px', color: '#fff' }}>{lookupResult.engine_info || '—'}</div>
                  </div>
                  {lookupResult.msrp && (
                    <div>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>MSRP</span>
                      <div style={{ fontSize: '14px', color: '#ffb347', fontWeight: 700 }}>${lookupResult.msrp.toLocaleString()}</div>
                    </div>
                  )}
                </>
              )}
              {lookupResult.price_flag !== 'normal' && (
                <div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Price Flag</span>
                  <div style={css.badge(FLAG_COLORS[lookupResult.price_flag] || '#6b7280')}>
                    {lookupResult.price_flag} ({lookupResult.price_deviation_pct}%)
                  </div>
                </div>
              )}
            </div>
            {lookupResult.flags.length > 0 && (
              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: '6px', fontSize: '12px', color: '#ef4444' }}>
                {lookupResult.flags.join(' | ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={css.statsRow}>
        <div style={css.statCard}><div style={css.statNum}>{stats.total}</div><div style={css.statLabel}>Total Lookups</div></div>
        <div style={css.statCard}><div style={{ ...css.statNum, color: '#f59e0b' }}>{stats.flagged}</div><div style={css.statLabel}>Flagged</div></div>
        <div style={css.statCard}><div style={{ ...css.statNum, color: '#ef4444' }}>{stats.suspicious}</div><div style={css.statLabel}>Suspicious</div></div>
        <div style={css.statCard}><div style={{ ...css.statNum, color: '#f59e0b' }}>{stats.underpriced}</div><div style={css.statLabel}>Underpriced</div></div>
        <div style={css.statCard}><div style={{ ...css.statNum, color: '#6b7280' }}>{stats.invalid}</div><div style={css.statLabel}>Invalid VIN</div></div>
        <div style={css.statCard}><div style={{ ...css.statNum, color: '#22c55e' }}>{stats.reviewed}</div><div style={css.statLabel}>Reviewed</div></div>
      </div>

      {/* Filter */}
      <div style={css.filterRow}>
        {['all', 'normal', 'underpriced', 'overpriced', 'suspicious'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={css.filterBtn(filter === f)}>{f}</button>
        ))}
      </div>

      {/* Lookups Table */}
      <div style={css.tableWrap}>
        <table style={css.table}>
          <thead>
            <tr>
              {['VIN', 'Valid', 'Vehicle', 'MSRP', 'Listed', 'Flag', 'Dev%', 'Seller', 'Product', 'Reviewed', 'Date', 'Actions'].map(h => (
                <th key={h} style={css.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} style={{ ...css.td, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px' }}>Loading...</td></tr>
            ) : lookups.map(l => (
              <tr key={l.id} style={l.price_flag === 'suspicious' ? { background: 'rgba(239,68,68,0.04)' } : l.price_flag === 'underpriced' ? { background: 'rgba(245,158,11,0.03)' } : {}}>
                <td style={{ ...css.td, fontFamily: 'monospace', fontSize: '11px', letterSpacing: '1px' }}>{l.vin}</td>
                <td style={css.td}>
                  <span style={css.badge(l.valid ? '#22c55e' : '#ef4444')}>{l.valid ? 'Yes' : 'No'}</span>
                </td>
                <td style={css.td}>{[l.year, l.make, l.model].filter(Boolean).join(' ') || '—'}</td>
                <td style={css.td}>{l.msrp_cents ? fmt(l.msrp_cents) : '—'}</td>
                <td style={css.td}>{l.listed_price_cents ? fmt(l.listed_price_cents) : '—'}</td>
                <td style={css.td}>
                  <span style={css.badge(FLAG_COLORS[l.price_flag] || '#6b7280')}>{l.price_flag}</span>
                </td>
                <td style={css.td}>{l.price_deviation_pct != null ? `${l.price_deviation_pct}%` : '—'}</td>
                <td style={{ ...css.td, fontSize: '11px' }}>{l.sellers?.business_name || '—'}</td>
                <td style={{ ...css.td, fontSize: '11px' }}>{l.products?.name || '—'}</td>
                <td style={css.td}>
                  {l.reviewed_by ? (
                    <div>
                      <span style={css.badge('#22c55e')}>Reviewed</span>
                      {l.override_reason && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{l.override_reason}</div>}
                    </div>
                  ) : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>—</span>}
                </td>
                <td style={{ ...css.td, fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{fmtDate(l.created_at)}</td>
                <td style={css.td}>
                  {!l.reviewed_by && l.price_flag !== 'normal' ? (
                    <button onClick={() => { setOverrideTarget(l); setOverrideFlag('normal'); setOverrideReason('') }} style={css.btnSuccess}>
                      Override
                    </button>
                  ) : !l.reviewed_by ? (
                    <button onClick={() => { setOverrideTarget(l); setOverrideFlag(l.price_flag); setOverrideReason('') }} style={css.btnGhost}>
                      Review
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!loading && lookups.length === 0 && (
              <tr><td colSpan={12} style={{ ...css.td, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '48px' }}>No VIN lookups yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Override Modal */}
      {overrideTarget && (
        <div style={css.overlay} onClick={() => setOverrideTarget(null)}>
          <div style={css.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '3px', color: '#ff6b35', marginBottom: '16px' }}>
              Review VIN Lookup
            </h2>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
              <div><strong>VIN:</strong> {overrideTarget.vin}</div>
              <div><strong>Vehicle:</strong> {[overrideTarget.year, overrideTarget.make, overrideTarget.model].filter(Boolean).join(' ')}</div>
              <div><strong>Current Flag:</strong> <span style={css.badge(FLAG_COLORS[overrideTarget.price_flag] || '#6b7280')}>{overrideTarget.price_flag}</span></div>
              {overrideTarget.price_deviation_pct != null && <div><strong>Deviation:</strong> {overrideTarget.price_deviation_pct}% from MSRP</div>}
              {overrideTarget.sellers && <div><strong>Seller:</strong> {overrideTarget.sellers.business_name}</div>}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Override Flag To</label>
              <select value={overrideFlag} onChange={e => setOverrideFlag(e.target.value)} style={css.inputSmall}>
                <option value="normal">Normal (clear flag)</option>
                <option value="underpriced">Underpriced</option>
                <option value="overpriced">Overpriced</option>
                <option value="suspicious">Suspicious</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Reason / Notes</label>
              <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} style={{ ...css.inputSmall, height: '80px', resize: 'vertical' as const }} placeholder="e.g. Verified with seller — custom build justifies low price" />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={doOverride} disabled={overriding} style={{ flex: 1, ...css.btnPrimary, opacity: overriding ? 0.7 : 1 }}>
                {overriding ? 'Saving...' : 'Confirm Review'}
              </button>
              <button onClick={() => setOverrideTarget(null)} style={{ flex: 1, ...css.btnGhost, padding: '10px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
