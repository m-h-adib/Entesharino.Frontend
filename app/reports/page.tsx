"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { auth } from "@/lib/auth";

type Platform = 1 | 2 | 3 | 4;
type DeliveryStatus = 1 | 2 | 3 | 4 | 5 | 6;

type Dashboard = {
  from?: string | null;
  to?: string | null;
  channels: { total: number; active: number; connected: number; disconnected: number };
  posts: {
    total: number; draft: number; scheduled: number; processing: number;
    completed: number; partiallyCompleted: number; failed: number; cancelled: number;
  };
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
  externalMessageId?: string | null;
  errorMessage?: string | null;
};

type DeliveryReport = { totalCount: number; page: number; pageSize: number; items: DeliveryItem[] };

type Summary = {
  total: number;
  sent: number;
  pending: number;
  processing: number;
  failed: number;
  cancelled: number;
  channels: Array<{
    channelId: number; channelName: string; platform: Platform;
    total: number; sent: number; pending: number; processing: number; failed: number; cancelled: number;
  }>;
  recentFailures: DeliveryItem[];
};

type Result<T> = { success: boolean; data: T; message?: string };

const platforms: Record<Platform, string> = { 1: "تلگرام", 2: "ایتا", 3: "بله", 4: "روبیکا" };
const statuses: Record<DeliveryStatus, string> = {
  1: "در انتظار", 2: "در حال پردازش", 3: "ارسال شده", 4: "ناموفق", 5: "لغوشده", 6: "نامشخص",
};

function dateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function number(value: number) {
  return (value ?? 0).toLocaleString("fa-IR");
}

function bytes(value: number) {
  if (!value) return "۰ بایت";
  const units = ["بایت", "کیلوبایت", "مگابایت", "گیگابایت"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) { size /= 1024; index++; }
  return `${size >= 10 || index === 0 ? Math.round(size) : size.toFixed(1)} ${units[index]}`;
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function statusClass(status: DeliveryStatus) {
  if (status === 3) return "bg-emerald-50 text-emerald-700";
  if (status === 4) return "bg-red-50 text-red-700";
  if (status === 2) return "bg-blue-50 text-blue-700";
  if (status === 5) return "bg-slate-100 text-slate-500";
  return "bg-amber-50 text-amber-700";
}

function isoOrUndefined(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

export default function ReportsPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [report, setReport] = useState<DeliveryReport | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<"" | DeliveryStatus>("");
  const [platform, setPlatform] = useState<"" | Platform>("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canView = auth.hasPermission("Reports.View");
  const totalPages = Math.max(1, Math.ceil((report?.totalCount ?? 0) / pageSize));

  const query = useMemo(() => {
    const params = new URLSearchParams();
    const fromIso = isoOrUndefined(from);
    const toIso = isoOrUndefined(to);
    if (fromIso) params.set("from", fromIso);
    if (toIso) params.set("to", toIso);
    return params;
  }, [from, to]);

  async function load() {
    if (!canView) return;
    setLoading(true);
    setError("");

    try {
      const base = query.toString();
      const deliveryParams = new URLSearchParams(query);
      deliveryParams.set("page", String(page));
      deliveryParams.set("pageSize", String(pageSize));
      if (platform) deliveryParams.set("platform", String(platform));
      if (status) deliveryParams.set("status", String(status));

      const [dashboardResponse, summaryResponse, reportResponse] = await Promise.all([
        api.get<Result<Dashboard>>("/api/reports/dashboard" + (base ? "?" + base : "")),
        api.get<Result<Summary>>("/api/reports/deliveries/summary" + (base ? "?" + base : "")),
        api.get<Result<DeliveryReport>>("/api/reports/deliveries?" + deliveryParams.toString()),
      ]);

      setDashboard(dashboardResponse.data);
      setSummary(summaryResponse.data);
      setReport(reportResponse.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت گزارش‌ها");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [canView, page, platform, status, query.toString()]);

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    void load();
  }

  function resetFilters() {
    setFrom("");
    setTo("");
    setPlatform("");
    setStatus("");
    setPage(1);
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="text-xl font-black text-red-800">دسترسی غیرمجاز</h1>
        <p className="mt-2 text-sm text-red-600">شما دسترسی مشاهده گزارش‌ها را ندارید.</p>
      </div>
    );
  }

  if (loading && !dashboard) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">در حال دریافت گزارش‌ها...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">گزارش‌ها</h1>
        <p className="mt-1 text-sm text-slate-500">نمای کلی عملکرد انتشار، ارسال‌ها، کانال‌ها و رسانه‌ها</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={applyFilters} className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1fr_180px_180px_auto_auto]">
          <label>
            <span className="mb-2 block text-xs font-bold text-slate-500">از تاریخ</span>
            <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold text-slate-500">تا تاریخ</span>
            <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400" />
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold text-slate-500">پلتفرم</span>
            <select value={platform} onChange={(e) => { setPlatform(e.target.value ? Number(e.target.value) as Platform : ""); setPage(1); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
              <option value="">همه</option>
              {Object.entries(platforms).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-xs font-bold text-slate-500">وضعیت ارسال</span>
            <select value={status} onChange={(e) => { setStatus(e.target.value ? Number(e.target.value) as DeliveryStatus : ""); setPage(1); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
              <option value="">همه</option>
              <option value="1">در انتظار</option>
              <option value="2">در حال پردازش</option>
              <option value="3">ارسال شده</option>
              <option value="4">ناموفق</option>
              <option value="5">لغوشده</option>
            </select>
          </label>
          <button type="submit" className="self-end rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800">اعمال</button>
          <button type="button" onClick={resetFilters} className="self-end rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200">پاک کردن</button>
        </form>
      </section>

      {dashboard && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="کل پست‌ها" value={dashboard.posts.total} hint={`${number(dashboard.posts.completed)} تکمیل‌شده`} />
            <StatCard title="کل ارسال‌ها" value={dashboard.deliveries.total} hint={`${number(dashboard.deliveries.sent)} ارسال موفق`} />
            <StatCard title="کانال‌های فعال" value={dashboard.channels.active} hint={`${number(dashboard.channels.connected)} کانال متصل`} />
            <StatCard title="رسانه‌ها" value={dashboard.media.total} hint={bytes(dashboard.media.totalSize)} />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <Distribution title="وضعیت پست‌ها" total={dashboard.posts.total} items={[
              ["تکمیل‌شده", dashboard.posts.completed, "bg-emerald-500"],
              ["زمان‌بندی‌شده", dashboard.posts.scheduled, "bg-blue-500"],
              ["در حال پردازش", dashboard.posts.processing, "bg-indigo-500"],
              ["پیش‌نویس", dashboard.posts.draft, "bg-slate-400"],
              ["نیمه‌تکمیل", dashboard.posts.partiallyCompleted, "bg-amber-500"],
              ["ناموفق", dashboard.posts.failed, "bg-red-500"],
              ["لغوشده", dashboard.posts.cancelled, "bg-slate-600"],
            ]} />
            <Distribution title="وضعیت ارسال‌ها" total={dashboard.deliveries.total} items={[
              ["ارسال‌شده", dashboard.deliveries.sent, "bg-emerald-500"],
              ["در انتظار", dashboard.deliveries.pending, "bg-amber-500"],
              ["در حال پردازش", dashboard.deliveries.processing, "bg-blue-500"],
              ["ناموفق", dashboard.deliveries.failed, "bg-red-500"],
              ["لغوشده", dashboard.deliveries.cancelled, "bg-slate-500"],
            ]} />
          </section>
        </>
      )}

      {summary && (
        <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-black text-slate-800">خلاصه کانال‌ها</h2>
              <p className="mt-1 text-xs text-slate-400">توزیع وضعیت ارسال به تفکیک کانال</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-right text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">کانال</th><th className="px-5 py-3">پلتفرم</th><th className="px-5 py-3">کل</th><th className="px-5 py-3">موفق</th><th className="px-5 py-3">ناموفق</th><th className="px-5 py-3">در انتظار</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.channels.map((channel) => (
                    <tr key={channel.channelId}>
                      <td className="px-5 py-3 font-bold text-slate-800">{channel.channelName}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{platforms[channel.platform]}</td>
                      <td className="px-5 py-3">{number(channel.total)}</td>
                      <td className="px-5 py-3 text-emerald-700">{number(channel.sent)}</td>
                      <td className="px-5 py-3 text-red-600">{number(channel.failed)}</td>
                      <td className="px-5 py-3 text-amber-700">{number(channel.pending)}</td>
                    </tr>
                  ))}
                  {summary.channels.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">داده‌ای وجود ندارد.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-black text-slate-800">آخرین خطاها</h2>
              <p className="mt-1 text-xs text-slate-400">آخرین تلاش‌های ناموفق انتشار</p>
            </div>
            <div className="divide-y divide-slate-100">
              {summary.recentFailures.map((item, index) => (
                <div key={`${item.postId}-${item.channelId}-${index}`} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-bold text-slate-800">{item.postTitle || "بدون عنوان"}</div>
                      <div className="mt-1 text-xs text-slate-400">{item.channelName} · {platforms[item.platform]}</div>
                    </div>
                    <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">ناموفق</span>
                  </div>
                  {item.errorMessage && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">{item.errorMessage}</div>}
                  <div className="mt-2 text-[11px] text-slate-400">تلاش مجدد: {number(item.retryCount)} · {dateTime(item.scheduledAt ?? item.sentAt)}</div>
                </div>
              ))}
              {summary.recentFailures.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-400">خطای اخیری ثبت نشده است.</div>}
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-black text-slate-800">گزارش جزئیات ارسال</h2>
            <p className="mt-1 text-xs text-slate-400">{number(report?.totalCount ?? 0)} رکورد</p>
          </div>
          <div className="text-xs text-slate-400">{loading ? "در حال به‌روزرسانی..." : ""}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-right text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr><th className="px-5 py-4">پست</th><th className="px-5 py-4">کانال</th><th className="px-5 py-4">پلتفرم</th><th className="px-5 py-4">وضعیت</th><th className="px-5 py-4">تلاش مجدد</th><th className="px-5 py-4">زمان ارسال</th><th className="px-5 py-4">خطا</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(report?.items ?? []).map((item, index) => (
                <tr key={`${item.postId}-${item.channelId}-${index}`} className="hover:bg-slate-50/70">
                  <td className="max-w-[260px] px-5 py-4"><div className="truncate font-bold text-slate-800">{item.postTitle || "بدون عنوان"}</div><div className="mt-1 text-[11px] text-slate-400">#{number(item.postId)}</div></td>
                  <td className="px-5 py-4 font-medium text-slate-600">{item.channelName}</td>
                  <td className="px-5 py-4 text-xs text-slate-500">{platforms[item.platform]}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(item.status)}`}>{statuses[item.status] ?? "نامشخص"}</span></td>
                  <td className="px-5 py-4 text-slate-500">{number(item.retryCount)}</td>
                  <td className="px-5 py-4 text-xs text-slate-400">{dateTime(item.sentAt ?? item.scheduledAt)}</td>
                  <td className="max-w-[260px] px-5 py-4 text-xs text-red-600">{item.errorMessage ? <span className="line-clamp-2">{item.errorMessage}</span> : "—"}</td>
                </tr>
              ))}
              {!report?.items?.length && <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-400">رکوردی برای نمایش وجود ندارد.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-400">صفحه {number(page)} از {number(totalPages)}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1 || loading} onClick={() => setPage((v) => Math.max(1, v - 1))} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-40">قبلی</button>
            <button disabled={page >= totalPages || loading} onClick={() => setPage((v) => Math.min(totalPages, v + 1))} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-40">بعدی</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, hint }: { title: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-bold text-slate-500">{title}</div>
      <div className="mt-3 text-3xl font-black text-slate-900">{number(value)}</div>
      <div className="mt-2 text-xs text-slate-400">{hint}</div>
    </div>
  );
}

function Distribution({ title, total, items }: { title: string; total: number; items: [string, number, string][] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-black text-slate-800">{title}</h2>
        <span className="text-xs text-slate-400">کل: {number(total)}</span>
      </div>
      <div className="space-y-4">
        {items.map(([label, value, barClass]) => {
          const p = percent(value, total);
          return (
            <div key={label}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">{label}</span>
                <span className="text-slate-400">{number(value)} · {number(p)}٪</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${barClass}`} style={{ width: `${p}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
