'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Layers, FileText, Sparkles, Plus, Upload, CheckCheck, 
  CheckCircle, AlertTriangle, Search, RefreshCw, Pencil, Trash2, Check, Save 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ModularKnowledgeItem } from './types';
import { KnowledgeItemModal } from './modals/KnowledgeItemModal';

interface KnowledgeViewProps {
  studioId?: string;
  onKnowledgeUpdate?: () => void;
}

export default function KnowledgeView({
  studioId = 'default',
  onKnowledgeUpdate,
}: KnowledgeViewProps) {
  const [knowledgeViewMode, setKnowledgeViewMode] = useState<'modular' | 'raw'>('modular');
  const [knowledgeCategoryTab, setKnowledgeCategoryTab] = useState<string>('all');
  const [knowledgeSearchQuery, setKnowledgeSearchQuery] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('archscale_knowledge_view_mode') as 'modular' | 'raw' | null;
      if (savedMode === 'modular' || savedMode === 'raw') {
        setKnowledgeViewMode(savedMode);
      }
    }
  }, []);

  const handleModeChange = (mode: 'modular' | 'raw') => {
    setKnowledgeViewMode(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('archscale_knowledge_view_mode', mode);
      } catch (e) {}
    }
  };

  // Modular Knowledge Items state
  const [modularItems, setModularItems] = useState<ModularKnowledgeItem[]>([]);
  const [isLoadingModular, setIsLoadingModular] = useState(false);
  const [isModularModalOpen, setIsModularModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ModularKnowledgeItem | null>(null);
  const [isSavingModularItem, setIsSavingModularItem] = useState(false);
  const [isSplittingRaw, setIsSplittingRaw] = useState(false);
  const [modularToast, setModularToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Raw Markdown Knowledge Base state
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);
  const [knowledgeSavedToast, setKnowledgeSavedToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchModularItems();
    fetchRawKnowledge();
  }, [studioId]);

  const fetchModularItems = async () => {
    try {
      setIsLoadingModular(true);
      const res = await fetch(`/api/knowledge?studioId=${encodeURIComponent(studioId)}`);
      const data = await res.json();
      if (data.items) {
        setModularItems(data.items);
      }
    } catch (err) {
      console.error('Failed to fetch modular knowledge items:', err);
    } finally {
      setIsLoadingModular(false);
    }
  };

  const fetchRawKnowledge = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data?.settings?.knowledgeBase !== undefined && data?.settings?.knowledgeBase !== null) {
        setKnowledgeBase(data.settings.knowledgeBase);
      }
    } catch (err) {
      console.warn('Failed to load raw knowledge base:', err);
    }
  };

  const handleSaveKnowledge = async () => {
    if (isSavingKnowledge) return;
    setIsSavingKnowledge(true);
    try {
      const { error } = await supabase
        .from('studio_settings')
        .update({
          knowledge_base: knowledgeBase,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studioId);

      if (error) throw error;
      setKnowledgeSavedToast(true);
      setTimeout(() => setKnowledgeSavedToast(false), 3000);
      if (onKnowledgeUpdate) onKnowledgeUpdate();
    } catch (err: any) {
      console.error('Failed to save knowledge base:', err);
      alert('Failed to save knowledge base: ' + (err.message || err));
    } finally {
      setIsSavingKnowledge(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        setKnowledgeBase(content);
        setKnowledgeViewMode('raw');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        setKnowledgeBase(content);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadStarterTemplate = () => {
    const template = `# Studio & Company Overview
ArchScale is an award-winning architecture and interior master-planning practice specializing in luxury residential, high-rise commercial, and boutique hospitality projects.

--- PRODUCTS & MENU / CATALOG ---
• Architectural Design Masterplanning: ৳250/sq.ft (schematic design, 3D modeling, construction drawings)
• Interior Architecture & Luxury Fit-out: ৳180/sq.ft (furniture curation, materials, lighting)
• Landscape & Sustainable Urbanism: Custom retainer based on acreage
• Feasibility & Structural Approval Consultations: Comprehensive site analysis

--- PRICING & PAYMENT / DELIVERY ---
• Initial Discovery & Concept Review: Complimentary 30-min WhatsApp consultation
• Retainer / Advance: 30% upon contract signing, milestone payments across schematic & construction
• Payment Modes Accepted: Direct Bank Wire (SCB / City Bank), bKash Merchant, Nagad Business
• Project Delivery: Turnaround 4–6 weeks for schematic phase

--- POLICIES, REFUNDS & REVISIONS ---
• Revisions: Includes 3 major schematic design iterations
• Site Inspections: Bi-weekly engineer supervision included in Dhaka & Chittagong
• Cancellation: Pro-rata refund prior to schematic release

--- CUSTOMER FAQS & SUPPORT ---
• Do you work outside Dhaka? Yes, across Sylhet, Chittagong, Cox's Bazar and internationally
• What is required to start? Site boundary demarcation, survey map, and initial project brief
• How long does planning permission take? Typically 3–4 weeks with Rajuk or local municipal development authority`;
    setKnowledgeBase(template);
  };

  const handleAutoSplitRaw = async () => {
    if (isSplittingRaw) return;
    setIsSplittingRaw(true);
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'split_from_raw',
          studioId,
          rawText: knowledgeBase || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to auto-split knowledge base');
      }
      setModularToast({
        type: 'success',
        message: data.message || `Successfully generated ${data.items?.length || 0} modular knowledge sections!`,
      });
      setTimeout(() => setModularToast(null), 4500);
      await fetchModularItems();
      setKnowledgeViewMode('modular');
      if (onKnowledgeUpdate) onKnowledgeUpdate();
    } catch (err: any) {
      console.error('Error auto-splitting knowledge base:', err);
      setModularToast({
        type: 'error',
        message: err.message || 'Error auto-splitting raw knowledge',
      });
      setTimeout(() => setModularToast(null), 4500);
    } finally {
      setIsSplittingRaw(false);
    }
  };

  const handleOpenCreateItem = (defaultCategory: any = 'catalog') => {
    setEditingItem({
      category: ['overview', 'catalog', 'pricing_delivery', 'policies', 'faq'].includes(defaultCategory)
        ? defaultCategory
        : 'catalog',
      title: '',
      content: '',
      tags: [],
      tagsInput: '',
      is_active: true,
    });
    setIsModularModalOpen(true);
  };

  const handleOpenEditItem = (item: ModularKnowledgeItem) => {
    setEditingItem({
      id: item.id,
      category: item.category,
      title: item.title,
      content: item.content,
      tags: item.tags || [],
      tagsInput: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      is_active: item.is_active !== false,
    });
    setIsModularModalOpen(true);
  };

  const handleSaveModularItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingItem || !editingItem.title.trim() || !editingItem.content.trim()) {
      alert('Title and Content are required.');
      return;
    }
    setIsSavingModularItem(true);
    try {
      const method = editingItem.id ? 'PUT' : 'POST';
      const cleanTags = editingItem.tagsInput
        ? editingItem.tagsInput.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
        : editingItem.tags || [];

      const payload: any = {
        studioId,
        category: editingItem.category,
        title: editingItem.title.trim(),
        content: editingItem.content.trim(),
        tags: cleanTags,
        is_active: editingItem.is_active,
      };
      if (editingItem.id) {
        payload.id = editingItem.id;
      }

      const res = await fetch('/api/knowledge', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save knowledge section');
      }

      setModularToast({
        type: 'success',
        message: editingItem.id ? 'Knowledge section updated!' : 'Knowledge section created!',
      });
      setTimeout(() => setModularToast(null), 3000);
      setIsModularModalOpen(false);
      setEditingItem(null);
      await fetchModularItems();
      if (onKnowledgeUpdate) onKnowledgeUpdate();
    } catch (err: any) {
      console.error('Error saving modular item:', err);
      alert(err.message || 'Failed to save modular item');
    } finally {
      setIsSavingModularItem(false);
    }
  };

  const handleDeleteModularItem = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/knowledge?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to delete section');
      }
      setModularToast({
        type: 'success',
        message: `Deleted "${title}" successfully.`,
      });
      setTimeout(() => setModularToast(null), 3000);
      await fetchModularItems();
      if (onKnowledgeUpdate) onKnowledgeUpdate();
    } catch (err: any) {
      console.error('Error deleting modular item:', err);
      alert(err.message || 'Failed to delete item');
    }
  };

  const handleToggleModularActive = async (item: ModularKnowledgeItem) => {
    try {
      const nextActive = !item.is_active;
      setModularItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active: nextActive } : i)));

      const res = await fetch('/api/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, is_active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update active state');
      }
      if (onKnowledgeUpdate) onKnowledgeUpdate();
    } catch (err: any) {
      console.error('Error toggling active state:', err);
      await fetchModularItems();
    }
  };

  const filteredModularItems = modularItems.filter((item) => {
    if (knowledgeCategoryTab !== 'all' && item.category !== knowledgeCategoryTab) {
      return false;
    }
    if (knowledgeSearchQuery.trim()) {
      const q = knowledgeSearchQuery.toLowerCase();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchContent = (item.content || '').toLowerCase().includes(q);
      const matchTag = (item.tags || []).some((t: string) => t.toLowerCase().includes(q));
      return matchTitle || matchContent || matchTag;
    }
    return true;
  });

  const categoryCounts = modularItems.reduce((acc: Record<string, number>, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-6 xl:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Toast Notification */}
      {modularToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            modularToast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {modularToast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{modularToast.message}</span>
        </div>
      )}

      {/* Header with Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-xl text-[var(--ink)] flex items-center gap-2">
              <BookOpen size={20} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
              <span>Studio Knowledge Base</span>
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              v2 Modular Engine
            </span>
          </div>
          <p className="text-xs text-[var(--ink)]/60 mt-0.5">
            Targeted knowledge modules dynamically retrieved by AI based on customer intent, saving tokens and speeding up replies.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-[var(--paper-raised)] p-1 rounded-xl border border-[var(--paper-line)] shrink-0 self-start sm:self-auto shadow-2xs">
          <button
            type="button"
            onClick={() => handleModeChange('modular')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              knowledgeViewMode === 'modular'
                ? 'bg-[var(--paper)] text-[var(--ink)] shadow-2xs'
                : 'text-[var(--ink)]/60 hover:text-[var(--ink)]'
            }`}
          >
            <Layers size={13} />
            <span>Modular Cards ({modularItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('raw')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              knowledgeViewMode === 'raw'
                ? 'bg-[var(--paper)] text-[var(--ink)] shadow-2xs'
                : 'text-[var(--ink)]/60 hover:text-[var(--ink)]'
            }`}
          >
            <FileText size={13} />
            <span>Raw Text Editor</span>
          </button>
        </div>
      </div>

      {/* MODE 1: MODULAR KNOWLEDGE CARDS */}
      {knowledgeViewMode === 'modular' && (
        <div className="space-y-4">
          {/* Quick Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--paper-raised)] p-3 rounded-2xl border border-[var(--paper-line)]">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink)]/40" />
                <input
                  type="text"
                  value={knowledgeSearchQuery}
                  onChange={(e) => setKnowledgeSearchQuery(e.target.value)}
                  placeholder="Search titles, tags, or content..."
                  className="w-full text-xs pl-8.5 pr-3 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
              {knowledgeBase?.trim() && modularItems.length === 0 && (
                <button
                  type="button"
                  onClick={handleAutoSplitRaw}
                  disabled={isSplittingRaw}
                  className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                  title="Automatically parse existing raw text into modular sections"
                >
                  <Sparkles size={13} className={isSplittingRaw ? 'animate-spin' : ''} />
                  <span>{isSplittingRaw ? 'Splitting...' : 'Auto-Split from Raw Text'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleOpenCreateItem('catalog')}
                className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] transition-all cursor-pointer shadow-2xs"
              >
                <Plus size={14} />
                <span>Add Section</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-medium custom-scrollbar">
            {[
              { id: 'all', label: 'All Sections', count: modularItems.length },
              { id: 'overview', label: 'Overview (Always Active)', count: categoryCounts['overview'] || 0 },
              { id: 'catalog', label: 'Offerings & Menu', count: categoryCounts['catalog'] || 0 },
              { id: 'pricing_delivery', label: 'Pricing & Delivery', count: categoryCounts['pricing_delivery'] || 0 },
              { id: 'policies', label: 'Policies & Revisions', count: categoryCounts['policies'] || 0 },
              { id: 'faq', label: 'Customer FAQs', count: categoryCounts['faq'] || 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setKnowledgeCategoryTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  knowledgeCategoryTab === tab.id
                    ? 'border-[var(--amber)] bg-[var(--amber)]/10 text-[var(--amber-deep)] dark:text-[var(--amber)] font-bold shadow-2xs'
                    : 'border-[var(--paper-line)] bg-[var(--paper-raised)] text-[var(--ink)]/60 hover:text-[var(--ink)]'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--paper)] text-[var(--ink)]/50 tabular-nums">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          {isLoadingModular ? (
            <div className="p-12 text-center text-xs text-[var(--ink)]/50 flex flex-col items-center justify-center gap-2">
              <RefreshCw size={18} className="animate-spin text-[var(--amber)]" />
              <span>Loading modular knowledge sections...</span>
            </div>
          ) : filteredModularItems.length === 0 ? (
            <div className="p-12 rounded-2xl border border-dashed border-[var(--paper-line)] bg-[var(--paper-raised)] text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[var(--amber)]/10 text-[var(--amber-deep)] dark:text-[var(--amber)] flex items-center justify-center mx-auto">
                <BookOpen size={20} />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-sm font-semibold text-[var(--ink)]">No knowledge sections found</h3>
                <p className="text-xs text-[var(--ink)]/60 mt-1">
                  {knowledgeSearchQuery
                    ? 'No sections match your search query.'
                    : 'Modular sections help the AI retrieve only what it needs, keeping responses accurate and fast.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenCreateItem(knowledgeCategoryTab === 'all' ? 'catalog' : knowledgeCategoryTab)}
                  className="px-3.5 py-1.5 rounded-lg bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  + Add First Section
                </button>
                {knowledgeBase?.trim() && (
                  <button
                    type="button"
                    onClick={handleAutoSplitRaw}
                    className="px-3.5 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-raised)] cursor-pointer"
                  >
                    Auto-Split from Raw Text
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModularItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 bg-[var(--paper-raised)] flex flex-col justify-between transition-all hover:shadow-md ${
                    item.is_active
                      ? 'border-[var(--paper-line)]'
                      : 'border-dashed border-[var(--paper-line)] opacity-60 bg-[var(--paper)]'
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                          item.category === 'overview'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                            : item.category === 'catalog'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                            : item.category === 'pricing_delivery'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : item.category === 'policies'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          {item.category.replace('_', ' ')}
                        </span>
                        <h4 className="font-display font-semibold text-sm text-[var(--ink)] mt-1.5 truncate">
                          {item.title}
                        </h4>
                      </div>

                      {/* Active / Inactive Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleModularActive(item)}
                        className={`w-8 h-4.5 rounded-full transition-colors relative cursor-pointer shrink-0 mt-1 ${
                          item.is_active ? 'bg-emerald-500' : 'bg-[var(--paper-line)]'
                        }`}
                        title={item.is_active ? 'Active (AI queries this)' : 'Inactive (AI ignores this)'}
                      >
                        <span
                          className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                            item.is_active ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Content Snippet */}
                    <p className="text-xs text-[var(--ink)]/70 line-clamp-4 leading-relaxed font-mono bg-[var(--paper)] p-2.5 rounded-xl border border-[var(--paper-line)] mb-3 select-all whitespace-pre-wrap">
                      {item.content}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-2 border-t border-[var(--paper-line)] flex items-center justify-between gap-2">
                    {/* Tags */}
                    <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar flex-1 py-0.5">
                      {(item.tags || []).map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--paper-line)] text-[var(--ink)]/60 shrink-0"
                        >
                          #{tag}
                        </span>
                      ))}
                      {(!item.tags || item.tags.length === 0) && (
                        <span className="text-[10px] text-[var(--ink)]/40 italic">No search tags</span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditItem(item)}
                        className="p-1 rounded-md text-[var(--ink)]/60 hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
                        title="Edit section"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteModularItem(item.id!, item.title)}
                        className="p-1 rounded-md text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete section"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: RAW TEXT EDITOR (Fallback & Bulk Editing) */}
      {knowledgeViewMode === 'raw' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-xs text-[var(--ink)]">Raw Knowledge Base Document</p>
              <p className="text-[11px] text-[var(--ink)]/60">
                You can write your complete knowledge base here and click "Auto-Split" to break it into targeted modules.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-raised)] flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Upload size={13} />
                <span>Import File</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.json"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleLoadStarterTemplate}
                className="px-3 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-raised)] cursor-pointer shadow-2xs"
              >
                Load Starter Template
              </button>

              <button
                type="button"
                onClick={handleSaveKnowledge}
                disabled={isSavingKnowledge}
                className="px-4 py-1.5 rounded-lg bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Save size={13} />
                <span>{isSavingKnowledge ? 'Saving...' : knowledgeSavedToast ? 'Saved!' : 'Save Document'}</span>
              </button>
            </div>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="relative rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] overflow-hidden"
          >
            <textarea
              rows={20}
              value={knowledgeBase}
              onChange={(e) => setKnowledgeBase(e.target.value)}
              placeholder="Type or paste your complete studio documentation, menus, pricing packages, FAQs, and operational rules here..."
              className="w-full p-4 text-xs font-mono text-[var(--ink)] bg-transparent focus:outline-none resize-y leading-relaxed custom-scrollbar"
            />
          </div>
        </div>
      )}

      {/* Embedded Knowledge Item Modal */}
      <KnowledgeItemModal
        isOpen={isModularModalOpen}
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        onClose={() => setIsModularModalOpen(false)}
        onSave={handleSaveModularItem}
        isSaving={isSavingModularItem}
      />
    </div>
  );
}
