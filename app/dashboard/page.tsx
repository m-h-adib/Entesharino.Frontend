"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { auth } from "@/lib/auth";

type Platform = 1 | 2 | 3 | 4;
type DeliveryStatus = 1 | 2 | 3 | 4 | 5;

type Dashboard = {
  channels: { total: number; active: number; connected: number; disconnected: number };
  posts: { total: number; draft: number; scheduled: number; processing: number; completed: number; partiallyCompleted: number; failed: number; cancelled: number };
  deliveries: { total: number; pending: number; processing: number; sent: number; failed: number; cancelled: number };
  media: { total: number; totalSize: number; sent: number; pending: number; processing: number; failed: number; cancelled: number };
};

type DeliveryItem = {
  postId: number;
  postTitle: string;
  channelId: number;
  channelName: string;
  platform: Platform;
  status: DeliveryStatus;
  retryCount: number;
  sentAt?: string | null;
  scheduledAt?: string | null;
  errorMessage?: string | null;
};

type DeliveryReport = { totalCount: number; page: number; pageSize: number; items: DeliveryItem[] };
type Result<T> = { success: boolean; data: T; message?: string };

const platforms: Record<Platform, string> = { 1: "تلگرام", 2: "ایتا", 3: "بله", 4: "روبیکا" };
const statusInfo: Record<DeliveryStatus, { label: string; className: string }> = {
  1: { label: "در انتظار", className: "bg-amber-50 text-amber-700" },
  2: { label: "در حال پردازش", className: "bg-blue-50 text-blue-700" },
  3: { label: "موفق", className: "bg-emerald-50 text-emerald-700" },
  4: { label: "ناموفق", className: "bg-red-50 text-red-700" },
  5: { label: "لغوشده", className: "bg-slate-100 text-slate-500" },
};

function number(value: number) {
  return (value ?? 0).toLocaleString("fa-IR");
}

function dateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function bytes(value: number) {
  if (!value) return "۰ بایت";
  const units = ["بایت", "کیلوبایت", "مگابایت", "گیگابایت"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) { size /= 1024; index++; }
  return `${size >= 10 || index === 0 ? Math.round(size) : size.toFixed(1)} ${units[index]}`;
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canView = auth.hasPermission("Reports.View");

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const [dashboardResponse, deliveryResponse] = await Promise.all([
          api.get<Result<Dashboard>>("/api/reports/dashboard"),
          api.get<Result<DeliveryReport>>("/api/reports/deliveries?page=1&pageSize=5"),
        ]);

        setDashboard(dashboardResponse.data);
        setDeliveries(deliveryResponse.data?.items ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات داشبورد");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [canView]);

  if (!canView) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="text-xl font-black text-red-800">دسترسی غیرمجاز</h1>
        <p className="mt-2 text-sm text-red-600">شما دسترسی مشاهده داشبورد گزارش‌ها را ندارید.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">در حال دریافت اطلاعات داشبورد...</div>;
  }

  const d = dashboard ?? {
    channels: { total: 0, active: 0, connected: 0, disconnected: 0 },
    posts: { total: 0, draft: 0, scheduled: 0, processing: 0, completed: 0, partiallyCompleted: 0, failed: 0, cancelled: 0 },
    deliveries: { total: 0, pending: 0, processing: 0, sent: 0, failed: 0, cancelled: 0 },
    media: { total: 0, totalSize: 0, sent: 0, pending: 0, processing: 0, failed: 0, cancelled: 0 },
  };

  const successRate = d.deliveries.total ? Math.round((d.deliveries.sent / d.deliveries.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">داشبورد</h1>
          <p className="mt-1.5 text-xs text-slate-500 sm:text-sm">نمای کلی وضعیت انتشار و ارسال محتوای شما</p>
        </div>
        <a href="/posts" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800">
          <span className="text-base leading-none">+</span>
          ایجاد پست جدید
        </a>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="کل کانال‌ها" value={d.channels.total} detail={`${number(d.channels.active)} کانال فعال`} icon="◉" />
        <Stat title="کل پست‌ها" value={d.posts.total} detail={`${number(d.posts.completed)} پست تکمیل‌شده`} icon="↗" />
        <Stat title="در انتظار ارسال" value={d.deliveries.pending} detail={`${number(d.deliveries.processing)} در حال پردازش`} icon="◷" />
        <Stat title="ارسال ناموفق" value={d.deliveries.failed} detail={`${number(d.deliveries.cancelled)} لغوشده`} icon="!" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-black text-slate-900">وضعیت ارسال‌ها</h2>
              <p className="mt-1 text-[11px] text-slate-400">آخرین فعالیت‌های انتشار محتوا</p>
            </div>
            <a href="/reports" className="text-xs font-bold text-slate-500 hover:text-slate-900">مشاهده همه</a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] text-slate-400">
                  <th className="px-5 py-3 font-medium">پست</th>
                  <th className="px-5 py-3 font-medium">کانال</th>
                  <th className="px-5 py-3 font-medium">وضعیت</th>
                  <th className="px-5 py-3 font-medium">زمان</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((item, index) => {
                  const info = statusInfo[item.status] ?? statusInfo[1];
                  return (
                    <tr key={`${item.postId}-${item.channelId}-${index}`} className="border-b border-slate-50 last:border-0">
                      <td className="max-w-[260px] px-5 py-4">
                        <div className="truncate text-xs font-bold text-slate-700">{item.postTitle || "بدون عنوان"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-slate-600">{item.channelName}</div>
                        <div className="mt-1 text-[10px] text-slate-400">{platforms[item.platform]}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${info.className}`}>{info.label}</span>
                      </td>
                      <td className="px-5 py-4 text-[11px] text-slate-400">{dateTime(item.sentAt ?? item.scheduledAt)}</td>
                    </tr>
                  );
                })}
                {!deliveries.length && <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-400">ارسالی برای نمایش وجود ندارد.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-sm font-black text-slate-900">خلاصه عملکرد</h2>
            <p className="mt-1 text-[11px] text-slate-400">اطلاعات واقعی سامانه</p>
          </div>

          <div className="mt-7">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-black text-slate-950">{number(successRate)}٪</div>
                <div className="mt-1 text-[11px] text-slate-400">نرخ موفقیت ارسال</div>
              </div>
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{number(d.deliveries.total)} کل ارسال</span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-slate-900" style={{ width: `${successRate}%` }} />
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-lg font-black text-slate-900">{number(d.deliveries.sent)}</div>
              <div className="mt-1 text-[10px] text-slate-400">ارسال موفق</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-lg font-black text-slate-900">{number(d.deliveries.failed)}</div>
              <div className="mt-1 text-[10px] text-slate-400">ارسال ناموفق</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-lg font-black text-slate-900">{number(d.channels.connected)}</div>
              <div className="mt-1 text-[10px] text-slate-400">کانال متصل</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-lg font-black text-slate-900">{bytes(d.media.totalSize)}</div>
              <div className="mt-1 text-[10px] text-slate-400">حجم رسانه‌ها</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-900">دسترسی سریع</h2>
          <p className="mt-1 text-[11px] text-slate-400">عملیات پرکاربرد سامانه</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["/posts", "ساخت پست", "یک محتوای جدید ایجاد کنید"],
            ["/channels", "افزودن کانال", "یک کانال جدید متصل کنید"],
            ["/users", "مدیریت کاربران", "کاربران و دسترسی‌ها"],
            ["/reports", "گزارش ارسال‌ها", "مشاهده جزئیات ارسال"],
          ].map(([href, title, description]) => (
            <a key={href} href={href} className="rounded-xl border border-slate-200 p-4 text-right transition hover:border-slate-300 hover:bg-slate-50">
              <div className="text-xs font-bold text-slate-800">{title}</div>
              <div className="mt-1.5 text-[10px] leading-5 text-slate-400">{description}</div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ title, value, detail, icon }: { title: string; value: number; detail: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{number(value)}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-700">{icon}</div>
      </div>
      <p className="mt-4 text-[11px] text-slate-400">{detail}</p>
    </div>
  );
}
