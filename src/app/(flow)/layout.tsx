import { DemoStrip } from "@/components/AppShell";
import { Logo } from "@/components/ui";
import { IS_DEMO } from "@/lib/backend";

export default function FlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      {IS_DEMO && <DemoStrip />}
      <header className="mx-auto max-w-md px-4 py-3">
        <Logo />
      </header>
      {children}
    </div>
  );
}
