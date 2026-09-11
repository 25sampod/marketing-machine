'use client';

import React, { useState } from 'react';
import { Users, Copy, Check, UserPlus, Pencil, Layers } from 'lucide-react';
import { TeamMember } from './types';

interface TeamViewProps {
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  team: any;
}

export default function TeamView({
  teamMembers,
  setTeamMembers,
  team,
}: TeamViewProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteSpecialty, setInviteSpecialty] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Edit member state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editRole, setEditRole] = useState('specialist');
  const [editName, setEditName] = useState('');
  const [isSavingMember, setIsSavingMember] = useState(false);

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
          specialty: inviteSpecialty.trim() || 'Architecture Specialist',
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

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-6 xl:p-8 w-full space-y-6">
      <div>
        <h2 className="font-display font-bold text-xl text-[var(--ink)] flex items-center gap-2">
          <Users size={20} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
          <span>Team Specialists &amp; Partner Roster</span>
        </h2>
        <p className="text-xs text-[var(--ink)]/60 mt-0.5">
          Manage senior specialists, role tiers, and lead assignment routing
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
              placeholder="Specialty / Designation (e.g. Commercial Architecture, BIM, Interior FF&E...)"
              value={inviteSpecialty}
              onChange={(e) => setInviteSpecialty(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--ink)]/40 focus:outline-none focus:border-[var(--amber)]"
            />
            <datalist id="specialist-designations-view">
              <option value="Commercial Architecture" />
              <option value="High-End Residential" />
              <option value="Turnkey Renovation" />
              <option value="Interior Architecture & FF&E" />
              <option value="Landscape Architecture" />
              <option value="Urban Design & Master Planning" />
              <option value="Sustainable & Passive House" />
              <option value="BIM & Computational Design" />
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
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink)]/50">Active Roster ({teamMembers.length})</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {teamMembers.map((member) => {
            const emailDisplay = member.email || member.contact || 'specialist@studio.com';
            const initial = (member.name || emailDisplay).charAt(0).toUpperCase();
            const isEditing = editingMemberId === member.id;

            if (isEditing) {
              return (
                <div key={member.id} className="p-4 rounded-2xl border border-[var(--amber)] bg-[var(--paper-raised)] space-y-3 shadow-xs">
                  <p className="font-semibold text-xs text-[var(--ink)]">Edit Specialist Profile</p>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Name"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)]"
                    />
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)]"
                    >
                      <option value="specialist">Specialist Partner</option>
                      <option value="owner">Studio Owner</option>
                      <option value="admin">Administrator</option>
                      <option value="collaborator">Collaborator</option>
                    </select>
                    <input
                      type="text"
                      value={editSpecialty}
                      onChange={(e) => setEditSpecialty(e.target.value)}
                      placeholder="Specialty / Role"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--paper-line)] bg-[var(--paper)] text-[var(--ink)]"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingMemberId(null)}
                      className="px-2.5 py-1 rounded text-xs border border-[var(--paper-line)] text-[var(--ink)]/60 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSavingMember}
                      onClick={() => handleSaveMemberEdit(member.id)}
                      className="px-3 py-1 rounded bg-[var(--amber)] text-[var(--text-on-amber)] text-xs font-semibold cursor-pointer shadow-2xs"
                    >
                      {isSavingMember ? 'Saving...' : 'Save'}
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
                        {member.role || 'Partner'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--ink)]/50 font-medium truncate">{emailDisplay}</p>
                    <p className="text-[11px] text-[var(--amber-deep)] dark:text-[var(--amber)] font-medium mt-0.5 truncate">
                      {member.specialty || 'Architecture Specialist'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEditingMember(member)}
                    className="p-1.5 rounded-lg border border-[var(--paper-line)] hover:bg-[var(--paper)] text-[var(--ink)]/60 hover:text-[var(--ink)] cursor-pointer transition-colors"
                    title="Edit specialist"
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
      <div className="rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] p-5 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-semibold text-sm text-[var(--ink)] flex items-center gap-2">
              <Layers size={16} className="text-[var(--amber-deep)] dark:text-[var(--amber)]" />
              <span>Automated Scope-to-Specialist Routing Matrix</span>
            </h3>
            <p className="text-xs text-[var(--ink)]/60 mt-0.5">
              How incoming architectural project briefs automatically route to practice partners upon AI qualification
            </p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--paper)] border border-[var(--paper-line)] text-emerald-600 dark:text-emerald-400 self-start sm:self-auto">
            Auto-Dispatch Active
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--paper)] text-[var(--ink)]/60 text-[11px] border-b border-[var(--paper-line)]">
              <tr>
                <th className="p-3">Inbound Typology / Scope</th>
                <th className="p-3">Matching Rule</th>
                <th className="p-3">Routed Specialist Partner</th>
                <th className="p-3 text-right">Routing Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--paper-line)]">
              {[
                { scope: 'Commercial Architecture', keyword: 'commercial' },
                { scope: 'High-End Residential', keyword: 'residential' },
                { scope: 'Turnkey Renovation', keyword: 'renovation' },
                { scope: 'Interior Architecture & FF&E', keyword: 'interior' },
                { scope: 'Landscape Architecture', keyword: 'landscape' },
                { scope: 'Urban Design & Master Planning', keyword: 'urban' },
              ].map((item, idx) => {
                const matched = teamMembers.find((m) => {
                  if (!m.specialty) return false;
                  const spec = m.specialty.toLowerCase();
                  return spec.includes(item.keyword) || item.keyword.includes(spec);
                });
                const partnerName = matched ? matched.name || matched.email : (teamMembers[0]?.name || 'Studio Principal (Default)');
                const partnerRole = matched ? (matched.role || 'Specialist') : 'Practice Default';

                return (
                  <tr key={idx} className="hover:bg-[var(--paper)] transition-colors">
                    <td className="p-3 font-sans font-semibold text-[var(--ink)]">{item.scope}</td>
                    <td className="p-3 text-[var(--ink)]/60">
                      match: <span className="text-[var(--amber-deep)] dark:text-[var(--amber)] font-bold">"{item.keyword}"</span>
                    </td>
                    <td className="p-3 font-sans">
                      <span className="font-medium text-[var(--ink)]">{partnerName}</span>
                      <span className="text-[10px] text-[var(--ink)]/50 font-medium ml-1.5">({partnerRole})</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Routed</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
