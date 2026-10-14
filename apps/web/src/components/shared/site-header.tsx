import { HeaderAccount } from "@/components/shared/header-account";
import { Logo } from "@/components/shared/logo";
import { PrimaryNav } from "@/components/shared/primary-nav";
import { ThemeToggle } from "@/theme/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-[4.5rem] w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <PrimaryNav />
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle className="hidden sm:inline-flex" />
          <HeaderAccount />
        </div>
      </div>
    </header>
  );
}
