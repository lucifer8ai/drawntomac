import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function DetailShell({
  children,
  backTo,
}: {
  children: React.ReactNode;
  backTo?: { to: string; params?: Record<string, string>; search?: Record<string, string> };
}) {
  const backLink = backTo ?? { to: "/home" };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/home" className="text-2xl font-black tracking-tight text-foreground">
            #d.To
          </Link>
          <Link {...(backLink as any)} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
