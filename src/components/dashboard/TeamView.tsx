'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Copy, Check, UserPlus, Pencil, Layers, Plus, 
  Trash2, Sparkles, RefreshCw, Save, X, AlertCircle 
} from 'lucide-react';
import { TeamMember, RoutingRule } from './types';

interface TeamViewProps {
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  team: any;
  onTeamUpdate?: (team: any) => void;
}

export default function TeamView({
  teamMembers,
  setTeamMembers,
  team,
  onTeamUpdate,
}: TeamViewProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteSpecialty, setInviteSpecialty] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Edit member profile state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editRole, setEditRole] = useState('specialist');
  const [editName, setEditName] = useState('');
  const [isSavingMember, setIsSavingMember] = useState(false);

  // Dynamic Studio Knowledge State
  const [knowledgeItems, setKnowledgeItems] = useState<any[]>([]);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);

  // Modular Routing Rules Matrix State
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([]);
  const [hasUnsavedRules, setHasUnsavedRules] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [rulesSavedToast, setRulesSavedToast] = useState(false);
  const hasLoadedDbRulesRef = React.useRef(false);

  // Hydrate team and routing rules directly if not yet provided by parent
  useEffect(() => {
    if (!team || !team.id) {
      fetch('/api/teams')
        .then((res) => res.json())
        .then((data) => {
          if (data?.team) {
            onTeamUpdate?.(data.team);
            if (Array.isArray(data.team.routing_rules) && data.team.routing_rules.length > 0) {
              setRoutingRules(data.team.routing_rules);
              hasLoadedDbRulesRef.current = true;
            }
          }
          if (Array.isArray(data?.members) && data.members.length > 0 && teamMembers.length === 0) {
            setTeamMembers(data.members);
          }
        })
        .catch((err) => console.error('Error hydrating team in TeamView:', err));
    }
  }, [team, onTeamUpdate, setTeamMembers, teamMembers.length]);

  // Add Custom Routing Rule state
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newScope, setNewScope] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState('');

  // Edit Routing Rule state
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [editScope, setEditScope] = useState('');
  const [editKeyword, setEditKeyword] = useState('');

  // 1. Fetch live studio knowledge items on mount
  useEffect(() => {
    async function loadStudioKnowledge() {
      setIsLoadingKnowledge(true);
      try {
        const res = await fetch('/api/knowledge');
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setKnowledgeItems(data.items);
        }
      } catch (err) {
        console.error('Error fetching studio knowledge for TeamView:', err);
      } finally {
        setIsLoadingKnowledge(false);
      }
    }
    loadStudioKnowledge();
  }, []);

  // 2. Extract dynamic role & scope suggestion presets from actual studio knowledge
  const specialtyPresets = React.useMemo(() => {
    const fromKnowledge = knowledgeItems
      .filter((k) => k.title && k.title.trim())
      .map((k) => {
        const raw = k.title.trim();
        return raw
          .toLowerCase()
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      });

    const unique = Array.from(new Set(fromKnowledge));
    if (unique.length > 0) return unique;

    // Sensible business defaults if knowledge base is still empty
    return [
      'Customer Support',
      'Operations Lead',
      'Orders & Billing',
      'Logistics & Delivery',
      'Sales & Client Partner',
      'General Specialist',
    ];
  }, [knowledgeItems]);

  // 3. Helper to build pre-defined routing rules from studio knowledge items
  const buildKnowledgeRules = React.useCallback(
    (items: any[], members: TeamMember[]): RoutingRule[] => {
      const defaultAssignee = members[0] || null;
      const candidateItems = items.filter(
        (item) => item.is_active !== false && item.title && !item.title.toLowerCase().includes('how ordering works')
      );

      if (candidateItems.length === 0) {
        return [
          {
            scope: 'General Inquiries',
            keyword: 'general',
            assigneeId: defaultAssignee?.id,
            assigneeName: defaultAssignee?.name || defaultAssignee?.email || 'Studio Lead',
          },
          {
            scope: 'Orders & Support',
            keyword: 'order',
            assigneeId: defaultAssignee?.id,
            assigneeName: defaultAssignee?.name || defaultAssignee?.email || 'Studio Lead',
          },
          {
            scope: 'Escalations & Complaints',
            keyword: 'urgent',
            assigneeId: defaultAssignee?.id,
            assigneeName: defaultAssignee?.name || defaultAssignee?.email || 'Studio Lead',
          },
        ];
      }

      return candidateItems.slice(0, 8).map((item) => {
        const cleanScope = item.title
          .trim()
          .toLowerCase()
          .split(' ')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        const rawKeyword =
          (item.tags && item.tags[0]) ||
          item.title.toLowerCase().split(/[\s/&:]+/)[0] ||
          'general';
        const keyword = rawKeyword.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Match specialist if their specialty matches the keyword
        const matchedMember =
          members.find((m) => {
            if (!m.specialty) return false;
            const spec = m.specialty.toLowerCase();
            return spec.includes(keyword) || keyword.includes(spec);
          }) || defaultAssignee;

        return {
          scope: cleanScope,
          keyword,
          assigneeId: matchedMember?.id,
          assigneeName: matchedMember?.name || matchedMember?.email || 'Studio Lead',
        };
      });
    },
    []
  );

  // 4. Initialize routing rules from database or auto-generate from knowledge base
  useEffect(() => {
    // If we have saved rules from database, load them and prevent overwriting
    if (team?.routing_rules && Array.isArray(team.routing_rules) && team.routing_rules.length > 0) {
      setRoutingRules(team.routing_rules);
      hasLoadedDbRulesRef.current = true;
      return;
    }

    // Only auto-generate if we haven't loaded DB rules, user has no unsaved edits, and list is empty
    if (!hasLoadedDbRulesRef.current && !hasUnsavedRules && routingRules.length === 0) {
      if (knowledgeItems.length > 0) {
        const generated = buildKnowledgeRules(knowledgeItems, teamMembers);
        setRoutingRules(generated);
      } else {
        const fallback = buildKnowledgeRules([], teamMembers);
        setRoutingRules(fallback);
      }
    }
  }, [team?.routing_rules, knowledgeItems, teamMembers, buildKnowledgeRules, hasUnsavedRules, routingRules.length]);

  const copyInviteLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://scale.sampod.site';
    const code = team?.invite_code || 'arch8899';
    const link = `${origin}/join/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !team?.id) return;
    setIsInviting(true);
    try {
      const res = await fetch('/api/teams/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team.id,
          email: inviteEmail,
          name: inviteName,
          specialty: inviteSpecialty.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.member) {
        setTeamMembers((prev) => [...prev, data.member]);
        setInviteEmail('');
        setInviteName('');
        setInviteSpecialty('');
      } else {
        alert(data.error || 'Failed to invite member');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInviting(false);
    }
  };

  const startEditingMember = (member: any) => {
    setEditingMemberId(member.id);
    setEditSpecialty(member.specialty || '');
    setEditRole(member.role || 'specialist');
    setEditName(member.name || '');
  };

  const handleSaveMemberEdit = async (memberId: string) => {
    if (isSavingMember) return;
    setIsSavingMember(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          specialty: editSpecialty,
          role: editRole,
          name: editName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTeamMembers((prev) =>
          prev.map((m) =>
            m.id === memberId
              ? { ...m, specialty: editSpecialty, role: editRole, name: editName || m.name }
              : m
          )
        );
        setEditingMemberId(null);
      } else {
        alert(data.error || 'Failed to update member');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingMember(false);
    }
  };

  // Routing Rules handlers
  const handleAssigneeChange = (ruleIndex: number, memberId: string) => {
    const member = teamMembers.find((m) => m.id === memberId);
    setRoutingRules((prev) =>
      prev.map((r, i) =>
        i === ruleIndex
          ? {
              ...r,
              assigneeId: memberId || undefined,
              assigneeName: member ? member.name || member.email : 'Studio Default',
            }
          : r
      )
    );
    setHasUnsavedRules(true);
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScope.trim() || !newKeyword.trim()) return;

    const assigned = teamMembers.find((m) => m.id === newAssigneeId) || teamMembers[0];
    const newRule: RoutingRule = {
      scope: newScope.trim(),
      keyword: newKeyword.trim().toLowerCase(),
      assigneeId: assigned?.id,
      assigneeName: assigned ? assigned.name || assigned.email : 'Studio Default',
    };

    setRoutingRules((prev) => [...prev, newRule]);
    setNewScope('');
    setNewKeyword('');
    setNewAssigneeId('');
    setIsAddingRule(false);
    setHasUnsavedRules(true);
  };

  const handleDeleteRule = (ruleIndex: number) => {
    setRoutingRules((prev) => prev.filter((_, i) => i !== ruleIndex));
    setHasUnsavedRules(true);
  };

  const handleStartEditRule = (ruleIndex: number) => {
    const rule = routingRules[ruleIndex];
    if (!rule) return;
    setEditingRuleIndex(ruleIndex);
    setEditScope(rule.scope);
    setEditKeyword(rule.keyword);
  };

  const handleSaveRuleEdit = (ruleIndex: number) => {
    if (!editScope.trim() || !editKeyword.trim()) return;
    setRoutingRules((prev) =>
      prev.map((r, i) =>
        i === ruleIndex
          ? {
              ...r,
              scope: editScope.trim(),
              keyword: editKeyword.trim().toLowerCase(),
            }
          : r
      )
    );
    setEditingRuleIndex(null);
    setHasUnsavedRules(true);
  };

  const handleSaveRulesToDatabase = async () => {
    const targetTeamId = team?.id || '00000000-0000-0000-0000-000000000001';
    setIsSavingRules(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: targetTeamId,
          routingRules,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHasUnsavedRules(false);
        hasLoadedDbRulesRef.current = true;
        setRulesSavedToast(true);
        if (data.team) {
          onTeamUpdate?.(data.team);
        } else if (team) {
          onTeamUpdate?.({ ...team, routing_rules: routingRules });
        }
        setTimeout(() => setRulesSavedToast(false), 3000);
      } else {
        alert(data.error || 'Failed to save routing rules.');
      }
    } catch (err: any) {
      console.error('Failed to save routing matrix:', err);
      alert('Network error saving routing matrix: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSavingRules(false);
    }
  };

  const handleSyncKnowledgePresets = () => {
    const generated = buildKnowledgeRules(knowledgeItems, teamMembers);
    setRoutingRules(generated);
    setHasUnsavedRules(true);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-6 xl:p-8 w-full space-y-6">
      <div>
        <h2 className="font-display font-bold text-xl text-[var(--ink)] flex items-center gap-2">
          <Users size={20} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
          <span>Team Specialists &amp; Partner Roster</span>
        </h2>
        <p className="text-xs text-[var(--ink)]/60 mt-0.5">
          Manage team members, roles, specialties, and automated scope-based lead routing
        </p>
      </div>

      {/* Shareable Invite Card */}
      <div className="p-4 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--ink)]/70">Shareable Studio Invite Link</span>
          {copiedLink && (
            <span className="text-[10px] font-medium text-emerald-500 flex items-center gap-1">
              <Check size={11} /> Link Copied!
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={`${typeof window !== 'undefined' ? window.location.origin : 'https://scale.sampod.site'}/join/${team?.invite_code || 'arch8899'}`}
            className="flex-1 text-xs font-mono px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)]/70 select-all"
          />
          <button
            type="button"
            onClick={copyInviteLink}
            className="px-4 py-2 rounded-lg bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs"
          >
            <Copy size={13} />
            <span>Copy</span>
          </button>
        </div>
      </div>

      {/* Invite Partner Form */}
      <form onSubmit={handleInvite} className="p-4 sm:p-5 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] space-y-3 shadow-xs">
        <p className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
          <UserPlus size={14} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
          <span>Invite New Specialist Partner</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Partner name (e.g. David)"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--ink)]/40 focus:outline-none focus:border-[var(--amber)]"
          />
          <input
            type="email"
            required
            placeholder="partner@studio.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--ink)]/40 focus:outline-none focus:border-[var(--amber)]"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              list="specialist-designations-view"
              placeholder="Specialty / Role (Choose or type any role)..."
              value={inviteSpecialty}
              onChange={(e) => setInviteSpecialty(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--ink)]/40 focus:outline-none focus:border-[var(--amber)]"
            />
            <datalist id="specialist-designations-view">
              {specialtyPresets.map((preset, idx) => (
                <option key={idx} value={preset} />
              ))}
            </datalist>
          </div>
          <button
            type="submit"
            disabled={isInviting}
            className="px-4 py-2 rounded-lg bg-[var(--amber)] hover:bg-[var(--amber-deep)] text-[var(--text-on-amber)] text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-2xs disabled:opacity-50 shrink-0"
          >
            {isInviting ? 'Inviting...' : 'Send Invite'}
          </button>
        </div>
      </form>

      {/* Active Specialists Roster Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/50">
            Active Roster ({teamMembers.length})
          </p>
          <span className="text-[11px] text-[var(--ink)]/50">
            Click <Pencil size={11} className="inline ml-0.5 mr-0.5" /> to customize name, role, or specialty
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {teamMembers.map((member) => {
            const emailDisplay = member.email || member.contact || 'specialist@studio.com';
            const initial = (member.name || emailDisplay).charAt(0).toUpperCase();
            const isEditing = editingMemberId === member.id;

            if (isEditing) {
              return (
                <div key={member.id} className="p-4 rounded-2xl border border-[var(--amber)] bg-[var(--paper-raised)] space-y-3 shadow-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
                      <Pencil size={13} className="text-[var(--amber)]" />
                      <span>Edit Member Profile</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingMemberId(null)}
                      className="p-1 rounded text-[var(--ink)]/40 hover:text-[var(--ink)] cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[var(--ink)]/60 block mb-1">Display Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[var(--ink)]/60 block mb-1">System Role Tier</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                      >
                        <option value="owner">Studio Owner</option>
                        <option value="specialist">Specialist Partner</option>
                        <option value="admin">Administrator</option>
                        <option value="operations">Operations Lead</option>
                        <option value="support">Customer Support</option>
                        <option value="collaborator">Collaborator</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[var(--ink)]/60 block mb-1">
                        Role / Specialty (Choose from studio knowledge or type custom)
                      </label>
                      <input
                        type="text"
                        value={editSpecialty}
                        onChange={(e) => setEditSpecialty(e.target.value)}
                        placeholder="e.g. Fast Food Operations, Customer Support, Logistics..."
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                      />
                      {/* Studio Knowledge Quick-Select Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2">
                        <span className="text-[10px] text-[var(--ink)]/45 flex items-center gap-1">
                          <Sparkles size={11} className="text-[var(--amber)]" /> Suggestions:
                        </span>
                        {specialtyPresets.slice(0, 7).map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setEditSpecialty(preset)}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--paper-line)] bg-[var(--paper)] hover:border-[var(--amber)] hover:text-[var(--amber-deep)] dark:hover:text-[var(--amber)] text-[var(--ink)]/70 transition-colors cursor-pointer"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingMemberId(null)}
                      className="px-2.5 py-1 rounded-lg text-xs border border-[var(--paper-line)] text-[var(--ink)]/60 hover:bg-[var(--paper)] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingMember}
                      onClick={() => handleSaveMemberEdit(member.id)}
                      className="px-3 py-1 rounded-lg bg-[var(--amber)] text-[var(--text-on-amber)] text-xs font-semibold hover:bg-[var(--amber-deep)] cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <Check size={13} />
                      <span>{isSavingMember ? 'Saving...' : 'Save Profile'}</span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={member.id} className="p-4 rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] flex items-center justify-between shadow-xs hover:border-[var(--amber)]/40 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--amber)]/15 text-[var(--amber-deep)] dark:text-[var(--amber)] flex items-center justify-center font-bold text-sm shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-xs text-[var(--ink)] truncate">{member.name || emailDisplay}</p>
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--paper)] border border-[var(--paper-line)] text-[var(--ink)]/60">
                        {member.role || 'Member'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--ink)]/50 font-medium truncate">{emailDisplay}</p>
                    {member.specialty ? (
                      <p className="text-[11px] text-[var(--amber-deep)] dark:text-[var(--amber)] font-medium mt-0.5 truncate">
                        {member.specialty}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[var(--ink)]/40 italic mt-0.5 truncate">
                        {member.role === 'owner' ? 'Studio Owner' : 'Specialist (No custom specialty)'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEditingMember(member)}
                    className="p-1.5 rounded-lg border border-[var(--paper-line)] hover:bg-[var(--paper)] text-[var(--ink)]/60 hover:text-[var(--ink)] cursor-pointer transition-colors"
                    title="Edit member role and specialty"
                  >
                    <Pencil size={13} />
                  </button>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Active" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Automated Scope-to-Specialist Routing Matrix */}
      <div className="rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-sm text-[var(--ink)] flex items-center gap-2">
              <Layers size={16} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
              <span>Automated Scope-to-Specialist Routing Matrix</span>
            </h3>
            <p className="text-xs text-[var(--ink)]/60 mt-0.5">
              How incoming customer inquiries and project scopes automatically route to practice partners upon AI qualification
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSyncKnowledgePresets}
              className="px-2.5 py-1.5 rounded-xl border border-[var(--paper-line)] hover:bg-[var(--paper)] text-[var(--ink)]/70 hover:text-[var(--ink)] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Re-generate default rules from current studio knowledge"
            >
              <RefreshCw size={12} className={isLoadingKnowledge ? 'animate-spin' : ''} />
              <span>Sync from Knowledge</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddingRule(!isAddingRule)}
              className="px-2.5 py-1.5 rounded-xl border border-[var(--amber)]/40 hover:bg-[var(--amber)]/10 text-[var(--amber-deep)] dark:text-[var(--amber)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            >
              <Plus size={13} />
              <span>Add Custom Scope</span>
            </button>

            <button
              type="button"
              onClick={handleSaveRulesToDatabase}
              disabled={isSavingRules}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all ${
                hasUnsavedRules
                  ? 'bg-[var(--amber)] text-[var(--text-on-amber)] hover:bg-[var(--amber-deep)] animate-pulse'
                  : 'bg-[var(--paper-raised)] text-[var(--ink)]/80 hover:text-[var(--ink)] border border-[var(--paper-line)]'
              }`}
            >
              <Save size={13} />
              <span>{isSavingRules ? 'Saving...' : 'Save Matrix'}</span>
            </button>

            {rulesSavedToast && (
              <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1 animate-in fade-in">
                <Check size={13} /> Saved!
              </span>
            )}
          </div>
        </div>

        {/* Add Custom Scope Form Drawer */}
        {isAddingRule && (
          <form onSubmit={handleAddRule} className="p-3.5 rounded-xl border border-[var(--amber)]/40 bg-[var(--paper)] space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
                <Plus size={13} className="text-[var(--amber)]" />
                <span>New Scope Routing Rule</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAddingRule(false)}
                className="p-1 rounded text-[var(--ink)]/40 hover:text-[var(--ink)] cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] font-semibold text-[var(--ink)]/60 block mb-1">Typology / Scope Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fast Food, VIP Orders, Inquiries..."
                  value={newScope}
                  onChange={(e) => setNewScope(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[var(--ink)]/60 block mb-1">Matching Keyword</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. burger, pizza, delivery..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[var(--ink)]/60 block mb-1">Routed Specialist Partner</label>
                <select
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)]"
                >
                  <option value="">Studio Principal (Default)</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name || member.email} ({member.specialty || member.role || 'Partner'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingRule(false)}
                className="px-2.5 py-1 text-xs rounded border border-[var(--paper-line)] text-[var(--ink)]/60 hover:bg-[var(--paper-raised)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs font-semibold rounded bg-[var(--amber)] text-[var(--text-on-amber)] hover:bg-[var(--amber-deep)] cursor-pointer shadow-2xs"
              >
                Add Rule
              </button>
            </div>
          </form>
        )}

        {/* Matrix Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[650px] text-left text-xs">
            <thead className="bg-[var(--paper)] text-[var(--ink)]/60 text-[11px] border-b border-[var(--paper-line)]">
              <tr>
                <th className="p-3">Inbound Typology / Scope</th>
                <th className="p-3">Matching Rule</th>
                <th className="p-3">Routed Specialist Partner</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--paper-line)]">
              {routingRules.map((item, idx) => {
                const isEditingRule = editingRuleIndex === idx;

                return (
                  <tr key={idx} className="hover:bg-[var(--paper)] transition-colors">
                    <td className="p-3 font-sans">
                      {isEditingRule ? (
                        <input
                          type="text"
                          value={editScope}
                          onChange={(e) => setEditScope(e.target.value)}
                          className="text-xs px-2 py-1 rounded border border-[var(--amber)] bg-[var(--paper-raised)] text-[var(--ink)] w-full max-w-xs"
                        />
                      ) : (
                        <span className="font-semibold text-[var(--ink)]">{item.scope}</span>
                      )}
                    </td>

                    <td className="p-3 text-[var(--ink)]/60 font-sans">
                      {isEditingRule ? (
                        <input
                          type="text"
                          value={editKeyword}
                          onChange={(e) => setEditKeyword(e.target.value)}
                          placeholder="keyword"
                          className="text-xs px-2 py-1 rounded border border-[var(--amber)] bg-[var(--paper-raised)] text-[var(--ink)] w-32"
                        />
                      ) : (
                        <span>
                          match: <span className="text-[var(--amber-deep)] dark:text-[var(--amber)] font-bold font-mono">"{item.keyword}"</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3 font-sans">
                      <select
                        value={item.assigneeId || ''}
                        onChange={(e) => handleAssigneeChange(idx, e.target.value)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-[var(--paper-line)] bg-[var(--paper-raised)] text-[var(--ink)] focus:outline-none focus:border-[var(--amber)] cursor-pointer"
                      >
                        <option value="">Studio Principal (Default)</option>
                        {teamMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name || member.email} ({member.specialty || member.role || 'Specialist'})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        {isEditingRule ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveRuleEdit(idx)}
                              className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                              title="Save scope edit"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRuleIndex(null)}
                              className="p-1 rounded bg-[var(--paper)] text-[var(--ink)]/50 hover:text-[var(--ink)] cursor-pointer"
                              title="Cancel"
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEditRule(idx)}
                              className="p-1 rounded hover:bg-[var(--paper-line)]/50 text-[var(--ink)]/50 hover:text-[var(--ink)] cursor-pointer transition-colors"
                              title="Edit scope rule"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(idx)}
                              className="p-1 rounded hover:bg-red-500/10 text-[var(--ink)]/40 hover:text-red-500 cursor-pointer transition-colors"
                              title="Delete rule"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {routingRules.length === 0 && (
          <div className="p-8 text-center text-xs text-[var(--ink)]/50 space-y-2 border border-dashed border-[var(--paper-line)] rounded-xl">
            <p>No routing rules defined yet.</p>
            <button
              type="button"
              onClick={handleSyncKnowledgePresets}
              className="px-3 py-1.5 rounded-lg bg-[var(--amber)] text-[var(--text-on-amber)] font-semibold text-xs cursor-pointer shadow-2xs"
            >
              Generate from Studio Knowledge
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
