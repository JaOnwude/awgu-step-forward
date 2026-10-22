import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { MobileTabBar } from "@/components/shared/primary-nav";
import { SiteFooter } from "@/components/shared/site-footer";
import { ServiceWorkerRegistration } from "@/components/shared/service-worker";
import { SiteHeader } from "@/components/shared/site-header";
import { Toaster } from "@/components/shared/toaster";
import { QueryProvider } from "@/lib/query/provider";
import { ThemeProvider } from "@/theme/theme-provider";

// Brand typefaces (DECISIONS D21): Fraunces for headlines, Plus Jakarta Sans
// for the interface. Self-hosted by next/font, Latin subset only.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Awgu StepForward — Verified opportunities for your next step",
  description:
    "A verified opportunity directory and application tracker for Enugu State, prioritising Awgu. Find learning, work, apprenticeships, and safe local paid work.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7ef" },
    { media: "(prefers-color-scheme: dark)", color: "#10140f" },
  ],
};

const themeScript = `(function(){try{var m=localStorage.getItem('awgu-theme')||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.dataset.theme=m;r.style.colorScheme=d?'dark':'light';r.dataset.sidebar=localStorage.getItem('awgu-sidebar')==='collapsed'?'collapsed':'expanded';}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full font-sans">
        <ThemeProvider>
          <QueryProvider>
            <a
              href="#main"
              className="sr-only z-50 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
            >
              Skip to content
            </a>
            <div className="flex min-h-dvh flex-col">
              <SiteHeader />
              <div className="flex flex-1">
                <AppSidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                  <main id="main" className="flex-1">
                    {children}
                  </main>
                  <SiteFooter />
                </div>
              </div>
            </div>
            <MobileTabBar />
            <Toaster />
            <ServiceWorkerRegistration />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
