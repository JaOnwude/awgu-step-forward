import { SidebarToggle } from "@/components/shared/app-sidebar";
import { HeaderAccount } from "@/components/shared/header-account";
import { Logo } from "@/components/shared/logo";
import { PrimaryNav } from "@/components/shared/primary-nav";
import { ThemeToggle } from "@/theme/theme-toggle";

// Full width, so the logo sits over the left sidebar as in VS Code's title bar.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="flex h-[4.5rem] w-full items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <SidebarToggle />
          {/* Under 360px (small Android phones) only the mark fits. */}
          <Logo className="max-[359px]:[&>span:last-child]:hidden" />
        </div>
        <PrimaryNav />
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* On phones the theme switch lives in the menu drawer instead. */}
          <ThemeToggle className="hidden sm:grid" />
          <HeaderAccount />
        </div>
      </div>
    </header>
  );
}
