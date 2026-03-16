'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBotProps {
  lang?: 'en' | 'es';
}

export default function ChatBot({ lang = 'en' }: ChatBotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: lang === 'es'
        ? '¡BIENVENIDO A DUSTDEVIL! 🏍️ Soy DEVIL, tu asistente del mercado. ¿Buscas comprar, vender, o necesitas consejos sobre motos?'
        : 'WELCOME TO DUSTDEVIL! 🏍️ I\'m DEVIL, your marketplace AI. Looking to buy, sell, or need advice on a bike?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated, lang }),
      });

      if (!res.ok) throw new Error('Chat failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let botText = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      setLoading(false);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          botText += chunk;
          setMessages(prev => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: 'assistant', content: botText };
            return copy;
          });
        }
      }
    } catch {
      setLoading(false);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: lang === 'es'
            ? '¡Lo siento! Algo salió mal. Intenta de nuevo.'
            : 'Sorry, something went wrong. Try again!'
        }
      ]);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const placeholder = lang === 'es'
    ? 'Pregunta sobre motos, precios, consejos...'
    : 'Ask about bikes, prices, what to look for...';

  return (
    <>
      <button
        className={`chatbot-bubble ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? '✕' : '🏍️'}
      </button>

      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <div className="chatbot-avatar">💀</div>
            <div className="chatbot-header-text">
              <h4>DEVIL — DUSTDEVIL AI</h4>
              <span><span className="chatbot-online"></span>Online now</span>
            </div>
          </div>

          <div className="chatbot-messages" ref={messagesRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role === 'user' ? 'user' : 'bot'}`}>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="chat-typing">
                <span></span><span></span><span></span>
              </div>
            )}
          </div>

          <div className="chatbot-input">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={placeholder}
              autoFocus
            />
            <button onClick={send} disabled={loading} aria-label="Send">
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
