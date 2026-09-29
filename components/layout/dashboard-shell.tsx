"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

type IconName =
  | "dashboard"
  | "users"
  | "roles"
  | "channels"
  | "posts"
  | "reports"
  | "settings"
  | "menu"
  | "close"
  | "bell"
  | "search"
  | "chevron"
  | "logout";

const navigation = [
  { href: "/dashboard", label: "داشبورد", icon: "dashboard" as IconName },
  { href: "/users", label: "کاربران", icon: "users" as IconName },
  { href: "/roles", label: "نقش‌ها و دسترسی‌ها", icon: "roles" as IconName },
  { href: "/channels", label: "کانال‌ها", icon: "channels" as IconName },
  { href: "/posts", label: "پست‌ها", icon: "posts" as IconName },
  { href: "/reports", label: "گزارش‌ها", icon: "reports" as IconName },
];

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "dashboard":
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
    case "users":
      return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "roles":
      return <svg {...common}><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M8 5V3h8v2M7 10h10M7 14h6" /></svg>;
    case "channels":
      return <svg {...common}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" /><path d="m9 10 6 2-6 2z" /></svg>;
    case "posts":
      return <svg {...common}><path d="M5 3h10l4 4v14H5z" /><path d="M15 3v5h5M8 12h8M8 16h6" /></svg>;
    case "reports":
      return <svg {...common}><path d="M4 19V5M4 19h17" /><path d="m7 15 4-5 3 3 5-7" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.42 1.42-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-2v-.48a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.42-1.42.06-.06A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.56-1.03H6v-2h.84A1.7 1.7 0 0 0 8.4 10a1.7 1.7 0 0 0-.34-1.88L8 8.06l1.42-1.42.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 12.39 5.5V5h2v.5a1.7 1.7 0 0 0 1.03 1.54 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.42 1.42-.06.06A1.7 1.7 0 0 0 18.4 10a1.7 1.7 0 0 0 1.56 1.03H21v2h-.84A1.7 1.7 0 0 0 18.6 15z" /></svg>;
    case "menu":
      return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
    case "close":
      return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case "bell":
      return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
    case "chevron":
      return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>;
    case "logout":
      return <svg {...common}><path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6" /></svg>;
  }
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    localStorage.removeItem("entesharino_access_token");
    router.replace("/login");
  }

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="بستن منو"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 right-0 z-50 flex w-[270px] flex-col border-l border-slate-200 bg-white transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-5">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">
              ا
            </span>
            <div>
              <div className="text-[17px] font-black text-slate-900">انتشارینو</div>
              <div className="text-[10px] font-medium text-slate-400">مدیریت انتشار محتوا</div>
            </div>
          </Link>
          <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="mb-3 px-3 text-[11px] font-bold text-slate-400">منوی اصلی</div>
          <div className="space-y-1">
            {navigation.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={[
                    "group flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium transition",
                    active
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                  ].join(" ")}
                >
                  <span className={active ? "text-white" : "text-slate-400 group-hover:text-slate-700"}>
                    <Icon name={item.icon} />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </Link>
              );
            })}
          </div>

          <div className="my-6 h-px bg-slate-100" />

          <div className="mb-3 px-3 text-[11px] font-bold text-slate-400">سیستم</div>
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          >
            <span className="text-slate-400"><Icon name="settings" /></span>
            تنظیمات
          </Link>
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
              ا
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-slate-800">کاربر سیستم</div>
              <div className="truncate text-[10px] text-slate-400">مدیر سامانه</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <Icon name="logout" size={18} />
            خروج از حساب
          </button>
        </div>
      </aside>
    </>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 lg:hidden"
              aria-label="باز کردن منو"
            >
              <Icon name="menu" />
            </button>
            <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
              <span>انتشارینو</span>
              <Icon name="chevron" size={14} />
              <span className="font-medium text-slate-700">داشبورد</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden md:block">
              <Icon name="search" size={17} />
              <input
                placeholder="جستجو..."
                className="h-10 w-56 rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-xs outline-none transition focus:border-slate-300 focus:bg-white"
              />
              <span className="pointer-events-none absolute right-3 top-2.5 text-slate-400">
                <Icon name="search" size={17} />
              </span>
            </div>
            <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50">
              <Icon name="bell" size={18} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="hidden text-left sm:block">
              <div className="text-xs font-bold text-slate-800">مدیر سیستم</div>
              <div className="mt-0.5 text-[10px] text-slate-400">Administrator</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
              م
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
