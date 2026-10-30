import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Bot, Send, User, Loader2, ArrowRight, Route, ShieldAlert, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import type { ChatMessage } from '../../types';

const quickPrompts = [
  'Optimize all pending deliveries',
  'Vehicle 2 has broken down. Redistribute its deliveries.',
  'Which vehicle has the highest workload?',
  'Show deliveries that may be delayed.',
  'Suggest how to reduce total delivery distance.',
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content:
        "👋 Welcome! I am **SmartMove AI Assistant**, your intelligent logistics advisor.\n\nI monitor your Chennai fleet, analyze real-time delivery loads, and connect directly with our OR-Tools optimization engine. Ask me anything or select a prompt below!",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastIntent, setLastIntent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.post('/api/ai/chat', {
        message: text,
        history: historyPayload,
      });

      const aiMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: res.data.response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setLastIntent(res.data.intent || null);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content:
            "⚠️ The AI service is currently operating in offline mode. Make sure the FastAPI backend is running and `GEMINI_API_KEY` is configured in `backend/.env`.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            SmartMove AI Assistant
          </h1>
          <p className="text-xs text-slate-500">
            Powered by Google Gemini 1.5 & OR-Tools logistics heuristics
          </p>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden min-h-0">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${
                    isUser ? 'bg-blue-600 text-white' : 'bg-slate-900 text-blue-400'
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-sm whitespace-pre-line'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 max-w-md">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-blue-400 shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                Analyzing logistics telemetry and computing response…
              </div>
            </div>
          )}

          {/* Action Shortcut suggestion if relevant */}
          {lastIntent === 'optimize' && !loading && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 max-w-md">
              <Route className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Ready to run mathematical multi-vehicle optimization?</span>
              <Link
                to="/admin/optimization"
                className="ml-auto inline-flex items-center gap-1 font-bold text-blue-700 hover:underline shrink-0"
              >
                Go to Optimizer <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {lastIntent === 'breakdown' && !loading && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 max-w-md">
              <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
              <span>Simulate breakdown impact and review route reassignments?</span>
              <Link
                to="/admin/scenarios"
                className="ml-auto inline-flex items-center gap-1 font-bold text-red-700 hover:underline shrink-0"
              >
                Open Simulator <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="border-t border-slate-100 bg-slate-50/50 p-3 overflow-x-auto">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium shrink-0">Suggestions:</span>
            {quickPrompts.map((p) => (
              <button
                key={p}
                onClick={() => handleSend(p)}
                disabled={loading}
                className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:border-blue-300 hover:text-blue-700 transition-colors disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={onSubmit} className="flex items-center gap-2 p-3 bg-white border-t border-slate-100">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask SmartMove AI (e.g., 'Optimize pending deliveries' or 'Which route has the highest workload?')..."
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
