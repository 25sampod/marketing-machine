'use client';

import React, { useState, useRef } from 'react';
import { 
  BookOpen, Layers, FileText, Sparkles, Plus, Upload, CheckCheck, 
  CheckCircle, AlertTriangle, Search, RefreshCw, Pencil, Trash2, Check 
} from 'lucide-react';
import { ModularKnowledgeItem } from './types';

interface KnowledgeViewProps {
  modularItems: ModularKnowledgeItem[];
  isLoadingModular: boolean;
  isSplittingRaw: boolean;
  onAutoSplitRaw: () => Promise<void> | void;
  onOpenCreateItem: (category: string) => void;
  onOpenEditItem: (item: ModularKnowledgeItem) => void;
  onToggleModularActive: (item: ModularKnowledgeItem) => Promise<void> | void;
  onDeleteModularItem: (id: string, title: string) => Promise<void> | void;
  knowledgeBase: string;
  setKnowledgeBase: (kb: string) => void;
  onSaveKnowledge: () => Promise<void> | void;
  isSavingKnowledge: boolean;
  knowledgeSavedToast: boolean;
  modularToast: { message: string; type: 'success' | 'error' } | null;
  setModularToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
}

export default function KnowledgeView({
  modularItems,
  isLoadingModular,
  isSplittingRaw,
  onAutoSplitRaw,
  onOpenCreateItem,
  onOpenEditItem,
  onToggleModularActive,
  onDeleteModularItem,
  knowledgeBase,
  setKnowledgeBase,
  onSaveKnowledge,
  isSavingKnowledge,
  knowledgeSavedToast,
  modularToast,
  setModularToast,
}: KnowledgeViewProps) {
  const [knowledgeViewMode, setKnowledgeViewMode] = useState<'modular' | 'raw'>('modular');
  const [knowledgeCategoryTab, setKnowledgeCategoryTab] = useState<string>('all');
  const [knowledgeSearchQuery, setKnowledgeSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
• How to book a site visit? Schedule directly via WhatsApp chat or partner consultation`;
    setKnowledgeBase(template);
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'overview':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'catalog':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'pricing_delivery':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'policies':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'faq':
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
      default:
        return 'bg-[var(--paper)] text-[var(--ink)]/70 border-[var(--paper-line)]';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'overview':
        return 'Company Overview';
      case 'catalog':
        return 'Products & Menu';
      case 'pricing_delivery':
        return 'Pricing & Delivery';
      case 'policies':
        return 'Policies & Refunds';
      case 'faq':
        return 'FAQ & Support';
      default:
        return category;
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-6 xl:p-8 w-full space-y-4 flex flex-col min-h-0">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-xl text-[var(--ink)] flex items-center gap-2">
            <BookOpen size={20} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
            <span>Studio Knowledge Base &amp; Offerings</span>
          </h2>
          <p className="text-xs text-[var(--ink)]/60 mt-0.5">
            Modular knowledge library dynamically queried by AI. Only relevant sections are fetched per message, saving ~80% tokens.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--paper-raised)] border border-[var(--paper-line)] text-xs font-medium">
            <button
              type="button"
              onClick={() => setKnowledgeViewMode('modular')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                knowledgeViewMode === 'modular'
                  ? 'bg-[var(--amber)] text-[var(--text-on-amber)] font-semibold shadow-2xs'
                  : 'text-[var(--ink)]/70 hover:text-[var(--ink)]'
              }`}
            >
              <Layers size={13} />
              <span>Modular Cards ({modularItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setKnowledgeViewMode('raw')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                knowledgeViewMode === 'raw'
                  ? 'bg-[var(--amber)] text-[var(--text-on-amber)] font-semibold shadow-2xs'
                  : 'text-[var(--ink)]/70 hover:text-[var(--ink)]'
              }`}
            >
              <FileText size={13} />
              <span>Raw Document</span>
            </button>
          </div>

          {knowledgeViewMode === 'modular' ? (
            <>
              <button
                type="button"
                disabled={isSplittingRaw}
                onClick={onAutoSplitRaw}
                className="text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] hover:bg-[var(--paper)] text-[var(--ink)] cursor-pointer disabled:opacity-50 transition-all shadow-2xs"
                title="Auto-split monolithic knowledge base into categorized modular sections"
              >
                <Sparkles size={13} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
                <span>{isSplittingRaw ? 'Analyzing & Splitting...' : 'Auto-Split from Raw Text'}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenCreateItem('catalog')}
                className="text-xs font-semibold flex items-center gap-1.5 bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] px-3.5 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Section</span>
              </button>
            </>
          ) : (
            <>
              <input
                type="file"
                ref={fileInputRef}
                accept=".txt,.md,.text,.markdown,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] hover:bg-[var(--paper)] text-[var(--ink)] cursor-pointer"
              >
                <Upload size={13} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
                <span>Upload .txt / .md</span>
              </button>

              <button
                type="button"
                onClick={handleLoadStarterTemplate}
                className="text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] hover:bg-[var(--paper)] text-[var(--ink)] cursor-pointer"
              >
                <FileText size={13} />
                <span>Load Template</span>
              </button>

              <button
                type="button"
                disabled={isSavingKnowledge}
                onClick={onSaveKnowledge}
                className="text-xs font-semibold flex items-center gap-1.5 bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] px-4 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isSavingKnowledge ? (
                  <span>Saving...</span>
                ) : knowledgeSavedToast ? (
                  <>
                    <CheckCheck size={14} />
                    <span>Saved to Database!</span>
                  </>
                ) : (
                  <span>Save Raw</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Toast Banner */}
      {modularToast && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between border ${
            modularToast.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
          }`}
        >
          <span className="flex items-center gap-2">
            {modularToast.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            <span>{modularToast.message}</span>
          </span>
          <button
            type="button"
            onClick={() => setModularToast(null)}
            className="hover:opacity-70 text-xs px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* SUBVIEW 1: MODULAR CARDS VIEW */}
      {knowledgeViewMode === 'modular' && (
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Token Optimization Callout */}
          <div className="p-3.5 rounded-xl border border-[var(--paper-line)] bg-[var(--paper-raised)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[var(--amber)]/15 text-[var(--amber-deep)] dark:text-[var(--amber)] flex items-center justify-center shrink-0">
                <Sparkles size={14} />
              </span>
              <div>
                <span className="font-semibold text-[var(--ink)] block">
                  Dynamic Selective Knowledge Retrieval Active
                </span>
                <span className="text-[var(--ink)]/60 text-[11px]">
                  Only your Core Overview + top 1–2 relevant catalog/pricing cards are sent per message. Eliminates prompt bloat and cuts token costs by ~80%.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-[var(--paper)] text-[var(--ink)]/70 border border-[var(--paper-line)]">
                {modularItems.filter((i) => i.is_active).length} Active Chunks
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ⚡ ~80% Token Savings
              </span>
            </div>
          </div>

          {/* Filter Tabs & Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
              {[
                { id: 'all', label: 'All', count: modularItems.length },
                { id: 'overview', label: 'Overview', count: modularItems.filter((i) => i.category === 'overview').length },
                { id: 'catalog', label: 'Products & Menu', count: modularItems.filter((i) => i.category === 'catalog').length },
                { id: 'pricing_delivery', label: 'Pricing & Delivery', count: modularItems.filter((i) => i.category === 'pricing_delivery').length },
                { id: 'policies', label: 'Policies & Refunds', count: modularItems.filter((i) => i.category === 'policies').length },
                { id: 'faq', label: 'FAQ & Support', count: modularItems.filter((i) => i.category === 'faq').length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setKnowledgeCategoryTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 font-medium ${
                    knowledgeCategoryTab === tab.id
                      ? 'bg-[var(--amber)] text-[var(--text-on-amber)] font-semibold shadow-2xs'
                      : 'bg-[var(--paper-raised)] text-[var(--ink)]/70 hover:text-[var(--ink)] border border-[var(--paper-line)]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      knowledgeCategoryTab === tab.id
                        ? 'bg-black/20 text-white'
                        : 'bg-[var(--paper)] text-[var(--ink)]/50'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink)]/40" />
              <input
                type="text"
                value={knowledgeSearchQuery}
                onChange={(e) => setKnowledgeSearchQuery(e.target.value)}
                placeholder="Search cards, keywords, tags..."
                className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
              />
              {knowledgeSearchQuery && (
                <button
                  type="button"
                  onClick={() => setKnowledgeSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink)]/40 hover:text-[var(--ink)] text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid / Empty State */}
          {(() => {
            const filteredItems = modularItems.filter((item) => {
              if (knowledgeCategoryTab !== 'all' && item.category !== knowledgeCategoryTab) {
                return false;
              }
              if (knowledgeSearchQuery.trim()) {
                const q = knowledgeSearchQuery.toLowerCase();
                const titleMatch = (item.title || '').toLowerCase().includes(q);
                const contentMatch = (item.content || '').toLowerCase().includes(q);
                const tagsMatch = (item.tags || []).some((t: string) => t.toLowerCase().includes(q));
                return titleMatch || contentMatch || tagsMatch;
              }
              return true;
            });

            if (isLoadingModular) {
              return (
                <div className="flex-1 p-12 flex flex-col items-center justify-center text-xs text-[var(--ink)]/60">
                  <RefreshCw size={20} className="animate-spin text-[var(--amber)] mb-2" />
                  <span>Loading knowledge sections...</span>
                </div>
              );
            }

            if (modularItems.length === 0) {
              return (
                <div className="flex-1 p-8 sm:p-12 rounded-2xl border border-dashed border-[var(--paper-line)] bg-[var(--paper-raised)] flex flex-col items-center justify-center text-center max-w-xl mx-auto my-8">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--amber)]/10 text-[var(--amber-deep)] dark:text-[var(--amber)] flex items-center justify-center mb-3">
                    <BookOpen size={24} />
                  </div>
                  <h3 className="font-display font-bold text-base text-[var(--ink)] mb-1">
                    No Modular Knowledge Sections Yet
                  </h3>
                  <p className="text-xs text-[var(--ink)]/60 max-w-md mb-5 leading-relaxed">
                    Your studio currently has raw text in the database. Use our 1-click Auto-Split engine to automatically convert it into smart modular cards, or add cards manually.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isSplittingRaw}
                      onClick={onAutoSplitRaw}
                      className="px-4 py-2 rounded-xl bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      <Sparkles size={14} />
                      <span>{isSplittingRaw ? 'Splitting Sections...' : 'Auto-Split Raw Knowledge Base'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenCreateItem('catalog')}
                      className="px-4 py-2 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-raised)] text-xs font-medium cursor-pointer"
                    >
                      + Add Manually
                    </button>
                  </div>
                </div>
              );
            }

            if (filteredItems.length === 0) {
              return (
                <div className="flex-1 p-12 rounded-2xl border border-dashed border-[var(--paper-line)] bg-[var(--paper-raised)] flex flex-col items-center justify-center text-center">
                  <p className="text-xs text-[var(--ink)]/60">
                    No knowledge cards match your selected category or search filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setKnowledgeCategoryTab('all');
                      setKnowledgeSearchQuery('');
                    }}
                    className="mt-2 text-xs text-[var(--amber-deep)] dark:text-[var(--amber)] font-medium hover:underline cursor-pointer"
                  >
                    Reset filters
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border bg-[var(--paper-raised)] p-4 flex flex-col justify-between transition-all shadow-xs ${
                      item.is_active
                        ? 'border-[var(--paper-line)] hover:border-[var(--amber)]/50'
                        : 'border-dashed border-[var(--paper-line)] opacity-60'
                    }`}
                  >
                    {/* Card Header */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(
                            item.category
                          )}`}
                        >
                          {getCategoryLabel(item.category)}
                        </span>

                        <button
                          type="button"
                          onClick={() => onToggleModularActive(item)}
                          className="flex items-center gap-1 text-[10px] font-medium cursor-pointer text-[var(--ink)]/70 hover:text-[var(--ink)]"
                          title="Toggle active status for AI queries"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          <span>{item.is_active ? 'Active' : 'Paused'}</span>
                        </button>
                      </div>

                      <h3 className="font-bold text-sm text-[var(--ink)] mb-2 leading-snug">
                        {item.title}
                      </h3>

                      {/* Content preview */}
                      <div className="bg-[var(--paper)] p-3 rounded-xl border border-[var(--paper-line)] text-xs text-[var(--ink)]/80 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed mb-3">
                        {item.content}
                      </div>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.tags.map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper)] text-[var(--ink)]/60 font-mono border border-[var(--paper-line)]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="pt-3 border-t border-[var(--paper-line)] flex items-center justify-between text-xs">
                      <span className="text-[10px] text-[var(--ink)]/50 font-mono">
                        ~{Math.round((item.content?.length || 0) / 4)} tokens · {item.content?.length || 0} chars
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenEditItem(item)}
                          className="px-2.5 py-1 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] hover:bg-[var(--paper-raised)] text-[var(--ink)] text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          title="Edit section"
                        >
                          <Pencil size={11} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => item.id && onDeleteModularItem(item.id, item.title)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                          title="Delete section"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* SUBVIEW 2: RAW DOCUMENT EDITOR */}
      {knowledgeViewMode === 'raw' && (
        <div className="flex-1 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] flex flex-col min-h-[450px] overflow-hidden shadow-xs">
          <div className="p-3 border-b border-[var(--paper-line)] bg-[var(--paper)] flex items-center justify-between text-xs font-medium tabular-nums text-[var(--ink)]/60">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Live Raw Markdown Editor</span>
            </span>
            <div className="flex items-center gap-3">
              <span>
                {knowledgeBase.trim()
                  ? `${knowledgeBase.trim().split(/\s+/).length} words · ${knowledgeBase.length} characters`
                  : '0 words'}
              </span>
              <button
                type="button"
                onClick={onAutoSplitRaw}
                disabled={isSplittingRaw}
                className="text-[11px] font-semibold text-[var(--amber-deep)] dark:text-[var(--amber)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles size={12} />
                <span>Convert to Modular Cards</span>
              </button>
            </div>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="flex-1 p-4 flex flex-col"
          >
            <textarea
              value={knowledgeBase}
              onChange={(e) => setKnowledgeBase(e.target.value)}
              placeholder={`# Company Overview\nDescribe your business, menu, services, hours, delivery zones...\n\n--- MENU & OFFERINGS ---\n• Item 1: ৳Price\n• Item 2: ৳Price\n\n--- DELIVERY & PAYMENT ---\n• Coverage areas & delivery fees\n• Payment methods accepted (Cash on Delivery, bKash, etc.)\n\n--- POLICIES & REFUNDS ---\n• Cancellation and return rules...`}
              className="w-full flex-1 min-h-[380px] p-4 rounded-xl border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-[var(--amber)] resize-y placeholder:text-[var(--ink)]/30 font-mono"
            />
          </div>

          <div className="p-3 border-t border-[var(--paper-line)] bg-[var(--paper)] flex items-center justify-between text-xs text-[var(--ink)]/60">
            <span>Tip: You can drag and drop any .txt or .md catalog directly into the editor, then click "Convert to Modular Cards".</span>
            {knowledgeSavedToast && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Check size={13} /> Saved to studio_settings
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
