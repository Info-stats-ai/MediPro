"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { FileClock, LayoutDashboard, Menu, Plus, ShieldCheck, X } from "lucide-react";
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
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-3 px-6 py-7" aria-label="MediNotes Pro home">
        <span className="grid size-10 place-items-center rounded-xl bg-sage-600 text-white shadow-lg shadow-sage-600/20">
          <span className="text-xl font-semibold">M</span>
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
          return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${active ? "bg-sage-100 text-sage-700" : "text-slate-500 hover:bg-slate-50 hover:text-ink"}`}><item.icon className="size-[18px]" />{item.label}</Link>;
        })}
      </nav>
      <div className="mt-auto border-t border-slate-100 p-4">
        <div className="rounded-xl bg-sage-50 p-3 text-xs leading-5 text-slate-600"><ShieldCheck className="mb-2 size-5 text-sage-600" />Protected clinical workspace</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F9F8]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/80 bg-white lg:block">{sidebar}</aside>
      {open && <div className="fixed inset-0 z-40 bg-ink/35 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}><aside className="h-full w-72 bg-white" onClick={(event) => event.stopPropagation()}><button onClick={() => setOpen(false)} className="absolute left-[17rem] top-4 rounded-full bg-white p-2" aria-label="Close menu"><X className="size-5" /></button>{sidebar}</aside></div>}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur md:px-8">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-600 lg:hidden" aria-label="Open menu"><Menu className="size-5" /></button>
          <p className="hidden text-xs font-medium text-slate-500 sm:block">Clinical intelligence, made clear.</p>
          <div className="ml-auto flex items-center gap-3">
            {!hasClerk && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Preview mode</span>}
            {hasClerk && <><SignedOut><SignInButton><button className="text-sm font-semibold text-sage-700">Sign in</button></SignInButton></SignedOut><SignedIn><UserButton /></SignedIn></>}
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
