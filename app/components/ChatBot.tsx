'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  lang?: 'en' | 'es'
}

export default function ChatBot({ lang = 'en' }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: lang === 'es'
      ? '¡Hola! Soy el asistente de DIRTBIKZ. Pregúntame sobre inventario, partes, precios o ubicaciones. ¿En qué te puedo ayudar?'
      : "Hey! I'm the DIRTBIKZ assistant. Ask me about inventory, parts, pricing, or locations. What are you looking for?",
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, lang }),
      })
      if (!res.body) throw new Error('no body')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let reply = ''
      setMessages(m => [...m, { role: 'assistant', content: '' }])
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        reply += decoder.decode(value, { stream: true })
        setMessages(m => m.map((msg, i) => i === m.length - 1 ? { ...msg, content: reply } : msg))
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: lang === 'es' ? 'Lo siento, algo salió mal. Llámanos al (910) 555-0100.' : 'Sorry, something went wrong. Call us at (910) 555-0100.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        className="chat-bubble"
        onClick={() => setOpen(o => !o)}
        aria-label="Open chat"
      >
        {open ? '✕' : '🏍️'}
      </button>

      {open && (
        <div className="chat-panel">
          <div className="chat-panel__header">
            <span className="chat-panel__title">DIRTBIKZ AI</span>
            <button className="chat-panel__close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="chat-panel__messages" ref={messagesRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="chat-msg chat-msg--assistant chat-msg--loading">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
            )}
          </div>

          <div className="chat-panel__input">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={lang === 'es' ? 'Pregunta sobre inventario...' : 'Ask about inventory...'}
            />
            <button onClick={send} disabled={loading}>
              {lang === 'es' ? 'Enviar' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
