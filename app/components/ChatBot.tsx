'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Welcome to Kyoto Asian Grille! 🥢 I\'m Yuki, your virtual host. Ask me about our menu, specials, gluten-free options, or anything else. How can I help?'
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
        body: JSON.stringify({ messages: updated }),
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
        { role: 'assistant', content: 'Sorry, I\'m having trouble connecting. Please call us at (910) 332-3302 and we\'ll be happy to help!' }
      ]);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Detect language for bilingual greeting
  const detectLang = (text: string) => {
    const esWords = ['hola', 'menú', 'comida', 'quiero', 'precio', 'reservar', 'gracias', 'por favor'];
    return esWords.some(w => text.toLowerCase().includes(w)) ? 'es' : 'en';
  };

  return (
    <>
      <button
        className={`chatbot-bubble ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? '✕' : '🥢'}
      </button>

      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <div className="chatbot-avatar">🍣</div>
            <div className="chatbot-header-text">
              <h4>Yuki — Kyoto Virtual Host</h4>
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
              placeholder="Ask about our menu, hours, GF options..."
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
