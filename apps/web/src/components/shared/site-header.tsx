import { SidebarToggle } from "@/components/shared/app-sidebar";
import { HeaderAccount } from "@/components/shared/header-account";
import { Logo } from "@/components/shared/logo";
import { PrimaryNav } from "@/components/shared/primary-nav";
import { ThemeToggle } from "@/theme/theme-toggle";

// Full width, so the logo sits over the left sidebar as in VS Code's title bar.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="flex h-[4.5rem] w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-5">
        <div className="flex items-center gap-3">
          <SidebarToggle />
          <Logo />
        </div>
        <PrimaryNav />
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <HeaderAccount />
        </div>
      </div>
    </header>
  );
}
