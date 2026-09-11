"use client";

import { type FormEvent, useState } from "react";

export default function WaitlistForm() {
 const [email, setEmail] = useState("");
 const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
 const [message, setMessage] = useState("");

 const validateEmail = (val: string) => {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim());
 };

 async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!validateEmail(email)) {
   setStatus("error");
   setMessage("Please enter a valid work email address.");
   return;
  }

  setStatus("loading");
  setMessage("");

  try {
   const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
   const utmCampaign = urlParams?.get('utm_campaign') || urlParams?.get('campaign') || 'Website Direct';
   const utmSource = urlParams?.get('utm_source') || 'web';

   const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
     name: email.split("@")[0],
     contact: email,
     source: "web",
     campaign: utmCampaign,
     utm_source: utmSource,
     message: "Waitlist inquiry for studio marketing automation.",
    }),
   });

   const data = await response.json();

   if (response.ok) {
    setStatus("success");
    setMessage("Brief captured! View your live Studio Dashboard to see it in real-time.");
    setEmail("");
   } else {
    setStatus("error");
    setMessage(data.error || "Unable to join. Please try again.");
   }
  } catch {
   setStatus("error");
   setMessage("Network error. Please check your connection and try again.");
  }
 }

 return (
  <form onSubmit={handleSubmit} className="space-y-3" noValidate>
   <label className="sr-only" htmlFor="waitlist-email">
    Work email
   </label>
   <div className="flex flex-col sm:flex-row gap-3">
    <input
     id="waitlist-email"
     name="email"
     type="email"
     value={email}
     onChange={(e) => {
      setEmail(e.target.value);
      if (status === "error") setStatus("idle");
     }}
     disabled={status === "loading" || status === "success"}
     autoComplete="email"
     required
     aria-invalid={status === "error"}
     aria-describedby="waitlist-feedback"
     placeholder="name@company.com"
     className={`min-w-0 flex-1 rounded-lg border px-4 py-3 text-base sm:text-sm min-h-[48px] transition-colors focus:outline-none ${
      status === "error"
       ? "border-red-500/80 bg-red-500/10 text-[var(--ink)] focus:border-red-500"
       : "border-[var(--paper-line)] bg-[var(--paper-raised)] text-[var(--ink)] placeholder:text-[var(--ink)]/45 focus:border-[var(--amber)]"
     }`}
    />
    <button
     type="submit"
     disabled={status === "loading" || status === "success"}
     className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--amber)] px-5 py-3 text-sm font-semibold text-[var(--text-on-amber)] transition-all hover:bg-[var(--amber-deep)] active:scale-[0.98] disabled:opacity-60 cursor-pointer shadow-xs min-h-[48px]"
    >
     {status === "loading" ? (
      <span className="flex items-center gap-2">
       <svg className="animate-spin h-4 w-4 text-[var(--text-on-amber)]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
       </svg>
       Verifying...
      </span>
     ) : status === "success" ? (
      "Access Granted ✓"
     ) : (
      "Get instant access"
     )}
    </button>
   </div>

   <p
    id="waitlist-feedback"
    aria-live="polite"
    className={`min-h-5 text-xs transition-colors ${
     status === "error"
      ? "text-red-500 font-medium"
      : status === "success"
      ? "text-teal font-medium"
      : "text-[var(--ink)]/60"
    }`}
    role="status"
   >
    {message || "Instant setup in under 2 minutes. No credit card required. Free 14-day trial included."}
   </p>
  </form>
 );
}
