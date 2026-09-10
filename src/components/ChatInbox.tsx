'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, MessageCircle, AlertCircle, Trash2, Sparkles, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ChatInbox({ lead }: { lead: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lead) return;

    // Fetch initial messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('lead_id', lead.id)
        .order('sent_at', { ascending: true });
      if (data) setMessages(data);
    };

    fetchMessages();

    // Subscribe to new messages in real-time
    const channel = supabase
      .channel(`messages:${lead.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${lead.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `lead_id=eq.${lead.id}` },
        () => {
          setMessages([]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lead]);

  useEffect(() => {
    setSendError(null);
    setConfirmClear(false);
  }, [lead?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, text: input }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSendError(data.error || 'Failed to dispatch message via WhatsApp.');
        return;
      }
      setInput('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      setSendError(error?.message || 'Network error occurred while sending message.');
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    if (!lead?.id || clearing) return;
    setClearing(true);
    try {
      const res = await fetch(`/api/messages?leadId=${lead.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessages([]);
        setConfirmClear(false);
      } else {
        const data = await res.json();
        setSendError(data.error || 'Failed to archive chat thread.');
      }
    } catch (err: any) {
      setSendError(err?.message || 'Error clearing chat thread.');
    } finally {
      setClearing(false);
    }
  };

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[360px] rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] p-8 text-center text-[var(--ink)]/50">
        <div className="w-12 h-12 rounded-xl bg-[var(--paper)] border border-[var(--paper-line)] flex items-center justify-center mb-3">
          <MessageCircle size={22} className="opacity-60" />
        </div>
        <p className="font-display font-medium text-sm text-[var(--ink)]/80">Studio WhatsApp Console</p>
        <p className="text-xs text-[var(--ink)]/50 mt-1 max-w-[200px]">
          Select any lead from the live pipeline to view their conversational thread.
        </p>
      </div>
    );
  }

  const priorityColor =
    lead.priority_tier === 'urgent'
      ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
      : lead.priority_tier === 'high' || lead.qualification_percentage >= 70
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
      : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400';

  return (
    <div className="flex flex-col h-full min-h-[440px] bg-[var(--paper)] rounded-2xl shadow-xs border border-[var(--paper-line)] overflow-hidden">
      {/* Thread Header */}
      <div className="p-4 border-b border-[var(--paper-line)] bg-[var(--paper-raised)] flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-sm text-[var(--ink)]">{lead.name}</h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--paper-line)] text-[var(--ink)]/70 uppercase">
              {lead.source}
            </span>
            {lead.qualification_percentage > 0 && (
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${priorityColor}`}>
                {lead.qualification_percentage}% Match
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--ink)]/55 font-mono">
            <span>{lead.contact}</span>
            {lead.estimated_budget && (
              <>
                <span>•</span>
                <span className="text-[var(--amber-deep)] dark:text-[var(--amber)]">{lead.estimated_budget}</span>
              </>
            )}
            {lead.project_type && (
              <>
                <span>•</span>
                <span>{lead.project_type}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {confirmClear ? (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
              <button
                onClick={handleClearChat}
                disabled={clearing}
                className="text-[10px] font-mono font-semibold px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-2xs"
              >
                {clearing ? 'Clearing...' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="text-[10px] font-mono px-2 py-1 rounded bg-[var(--paper)] border border-[var(--paper-line)] text-[var(--ink)]/70 hover:text-[var(--ink)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              title="Archive conversation thread (preserves cumulative lead profile)"
              className="p-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)]/60 hover:text-red-500 hover:border-red-500/30 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          )}

          <span
            className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${
              lead.status === 'qualified'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-[var(--paper)] border-[var(--paper-line)] text-[var(--ink)]/70'
            }`}
          >
            {lead.status}
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--paper)]">
        {messages.length === 0 && lead.message && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-xl p-3 shadow-2xs bg-[var(--paper-raised)] text-[var(--ink)] border border-[var(--paper-line)] rounded-bl-none">
              <p className="text-xs sm:text-sm leading-relaxed">{lead.message}</p>
              <p className="text-[10px] mt-1 text-right font-mono text-[var(--ink)]/40">
                {lead.created_at ? format(new Date(lead.created_at), 'HH:mm') : ''}
              </p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-xl p-3 shadow-2xs ${
                msg.direction === 'outbound'
                  ? 'bg-[var(--amber)] text-[var(--text-on-amber)] rounded-br-none'
                  : 'bg-[var(--paper-raised)] text-[var(--ink)] border border-[var(--paper-line)] rounded-bl-none'
              }`}
            >
              <p className="text-xs sm:text-sm leading-relaxed">{msg.content}</p>
              <p
                className={`text-[10px] mt-1 text-right font-mono ${
                  msg.direction === 'outbound' ? 'text-white/75' : 'text-[var(--ink)]/40'
                }`}
              >
                {format(new Date(msg.sent_at), 'HH:mm')}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Section */}
      <div className="p-3 bg-[var(--paper-raised)] border-t border-[var(--paper-line)]">
        {/* AI Suggested Reply Banner */}
        {lead.suggested_reply && (
          <div className="mb-2 p-2.5 rounded-lg bg-[var(--amber)]/10 border border-[var(--amber)]/20 text-xs flex items-start justify-between gap-2 animate-in fade-in duration-150">
            <div className="space-y-1 overflow-hidden">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--amber-deep)] dark:text-[var(--amber)]">
                <Sparkles size={13} className="shrink-0" />
                <span>AI Suggested Reply</span>
              </div>
              <p className="text-[var(--ink)]/80 italic font-mono text-[11px] leading-relaxed line-clamp-2">
                "{lead.suggested_reply}"
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInput(lead.suggested_reply)}
              className="shrink-0 px-2 py-1 text-[10px] font-mono font-medium rounded bg-[var(--amber)] text-[var(--text-on-amber)] hover:bg-[var(--amber-deep)] cursor-pointer shadow-2xs"
            >
              Use Draft
            </button>
          </div>
        )}

        {/* Delivery Error Banner */}
        {sendError && (
          <div className="mb-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
            <span className="flex items-center gap-1.5 font-mono">
              <AlertCircle size={14} className="shrink-0" />
              <span>{sendError}</span>
            </span>
            <button
              onClick={() => setSendError(null)}
              className="text-xs font-bold opacity-70 hover:opacity-100 px-1 py-0.5"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Input Row */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            className="flex-1 border border-[var(--paper-line)] bg-[var(--paper)] rounded-lg px-3.5 py-2 text-xs sm:text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/40 focus:outline-none focus:border-[var(--amber)] transition-colors"
            placeholder="Type WhatsApp reply..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="bg-[var(--amber)] text-[var(--text-on-amber)] p-2 rounded-lg hover:bg-[var(--amber-deep)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
