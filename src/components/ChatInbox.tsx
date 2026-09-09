'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, User } from 'lucide-react';
import { format } from 'date-fns';

export default function ChatInbox({ lead }: { lead: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
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

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${lead.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${lead.id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, text: input }),
      });
      setInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <User size={48} className="mb-4 opacity-50" />
        <p>Select a lead to view conversation</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-gray-900">{lead.name}</h3>
          <p className="text-xs text-gray-500">{lead.contact} • {lead.source}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          lead.status === 'qualified' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
        }`}>
          {lead.status}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-lg p-3 ${
              msg.direction === 'outbound' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-900 rounded-bl-none'
            }`}>
              <p className="text-sm">{msg.content}</p>
              <p className={`text-[10px] mt-1 text-right ${msg.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'}`}>
                {format(new Date(msg.sent_at), 'HH:mm')}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
