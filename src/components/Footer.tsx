import { footerLinks } from "@/lib/content";

const socialLinks = [
  {
    name: "GitHub",
    href: "https://github.com",
    icon: (
      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
  {
    name: "X (Twitter)",
    href: "https://x.com",
    icon: (
      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "Discord",
    href: "https://discord.com",
    icon: (
      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.894.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com",
    icon: (
      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--paper-line)] py-12 sm:py-16 bg-[var(--paper)] overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-6 sm:gap-8 md:gap-10 min-w-0">
          <div className="col-span-2 md:col-span-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-md bg-[var(--amber)] text-[var(--text-on-amber)] flex items-center justify-center font-mono font-bold text-xs shadow-2xs">
                AS
              </span>
              <span className="font-display font-bold text-xl tracking-tight text-[var(--ink)]">
                ArchScale
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--amber)]/15 text-[var(--amber-deep)] border border-[var(--amber)]/30">
                AS-05
              </span>
            </div>
            <p className="text-sm text-[var(--ink)]/65 max-w-xs leading-relaxed mb-4 sm:mb-5">
              The marketing automation machine that captures, qualifies, and routes leads for architecture and interior design studios.
            </p>

            {/* Live Status Indicator */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[var(--paper-line)] bg-[var(--paper-raised)] shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal" />
              </span>
              <span className="text-[11px] text-[var(--ink)]/70 font-medium">
                All systems operational
              </span>
            </div>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading} className="col-span-1">
              <p className="text-xs uppercase tracking-wider font-semibold text-[var(--ink)] mb-3 sm:mb-4 font-mono">
                {heading}
              </p>
              <ul className="flex flex-col gap-2 sm:gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-xs sm:text-sm text-[var(--ink)]/65 hover:text-[var(--ink)] transition-colors py-1 inline-block"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar with Socials and Legal */}
        <div className="mt-10 sm:mt-14 pt-6 border-t border-[var(--paper-line)] flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
            <p className="text-xs text-[var(--ink)]/50 font-mono">
              © {new Date().getFullYear()} Nova Technologies Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-3 sm:gap-4 text-xs text-[var(--ink)]/55">
              <a href="#" className="hover:text-[var(--ink)] transition-colors py-1">Privacy</a>
              <span>•</span>
              <a href="#" className="hover:text-[var(--ink)] transition-colors py-1">Terms</a>
              <span>•</span>
              <a href="#" className="hover:text-[var(--ink)] transition-colors py-1">Security</a>
            </div>
          </div>

          {/* Social Icons with accessible touch targets */}
          <div className="flex items-center gap-2 text-[var(--ink)]/55">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.name}
                className="hover:text-[var(--ink)] hover:bg-[var(--paper-raised)] transition-all p-2 rounded-lg"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
