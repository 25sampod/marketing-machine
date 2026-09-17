export const nav = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Solutions", href: "#solutions" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export interface Feature {
  title: string;
  body: string;
  tag: string;
  icon: string;
  big?: boolean;
}

export const features: Feature[] = [
  {
    title: "Omnichannel lead capture",
    body: "Automatically consolidate inbound inquiries across Instagram DMs, WhatsApp conversations, Meta Lead Ads, and portfolio inquiry forms into one unified studio pipeline.",
    tag: "Lead Capture",
    icon: "zap",
    big: true,
  },
  {
    title: "AI budget & scope qualification",
    body: "Azure OpenAI analyzes inbound client messages instantly, parsing estimated budgets, square footage, timelines, and project typologies.",
    tag: "AI Intelligence",
    icon: "plug",
  },
  {
    title: "Skill-based partner routing",
    body: "Automatically match qualified leads to the appropriate specialist — Commercial, High-End Residential, or Turnkey Renovation.",
    tag: "Smart Routing",
    icon: "users",
  },
  {
    title: "Sub-second WhatsApp auto-replies",
    body: "Acknowledge client briefs in under 5 seconds with bespoke studio intro packets and calendar booking links before competitors even view the DM.",
    tag: "Instant Response",
    icon: "repeat",
  },
  {
    title: "Automated follow-up engine",
    body: "Background cron workers detect warm prospects who stalled after initial contact and re-engage them automatically with conversational check-ins.",
    tag: "Re-engagement",
    icon: "shield",
  },
  {
    title: "Realtime studio CRM & chat inbox",
    body: "Live Postgres Realtime streams incoming inquiries and allows principals to take over WhatsApp threads directly from the browser.",
    tag: "Live Dashboard",
    icon: "sliders",
  },
];

export interface Step {
  title: string;
  body: string;
  tag: string;
  badge: string;
  highlight: string;
}

export const steps: Step[] = [
  {
    title: "Inquiry Ingestion",
    body: "A prospective client messages your studio via WhatsApp, Instagram ad, or portfolio contact form with project requirements.",
    tag: "01 / Ingestion",
    badge: "Meta Cloud API",
    highlight: "Sub-second webhook capture",
  },
  {
    title: "AI Scope Qualification",
    body: "Azure OpenAI inspects the brief for budget mention, project typology, and square footage, computing a qualification score.",
    tag: "02 / Qualify",
    badge: "Azure OpenAI",
    highlight: "Autonomous lead scoring",
  },
  {
    title: "Specialist Assignment",
    body: "Commercial briefs route directly to commercial partners; private residences assign to interior design leads automatically.",
    tag: "03 / Route",
    badge: "Skill Matching",
    highlight: "Zero-latency distribution",
  },
  {
    title: "Conversion & Follow-up",
    body: "Instant automated WhatsApp replies schedule consultations, while scheduled background crons re-engage dormant inquiries.",
    tag: "04 / Convert",
    badge: "Cron Automation",
    highlight: "3.4x consultation conversion",
  },
];

export const stats = [
  { value: "< 5", suffix: "s", label: "instant response time on WhatsApp" },
  { value: "3.4", suffix: "x", label: "higher consultation booking rate" },
  { value: "100", suffix: "%", label: "leads scored & qualified automatically" },
  { value: "$240k", suffix: "+", label: "average pipeline protected per month" },
];

export interface SolutionWorkflow {
  name: string;
  time: string;
}

export interface Solution {
  id: string;
  role: string;
  headline: string;
  description: string;
  tools: string[];
  metric: string;
  metricLabel: string;
  workflows: SolutionWorkflow[];
}

export const solutions: Solution[] = [
  {
    id: "commercial",
    role: "Commercial Studios",
    headline: "High-ticket office, hospitality, and retail developments qualified on day one.",
    description: "Screen corporate briefs, verify square footage and tenant improvement budgets, and route large RFP inquiries straight to senior commercial partners.",
    tools: ["Instagram", "WhatsApp", "Meta Ads", "Supabase"],
    metric: "4 mins",
    metricLabel: "average lead to consultation time (was 48 hours)",
    workflows: [
      { name: "Commercial Budget Extraction", time: "Instant" },
      { name: "Partner Direct Calendar Booking", time: "Automated" },
      { name: "Portfolio Deck Delivery", time: "On Inbound" },
    ],
  },
  {
    id: "residential",
    role: "Residential Practices",
    headline: "Give luxury homeowners a white-glove architectural concierge response.",
    description: "Homeowners demand quick attention. The system captures aesthetic preferences, site locations, and estimated budgets before scheduling an on-site visit.",
    tools: ["WhatsApp", "Instagram", "Meta Ads", "Postgres"],
    metric: "68%",
    metricLabel: "increase in initial site-visit bookings",
    workflows: [
      { name: "Site Location & Scope Intake", time: "Instant" },
      { name: "Lead Qualification & Scoring", time: "Sub-second" },
      { name: "48-Hour Stale Lead Nudge", time: "Automated" },
    ],
  },
  {
    id: "interior",
    role: "Interior Designers",
    headline: "Filter serious turnkey renovations from casual decor shoppers.",
    description: "Stop spending hours answering DM queries manually. Let AI clarify room counts and budgets so your designers only speak to ready-to-sign clients.",
    tools: ["WhatsApp", "Instagram", "Azure OpenAI", "Supabase"],
    metric: "12 hrs",
    metricLabel: "saved per designer every single week",
    workflows: [
      { name: "Renovation Scope Auto-Reply", time: "On Inbound" },
      { name: "Budget Verification Gate", time: "Autonomous" },
      { name: "Designer Assignment", time: "Skill-Based" },
    ],
  },
  {
    id: "allied",
    role: "Design-Build Firms",
    headline: "Coordinate client intake, engineering estimates, and partner handoffs.",
    description: "Unify architectural intake with structural feasibility and trade partner estimates so quotes go out before competitors finish site evaluations.",
    tools: ["WhatsApp", "Meta Ads", "Supabase", "Vercel"],
    metric: "2.8x",
    metricLabel: "faster feasibility and quote delivery",
    workflows: [
      { name: "Design-Build Intake Classification", time: "Instant" },
      { name: "Trade Partner Allocation", time: "Auto-Assigned" },
      { name: "Milestone Contract Nudge", time: "Scheduled" },
    ],
  },
];

export interface WorkflowNode {
  id: string;
  stepLabel: string;
  title: string;
  service: string;
  summary: string;
  status: "success" | "active" | "queued";
}

export interface WorkflowScenario {
  id: string;
  name: string;
  badge: string;
  description: string;
  nodes: WorkflowNode[];
}

export const workflowScenarios: WorkflowScenario[] = [
  {
    id: "whatsapp-inbound",
    name: "WhatsApp Inquiry to Client",
    badge: "Inbound Pipeline",
    description: "Capture inbound WhatsApp brief, score budget with AI, route to partner, and reply instantly.",
    nodes: [
      {
        id: "node-1",
        stepLabel: "1. Capture",
        title: "WhatsApp Message Received",
        service: "WhatsApp",
        summary: "Prospective client inquires about a 5,000 sqft commercial office with $150k budget",
        status: "success",
      },
      {
        id: "node-2",
        stepLabel: "2. Qualify",
        title: "Azure OpenAI Scoring",
        service: "Azure OpenAI",
        summary: "Extracts budget ($150,000) and typology (Commercial). Score: 2/2 Qualified",
        status: "success",
      },
      {
        id: "node-3",
        stepLabel: "3. Route",
        title: "Assign Specialist Partner",
        service: "Supabase",
        summary: "Assigned lead to Commercial Practice Lead in PostgreSQL",
        status: "success",
      },
      {
        id: "node-4",
        stepLabel: "4. Engage",
        title: "Instant Outbound Reply",
        service: "WhatsApp",
        summary: "Sends consultation booking invitation and project portfolio link to client's phone",
        status: "success",
      },
    ],
  },
  {
    id: "stale-lead-cron",
    name: "Stale Lead Re-engagement",
    badge: "Automation Cron",
    description: "Identify dormant contacted leads and re-ignite conversations with personalized follow-ups.",
    nodes: [
      {
        id: "node-1",
        stepLabel: "1. Monitor",
        title: "Scheduled Cron Execution",
        service: "Vercel",
        summary: "Cron runs every 48 hours to inspect contacted leads with no client response",
        status: "success",
      },
      {
        id: "node-2",
        stepLabel: "2. Detect",
        title: "Identify Inactive Leads",
        service: "Supabase",
        summary: "Queries leads where last_contacted_at exceeds threshold and status is contacted",
        status: "success",
      },
      {
        id: "node-3",
        stepLabel: "3. Nudge",
        title: "Send WhatsApp Follow-up",
        service: "WhatsApp",
        summary: "Dispatches friendly inquiry check-in: 'Hi again! Just checking in on your project thoughts'",
        status: "success",
      },
      {
        id: "node-4",
        stepLabel: "4. Update",
        title: "Refresh Lead Timestamp",
        service: "Supabase",
        summary: "Updates last_contacted_at in database to prevent multiple messages",
        status: "success",
      },
    ],
  },
  {
    id: "meta-ad-conversion",
    name: "Instagram & Meta Ad Intake",
    badge: "Ad Optimization",
    description: "Turn clicks on architectural project reels directly into qualified studio leads.",
    nodes: [
      {
        id: "node-1",
        stepLabel: "1. Click",
        title: "Instagram Ad Clicked",
        service: "Meta",
        summary: "User taps 'Send WhatsApp Message' on an Instagram reel of your latest penthouse build",
        status: "success",
      },
      {
        id: "node-2",
        stepLabel: "2. Intake",
        title: "Lead Profile Creation",
        service: "Meta Webhook",
        summary: "Captures user contact and opens live WhatsApp conversation channel",
        status: "success",
      },
      {
        id: "node-3",
        stepLabel: "3. Qualify",
        title: "Automated Scope Discovery",
        service: "Azure OpenAI",
        summary: "Requests missing budget and project timeline if not initially provided",
        status: "success",
      },
      {
        id: "node-4",
        stepLabel: "4. Live Takeover",
        title: "Alert Studio Principal",
        service: "Dashboard",
        summary: "Pushes real-time notification to principal's dashboard for high-value commission",
        status: "success",
      },
    ],
  },
];

export const testimonials = [
  {
    quote:
      "We used to lose 40% of our Instagram inquiries because our team was on job sites all day. Scale qualifies project scopes and schedules site visits before we even get back to the office.",
    name: "Elena Rostova",
    role: "Principal Architect",
    company: "Studio Rostova",
    companyBadge: "SR",
    metric: "3.8x",
    metricLabel: "consultation booking rate",
  },
  {
    quote:
      "The automatic skill-based routing is brilliant. Commercial RFP inquiries go straight to my phone, while residential inquiries route directly to our interior director with zero manual triage.",
    name: "Marcus Thorne",
    role: "Managing Partner",
    company: "Thorne & Co Architects",
    companyBadge: "TC",
    metric: "< 4 mins",
    metricLabel: "inquiry to RFP review",
  },
  {
    quote:
      "The 48-hour follow-up cron revived three dormant projects last month worth over $180k in design fees that we thought had gone completely cold.",
    name: "Sophia Martinez",
    role: "Design Director",
    company: "Atelier Martinez",
    companyBadge: "AM",
    metric: "$180k+",
    metricLabel: "revived design fees",
  },
  {
    quote:
      "Our clients expect high-end white-glove communication. Scale delivers immediate conversational replies on WhatsApp without feeling like an impersonal generic bot.",
    name: "Julian Vance",
    role: "Creative Director",
    company: "Vance Interior Architecture",
    companyBadge: "VA",
    metric: "100%",
    metricLabel: "inquiries acknowledged < 5s",
  },
  {
    quote:
      "As a 10-person practice, we competing with 80-person firms for luxury commissions. Scale gives us the speed, presence, and responsiveness of a corporate firm.",
    name: "Amara Chen",
    role: "Founder & Lead Architect",
    company: "Chen Design Studio",
    companyBadge: "CD",
    metric: "+82%",
    metricLabel: "closed commission pipeline",
  },
];

export const plans = [
  {
    name: "Boutique Studio",
    monthlyPrice: "$79",
    annualPrice: "$65",
    period: "per studio / month",
    annualPeriod: "per studio / month (billed annually)",
    description: "For solo architects and boutique practices automating their first client intake pipelines.",
    features: [
      "Up to 3 studio team members",
      "Real-time WhatsApp Webhook integration",
      "Azure OpenAI budget & scope qualification",
      "Automated instant WhatsApp replies",
      "48-hour stale lead re-engagement cron",
      "Real-time Supabase studio dashboard",
    ],
    highlighted: false,
  },
  {
    name: "Growth Practice",
    monthlyPrice: "$189",
    annualPrice: "$149",
    period: "per studio / month",
    annualPeriod: "per studio / month (billed annually)",
    description: "For established 5-20 person architecture and interior design studios handling active project streams.",
    features: [
      "Unlimited studio team members",
      "Multi-channel Meta Ads & WhatsApp intake",
      "Skill-based partner routing (Commercial & Residential)",
      "Interactive studio WhatsApp chat console",
      "Customizable qualification scoring logic",
      "Automated follow-up drip schedules",
      "Live conversion analytics & funnel tracking",
    ],
    highlighted: true,
  },
  {
    name: "Regional Firm",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    period: "billed annually",
    description: "For multi-office practices requiring multi-branch routing, custom CRM sync, and dedicated infrastructure.",
    features: [
      "Multi-office branch routing by territory",
      "Dedicated Meta WABA business numbers",
      "Custom ERP & accounting integrations",
      "Dedicated workflow implementation lead",
      "Custom AI model fine-tuning for architectural RFPs",
      "Enterprise SLA & custom data security",
    ],
    highlighted: false,
  },
];

export const faqs = [
  {
    question: "How does Scale capture inquiries from Instagram and WhatsApp?",
    answer:
      "Scale connects directly to Meta's official Cloud API via secure webhooks. When a client clicks an Instagram ad, sends a DM, or messages your studio's WhatsApp number, the event is ingested in sub-second time without third-party middleware.",
  },
  {
    question: "How does the AI qualify architectural leads?",
    answer:
      "Using Azure OpenAI, our system parses natural conversational briefs to identify key commercial signals: estimated budget ($50k - $500k+), project typology (Commercial, Residential, Renovation), square footage, and project timeline. Leads scoring >= 2 points are automatically marked 'Qualified'.",
  },
  {
    question: "How does partner routing work?",
    answer:
      "When a lead is scored as 'Qualified', Scale inspects the lead's typology and routes it to the matching partner (e.g. Commercial briefs to Commercial Lead, Residential villas to Residential Lead). If no direct match exists, it distributes leads via round-robin.",
  },
  {
    question: "Can our team chat with clients directly from the dashboard?",
    answer:
      "Yes! The Studio Dashboard features an interactive live WhatsApp Console. Principals and project leads can view the full conversational history and send manual replies directly to the client's phone.",
  },
  {
    question: "What happens when a prospect stops responding?",
    answer:
      "The built-in automated follow-up engine scans for leads that have been contacted but haven't replied within your target window (e.g. 48 hours), sending a courteous follow-up message to revive the conversation.",
  },
  {
    question: "Do I need Meta business verification to test or demo the system?",
    answer:
      "No! Meta provides a developer test number that allows you to send and receive real, live two-way WhatsApp messages immediately during hackathons, testing, and client demos with zero fees or paperwork.",
  },
];

export const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Architecture Engine", href: "#how-it-works" },
    { label: "Solutions", href: "#solutions" },
    { label: "Studio Pricing", href: "#pricing" },
  ],
  Studio: [
    { label: "About Scale", href: "#product" },
    { label: "Live Dashboard", href: "/dashboard" },
    { label: "Problem AS-05", href: "#" },
    { label: "Hackathon Brief", href: "#" },
  ],
  Resources: [
    { label: "FAQ", href: "#faq" },
    { label: "Meta Cloud API Docs", href: "https://developers.facebook.com" },
    { label: "Supabase Realtime", href: "https://supabase.com" },
    { label: "Azure OpenAI", href: "https://azure.microsoft.com" },
  ],
};
