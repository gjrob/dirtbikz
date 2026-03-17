'use client'

import { usePathname, useRouter } from 'next/navigation'
import '../globals.css'

const NAV = [
  { href: '/admin/products',  label: 'Products',  icon: '📦' },
  { href: '/admin/orders',    label: 'Orders',    icon: '🧾' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📊' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  const S = {
    shell: { display: 'flex', minHeight: '100vh', background: '#0a0a0a', fontFamily: 'Inter, sans-serif', color: '#fff' } as React.CSSProperties,
    sidebar: { width: '220px', background: '#0f0f0f', borderRight: '1px solid rgba(255,107,53,0.15)', display: 'flex', flexDirection: 'column' as const, flexShrink: 0 } as React.CSSProperties,
    logo: { padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,107,53,0.15)' } as React.CSSProperties,
    logoText: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', color: '#ff6b35', letterSpacing: '4px', display: 'block' } as React.CSSProperties,
    logoSub: { fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase' as const, marginTop: '2px' },
    nav: { flex: 1, padding: '16px 12px' } as React.CSSProperties,
    main: { flex: 1, overflow: 'auto' } as React.CSSProperties,
  }

  return (
    <div style={S.shell}>
      <aside style={S.sidebar}>
        <div style={S.logo}>
          <span style={S.logoText}>DIRTBIKZ</span>
          <span style={S.logoSub}>Admin</span>
        </div>
        <nav style={S.nav}>
          {NAV.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  marginBottom: '4px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  background: active ? 'rgba(255,107,53,0.15)' : 'transparent',
                  color: active ? '#ff6b35' : 'rgba(255,255,255,0.55)',
                  borderLeft: active ? '2px solid #ff6b35' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </a>
            )
          })}
        </nav>
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,107,53,0.1)' }}>
          <button
            onClick={logout}
            style={{ width: '100%', padding: '9px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', textAlign: 'left' }}
          >
            ← Logout
          </button>
        </div>
      </aside>
      <main style={S.main}>{children}</main>
    </div>
  )
}
