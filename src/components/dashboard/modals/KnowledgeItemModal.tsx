'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';
import { ModularKnowledgeItem } from '../types';

interface KnowledgeItemModalProps {
  isOpen: boolean;
  editingItem: ModularKnowledgeItem | null;
  setEditingItem: React.Dispatch<React.SetStateAction<ModularKnowledgeItem | null>>;
  onClose: () => void;
  onSave: (e?: React.FormEvent) => Promise<void> | void;
  isSaving: boolean;
}

export function KnowledgeItemModal({
  isOpen,
  editingItem,
  setEditingItem,
  onClose,
  onSave,
  isSaving,
}: KnowledgeItemModalProps) {
  if (!isOpen || !editingItem) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[var(--paper-raised)] border border-[var(--paper-line)] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden relative z-10 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-[var(--paper-line)] flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-display font-semibold text-base text-[var(--ink)] flex items-center gap-2">
              <BookOpen size={18} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
              <span>{editingItem.id ? 'Edit Knowledge Section' : 'Add Knowledge Section'}</span>
            </h3>
            <p className="text-xs text-[var(--ink)]/60">
              Targeted section dynamically queried by the AI retrieval engine
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] flex items-center justify-center text-[var(--ink)]/60 hover:text-[var(--ink)] cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSave} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/60 mb-1">
                Category
              </label>
              <select
                value={editingItem.category}
                onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] font-medium"
              >
                <option value="overview">Company Overview (Always Injected)</option>
                <option value="catalog">Products &amp; Menu / Offerings</option>
                <option value="pricing_delivery">Pricing &amp; Delivery / Payment</option>
                <option value="policies">Policies, Refunds &amp; Cancellations</option>
                <option value="faq">Customer FAQs &amp; Help</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/60 mb-1">
                AI Query Status
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingItem.is_active}
                  onChange={(e) => setEditingItem({ ...editingItem, is_active: e.target.checked })}
                  className="accent-[var(--amber)] rounded"
                />
                <span className="text-xs font-medium text-[var(--ink)]">
                  {editingItem.is_active ? 'Active (AI queries this)' : 'Paused (Excluded from AI)'}
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/60 mb-1">
              Section Title
            </label>
            <input
              type="text"
              required
              value={editingItem.title}
              onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
              placeholder="e.g. Wood-Fired Pizza Menu, Delivery Zones &amp; bKash, Return Policy"
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/60 mb-1">
              Search Keywords &amp; Tags (comma-separated)
            </label>
            <input
              type="text"
              value={editingItem.tagsInput !== undefined ? editingItem.tagsInput : (editingItem.tags || []).join(', ')}
              onChange={(e) => setEditingItem({ ...editingItem, tagsInput: e.target.value })}
              placeholder="pizza, pepperoni, cheese, delivery, dhanmondi, bkash"
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] font-mono"
            />
            <p className="text-[10px] text-[var(--ink)]/50 mt-1">
              When a customer's message contains any of these keywords, the AI dynamically extracts this section.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/60 mb-1">
              Section Content (Markdown &amp; Text)
            </label>
            <textarea
              required
              rows={6}
              value={editingItem.content}
              onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
              placeholder="Items, descriptions, pricing, operational rules, or guidelines..."
              className="w-full text-xs p-3 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] resize-y font-mono leading-relaxed"
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
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : editingItem.id ? 'Save Changes' : 'Create Section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
