'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface Product {
  id: string
  name: string
  brand?: string
  model?: string
  year?: number
  price_cents: number
  location?: string
  category: string
}

type Mode = 'link' | 'inventory'

interface Props {
  product: Product
  baseUrl: string
  onClose: () => void
}

function fmt(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })
}

export default function QRModal({ product, baseUrl, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<Mode>('link')
  const [copied, setCopied] = useState(false)

  const productUrl = `${baseUrl}/product/${product.id}`
  const inventoryData = JSON.stringify({
    id: product.id,
    name: product.name,
    brand: product.brand || '',
    model: product.model || '',
    year: product.year || '',
    price: fmt(product.price_cents),
    location: product.location || '',
    category: product.category,
  })

  const qrValue = mode === 'link' ? productUrl : inventoryData

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, qrValue, {
      width: 240,
      margin: 2,
      color: { dark: '#1a1a1a', light: '#ffffff' },
      errorCorrectionLevel: mode === 'inventory' ? 'M' : 'L',
    })
  }, [qrValue, mode])

  async function download() {
    if (!canvasRef.current) return
    const dataUrl = canvasRef.current.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `dirtbikz-${mode === 'link' ? 'product' : 'inventory'}-${product.id.slice(0, 8)}.png`
    a.click()
  }

  function print() {
    if (!canvasRef.current) return
    const dataUrl = canvasRef.current.toDataURL('image/png')
    const label = mode === 'link' ? productUrl : product.name
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>QR — ${product.name}</title>
          <style>
            @page { margin: 0.5in; }
            body { font-family: 'Helvetica Neue', sans-serif; text-align: center; padding: 24px; }
            img { display: block; margin: 0 auto 16px; width: 200px; height: 200px; }
            h2 { font-size: 18px; margin: 0 0 6px; }
            p  { font-size: 12px; color: #555; margin: 0; word-break: break-all; }
            .price { font-size: 22px; font-weight: 700; color: #ff6b35; margin: 8px 0 0; }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" />
          <h2>${product.name}</h2>
          <p>${label}</p>
          ${mode === 'link' ? `<div class="price">${fmt(product.price_cents)}</div>` : ''}
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `)
    win.document.close()
  }

  async function copyLink() {
    await navigator.clipboard.writeText(mode === 'link' ? productUrl : inventoryData)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const S = {
    overlay:  { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
    modal:    { background: '#111', border: '1px solid rgba(255,107,53,0.25)', borderTop: '3px solid #ff6b35', borderRadius: '10px', padding: '32px', width: '100%', maxWidth: '420px', fontFamily: 'Inter, sans-serif', color: '#fff' },
    title:    { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '3px', color: '#ff6b35', marginBottom: '4px' },
    sub:      { fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
    tabs:     { display: 'flex', gap: '8px', marginBottom: '20px' },
    tab:      (a: boolean): React.CSSProperties => ({ padding: '6px 16px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: a ? '#ff6b35' : 'rgba(255,255,255,0.08)', color: a ? '#fff' : 'rgba(255,255,255,0.5)' }),
    canvas:   { display: 'block', margin: '0 auto', borderRadius: '8px', background: '#fff', padding: '8px' },
    hint:     { fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' as const, marginTop: '10px', wordBreak: 'break-all' as const, lineHeight: 1.4 },
    btns:     { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '20px' },
    btn:      (color?: string): React.CSSProperties => ({ padding: '9px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: color || 'rgba(255,255,255,0.08)', color: color ? '#fff' : 'rgba(255,255,255,0.7)' }),
    close:    { display: 'block', width: '100%', marginTop: '14px', padding: '9px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' } as React.CSSProperties,
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.title}>QR Code</div>
        <div style={S.sub}>{product.name}</div>

        {/* Mode tabs */}
        <div style={S.tabs}>
          <button style={S.tab(mode === 'link')} onClick={() => setMode('link')}>🔗 Product Link</button>
          <button style={S.tab(mode === 'inventory')} onClick={() => setMode('inventory')}>📦 Inventory Tag</button>
        </div>

        {/* QR Canvas */}
        <canvas ref={canvasRef} style={S.canvas} />
        <p style={S.hint}>
          {mode === 'link'
            ? productUrl
            : `JSON: name, brand, model, year, price, location`}
        </p>

        {/* Actions */}
        <div style={S.btns}>
          <button style={S.btn('#1d7afc')} onClick={print}>🖨️ Print</button>
          <button style={S.btn('#22c55e')} onClick={download}>⬇️ Download</button>
          <button style={S.btn(copied ? '#22c55e' : undefined)} onClick={copyLink}>
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>

        <button style={S.close} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
