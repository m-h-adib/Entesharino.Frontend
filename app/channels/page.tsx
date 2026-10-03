"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { auth } from "@/lib/auth";

type Platform = 1 | 2 | 3 | 4;

type Channel = {
  id: number;
  platform: Platform;
  name: string;
  identifier: string;
  description?: string | null;
  isActive: boolean;
  isConnected: boolean;
  lastConnectionCheckAt?: string | null;
  createdAt: string;
};

type ListResponse<T> = {
  success: boolean;
  data: T[];
  totalCount: number;
  message?: string;
};

type ItemResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type ModalType = "create" | "edit" | "connection" | "access" | null;

const platforms: { value: Platform; label: string; short: string }[] = [
  { value: 1, label: "تلگرام", short: "TG" },
  { value: 2, label: "ایتا", short: "ایتا" },
  { value: 3, label: "بله", short: "بله" },
  { value: 4, label: "روبیکا", short: "روبیکا" },
];

const emptyForm = {
  platform: 1 as Platform,
  name: "",
  identifier: "",
  description: "",
  accessToken: "",
  refreshToken: "",
  tokenExpiresAt: "",
};

function platformInfo(platform: Platform) {
  return platforms.find((x) => x.value === platform) ?? platforms[0];
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<Channel | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [modal, setModal] = useState<ModalType>(null);

  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<"" | Platform>("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [accessUsers, setAccessUsers] = useState<{ userId: number; fullName: string; username: string; isOwner: boolean; hasAccess: boolean }[]>([]);
  const [accessChannel, setAccessChannel] = useState<Channel | null>(null);
  const [accessSaving, setAccessSaving] = useState(false);

  const canView = auth.hasPermission("Channels.View");
  const canManage = auth.hasPermission("Channels.Manage");

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  async function load() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (search.trim()) params.set("search", search.trim());
      if (platform) params.set("platform", String(platform));

      const response = await api.get<ListResponse<Channel>>(
        "/api/channels?" + params.toString(),
      );

      setChannels(response.data || []);
      setTotalCount(response.totalCount || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت کانال‌ها");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canView) void load();
    else setLoading(false);
  }, [canView, page, platform]);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    void load();
  }

  function closeModal() {
    setModal(null);
    setSelected(null);
    setForm(emptyForm);
    setAccessChannel(null);
    setAccessUsers([]);
  }

  function openCreate() {
    setSelected(null);
    setForm(emptyForm);
    setModal("create");
  }

  function openEdit(channel: Channel) {
    setSelected(channel);
    setForm({
      platform: channel.platform,
      name: channel.name,
      identifier: channel.identifier,
      description: channel.description ?? "",
      accessToken: "",
      refreshToken: "",
      tokenExpiresAt: "",
    });
    setModal("edit");
  }

  function openConnection(channel: Channel) {
    setSelected(channel);
    setForm({
      ...emptyForm,
      platform: channel.platform,
      accessToken: "",
      refreshToken: "",
      tokenExpiresAt: "",
    });
    setModal("connection");
  }

  async function openAccess(channel: Channel) {
    setSelected(channel);
    setAccessChannel(channel);
    setAccessUsers([]);
    setError("");
    setNotice("");
    setModal("access");

    try {
      const response = await api.get<ListResponse<{ userId: number; fullName: string; username: string; isOwner: boolean; hasAccess: boolean }>>(
        "/api/channels/" + channel.id + "/users",
      );
      setAccessUsers(response.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "دریافت کاربران کانال انجام نشد.");
    }
  }

  async function saveAccess() {
    if (!accessChannel) return;
    setAccessSaving(true);
    setError("");
    setNotice("");

    try {
      await api.put("/api/channels/" + accessChannel.id + "/users", {
        userIds: accessUsers.filter((x) => x.hasAccess && !x.isOwner).map((x) => x.userId),
      });
      setNotice("دسترسی ارسال پست کانال به‌روزرسانی شد.");
      closeModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره دسترسی‌ها انجام نشد.");
    } finally {
      setAccessSaving(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (modal === "create") {
        await api.post("/api/channels", {
          platform: form.platform,
          name: form.name,
          identifier: form.identifier,
          description: form.description || null,
          accessToken: form.accessToken,
          refreshToken: form.refreshToken || null,
          tokenExpiresAt: form.tokenExpiresAt
            ? new Date(form.tokenExpiresAt).toISOString()
            : null,
        });
        setNotice("کانال با موفقیت ایجاد شد.");
      } else if (modal === "edit" && selected) {
        await api.put("/api/channels/" + selected.id, {
          name: form.name,
          identifier: form.identifier,
          description: form.description || null,
        });
        setNotice("اطلاعات کانال به‌روزرسانی شد.");
      } else if (modal === "connection" && selected) {
        await api.put("/api/channels/" + selected.id + "/connection", {
          accessToken: form.accessToken,
          refreshToken: form.refreshToken || null,
          tokenExpiresAt: form.tokenExpiresAt
            ? new Date(form.tokenExpiresAt).toISOString()
            : null,
        });
        setNotice("اطلاعات اتصال با موفقیت به‌روزرسانی شد.");
      }

      closeModal();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "عملیات انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(channel: Channel) {
    setError("");
    setNotice("");

    try {
      await api.patch(
        "/api/channels/" +
          channel.id +
          "/active?isActive=" +
          String(!channel.isActive),
      );
      setNotice(channel.isActive ? "کانال غیرفعال شد." : "کانال فعال شد.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تغییر وضعیت کانال انجام نشد.");
    }
  }

  async function testConnection(channel: Channel) {
    setTestingId(channel.id);
    setError("");
    setNotice("");

    try {
      await api.post("/api/channels/" + channel.id + "/test-connection");
      setNotice("اتصال کانال با موفقیت تأیید شد.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "اتصال کانال ناموفق بود.");
      await load();
    } finally {
      setTestingId(null);
    }
  }

  async function remove(channel: Channel) {
    if (!window.confirm("کانال «" + channel.name + "» حذف شود؟")) return;

    setError("");
    setNotice("");

    try {
      await api.delete("/api/channels/" + channel.id);
      setNotice("کانال حذف شد.");
      if (channels.length === 1 && page > 1) setPage((value) => value - 1);
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حذف کانال انجام نشد.");
    }
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="text-xl font-black text-red-800">دسترسی غیرمجاز</h1>
        <p className="mt-2 text-sm text-red-600">
          شما دسترسی مشاهده کانال‌ها را ندارید.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">کانال‌ها</h1>
          <p className="mt-1 text-sm text-slate-500">
            مدیریت کانال‌ها و اطلاعات اتصال پلتفرم‌های انتشار
          </p>
        </div>

        {canManage && (
          <button
            onClick={openCreate}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            + افزودن کانال
          </button>
        )}
      </div>

      {(error || notice) && (
        <div
          className={
            error
              ? "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          }
        >
          {error || notice}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={submitSearch} className="grid gap-3 md:grid-cols-[1fr_190px_auto]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس نام یا شناسه کانال..."
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
          />

          <select
            value={platform}
            onChange={(e) => {
              const value = e.target.value;
              setPlatform(value ? (Number(value) as Platform) : "");
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
          >
            <option value="">همه پلتفرم‌ها</option>
            {platforms.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
          >
            جستجو
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-sm font-bold text-slate-800">لیست کانال‌ها</div>
            <div className="mt-1 text-xs text-slate-400">
              {totalCount.toLocaleString("fa-IR")} کانال
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-right">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr>
                <th className="px-5 py-4">کانال</th>
                <th className="px-5 py-4">پلتفرم</th>
                <th className="px-5 py-4">شناسه</th>
                <th className="px-5 py-4">اتصال</th>
                <th className="px-5 py-4">وضعیت</th>
                <th className="px-5 py-4">آخرین بررسی</th>
                <th className="px-5 py-4">عملیات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-400">
                    در حال دریافت کانال‌ها...
                  </td>
                </tr>
              ) : channels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm text-slate-400">
                    کانالی پیدا نشد.
                  </td>
                </tr>
              ) : (
                channels.map((channel) => {
                  const info = platformInfo(channel.platform);

                  return (
                    <tr key={channel.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-600">
                            {info.short}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{channel.name}</div>
                            {channel.description && (
                              <div className="mt-1 max-w-[240px] truncate text-xs text-slate-400">
                                {channel.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          {info.label}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {channel.identifier}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            channel.isConnected
                              ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                              : "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600"
                          }
                        >
                          {channel.isConnected ? "متصل" : "قطع"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {canManage ? (
                          <button
                            onClick={() => toggleActive(channel)}
                            className={
                              channel.isActive
                                ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                                : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500"
                            }
                          >
                            {channel.isActive ? "فعال" : "غیرفعال"}
                          </button>
                        ) : (
                          <span
                            className={
                              channel.isActive
                                ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                                : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500"
                            }
                          >
                            {channel.isActive ? "فعال" : "غیرفعال"}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-400">
                        {formatDate(channel.lastConnectionCheckAt)}
                      </td>

                      <td className="px-5 py-4">
                        {canManage && (
                          <div className="flex flex-wrap justify-end gap-1">
                            <button
                              onClick={() => void openAccess(channel)}
                              className="rounded-lg px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                            >
                              دسترسی ارسال
                            </button>
                            <button
                              onClick={() => testConnection(channel)}
                              disabled={testingId === channel.id}
                              className="rounded-lg px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              {testingId === channel.id ? "در حال بررسی..." : "تست اتصال"}
                            </button>
                            <button
                              onClick={() => openConnection(channel)}
                              className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                            >
                              اتصال
                            </button>
                            <button
                              onClick={() => openEdit(channel)}
                              className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                            >
                              ویرایش
                            </button>
                            <button
                              onClick={() => remove(channel)}
                              className="rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                            >
                              حذف
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-400">
            صفحه {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}
          </span>

          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"
            >
              قبلی
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"
            >
              بعدی
            </button>
          </div>
        </div>
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            {modal === "access" && accessChannel && (
              <div>
                <ModalHeader title={"دسترسی ارسال پست «" + accessChannel.name + "»"} close={closeModal} />
                <div className="max-h-[70vh] overflow-y-auto p-6">
                  <p className="mb-4 text-sm leading-7 text-slate-500">
                    فقط کاربرانی که انتخاب می‌شوند می‌توانند این کانال را برای ارسال پست انتخاب کنند. مالک کانال همیشه دسترسی دارد.
                  </p>
                  <div className="space-y-2">
                    {accessUsers.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-400">در حال دریافت کاربران...</div>
                    ) : accessUsers.map((user) => (
                      <label key={user.userId} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50">
                        <input type="checkbox" checked={user.hasAccess} disabled={user.isOwner}
                          onChange={() => setAccessUsers((items) => items.map((x) => x.userId === user.userId ? { ...x, hasAccess: !x.hasAccess } : x))}
                          className="h-4 w-4 accent-slate-900" />
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-slate-700">{user.fullName || user.username}{user.isOwner ? " (مالک)" : ""}</span>
                          <span className="text-xs text-slate-400">@{user.username}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
                  <button type="button" onClick={closeModal} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100">انصراف</button>
                  <button type="button" onClick={() => void saveAccess()} disabled={accessSaving || accessUsers.length === 0} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{accessSaving ? "در حال ذخیره..." : "ذخیره دسترسی‌ها"}</button>
                </div>
              </div>
            )}
            {modal !== "access" && (
              <form onSubmit={submit}>
              <ModalHeader
                title={
                  modal === "create"
                    ? "افزودن کانال"
                    : modal === "edit"
                      ? "ویرایش کانال"
                      : "اطلاعات اتصال «" + (selected?.name ?? "") + "»"
                }
                close={closeModal}
              />

              <div className="max-h-[70vh] overflow-y-auto p-6">
                {modal === "create" && (
                  <div className="mb-5">
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      پلتفرم
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {platforms.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setForm({ ...form, platform: item.value })}
                          className={
                            form.platform === item.value
                              ? "rounded-xl border-2 border-slate-900 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-900"
                              : "rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50"
                          }
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(modal === "create" || modal === "edit") && (
                  <div className="space-y-5">
                    <Field
                      label="نام کانال"
                      value={form.name}
                      onChange={(value) => setForm({ ...form, name: value })}
                      required
                    />
                    <Field
                      label="شناسه کانال"
                      value={form.identifier}
                      onChange={(value) => setForm({ ...form, identifier: value })}
                      required
                    />
                    <TextAreaField
                      label="توضیحات"
                      value={form.description}
                      onChange={(value) => setForm({ ...form, description: value })}
                    />

                    {modal === "create" && (
                      <>
                        <Field
                          label="Access Token"
                          type="password"
                          value={form.accessToken}
                          onChange={(value) => setForm({ ...form, accessToken: value })}
                          required
                        />
                        <Field
                          label="Refresh Token"
                          type="password"
                          value={form.refreshToken}
                          onChange={(value) => setForm({ ...form, refreshToken: value })}
                        />
                        <Field
                          label="تاریخ انقضای Token"
                          type="datetime-local"
                          value={form.tokenExpiresAt}
                          onChange={(value) => setForm({ ...form, tokenExpiresAt: value })}
                        />
                        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-700">
                          توکن به صورت رمزنگاری‌شده در Backend ذخیره می‌شود و در رابط کاربری نمایش داده نمی‌شود.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {modal === "connection" && (
                  <div className="space-y-5">
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      پلتفرم:{" "}
                      <strong>{platformInfo(selected?.platform ?? 1).label}</strong>
                    </div>

                    <Field
                      label="Access Token"
                      type="password"
                      value={form.accessToken}
                      onChange={(value) => setForm({ ...form, accessToken: value })}
                      required
                    />
                    <Field
                      label="Refresh Token"
                      type="password"
                      value={form.refreshToken}
                      onChange={(value) => setForm({ ...form, refreshToken: value })}
                    />
                    <Field
                      label="تاریخ انقضای Token"
                      type="datetime-local"
                      value={form.tokenExpiresAt}
                      onChange={(value) => setForm({ ...form, tokenExpiresAt: value })}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving ? "در حال ذخیره..." : modal === "create" ? "ایجاد کانال" : "ذخیره تغییرات"}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
      />
    </label>
  );
}

function ModalHeader({ title, close }: { title: string; close: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
      <h2 className="text-lg font-black text-slate-900">{title}</h2>
      <button
        type="button"
        onClick={close}
        className="h-9 w-9 rounded-lg text-xl text-slate-400 hover:bg-slate-100"
      >
        ×
      </button>
    </div>
  );
}
