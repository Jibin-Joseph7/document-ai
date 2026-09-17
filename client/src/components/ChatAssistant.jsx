// client/src/components/ChatAssistant.jsx
import { useRef, useState, useEffect } from 'react';
import { Sparkles, Send, FileText } from 'lucide-react';
import { Documents } from '../lib/documents';

// `scopeDocId`, when set, restricts questions to a single document
// (POST /documents/:id/ask); otherwise questions run across every
// document the user can see (POST /documents/ask). Same component either
// way - only the endpoint called changes.
export function ChatAssistant({ scopeDocId, scopeLabel }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [asking, setAsking] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || asking) return;

    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setAsking(true);

    try {
      const result = await Documents.ask(question, scopeDocId);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: result.answer,
          answerType: result.answer_type,
          sources: result.sources,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Something went wrong: ${err.message}`, answerType: 'error' },
      ]);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="h-4 w-4 text-gold-600" />
        <h3 className="text-sm font-semibold text-ink">
          Ask {scopeLabel ? `about “${scopeLabel}”` : 'your documents'}
        </h3>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-ink-faint">
            Ask a question in plain language — answers are grounded in your
            {scopeDocId ? ' document' : ' visible documents'} only.
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-right' : ''}>
            <div
              className={`inline-block max-w-[85%] rounded-sm px-3 py-2 text-left text-sm ${
                msg.role === 'user'
                  ? 'bg-ink text-white'
                  : msg.answerType === 'error'
                    ? 'border border-error-600/30 bg-error-50 text-error-600'
                    : 'border border-gold-100 bg-surface text-ink'
              }`}
            >
              {msg.text}
              {msg.sources?.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-border pt-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                    Sources
                  </p>
                  {msg.sources.map((s, j) => (
                    <div key={j} className="flex items-center gap-1.5 text-xs text-ink-faint">
                      <FileText className="h-3 w-3 shrink-0" />
                      Document #{s.document_id}
                      <span className="text-gold-600">
                        {Math.round(Math.max(s.score, 0) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {asking && <p className="text-sm text-ink-faint">Thinking…</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border px-4 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-teal-600"
        />
        <button
          type="submit"
          disabled={asking || !input.trim()}
          aria-label="Send"
          className="rounded-sm bg-teal-600 px-3 py-2 text-white transition-colors hover:bg-teal-700 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}