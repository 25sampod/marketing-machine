'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { Send, MessageCircle, AlertCircle, Trash2, Sparkles, CheckCheck, Eye, X, MoreVertical, RotateCcw, ArrowDown, Clock, Check } from 'lucide-react';
import { formatStudioTime, formatStudioDate, StudioTimeOptions } from '@/lib/formatTime';

export default function ChatInbox({
 lead,
 onLeadUpdate,
 timeOptions,
 qualificationThreshold = 70,
}: {
 lead: any;
 onLeadUpdate?: (updatedLead: any) => void;
 timeOptions?: StudioTimeOptions;
 qualificationThreshold?: number;
}) {
 const [messages, setMessages] = useState<any[]>([]);
 const [input, setInput] = useState('');
 const [sending, setSending] = useState(false);
 const [clearing, setClearing] = useState(false);
 const [resettingLead, setResettingLead] = useState(false);
 const [sendError, setSendError] = useState<string | null>(null);
 const [confirmClear, setConfirmClear] = useState(false);
 const [automationEnabled, setAutomationEnabled] = useState<boolean>(lead?.automation_enabled !== false);
 const [togglingAuto, setTogglingAuto] = useState(false);
 const [isReturning, setIsReturning] = useState<boolean>(Boolean(lead?.is_returning_client));
 const [togglingReturning, setTogglingReturning] = useState(false);
 const [showDossier, setShowDossier] = useState(false);
 const [showMenu, setShowMenu] = useState(false);
 const [isAtBottom, setIsAtBottom] = useState(true);
 const [hasNewUnread, setHasNewUnread] = useState(false);
 const [dismissedAiDraft, setDismissedAiDraft] = useState(false);
 const [isFollowingUp, setIsFollowingUp] = useState(false);
 const [followUpSuccessToast, setFollowUpSuccessToast] = useState<string | null>(null);
 const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
 const [isAiTyping, setIsAiTyping] = useState(false);
 const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
  setMounted(true);
 }, []);

 const scrollContainerRef = useRef<HTMLDivElement>(null);
 const messagesEndRef = useRef<HTMLDivElement>(null);

 const scrollToBottom = (smooth = true) => {
  if (messagesEndRef.current) {
   messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }
  setIsAtBottom(true);
  setHasNewUnread(false);
 };

 const handleScroll = () => {
  const el = scrollContainerRef.current;
  if (!el) return;
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  setIsAtBottom(atBottom);
  if (atBottom) setHasNewUnread(false);
 };

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

  // Subscribe to new messages & lead updates in real-time
  const channel = supabase
   .channel(`chat:${lead.id}`)
   .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${lead.id}` },
    (payload) => {
     const newMsg = payload.new;
     setMessages((prev) => [...prev, newMsg]);

     if (newMsg?.direction === 'inbound') {
      if (automationEnabled) {
       setIsAiTyping(true);
       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
       typingTimeoutRef.current = setTimeout(() => {
        setIsAiTyping(false);
       }, 20000);
      }
     } else if (newMsg?.direction === 'outbound') {
      setIsAiTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
     }
    }
   )
   .on(
    'postgres_changes',
    { event: 'DELETE', schema: 'public', table: 'messages', filter: `lead_id=eq.${lead.id}` },
    () => {
     setMessages([]);
     setIsAiTyping(false);
     if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
   )
   .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'leads', filter: `id=eq.${lead.id}` },
    (payload) => {
     const updatedLead = payload.new;
     if (updatedLead) {
      onLeadUpdate?.(updatedLead);
      // AI qualification completed and updated lead; clear AI typing state
      setTimeout(() => {
       setIsAiTyping(false);
      }, 1000);
     }
    }
   )
   .subscribe();

  return () => {
   supabase.removeChannel(channel);
   if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };
 }, [lead?.id, automationEnabled]);

 useEffect(() => {
  setSendError(null);
  setConfirmClear(false);
  setDismissedAiDraft(false);
  setIsAiTyping(false);
  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  if (lead) {
   setAutomationEnabled(lead.automation_enabled !== false);
   setIsReturning(Boolean(lead.is_returning_client));
  }
  // Snap to bottom on lead change
  setTimeout(() => scrollToBottom(false), 50);
 }, [lead?.id, lead?.automation_enabled, lead?.is_returning_client]);

 useEffect(() => {
  if (isAiTyping || isFollowingUp) {
   scrollToBottom(true);
  }
 }, [isAiTyping, isFollowingUp]);

 useEffect(() => {
  if (messages.length === 0) return;
  if (isAtBottom) {
   scrollToBottom(true);
  } else {
   setHasNewUnread(true);
  }
 }, [messages.length]);

 const handleToggleAutomation = async () => {
  if (!lead?.id || togglingAuto) return;
  const nextVal = !automationEnabled;
  setAutomationEnabled(nextVal);
  setTogglingAuto(true);
  try {
   const { error } = await supabase
    .from('leads')
    .update({ automation_enabled: nextVal })
    .eq('id', lead.id);
   if (error) throw error;
  } catch (err: any) {
   console.error('Error toggling lead automation:', err);
   setAutomationEnabled(!nextVal); // rollback
  } finally {
   setTogglingAuto(false);
  }
 };

 const handleToggleReturning = async () => {
  if (!lead?.id || togglingReturning) return;
  const nextVal = !isReturning;
  setIsReturning(nextVal);
  setTogglingReturning(true);
  try {
   const isLostLead = lead.status === 'lost' || lead.discovery_stage === 'lost';
   let newScore = lead.score ?? 0;
   if (!isLostLead) {
    const qualPts = Math.round(((lead?.qualification_percentage || 0) / 100) * 40);
    let budgetPts = 0;
    if (lead?.estimated_budget) {
     const rawDigits = parseInt(String(lead.estimated_budget).replace(/[^\d]/g, ''), 10) || 0;
     if (rawDigits >= 100_000) budgetPts = 25;
     else if (rawDigits >= 20_000) budgetPts = 20;
     else if (rawDigits >= 5_000) budgetPts = 15;
     else budgetPts = 10;
    } else if (lead?.budget_mentioned) {
     budgetPts = 8;
    }
    const scopePts = lead?.project_type ? 15 : 0;
    let timelinePts = 0;
    if (lead?.timeline && !lead.timeline.toLowerCase().includes('not specified')) {
     const tl = lead.timeline.toLowerCase();
     if (tl.includes('asap') || tl.includes('immediate') || tl.includes('urgent') || tl.includes('week') || tl.includes('today')) {
      timelinePts = 10;
     } else if (tl.includes('month') || tl.includes('soon')) {
      timelinePts = 6;
     } else {
      timelinePts = 3;
     }
    }
    const vipPts = nextVal ? 10 : 0;
    newScore = Math.min(100, Math.max(0, qualPts + budgetPts + scopePts + timelinePts + vipPts));
   }

   const { error } = await supabase
    .from('leads')
    .update({
     is_returning_client: nextVal,
     score: newScore,
    })
    .eq('id', lead.id);

   if (error) throw error;

   const updated = {
    ...lead,
    is_returning_client: nextVal,
    score: newScore,
   };
   Object.assign(lead, updated);
   onLeadUpdate?.(updated);
  } catch (err: any) {
   console.error('Error toggling returning client status:', err);
   setIsReturning(!nextVal); // rollback
  } finally {
   setTogglingReturning(false);
  }
 };

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
   setTimeout(() => scrollToBottom(true), 100);
  } catch (error: any) {
   console.error('Error sending message:', error);
   setSendError(error?.message || 'Network error occurred while sending message.');
  } finally {
   setSending(false);
  }
 };

 const handleDeleteMessage = async (messageId: string) => {
  if (!messageId || deletingMessageId) return;
  setDeletingMessageId(messageId);
  try {
   // 1. Delete from backend database via API route
   await fetch(`/api/messages?messageId=${messageId}&leadId=${lead?.id}`, {
    method: 'DELETE',
   });
   // 2. Direct client-side delete fallback to ensure immediate Postgres deletion
   await supabase.from('messages').delete().eq('id', messageId);

   // 3. Optimistically update local message list
   const remaining = messages.filter((m) => m.id !== messageId);
   setMessages(remaining);

   // 4. Update lead preview snippet if this was the latest message
   if (lead) {
    const latestMsg = remaining.length > 0 ? remaining[remaining.length - 1].content : null;
    const updated = { ...lead, message: latestMsg };
    Object.assign(lead, updated);
    onLeadUpdate?.(updated);
   }
  } catch (err: any) {
   console.error('Error deleting message:', err);
   setSendError(err?.message || 'Failed to delete message from database.');
  } finally {
   setDeletingMessageId(null);
  }
 };

 const handleClearChat = async () => {
  if (!lead?.id || clearing) return;
  setClearing(true);
  try {
   // 1. Delete all messages for this lead from backend via API
   const res = await fetch(`/api/messages?leadId=${lead.id}`, {
    method: 'DELETE',
   });
   // 2. Direct client fallback to guarantee backend message deletion
   await supabase.from('messages').delete().eq('lead_id', lead.id);

   if (res.ok) {
    setMessages([]);
    setConfirmClear(false);
    setShowMenu(false);
    const updated = {
     ...lead,
     message: null,
     suggested_reply: null,
     score: 0,
     qualification_percentage: 0,
     priority_tier: 'medium',
     discovery_stage: 'discovery',
     project_type: null,
     estimated_budget: null,
     timeline: null,
     ai_summary: null,
     budget_mentioned: false,
     status: 'new',
    };
    Object.assign(lead, updated);
    onLeadUpdate?.(updated);
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

 const handleResetLeadInfo = async () => {
  if (!lead?.id || resettingLead) return;
  setResettingLead(true);
  try {
   // 1. Delete all messages for this lead from the backend messages table
   await fetch(`/api/messages?leadId=${lead.id}`, {
    method: 'DELETE',
   });
   await supabase.from('messages').delete().eq('lead_id', lead.id);

   // 2. Clear local messages
   setMessages([]);

   // 3. Reset discovery and qualification fields in database
   const { error } = await supabase
    .from('leads')
    .update({
     message: null,
     suggested_reply: null,
     score: 0,
     qualification_percentage: 0,
     priority_tier: 'medium',
     discovery_stage: 'discovery',
     project_type: null,
     estimated_budget: null,
     timeline: null,
     ai_summary: null,
     budget_mentioned: false,
     status: 'new',
    })
    .eq('id', lead.id);

   if (error) throw error;

   const updated = {
    ...lead,
    message: null,
    suggested_reply: null,
    score: 0,
    qualification_percentage: 0,
    priority_tier: 'medium',
    discovery_stage: 'discovery',
    project_type: null,
    estimated_budget: null,
    timeline: null,
    ai_summary: null,
    budget_mentioned: false,
    status: 'new',
   };
   Object.assign(lead, updated);
   onLeadUpdate?.(updated);
   setShowMenu(false);
  } catch (err: any) {
   console.error('Error resetting lead info:', err);
   setSendError(err?.message || 'Failed to reset lead discovery data.');
  } finally {
   setResettingLead(false);
  }
 };

 const handleManualFollowUp = async () => {
  if (!lead?.id || isFollowingUp) return;
  setIsFollowingUp(true);
  setSendError(null);
  try {
   const res = await fetch('/api/cron/followup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId: lead.id }),
   });
   const data = await res.json();
   if (!res.ok || data.error) {
    throw new Error(data.error || 'Failed to send follow-up');
   }
   setFollowUpSuccessToast('AI follow-up sent!');
   setTimeout(() => setFollowUpSuccessToast(null), 3000);
   const { data: updatedMsgs } = await supabase
    .from('messages')
    .select('*')
    .eq('lead_id', lead.id)
    .order('sent_at', { ascending: true });
   if (updatedMsgs) setMessages(updatedMsgs);
   scrollToBottom();
   const updatedLead = { ...lead, status: 'contacted', last_contacted_at: new Date().toISOString() };
   Object.assign(lead, updatedLead);
   onLeadUpdate?.(updatedLead);
  } catch (err: any) {
   setSendError(err?.message || 'Error triggering follow-up');
  } finally {
   setIsFollowingUp(false);
  }
 };

 const handleUpdateStatus = async (newStatus: string) => {
  if (!lead?.id) return;
  try {
   const updatePayload: Record<string, any> = {
    status: newStatus,
    last_contacted_at: new Date().toISOString(),
   };
   if (newStatus === 'lost') {
    updatePayload.discovery_stage = 'lost';
    updatePayload.priority_tier = 'low';
    updatePayload.score = 0;
    updatePayload.qualification_percentage = 0;
    updatePayload.automation_enabled = false;
   }
   const { error } = await supabase
    .from('leads')
    .update(updatePayload)
    .eq('id', lead.id);
   if (error) throw error;
   const updated = { ...lead, ...updatePayload };
   Object.assign(lead, updated);
   onLeadUpdate?.(updated);
  } catch (err: any) {
   console.error('Failed to update status:', err);
   setSendError(err?.message || 'Failed to update status');
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

 const isLostOrDeclined = lead.status === 'lost' || lead.discovery_stage === 'lost';

 const priorityColor =
  isLostOrDeclined
   ? 'bg-zinc-500/10 border-zinc-500/30 text-zinc-500 dark:text-zinc-400'
   : (lead.score ?? 0) === 0
   ? 'bg-zinc-500/10 border-zinc-500/30 text-zinc-500 dark:text-zinc-400'
   : lead.priority_tier === 'urgent'
   ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
   : lead.priority_tier === 'high' || (lead.qualification_percentage || 0) >= qualificationThreshold
   ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
   : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400';

 return (
  <div className="flex flex-col h-full w-full bg-[var(--paper)] rounded-2xl shadow-xs border border-[var(--paper-line)] overflow-hidden relative min-h-0">
   {/* Thread Header - Pinned */}
   <div className="shrink-0 border-b border-[var(--paper-line)] bg-[var(--paper-raised)] z-10">
    {/* Row 1: Contact Identity & Primary Controls */}
    <div className="px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-2.5">
     <div className="flex items-center gap-2.5 min-w-0">
      {/* Avatar Initial with Status Indicator */}
      <div className="relative shrink-0">
       <div className="w-8 h-8 rounded-full bg-[var(--amber)]/15 border border-[var(--amber)]/30 text-[var(--amber-deep)] dark:text-[var(--amber)] font-display font-bold text-xs flex items-center justify-center">
        {(lead.name || 'C').charAt(0).toUpperCase()}
       </div>
       <span
        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--paper-raised)] ${
         automationEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
        }`}
        title={automationEnabled ? 'AI Automation Active' : 'AI Automation Paused'}
       />
      </div>

      <div className="min-w-0">
       <h3 className="font-display font-semibold text-xs sm:text-sm text-[var(--ink)] truncate">
        {lead.name}
       </h3>
       <p className="text-[11px] text-[var(--ink)]/55 truncate">
        {lead.contact}
       </p>
      </div>
     </div>

     {/* Header Right Actions */}
     <div className="flex items-center gap-1.5 shrink-0">
      {/* Live AI Status Pill */}
      <button
       type="button"
       onClick={handleToggleAutomation}
       disabled={togglingAuto}
       title={automationEnabled ? 'AI Auto-Replies Active. Click to pause.' : 'AI Auto-Replies Paused. Click to resume.'}
       className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border transition-all cursor-pointer ${
        automationEnabled
         ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
         : 'bg-zinc-500/10 border-zinc-500/30 text-zinc-500 hover:bg-zinc-500/20'
       }`}
      >
       <span className={`w-1.5 h-1.5 rounded-full ${automationEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
       <span>{automationEnabled ? 'AI Active' : 'AI Paused'}</span>
      </button>

      {/* Quick Clear Chat Thread (shows confirmation inline when clicked) */}
      {confirmClear && (
       <div className="flex items-center gap-1 animate-in fade-in duration-150">
        <button
         onClick={handleClearChat}
         disabled={clearing}
         className="text-[10px] font-semibold px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-2xs"
        >
         {clearing ? '...' : 'Clear'}
        </button>
        <button
         onClick={() => setConfirmClear(false)}
         className="text-[10px] font-medium px-1.5 py-1 rounded bg-[var(--paper)] border border-[var(--paper-line)] text-[var(--ink)]/70 hover:text-[var(--ink)] cursor-pointer"
        >
         Cancel
        </button>
       </div>
      )}

      {/* Three-Dot Menu Button */}
      <div className="relative">
       <button
        type="button"
        onClick={() => setShowMenu((prev) => !prev)}
        title="Lead Options & Actions"
        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
         showMenu
          ? 'bg-[var(--paper-raised)] border-[var(--ink)]/30 text-[var(--ink)]'
          : 'border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)]/70 hover:text-[var(--ink)] hover:bg-[var(--paper-raised)]'
        }`}
       >
        <MoreVertical size={14} />
       </button>

       {/* Dropdown Menu */}
       {showMenu && (
       <>
        <div
         className="fixed inset-0 z-20"
         onClick={() => setShowMenu(false)}
        />
        <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)] p-1.5 shadow-xl z-30 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-100">
         <button
          type="button"
          onClick={() => {
           setShowMenu(false);
           setShowDossier(true);
          }}
          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper)] text-[var(--ink)] flex items-center gap-2 cursor-pointer"
         >
          <Eye size={13} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
          <span>Lead Dossier Details</span>
         </button>

         <button
          type="button"
          onClick={() => {
           handleToggleReturning();
          }}
          disabled={togglingReturning}
          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper)] text-[var(--ink)] flex items-center justify-between gap-2 cursor-pointer"
         >
          <span className="flex items-center gap-2">
           <Sparkles size={13} className="text-blue-500" />
           <span>VIP Client</span>
          </span>
          <span className="text-[10px] font-semibold opacity-70">
           {isReturning ? 'Active' : 'Off'}
          </span>
         </button>

         <button
          type="button"
          onClick={() => {
           handleToggleAutomation();
          }}
          disabled={togglingAuto}
          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper)] text-[var(--ink)] flex items-center justify-between gap-2 cursor-pointer"
         >
          <span className="flex items-center gap-2">
           <span className={`w-1.5 h-1.5 rounded-full ${automationEnabled ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
           <span>AI Auto-Reply</span>
          </span>
          <span className="text-[10px] font-semibold opacity-70">
           {automationEnabled ? 'On' : 'Paused'}
          </span>
         </button>

         <div className="border-t border-[var(--paper-line)] my-1" />

         <button
          type="button"
          onClick={() => {
           handleResetLeadInfo();
          }}
          disabled={resettingLead}
          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper)] text-amber-600 dark:text-amber-400 flex items-center gap-2 cursor-pointer"
         >
          <RotateCcw size={13} />
          <span>{resettingLead ? 'Resetting...' : 'Reset Discovery Info'}</span>
         </button>

         <button
          type="button"
          onClick={() => {
           setShowMenu(false);
           setConfirmClear(true);
          }}
          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center gap-2 cursor-pointer"
         >
          <Trash2 size={13} />
          <span>Clear Chat & Reset</span>
         </button>
        </div>
       </>
      )}
      </div>
     </div>
    </div>

    {/* Row 2: Metadata Badges & Workflow Controls */}
    <div className="px-3.5 sm:px-4 py-1.5 bg-[var(--paper)]/60 border-t border-[var(--paper-line)] flex items-center justify-between gap-2">
     {/* Left Metadata Badges */}
     <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--paper-raised)] border border-[var(--paper-line)] text-[var(--ink)]/70 uppercase shrink-0">
       {lead.source}
      </span>
      {lead.qualification_percentage > 0 && (
       <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${priorityColor}`}>
        {lead.qualification_percentage}%
       </span>
      )}
      {isReturning && (
       <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 shrink-0">
        ★ VIP
       </span>
      )}
      {lead.project_type && (
       <span className="text-[10px] text-[var(--ink)]/60 truncate max-w-[100px] sm:max-w-[130px] shrink-0" title={lead.project_type}>
        {lead.project_type}
       </span>
      )}
     </div>

     {/* Right Controls */}
     <div className="flex items-center gap-1.5 shrink-0">
      {/* 1-Click AI Follow-Up Button */}
      <button
       type="button"
       onClick={handleManualFollowUp}
       disabled={isFollowingUp}
       className="text-[10px] font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] hover:bg-[var(--paper)] text-[var(--ink)] transition-colors cursor-pointer disabled:opacity-50"
       title="Trigger an autonomous, contextual AI follow-up message via WhatsApp"
      >
       <Clock size={11} className={isFollowingUp ? 'animate-spin text-[var(--amber-deep)]' : 'text-[var(--amber-deep)] dark:text-[var(--amber)]'} />
       <span>{isFollowingUp ? 'Sending...' : followUpSuccessToast ? 'Sent!' : 'Follow Up'}</span>
      </button>

      {/* Interactive Pipeline Status Dropdown */}
      <select
       value={lead.status || 'new'}
       onChange={(e) => handleUpdateStatus(e.target.value)}
       className="text-[10px] font-medium px-2 py-1 rounded-lg border bg-[var(--paper-raised)] border-[var(--paper-line)] text-[var(--ink)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--amber)]"
       title="Change Lead Pipeline Status"
      >
       <option value="new">New</option>
       <option value="contacted">Contacted</option>
       <option value="qualified">Qualified</option>
       <option value="consultation_booked">Consult Booked</option>
       <option value="converted">Won / Converted</option>
       <option value="lost">Archived</option>
      </select>
     </div>
    </div>
   </div>

   {/* Simplified, Concise Lead Details Pop-up Modal (Portaled to body to eliminate any parent stacking context conflicts) */}
   {showDossier && mounted && createPortal(
    <div
     className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
     onClick={(e) => {
      if (e.target === e.currentTarget) setShowDossier(false);
     }}
    >
     <div
      className="bg-[var(--paper)] border border-[var(--paper-line)] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 relative z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
      onClick={(e) => e.stopPropagation()}
     >
      {/* Pop-up Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--paper-line)]">
       <div>
        <h3 className="font-display font-semibold text-sm text-[var(--ink)]">
         {lead.name}
        </h3>
        <p className="text-xs text-[var(--ink)]/50">
         {lead.contact}
        </p>
       </div>
       <button
        type="button"
        onClick={() => setShowDossier(false)}
        className="p-1 rounded-lg border border-[var(--paper-line)] hover:bg-[var(--paper-raised)] text-[var(--ink)]/60 hover:text-[var(--ink)] cursor-pointer"
       >
        <X size={15} />
       </button>
      </div>

      {/* Essential Discovery Info */}
      <div className="space-y-2 text-xs font-medium">
       <div className="flex justify-between items-center py-1 border-b border-[var(--paper-line)]/50">
        <span className="text-[var(--ink)]/50">Project Typology</span>
        <span className="font-semibold text-[var(--ink)]">{lead.project_type || 'Pending inquiry'}</span>
       </div>
       <div className="flex justify-between items-center py-1 border-b border-[var(--paper-line)]/50">
        <span className="text-[var(--ink)]/50">Estimated Budget</span>
        <span className="font-semibold text-[var(--amber-deep)] dark:text-[var(--amber)]">
         {lead.estimated_budget || 'Pending inquiry'}
        </span>
       </div>
       <div className="flex justify-between items-center py-1 border-b border-[var(--paper-line)]/50">
        <span className="text-[var(--ink)]/50">Discovery Stage</span>
        <span className="font-semibold text-[var(--ink)] capitalize">
         {lead.discovery_stage ? lead.discovery_stage.replace('_', ' ') : 'Discovery'}
        </span>
       </div>
      </div>

      {/* Transparent LPI Multi-Factor Scoring Breakdown */}
      {(() => {
       const isLost = lead?.status === 'lost' || lead?.discovery_stage === 'lost';

       let qualPts = 0;
       let budgetPts = 0;
       let scopePts = 0;
       let timelinePts = 0;
       let vipPts = 0;

       if (!isLost) {
        qualPts = Math.round(((lead?.qualification_percentage || 0) / 100) * 40);
        if (lead?.estimated_budget) {
         const rawDigits = parseInt(String(lead.estimated_budget).replace(/[^\d]/g, ''), 10) || 0;
         if (rawDigits >= 100_000) budgetPts = 25;
         else if (rawDigits >= 20_000) budgetPts = 20;
         else if (rawDigits >= 5_000) budgetPts = 15;
         else budgetPts = 10;
        } else if (lead?.budget_mentioned) {
         budgetPts = 8;
        }
        scopePts = lead?.project_type ? 15 : 0;
        if (lead?.timeline && !lead.timeline.toLowerCase().includes('not specified')) {
         const tl = lead.timeline.toLowerCase();
         if (tl.includes('asap') || tl.includes('immediate') || tl.includes('urgent') || tl.includes('week') || tl.includes('today')) {
          timelinePts = 10;
         } else if (tl.includes('month') || tl.includes('soon')) {
          timelinePts = 6;
         } else {
          timelinePts = 3;
         }
        }
        vipPts = isReturning ? 10 : 0;
       }

       const totalFactorScore = isLost ? 0 : (qualPts + budgetPts + scopePts + timelinePts + vipPts);
       const displayScore = isLost ? 0 : Math.max(lead?.score ?? 0, totalFactorScore);
       const badgeLabel = isLost 
        ? 'LOST / ARCHIVED' 
        : (displayScore === 0) 
        ? (lead.priority_tier === 'low' ? 'INACTIVE / 0' : (lead.priority_tier || 'UNSCORED'))
        : (lead.priority_tier || 'standard');

       return (
        <div className="p-3 rounded-xl bg-[var(--paper-raised)] border border-[var(--paper-line)] space-y-2.5">
         <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
           <Sparkles size={13} className={isLost ? 'text-zinc-400' : 'text-[var(--amber-deep)] dark:text-[var(--amber)]'} />
           <span className="text-xs font-semibold text-[var(--ink)]">AI Lead Priority Index (LPI)</span>
          </div>
          <div className="flex items-center gap-1.5">
           <span className="text-xs font-bold text-[var(--ink)]">{displayScore}/100</span>
           <span className={`text-[9px] font-semibold uppercase font-bold px-1.5 py-0.5 rounded-full border ${priorityColor}`}>
            {badgeLabel}
           </span>
          </div>
         </div>

         <div className="space-y-2 text-[11px] font-medium">
          {/* Factor 1: Qualification Fit */}
          <div className="space-y-0.5">
           <div className="flex justify-between text-[10px]">
            <span className="text-[var(--ink)]/60">1. AI Qualification Match (40%)</span>
            <span className="text-[var(--ink)] font-semibold">{qualPts}/40 pts ({isLost ? 0 : (lead.qualification_percentage || 0)}%)</span>
           </div>
           <div className="w-full h-1.5 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (qualPts / 40) * 100)}%` }} />
           </div>
          </div>

          {/* Factor 2: Budget Depth */}
          <div className="space-y-0.5">
           <div className="flex justify-between text-[10px]">
            <span className="text-[var(--ink)]/60">2. Budget Depth (25%)</span>
            <span className="text-[var(--ink)] font-semibold">{budgetPts}/25 pts</span>
           </div>
           <div className="w-full h-1.5 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] overflow-hidden">
            <div className="h-full bg-[var(--amber)] rounded-full" style={{ width: `${Math.min(100, (budgetPts / 25) * 100)}%` }} />
           </div>
          </div>

          {/* Factor 3: Scope Typology */}
          <div className="space-y-0.5">
           <div className="flex justify-between text-[10px]">
            <span className="text-[var(--ink)]/60">3. Scope Typology Clarity (15%)</span>
            <span className="text-[var(--ink)] font-semibold">{scopePts}/15 pts</span>
           </div>
           <div className="w-full h-1.5 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.min(100, (scopePts / 15) * 100)}%` }} />
           </div>
          </div>

          {/* Factor 4: Timeline Urgency */}
          <div className="space-y-0.5">
           <div className="flex justify-between text-[10px]">
            <span className="text-[var(--ink)]/60">4. Timeline Urgency (10%)</span>
            <span className="text-[var(--ink)] font-semibold">{timelinePts}/10 pts</span>
           </div>
           <div className="w-full h-1.5 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (timelinePts / 10) * 100)}%` }} />
           </div>
          </div>

          {/* Factor 5: VIP Loyalty */}
          <div className="space-y-0.5">
           <div className="flex justify-between text-[10px]">
            <span className="text-[var(--ink)]/60">5. Returning Client Loyalty (10%)</span>
            <span className="text-[var(--ink)] font-semibold">{vipPts}/10 pts</span>
           </div>
           <div className="w-full h-1.5 rounded-full bg-[var(--paper)] border border-[var(--paper-line)] overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (vipPts / 10) * 100)}%` }} />
           </div>
          </div>
         </div>
        </div>
       );
      })()}

      {/* Brief AI Synthesis */}
      {lead.ai_summary && (
       <div className="p-2.5 rounded-xl bg-[var(--paper-raised)] border border-[var(--paper-line)] text-xs">
        <span className="text-[10px] font-semibold text-[var(--amber-deep)] dark:text-[var(--amber)] block mb-1">
         AI Synthesis
        </span>
        <p className="text-[var(--ink)]/80 italic text-[11px] leading-relaxed">
         "{lead.ai_summary}"
        </p>
       </div>
      )}

      {/* Modular Switches */}
      <div className="space-y-2 pt-1">
       <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper-raised)] border border-[var(--paper-line)] text-xs">
        <div>
         <span className="font-medium text-[var(--ink)]">VIP Client Status</span>
         <p className="text-[10px] text-[var(--ink)]/50">Priority executive routing</p>
        </div>
        <button
         type="button"
         onClick={handleToggleReturning}
         disabled={togglingReturning}
         className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
          isReturning
           ? 'bg-blue-500 text-white border-blue-600'
           : 'bg-[var(--paper)] border-[var(--paper-line)] text-[var(--ink)]/60 hover:text-[var(--ink)]'
         }`}
        >
         {isReturning ? 'Active' : 'Off'}
        </button>
       </div>

       <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper-raised)] border border-[var(--paper-line)] text-xs">
        <div>
         <span className="font-medium text-[var(--ink)]">AI Auto-Replies</span>
         <p className="text-[10px] text-[var(--ink)]/50">Autonomous conversational intake</p>
        </div>
        <button
         type="button"
         onClick={handleToggleAutomation}
         disabled={togglingAuto}
         className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
          automationEnabled
           ? 'bg-emerald-600 text-white border-emerald-700'
           : 'bg-zinc-600 text-white border-zinc-700'
         }`}
        >
         {automationEnabled ? 'Active' : 'Paused'}
        </button>
       </div>
      </div>

      {/* Actions */}
      <div className="pt-2 flex items-center justify-between border-t border-[var(--paper-line)]">
       <button
        type="button"
        onClick={handleResetLeadInfo}
        disabled={resettingLead}
        className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
       >
        {resettingLead ? 'Resetting...' : 'Reset Lead Info'}
       </button>
       <button
        type="button"
        onClick={() => setShowDossier(false)}
        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 cursor-pointer shadow-xs"
       >
        Done
       </button>
      </div>
     </div>
    </div>,
    document.body
   )}

   {/* Messages Scroll Area - Strictly constrained, internally scrolling with sleek hidden scrollbar */}
   <div
    ref={scrollContainerRef}
    onScroll={handleScroll}
    className="flex-1 overflow-y-auto min-h-0 px-3.5 sm:px-4 py-3 space-y-2 bg-[var(--paper)] chat-scrollbar overscroll-contain relative"
   >
    {messages.length === 0 ? (
     <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-6 text-center text-[var(--ink)]/40">
      <div className="w-10 h-10 rounded-full bg-[var(--paper-raised)] border border-[var(--paper-line)] flex items-center justify-center mb-2">
       <MessageCircle size={18} className="opacity-40" />
      </div>
      <p className="text-xs font-medium text-[var(--ink)]/70">Conversation Thread Cleared</p>
      <p className="text-[11px] mt-1 text-[var(--ink)]/40 max-w-xs">
       No active messages in this chat. Incoming messages from WhatsApp or Meta will automatically appear here.
      </p>
     </div>
    ) : (
     messages.map((msg, idx) => {
      const prevMsg = idx > 0 ? messages[idx - 1] : null;
      const isOutbound = msg.direction === 'outbound';
      const isSameSender = prevMsg && prevMsg.direction === msg.direction;

      // Check if date changed
      const prevDate = prevMsg ? new Date(prevMsg.sent_at).toDateString() : null;
      const currDate = new Date(msg.sent_at).toDateString();
      const showDateDivider = prevDate !== currDate;

      return (
       <div key={msg.id} className="space-y-1">
        {showDateDivider && (
         <div className="flex items-center justify-center my-2.5 select-none">
          <span className="px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[var(--ink)]/50 bg-[var(--paper-raised)] border border-[var(--paper-line)] rounded-full shadow-2xs">
           {formatStudioDate(msg.sent_at, timeOptions)}
          </span>
         </div>
        )}
        <div className={`flex items-center gap-1.5 ${isOutbound ? 'justify-end' : 'justify-start'} ${isSameSender ? 'mt-1' : 'mt-2.5'} group/msg relative`}>
         {/* Delete button for outbound message (placed on left of bubble) */}
         {isOutbound && (
          <button
           type="button"
           onClick={() => handleDeleteMessage(msg.id)}
           disabled={deletingMessageId === msg.id}
           title="Delete message from database"
           className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 rounded-md text-[var(--ink)]/40 hover:text-red-500 hover:bg-red-500/10 cursor-pointer shrink-0"
          >
           <Trash2 size={12} className={deletingMessageId === msg.id ? 'animate-spin text-red-500' : ''} />
          </button>
         )}

         <div
          className={`relative max-w-[85%] sm:max-w-[78%] px-3.5 py-2 rounded-2xl shadow-2xs transition-all ${
           isOutbound
            ? 'bg-[var(--amber)] text-[var(--text-on-amber)] rounded-tr-xs ml-auto'
            : 'bg-[var(--paper-raised)] text-[var(--ink)] border border-[var(--paper-line)] rounded-tl-xs mr-auto'
          }`}
         >
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
          <div
           className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-medium tabular-nums select-none ${
            isOutbound ? 'text-white/70' : 'text-[var(--ink)]/45'
           }`}
          >
           <span>{formatStudioTime(msg.sent_at, timeOptions)}</span>
           {isOutbound && <CheckCheck size={12} className="opacity-80 shrink-0" />}
          </div>
         </div>

         {/* Delete button for inbound message (placed on right of bubble) */}
         {!isOutbound && (
          <button
           type="button"
           onClick={() => handleDeleteMessage(msg.id)}
           disabled={deletingMessageId === msg.id}
           title="Delete message from database"
           className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 rounded-md text-[var(--ink)]/40 hover:text-red-500 hover:bg-red-500/10 cursor-pointer shrink-0"
          >
           <Trash2 size={12} className={deletingMessageId === msg.id ? 'animate-spin text-red-500' : ''} />
          </button>
         )}
        </div>
       </div>
      );
     })
    )}

    {/* AI Typing Indicator Bubble (Rendered on Outbound / Studio Right Side) */}
    {(isAiTyping || isFollowingUp) && (
     <div className="flex items-center gap-1.5 justify-end mt-2.5 group/msg animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className="relative max-w-[85%] sm:max-w-[78%] px-3.5 py-2 rounded-2xl bg-[var(--amber)]/10 dark:bg-[var(--amber)]/15 border border-[var(--amber)]/30 rounded-tr-xs ml-auto shadow-2xs flex items-center gap-2.5">
       <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--amber-deep)] dark:text-[var(--amber)] select-none">
        <Sparkles size={13} className="animate-pulse shrink-0" />
        <span>{isFollowingUp ? 'AI preparing follow-up...' : 'AI Assistant formulating reply...'}</span>
       </div>
       <div className="flex items-center space-x-1 py-0.5 select-none shrink-0">
        <span
         className="w-1.5 h-1.5 rounded-full bg-[var(--amber-deep)] dark:bg-[var(--amber)] animate-bounce"
         style={{ animationDelay: '-0.32s' }}
        />
        <span
         className="w-1.5 h-1.5 rounded-full bg-[var(--amber-deep)] dark:bg-[var(--amber)] animate-bounce"
         style={{ animationDelay: '-0.16s' }}
        />
        <span
         className="w-1.5 h-1.5 rounded-full bg-[var(--amber-deep)] dark:bg-[var(--amber)] animate-bounce"
         style={{ animationDelay: '0s' }}
        />
       </div>
      </div>
     </div>
    )}

    <div ref={messagesEndRef} />
   </div>

   {/* Floating Jump to Latest Button */}
   {!isAtBottom && (
    <button
     type="button"
     onClick={() => scrollToBottom(true)}
     className="absolute bottom-16 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--ink)] text-[var(--paper)] text-xs font-medium shadow-lg hover:opacity-90 transition-all active:scale-95 cursor-pointer animate-in fade-in slide-in-from-bottom-2"
    >
     <ArrowDown size={13} />
     <span>Latest</span>
     {hasNewUnread && (
      <span className="w-2 h-2 rounded-full bg-[var(--amber)] animate-pulse" />
     )}
    </button>
   )}

   {/* Input Composer Section - Pinned Bottom */}
   <div className="shrink-0 p-3 bg-[var(--paper-raised)] border-t border-[var(--paper-line)] z-10">
    {/* Paused Automation Advisory Banner */}
    {!automationEnabled && (
     <div className="mb-2 px-2.5 py-1 rounded-lg bg-zinc-500/10 border border-zinc-500/20 text-[10px] font-medium text-[var(--ink)]/70 flex items-center justify-between gap-2 animate-in fade-in duration-150">
      <span>⏸ AI auto-replies paused. Manual review active.</span>
      <button
       type="button"
       onClick={handleToggleAutomation}
       className="text-[10px] text-[var(--amber-deep)] dark:text-[var(--amber)] hover:underline font-semibold cursor-pointer shrink-0"
      >
       Resume AI
      </button>
     </div>
    )}

    {/* AI Suggested Reply Banner - Compact, dismissible */}
    {lead.suggested_reply && !dismissedAiDraft && (
     <div className="mb-2 p-2 rounded-xl bg-[var(--amber)]/10 border border-[var(--amber)]/20 text-xs flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-1 duration-150">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
       <Sparkles size={13} className="text-[var(--amber-deep)] dark:text-[var(--amber)] shrink-0" />
       <p className="text-[var(--ink)]/80 italic text-[11px] font-medium truncate" title={lead.suggested_reply}>
        "{lead.suggested_reply}"
       </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
       <button
        type="button"
        onClick={() => {
         setInput(lead.suggested_reply);
         setDismissedAiDraft(true);
        }}
        className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-[var(--amber)] text-[var(--text-on-amber)] hover:bg-[var(--amber-deep)] cursor-pointer shadow-2xs transition-all"
       >
        Use Draft
       </button>
       <button
        type="button"
        onClick={() => setDismissedAiDraft(true)}
        title="Dismiss suggestion"
        className="p-1 rounded-md text-[var(--ink)]/40 hover:text-[var(--ink)] hover:bg-[var(--paper)] cursor-pointer"
       >
        <X size={12} />
       </button>
      </div>
     </div>
    )}

    {/* Delivery Error Banner */}
    {sendError && (
     <div className="mb-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
      <span className="flex items-center gap-1.5 text-[11px] font-medium">
       <AlertCircle size={13} className="shrink-0" />
       <span className="truncate">{sendError}</span>
      </span>
      <button
       onClick={() => setSendError(null)}
       className="text-xs font-bold opacity-70 hover:opacity-100 px-1 py-0.5 cursor-pointer"
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
      className="flex-1 border border-[var(--paper-line)] bg-[var(--paper)] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[var(--ink)] placeholder:text-[var(--ink)]/40 focus:outline-none focus:border-[var(--amber)] focus:ring-1 focus:ring-[var(--amber)] transition-all"
      placeholder="Type a WhatsApp reply or press Enter..."
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
      disabled={sending}
     />
     <button
      onClick={handleSend}
      disabled={sending || !input.trim()}
      title="Send WhatsApp Message"
      className="bg-[var(--amber)] text-[var(--text-on-amber)] p-2.5 rounded-xl hover:bg-[var(--amber-deep)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
     >
      <Send size={15} />
     </button>
    </div>
   </div>
  </div>
 );
}
