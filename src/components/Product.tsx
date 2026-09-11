"use client";

import { useState, useRef, useEffect } from "react";
import { workflowScenarios, WorkflowScenario } from "@/lib/content";
import Reveal from "./Reveal";
import ServiceIcon from "./ServiceIcon";


function getServiceColor(service: string) {
 const s = service.toLowerCase();
 if (s.includes("github")) {
  return {
   bg: "bg-[#0969DA]/10 dark:bg-[#2F81F7]/15",
   border: "border-[#0969DA]/25 dark:border-[#2F81F7]/30",
   text: "text-[#0969DA] dark:text-[#2F81F7]",
   badge: "bg-[#0969DA]/10 dark:bg-[#2F81F7]/15 text-[#0969DA] dark:text-[#2F81F7] border-[#0969DA]/25 dark:border-[#2F81F7]/30",
  };
 }
 if (s.includes("slack")) {
  return {
   bg: "bg-[#4A154B]/10 dark:bg-[#36C5F0]/10",
   border: "border-[#4A154B]/25 dark:border-[#36C5F0]/25",
   text: "text-[#4A154B] dark:text-[#36C5F0]",
   badge: "bg-[#4A154B]/10 dark:bg-[#36C5F0]/10 text-[#4A154B] dark:text-[#36C5F0] border-[#4A154B]/20 dark:border-[#36C5F0]/20",
  };
 }
 if (s.includes("stripe")) {
  return {
   bg: "bg-[#635BFF]/10",
   border: "border-[#635BFF]/25",
   text: "text-[#635BFF]",
   badge: "bg-[#635BFF]/10 text-[#635BFF] border-[#635BFF]/25",
  };
 }
 if (s.includes("linear")) {
  return {
   bg: "bg-[#5E6AD2]/10",
   border: "border-[#5E6AD2]/25",
   text: "text-[#5E6AD2]",
   badge: "bg-[#5E6AD2]/10 text-[#5E6AD2] border-[#5E6AD2]/25",
  };
 }
 if (s.includes("notion")) {
  return {
   bg: "bg-amber-500/10 dark:bg-amber-400/15",
   border: "border-amber-500/25 dark:border-amber-400/30",
   text: "text-amber-600 dark:text-amber-400",
   badge: "bg-amber-500/10 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300 border-amber-500/25 dark:border-amber-400/30",
  };
 }
 if (s.includes("hubspot")) {
  return {
   bg: "bg-[#FF7A59]/10",
   border: "border-[#FF7A59]/25",
   text: "text-[#FF7A59]",
   badge: "bg-[#FF7A59]/10 text-[#FF7A59] border-[#FF7A59]/25",
  };
 }
 if (s.includes("security") || s.includes("test")) {
  return {
   bg: "bg-teal/10",
   border: "border-teal/25",
   text: "text-teal",
   badge: "bg-teal/10 text-teal border-teal/25",
  };
 }
 if (s.includes("datadog")) {
  return {
   bg: "bg-[#632CA6]/10",
   border: "border-[#632CA6]/25",
   text: "text-[#632CA6] dark:text-[#a87ffb]",
   badge: "bg-[#632CA6]/10 text-[#632CA6] dark:text-[#a87ffb] border-[#632CA6]/25",
  };
 }
 if (s.includes("pagerduty")) {
  return {
   bg: "bg-[#06AC38]/10",
   border: "border-[#06AC38]/25",
   text: "text-[#06AC38]",
   badge: "bg-[#06AC38]/10 text-[#06AC38] border-[#06AC38]/25",
  };
 }
 return {
  bg: "bg-[var(--amber)]/10",
  border: "border-[var(--amber)]/25",
  text: "text-[var(--amber-deep)]",
  badge: "bg-[var(--amber)]/10 text-[var(--amber-deep)] border-[var(--amber)]/25",
 };
}

export default function Product() {
 const [selectedScenarioId, setSelectedScenarioId] = useState<string>(workflowScenarios[0].id);
 const [simulatingStep, setSimulatingStep] = useState<number | null>(null);
 const [simulationFinished, setSimulationFinished] = useState(false);
 const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
 const scrollContainerRef = useRef<HTMLDivElement>(null);

 const activeScenario: WorkflowScenario =
  workflowScenarios.find((s) => s.id === selectedScenarioId) || workflowScenarios[0];

 useEffect(() => {
  const container = scrollContainerRef.current;
  const activeIdx = workflowScenarios.findIndex((s) => s.id === selectedScenarioId);
  const button = tabRefs.current[activeIdx];
  if (!container || !button) return;

  const containerRect = container.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const currentScroll = container.scrollLeft;
  const scrollTarget = currentScroll + (buttonRect.left - containerRect.left) - (container.clientWidth - buttonRect.width) / 2;
  container.scrollTo({ left: Math.max(0, scrollTarget), behavior: "smooth" });
 }, [selectedScenarioId]);

 const handleTestRun = () => {
  if (simulatingStep !== null) return;
  setSimulationFinished(false);
  setSimulatingStep(0);

  const stepDuration = 600;
  setTimeout(() => setSimulatingStep(1), stepDuration);
  setTimeout(() => setSimulatingStep(2), stepDuration * 2);
  setTimeout(() => setSimulatingStep(3), stepDuration * 3);
  setTimeout(() => {
   setSimulatingStep(null);
   setSimulationFinished(true);
   setTimeout(() => setSimulationFinished(false), 4000);
  }, stepDuration * 4);
 };

 const isSimulating = simulatingStep !== null;

 return (
  <section id="product" className="py-16 sm:py-20 md:py-24 lg:py-28 bg-[var(--paper)] transition-colors overflow-hidden">
   <div className="mx-auto max-w-6xl px-4 sm:px-6">
    {/* Clean, Focused Header */}
    <Reveal className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
     <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--ink)] break-words">
      Workflows that connect your entire stack
     </h2>
     <p className="mt-3 sm:mt-4 text-sm sm:text-base text-[var(--ink)]/70 leading-relaxed break-words">
      Connect everyday tools and let Nova handle the handoffs in the background.
     </p>
    </Reveal>

    {/* Clean Scenario Selector Tabs */}
    <Reveal className="w-full mb-8 sm:mb-10">
     <div
      ref={scrollContainerRef}
      className="-mx-4 sm:mx-0 overflow-x-auto custom-scrollbar pb-3 pt-1 scroll-smooth snap-x snap-proximity scroll-px-4 relative flex"
     >
      <div className="flex min-w-full px-4 sm:px-0 w-max">
       <div className="flex-1" aria-hidden="true"></div>
       <div
        role="tablist"
        aria-label="Workflow Examples"
        className="inline-flex items-center gap-1.5 p-1.5 rounded-xl bg-[var(--paper-raised)] border border-[var(--paper-line)] shadow-2xs shrink-0"
       >
        {workflowScenarios.map((scenario, idx) => {
         const isActive = scenario.id === activeScenario.id;
         return (
          <button
           key={scenario.id}
           ref={(el) => {
            tabRefs.current[idx] = el;
           }}
           role="tab"
           id={`scenario-tab-${scenario.id}`}
           aria-selected={isActive}
           aria-controls={`scenario-panel-${scenario.id}`}
           type="button"
           onClick={() => {
            setSelectedScenarioId(scenario.id);
            setSimulatingStep(null);
            setSimulationFinished(false);
           }}
           className={`px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-2 select-none shrink-0 snap-start active:scale-[0.98] ${
            isActive
             ? "bg-[var(--amber)] text-[var(--text-on-amber)] shadow-xs font-semibold"
             : "text-[var(--ink)]/65 hover:text-[var(--ink)] hover:bg-[var(--paper-line)]/50"
           }`}
          >
           <span>{scenario.name}</span>
          </button>
         );
        })}
       </div>
       <div className="flex-1" aria-hidden="true"></div>
      </div>
     </div>
    </Reveal>

    {/* Workflow Canvas with Stacked Grid Crossfade */}
    <Reveal className="w-full">
     <div className="rounded-2xl border border-[var(--paper-line)] bg-[var(--paper-raised)] p-5 sm:p-7 md:p-8 lg:p-9 shadow-sm relative overflow-hidden">
      {/* Stacked CSS Grid: Locks container height, smooth crossfade transition identical to Solutions */}
      <div className="w-full min-w-0 grid grid-cols-1 grid-rows-1 items-start">
       {workflowScenarios.map((scenario) => {
        const isScenarioActive = scenario.id === activeScenario.id;
        return (
         <div
          key={scenario.id}
          id={`scenario-panel-${scenario.id}`}
          role="tabpanel"
          aria-labelledby={`scenario-tab-${scenario.id}`}
          aria-hidden={!isScenarioActive}
          className={`col-start-1 row-start-1 w-full min-w-0 transition-all duration-350 ease-out ${
           isScenarioActive
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-3 scale-[0.985] pointer-events-none"
          }`}
         >
          {/* Scenario Summary Line */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 sm:mb-7 border-b border-[var(--paper-line)]">
           <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--amber)]/10 text-[var(--amber-deep)] border border-[var(--amber)]/20">
             {scenario.badge}
            </span>
            <p className="text-sm font-medium text-[var(--ink)]">
             {scenario.description}
            </p>
           </div>

           <button
            type="button"
            onClick={handleTestRun}
            disabled={isSimulating}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[var(--amber)]/10 border border-[var(--amber)]/25 hover:bg-[var(--amber)] hover:text-[var(--text-on-amber)] text-xs font-semibold text-[var(--amber-deep)] transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-60 shrink-0 self-start sm:self-auto min-h-[38px]"
           >
            <span className={`w-2 h-2 rounded-full ${isSimulating ? "bg-[var(--amber)] animate-ping" : simulationFinished ? "bg-emerald-500" : "bg-[var(--amber)]"}`} />
            <span>{isSimulating ? `Running step ${(simulatingStep ?? 0) + 1}...` : simulationFinished ? "Workflow completed" : "Simulate workflow"}</span>
           </button>
          </div>

          {/* 4 Connected Step Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 relative">
           {scenario.nodes.map((node, index) => {
            const isNodeActive = isScenarioActive && simulatingStep === index;
            const isNodePassed = isScenarioActive && simulatingStep !== null && simulatingStep > index;
            const serviceColor = getServiceColor(node.service);

            return (
             <div key={node.id} className="relative flex flex-col">
              <div
               className={`rounded-xl border bg-[var(--paper)] dark:bg-[var(--paper-deep)] p-4 sm:p-5 transition-all duration-300 flex flex-col justify-between h-full shadow-xs ${
                isNodeActive
                 ? "border-[var(--amber)] ring-2 ring-[var(--amber)]/40 bg-[var(--paper-raised)] dark:bg-[var(--paper-deep)] scale-[1.02] shadow-md"
                 : isNodePassed || (isScenarioActive && simulationFinished)
                 ? "border-emerald-500/50 bg-[var(--paper)] dark:bg-[var(--paper-deep)]"
                 : "border-[var(--paper-line)] hover:border-[var(--amber)]/40 hover:-translate-y-0.5 hover:shadow-sm"
               }`}
              >
               {/* Service Icon, Name & Step Badge */}
               <div>
                <div className="flex items-center justify-between gap-2.5 mb-3 min-h-[32px]">
                 <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs transition-all duration-300 ${
                   isNodeActive
                    ? "bg-[var(--amber)]/15 border-[var(--amber)] text-[var(--amber-deep)] scale-105"
                    : isNodePassed || (isScenarioActive && simulationFinished)
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    : `${serviceColor.bg} ${serviceColor.border} ${serviceColor.text || ""}`
                  }`}>
                   <ServiceIcon name={node.service} className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-semibold text-[var(--ink)]/90 truncate">
                   {node.service}
                  </span>
                 </div>

                 {/* Live Step Status Pill or Step Tag */}
                 {isNodeActive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--amber)]/15 text-[var(--amber-deep)] border border-[var(--amber)]/30 animate-fade-in shrink-0">
                   <span className="w-1.5 h-1.5 rounded-full bg-[var(--amber)] animate-ping" />
                   Running
                  </span>
                 ) : isNodePassed || (isScenarioActive && simulationFinished) ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-fade-in shrink-0">
                   <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                   </svg>
                   Done
                  </span>
                 ) : (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${serviceColor.badge} shrink-0`}>
                   {node.stepLabel}
                  </span>
                 )}
                </div>

                {/* Title */}
                <h3 className="font-display text-sm font-semibold text-[var(--ink)] leading-snug">
                 {node.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-[var(--ink)]/65 leading-relaxed mt-1.5">
                 {node.summary}
                </p>
               </div>
              </div>

              {/* Desktop Connector Arrow */}
              {index < scenario.nodes.length - 1 && (
               <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" aria-hidden="true">
                <div className={`w-6 h-6 rounded-full bg-[var(--paper)] border flex items-center justify-center shadow-xs transition-all duration-300 ${
                 isScenarioActive && simulatingStep !== null && simulatingStep > index
                  ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 scale-110 bg-emerald-50 dark:bg-emerald-950/40"
                  : isNodeActive
                  ? "border-[var(--amber)] text-[var(--amber-deep)] scale-105"
                  : "border-[var(--paper-line)] text-[var(--ink)]/40"
                }`}>
                 <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                 </svg>
                </div>
               </div>
              )}

              {/* Mobile Connector Arrow */}
              {index < scenario.nodes.length - 1 && (
               <div className="flex sm:hidden justify-center py-1.5 pointer-events-none" aria-hidden="true">
                <div className={`w-5 h-5 rounded-full bg-[var(--paper)] border flex items-center justify-center shadow-2xs transition-all duration-300 ${
                 isScenarioActive && simulatingStep !== null && simulatingStep > index
                  ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                  : isNodeActive
                  ? "border-[var(--amber)] text-[var(--amber-deep)]"
                  : "border-[var(--paper-line)] text-[var(--ink)]/40"
                }`}>
                 <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                 </svg>
                </div>
               </div>
              )}
             </div>
            );
           })}
          </div>

          {/* Simulation Complete Banner */}
          {isScenarioActive && simulationFinished && (
           <div className="mt-5 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-between text-xs font-medium animate-fade-in">
            <div className="flex items-center gap-2">
             <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
              ✓
             </span>
             <span>Simulation completed — all 4 automated steps executed cleanly.</span>
            </div>
            <span className="text-[11px] opacity-75">0 manual touches</span>
           </div>
          )}
         </div>
        );
       })}
      </div>
     </div>
    </Reveal>
   </div>
  </section>
 );
}
