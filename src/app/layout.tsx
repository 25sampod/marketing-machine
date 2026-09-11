import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import ScrollReset from "@/components/ScrollReset";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#080b11" },
  ],
};

export const metadata: Metadata = {
  title: "ArchScale — Marketing Machine for Architecture & Design Studios",
  description:
    "Give a 10-person studio the automation of a 100-person company. Capture leads from Instagram, WhatsApp, and email, qualify them with AI, and automate real-time conversions.",
  keywords: [
    "architecture marketing",
    "interior design lead automation",
    "whatsapp workflow",
    "lead qualification ai",
    "meta webhook crm",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme")||"dark";if(t==="dark"){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-[var(--paper)] text-[var(--text-on-paper)]">
        <ThemeProvider>
          <ScrollReset />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
