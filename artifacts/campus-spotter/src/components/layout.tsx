import React from "react";
import { Link, useLocation } from "wouter";
import { Map, PlusCircle, BarChart3, Moon, Sun, MapPin } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <header className="h-14 border-b flex items-center justify-between px-4 shrink-0 bg-card z-10 relative">
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />
          <h1 className="font-bold text-xl tracking-tight hidden sm:block font-display">Campus Spotter</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

      <nav className="h-16 border-t bg-card flex items-center justify-around px-2 sm:px-6 shrink-0 pb-safe">
        <NavItem href="/map" icon={<Map className="h-6 w-6" />} label="Map" active={location === "/map"} />
        <NavItem href="/" icon={<PlusCircle className="h-6 w-6" />} label="Add Sighting" active={location === "/"} />
        <NavItem href="/stats" icon={<BarChart3 className="h-6 w-6" />} label="Stats" active={location === "/stats"} />
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href}>
      <div
        className={`flex flex-col items-center justify-center w-20 gap-1 cursor-pointer transition-colors ${
          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
      </div>
    </Link>
  );
}
