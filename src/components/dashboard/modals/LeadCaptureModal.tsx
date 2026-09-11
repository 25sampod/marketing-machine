'use client';

import React, { useState } from 'react';

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadCaptured: () => void;
}

export function LeadCaptureModal({ isOpen, onClose, onLeadCaptured }: LeadCaptureModalProps) {
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadContact, setNewLeadContact] = useState('');
  const [newLeadSource, setNewLeadSource] = useState<'whatsapp' | 'web'>('whatsapp');
  const [newLeadMessage, setNewLeadMessage] = useState('');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  if (!isOpen) return null;

  const handleCaptureLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadContact || isSubmittingLead) return;
    setIsSubmittingLead(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLeadName,
          contact: newLeadContact,
          source: newLeadSource,
          message: newLeadMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewLeadName('');
        setNewLeadContact('');
        setNewLeadMessage('');
        onClose();
        onLeadCaptured();
      } else {
        alert(data.error || 'Failed to capture lead');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while capturing lead');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[var(--paper-raised)] border border-[var(--paper-line)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative z-10 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-[var(--paper-line)] flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-display font-semibold text-base text-[var(--ink)]">Capture New Lead</h3>
            <p className="text-xs text-[var(--ink)]/60">Submit inquiry directly into the live AI qualification pipeline</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] flex items-center justify-center text-[var(--ink)]/60 hover:text-[var(--ink)] cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCaptureLead} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/60 mb-1">
              Client / Lead Name
            </label>
            <input
              type="text"
              required
              value={newLeadName}
              onChange={(e) => setNewLeadName(e.target.value)}
              placeholder="e.g. Sampod or Architecture Client"
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/60 mb-1">
                Contact (Phone / Email)
              </label>
              <input
                type="text"
                required
                value={newLeadContact}
                onChange={(e) => setNewLeadContact(e.target.value)}
                placeholder="+8801645512513"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] font-medium tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/60 mb-1">
                Channel Source
              </label>
              <select
                value={newLeadSource}
                onChange={(e) => setNewLeadSource(e.target.value as any)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="web">Web Landing Page Brief</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/60 mb-1">
              Client Inquiry Brief
            </label>
            <textarea
              required
              rows={3}
              value={newLeadMessage}
              onChange={(e) => setNewLeadMessage(e.target.value)}
              placeholder="Project specifications, typology, or budget details..."
              className="w-full text-xs sm:text-sm p-3 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-raised)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingLead}
              className="px-5 py-2 rounded-lg bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isSubmittingLead ? 'Processing AI...' : 'Submit & Qualify Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
