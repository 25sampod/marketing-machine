export type DashboardView = 'pipeline' | 'kanban' | 'sheet' | 'analytics' | 'knowledge' | 'team' | 'settings';
export type SettingsTab = 'integrations' | 'general' | 'ai' | 'channels';

export const KANBAN_STAGES = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'consultation_booked', label: 'Consult Booked' },
  { id: 'converted', label: 'Won' },
  { id: 'lost', label: 'Archived' },
] as const;

export type KanbanStageId = (typeof KANBAN_STAGES)[number]['id'];

export interface Lead {
  id: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  channel?: string | null;
  status?: string | null;
  priority_tier?: 'urgent' | 'high' | 'returning' | 'review' | 'standard' | null;
  lpi_score?: number | null;
  lpi_breakdown?: any;
  budget?: string | null;
  timeline?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  metadata?: any;
  created_at: string;
  updated_at?: string | null;
  last_inbound_message_at?: string | null;
  last_message?: string | null;
  [key: string]: any;
}

export interface TeamMember {
  id: string;
  user_id?: string;
  team_id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  created_at?: string;
  [key: string]: any;
}

export interface ModularKnowledgeItem {
  id?: string;
  category: 'overview' | 'catalog' | 'pricing_delivery' | 'policies' | 'faq';
  title: string;
  content: string;
  tags: string[];
  tagsInput?: string;
  is_active: boolean;
  priority?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}
