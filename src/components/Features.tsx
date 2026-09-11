import { features } from "@/lib/content";
import Reveal from "./Reveal";

import { 
 MessageSquare, 
 Sparkles, 
 Users, 
 Send, 
 RefreshCw, 
 LayoutDashboard, 
 Layers 
} from "lucide-react";

function FeatureIcon({ name }: { name: string }) {
 const iconClass = "w-5 h-5 text-[var(--amber-deep)] dark:text-[var(--amber)]";
 switch (name) {
  case "zap":
  case "message":
   return <MessageSquare className={iconClass} />;
  case "plug":
  case "sparkles":
   return <Sparkles className={iconClass} />;
  case "users":
   return <Users className={iconClass} />;
  case "repeat":
   return <RefreshCw className={iconClass} />;
  case "shield":
  case "send":
   return <Send className={iconClass} />;
  case "sliders":
  case "dashboard":
   return <LayoutDashboard className={iconClass} />;
  default:
   return <Layers className={iconClass} />;
 }
}

export default function Features() {
 const [flagship, ...rest] = features;

 return (
  <section id="features" className="py-16 sm:py-20 md:py-24 lg:py-32 bg-[var(--paper)] overflow-hidden">
   <div className="mx-auto max-w-6xl px-4 sm:px-6">
    <Reveal variant="reveal-left" className="max-w-xl mb-10 sm:mb-14">
     <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[var(--ink)] break-words">
      Engineered for deep workflow automation
     </h2>
     <p className="mt-3 sm:mt-4 text-sm sm:text-base text-[var(--ink)]/70 leading-relaxed break-words">
      Each capability runs reliably in the background or connects seamlessly into visual workflows across your existing tools.
     </p>
    </Reveal>

    {/* Flagship Feature Card */}
    <Reveal className="w-full">
     <div className="border border-[var(--paper-line)] bg-[var(--paper)] dark:bg-[var(--paper-raised)] rounded-xl sm:rounded-2xl overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-[1.15fr_1fr] mb-6 hover:border-[var(--ink)]/20 transition-all min-w-0">
      <div className="p-4 sm:p-7 md:p-6 lg:p-10 flex flex-col justify-between min-w-0">
       <div>
        <div className="flex items-center gap-2.5 mb-3.5 sm:mb-4">
         <span className="p-2 rounded-lg bg-[var(--paper-raised)] dark:bg-[var(--paper-deep)] border border-[var(--paper-line)]">
          <FeatureIcon name={flagship.icon} />
         </span>
         <span className="text-[11px] font-medium text-[var(--amber-deep)] bg-[var(--amber)]/10 px-2.5 py-0.5 rounded border border-[var(--amber)]/20">
          {flagship.tag}
         </span>
        </div>
        <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold text-[var(--ink)] mb-2.5 sm:mb-3 tracking-tight break-words">
         {flagship.title}
        </h3>
        <p className="text-sm sm:text-base text-[var(--ink)]/70 leading-relaxed max-w-md break-words">
         {flagship.body}
        </p>
       </div>

       <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-[var(--paper-line)] flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 text-xs text-[var(--ink)]/55 ">
        <span>Runs 24/7 in background</span>
        <span className="text-teal font-medium">99.99% execution reliability</span>
       </div>
      </div>

      {/* Live Pipeline Visual in Flagship Card */}
      <div className="p-4 sm:p-7 md:p-6 lg:p-10 bg-[var(--paper-raised)]/50 dark:bg-[var(--paper-deep)] border-t md:border-t-0 md:border-l border-[var(--paper-line)] flex flex-col justify-center gap-2.5 sm:gap-3 min-w-0">
       <span className="text-xs font-medium text-[var(--ink)]/65 mb-0.5 sm:mb-1">
        Automated Workflow Flow
       </span>
       {[
        { step: "Event Detection", status: "Triggered instantly on app events", tag: "Instant" },
        { step: "Rules & Filtering", status: "Evaluates branch rules and team schedules", tag: "Verified" },
        { step: "Task Assignment", status: "Routes tickets and notifies assignees", tag: "Assigned" },
        { step: "Team Notification", status: "Dispatches summary updates to channels", tag: "Delivered" },
       ].map((pipe, idx) => (
        <div
         key={pipe.step}
         className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-[var(--paper)] dark:bg-[var(--paper-raised)] border border-[var(--paper-line)] text-xs shadow-2xs gap-2.5 sm:gap-3 hover:border-[var(--amber)]/40 transition-colors"
        >
         <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-teal/15 text-teal text-[10px] font-medium sm:text-xs font-bold flex items-center justify-center shrink-0">
           {idx + 1}
          </span>
          <div className="min-w-0">
           <p className="font-semibold text-[var(--ink)] truncate">{pipe.step}</p>
           <p className="text-[11px] text-[var(--ink)]/60 truncate">{pipe.status}</p>
          </div>
         </div>
         <span className="text-[10px] sm:text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded shrink-0">
          {pipe.tag}
         </span>
        </div>
       ))}
      </div>
     </div>
    </Reveal>

    {/* 6 Remaining Feature Cards */}
    <Reveal variant="reveal-stagger" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
     {rest.map((feature) => (
      <div
       key={feature.title}
       className="p-4 sm:p-7 rounded-xl sm:rounded-2xl border border-[var(--paper-line)] bg-[var(--paper)] dark:bg-[var(--paper-raised)] hover:bg-[var(--paper-raised)]/60 dark:hover:bg-[var(--paper-deep)] hover:border-[var(--amber)]/40 hover:-translate-y-1 hover:shadow-md active:scale-[0.99] transition-all duration-200 shadow-2xs flex flex-col justify-start group min-w-0"
      >
       <div className="flex items-center justify-between gap-2 mb-4 sm:mb-5">
        <span className="p-2.5 rounded-lg bg-[var(--paper-raised)] dark:bg-[var(--paper-deep)] border border-[var(--paper-line)] group-hover:border-[var(--amber)]/40 group-hover:scale-105 transition-all duration-200">
         <FeatureIcon name={feature.icon} />
        </span>
        <span className="text-[10px] font-medium text-[var(--ink)]/60 bg-[var(--paper-raised)] dark:bg-[var(--paper-deep)] px-2.5 py-1 rounded border border-[var(--paper-line)]">
         {feature.tag}
        </span>
       </div>
       <h3 className="font-display text-base sm:text-lg font-semibold text-[var(--ink)] mb-2 tracking-tight break-words">
        {feature.title}
       </h3>
       <p className="text-xs sm:text-sm text-[var(--ink)]/70 leading-relaxed break-words">
        {feature.body}
       </p>
      </div>
     ))}
    </Reveal>
   </div>
  </section>
 );
}
