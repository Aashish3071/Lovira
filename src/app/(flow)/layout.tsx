import { Logo } from "@/components/ui";

export default function FlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto max-w-md px-4 py-3">
        <Logo />
      </header>
      {children}
    </div>
  );
}
