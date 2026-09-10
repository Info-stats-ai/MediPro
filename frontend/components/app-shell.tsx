"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { FileClock, LayoutDashboard, LogIn, Menu, Plus, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/history", label: "History", icon: FileClock }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3 px-6 py-7" aria-label="MediNotes Pro home">
        <span className="grid size-10 place-items-center rounded-xl bg-sage-600 text-white shadow-lg shadow-sage-600/20">
          <span className="text-xl font-semibold" aria-hidden="true">M</span>
        </span>
        <span><span className="block text-[17px] font-bold tracking-tight text-ink">MediNotes</span><span className="block text-[10px] font-bold uppercase tracking-[.22em] text-sage-600">Pro</span></span>
      </Link>
      <div className="px-4">
        <Link href="/new" onClick={() => setOpen(false)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-ink/15 transition hover:bg-sage-700">
          <Plus className="size-4" /> New document
        </Link>
      </div>
      <nav className="mt-7 space-y-1 px-3" aria-label="Main navigation">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${active ? "bg-sage-100 text-sage-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-ink"}`}><item.icon className="size-[18px]" aria-hidden="true" />{item.label}</Link>;
        })}
      </nav>
      <div className="mt-auto border-t border-slate-100 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-sage-50 p-3 text-xs font-medium leading-5 text-slate-600"><ShieldCheck className="size-5 shrink-0 text-sage-600" aria-hidden="true" />Protected clinical workspace</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F9F8]">
      <a href="#main-content" className="fixed left-3 top-3 z-[60] -translate-y-20 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition focus:translate-y-0">Skip to main content</a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/80 bg-white lg:block">{sidebar}</aside>
      {open && <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}><aside className="relative h-full w-[min(18rem,86vw)] bg-white shadow-2xl" aria-label="Mobile navigation" onClick={(event) => event.stopPropagation()}><button onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close menu"><X className="size-5" /></button>{sidebar}</aside></div>}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur-xl md:px-8">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu" aria-expanded={open}><Menu className="size-5" /></button>
          <p className="ml-3 text-sm font-bold tracking-tight text-ink lg:ml-0 lg:text-xs lg:font-medium lg:text-slate-500">MediNotes <span className="text-sage-600">Pro</span><span className="hidden lg:inline"> · Clinical intelligence, made clear.</span></p>
          <div className="ml-auto flex items-center gap-3">
            <SignedOut><SignInButton><button className="btn-secondary min-h-9 px-3 py-1.5"><LogIn className="size-4" />Sign in</button></SignInButton></SignedOut>
            <SignedIn><UserButton /></SignedIn>
          </div>
        </header>
        <main id="main-content" className="mx-auto max-w-[1400px] p-4 sm:p-6 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
