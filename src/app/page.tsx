'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ChatInbox from '@/components/ChatInbox';
import { Users, Filter, CheckCircle2, MessageSquare, Plus, Activity, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  useEffect(() => {
    fetchData();

    const leadChannel = supabase
      .channel('public:leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLeads((prev) => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setLeads((prev) => prev.map((l) => l.id === payload.new.id ? payload.new : l));
          if (selectedLead?.id === payload.new.id) {
            setSelectedLead(payload.new);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadChannel);
    };
  }, []);

  const fetchData = async () => {
    const { data: leadsData } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    const { data: teamData } = await supabase.from('team_members').select('*');
    if (leadsData) setLeads(leadsData);
    if (teamData) setTeamMembers(teamData);
  };

  const getAssigneeName = (id: string) => {
    if (!id) return 'Unassigned';
    return teamMembers.find(t => t.id === id)?.name || 'Unknown';
  };

  const triggerCron = async () => {
    try {
      const res = await fetch('/api/cron/followup', {
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}` }
      });
      const data = await res.json();
      alert(data.message || `Sent ${data.followUpCount} follow-ups!`);
    } catch (e) {
      alert('Error running cron');
    }
  };

  const simulateWebLead = async () => {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Demo Lead ' + Math.floor(Math.random() * 1000),
        contact: 'demo@example.com',
        source: 'web',
        message: 'Hi, I need a new commercial office designed with a $150k budget.'
      })
    });
  };

  const qualifiedCount = leads.filter(l => l.status === 'qualified').length;
  const newCount = leads.filter(l => l.status === 'new').length;

  return (
    <div className="min-h-screen bg-gray-50 flex text-gray-900 font-sans">
      
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 p-6 flex flex-col">
        <div className="flex items-center space-x-2 text-white mb-10">
          <Activity className="text-blue-500" />
          <span className="text-xl font-bold">MarketingMachine</span>
        </div>
        
        <nav className="space-y-4 flex-1">
          <a href="#" className="flex items-center space-x-3 text-white bg-slate-800 px-4 py-3 rounded-lg">
            <Users size={20} />
            <span>Lead Inbox</span>
          </a>
          <a href="#" className="flex items-center space-x-3 hover:text-white px-4 py-3 rounded-lg transition-colors">
            <Activity size={20} />
            <span>Analytics</span>
          </a>
          <a href="#" className="flex items-center space-x-3 hover:text-white px-4 py-3 rounded-lg transition-colors">
            <Filter size={20} />
            <span>Workflows</span>
          </a>
        </nav>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Demo Tools</p>
          <button onClick={simulateWebLead} className="w-full text-sm flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors">
            <Plus size={16} />
            <span>Simulate Web Lead</span>
          </button>
          <button onClick={triggerCron} className="w-full text-sm flex items-center justify-center space-x-2 border border-slate-700 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg transition-colors">
            <Clock size={16} />
            <span>Run Follow-up Cron</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Header (Analytics summary) */}
        <div className="h-24 bg-white border-b border-gray-200 flex items-center px-8 justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Inbox</h1>
            <p className="text-sm text-gray-500">Manage and convert your incoming leads automatically.</p>
          </div>
          
          <div className="flex space-x-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{leads.length}</p>
              <p className="text-xs text-gray-500 uppercase font-semibold">Total Leads</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{newCount}</p>
              <p className="text-xs text-gray-500 uppercase font-semibold">New</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{qualifiedCount}</p>
              <p className="text-xs text-gray-500 uppercase font-semibold">Qualified</p>
            </div>
          </div>
        </div>

        {/* Dashboard Body */}
        <div className="flex-1 flex overflow-hidden p-6 gap-6">
          
          {/* Leads Table */}
          <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="p-4 font-semibold text-gray-600">Lead</th>
                    <th className="p-4 font-semibold text-gray-600">Source</th>
                    <th className="p-4 font-semibold text-gray-600">Status</th>
                    <th className="p-4 font-semibold text-gray-600">Score</th>
                    <th className="p-4 font-semibold text-gray-600">Assignee</th>
                    <th className="p-4 font-semibold text-gray-600">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      onClick={() => setSelectedLead(lead)}
                      className={`cursor-pointer hover:bg-blue-50 transition-colors ${selectedLead?.id === lead.id ? 'bg-blue-50' : ''}`}
                    >
                      <td className="p-4">
                        <p className="font-medium text-gray-900">{lead.name}</p>
                        <p className="text-xs text-gray-500">{lead.contact}</p>
                      </td>
                      <td className="p-4">
                        <span className="capitalize text-gray-600">{lead.source}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                          lead.status === 'qualified' ? 'bg-green-50 border-green-200 text-green-700' :
                          lead.status === 'contacted' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                          lead.status === 'new' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                          'bg-gray-100 border-gray-200 text-gray-700'
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-1">
                          {lead.score >= 2 ? <CheckCircle2 size={16} className="text-green-500" /> : <span className="w-4" />}
                          <span>{lead.score}/2</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {getAssigneeName(lead.assigned_to).charAt(0)}
                          </div>
                          <span className="text-gray-600">{getAssigneeName(lead.assigned_to)}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-500">
                        {format(new Date(lead.created_at), 'MMM d, HH:mm')}
                      </td>
                    </tr>
                  ))}
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        No leads yet. Use the demo tools to simulate one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chat Inbox Panel */}
          <div className="w-96 flex-shrink-0">
            <ChatInbox lead={selectedLead} />
          </div>

        </div>
      </div>
    </div>
  );
}
