"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { auth } from "@/lib/auth";

type User = {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  username: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  roles: string[];
};

type Role = {
  id: number;
  name: string;
  displayName: string;
  isActive: boolean;
};

type UserListResponse = {
  success: boolean;
  data: User[];
  totalCount: number;
  message?: string;
};

const blank = { firstName: "", lastName: "", username: "", email: "", password: "" };

function dateText(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | "password" | "role" | null>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [form, setForm] = useState(blank);
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const canView = auth.hasPermission("Users.View");
  const canManage = auth.hasPermission("Users.Manage");
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await api.get<UserListResponse>(
        "/api/users?page=" + page + "&pageSize=" + pageSize + "&search=" + encodeURIComponent(search)
      );
      setUsers(r.data || []);
      setTotal(r.totalCount || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت کاربران");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = window.setTimeout(load, 300);
    return () => window.clearTimeout(timer);
  }, [canView, load]);

  useEffect(() => {
    if (!canManage) {
      setRoles([]);
      return;
    }

    api.get<{ data: Role[] }>("/api/roles")
      .then((r) => setRoles((r.data || []).filter((x) => x.isActive)))
      .catch(() => setRoles([]));
  }, [canManage]);

  function close() {
    setModal(null);
    setSelected(null);
    setForm(blank);
    setPassword("");
    setRoleId("");
  }

  function openCreate() {
    setForm(blank);
    setModal("create");
  }

  function openEdit(user: User) {
    setSelected(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      password: "",
    });
    setModal("edit");
  }

  function openPassword(user: User) {
    setSelected(user);
    setPassword("");
    setModal("password");
  }

  function openRole(user: User) {
    setSelected(user);
    const current = roles.find((r) => user.roles.includes(r.name) || user.roles.includes(r.displayName));
    setRoleId(current ? String(current.id) : "");
    setModal("role");
  }

  async function submitUser(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (modal === "create") {
        await api.post("/api/users", {
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username,
          email: form.email,
          password: form.password,
        });
        setNotice("کاربر با موفقیت ایجاد شد.");
      } else if (modal === "edit" && selected) {
        await api.put("/api/users/" + selected.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
        });
        setNotice("اطلاعات کاربر به‌روزرسانی شد.");
      }
      close();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "عملیات انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(user: User) {
    try {
      await api.patch("/api/users/" + user.id + "/active", { isActive: !user.isActive });
      setNotice(user.isActive ? "کاربر غیرفعال شد." : "کاربر فعال شد.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تغییر وضعیت انجام نشد.");
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch("/api/users/" + selected.id + "/password", { password });
      setNotice("رمز عبور تغییر کرد.");
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تغییر رمز عبور انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(e: FormEvent) {
    e.preventDefault();
    if (!selected || !roleId) return;
    setSaving(true);
    try {
      await api.put("/api/users/" + selected.id + "/role", { roleId: Number(roleId) });
      setNotice("نقش کاربر تغییر کرد.");
      close();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تغییر نقش انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(user: User) {
    if (!window.confirm("کاربر «" + (user.fullName || user.username) + "» حذف شود؟")) return;
    try {
      await api.delete("/api/users/" + user.id);
      setNotice("کاربر حذف شد.");
      if (users.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حذف کاربر انجام نشد.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">کاربران</h1>
          <p className="mt-1 text-sm text-slate-500">مدیریت کاربران، وضعیت دسترسی و نقش‌ها</p>
        </div>
        {canManage && <button onClick={openCreate} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
          + کاربر جدید
        </button>
      </div>

      {(error || notice) && (
        <div className={error ? "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"}>
          {error || notice}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="جستجو بر اساس نام، نام کاربری یا ایمیل..."
            className="w-full max-w-md rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr>
                <th className="px-5 py-4">کاربر</th>
                <th className="px-5 py-4">ایمیل</th>
                <th className="px-5 py-4">نقش</th>
                <th className="px-5 py-4">آخرین ورود</th>
                <th className="px-5 py-4">وضعیت</th>
                <th className="px-5 py-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-400">در حال دریافت کاربران...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-400">کاربری پیدا نشد.</td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-600">
                        {(user.firstName?.[0] || "") + (user.lastName?.[0] || user.username?.[0] || "")}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{user.fullName || "بدون نام"}</div>
                        <div className="mt-0.5 text-xs text-slate-400">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{user.email || "—"}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {user.roles.length ? user.roles.map((role) => (
                        <span key={role} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{role}</span>
                      )) : <span className="text-xs text-slate-400">بدون نقش</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">{dateText(user.lastLoginAt)}</td>
                  <td className="px-5 py-4">
                    {canManage && <button onClick={() => toggle(user)} className={user.isActive ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700" : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500"}>
                      {user.isActive ? "فعال" : "غیرفعال"}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap justify-end gap-1">
                      {canManage && <button onClick={() => openEdit(user)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">ویرایش</button>}
                      {canManage && <button onClick={() => openRole(user)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">نقش</button>}
                      {canManage && <button onClick={() => openPassword(user)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">رمز</button>}
                      {canManage && <button onClick={() => remove(user)} className="rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">حذف</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          <span className="text-xs text-slate-500">{total.toLocaleString("fa-IR")} کاربر</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40">قبلی</button>
            <span className="text-xs font-bold text-slate-500">صفحه {page.toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")}</span>
            <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40">بعدی</button>
          </div>
        </div>
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            {(modal === "create" || modal === "edit") && (
              <form onSubmit={submitUser}>
                <Header title={modal === "create" ? "افزودن کاربر" : "ویرایش کاربر"} close={close} />
                <div className="grid gap-4 p-6 sm:grid-cols-2">
                  <Field label="نام" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
                  <Field label="نام خانوادگی" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
                  <Field label="نام کاربری" value={form.username} onChange={(v) => setForm({ ...form, username: v })} required disabled={modal === "edit"} />
                  <Field label="ایمیل" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
                  {modal === "create" && <div className="sm:col-span-2"><Field label="رمز عبور" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required /></div>}
                </div>
                <Actions close={close} saving={saving} text={modal === "create" ? "ایجاد کاربر" : "ذخیره تغییرات"} />
              </form>
            )}

            {modal === "password" && (
              <form onSubmit={changePassword}>
                <Header title="تغییر رمز عبور" close={close} />
                <div className="p-6">
                  <p className="mb-4 text-sm text-slate-500">رمز جدید برای «{selected?.fullName || selected?.username}»</p>
                  <Field label="رمز عبور جدید" type="password" value={password} onChange={setPassword} required />
                </div>
                <Actions close={close} saving={saving} text="تغییر رمز عبور" />
              </form>
            )}

            {modal === "role" && (
              <form onSubmit={changeRole}>
                <Header title="تغییر نقش کاربر" close={close} />
                <div className="p-6">
                  <label className="mb-2 block text-sm font-bold text-slate-700">نقش</label>
                  <select value={roleId} onChange={(e) => setRoleId(e.target.value)} required className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400">
                    <option value="">انتخاب نقش...</option>
                    {roles.map((role) => <option key={role.id} value={role.id}>{role.displayName || role.name}</option>)}
                  </select>
                </div>
                <Actions close={close} saving={saving} text="ذخیره نقش" />
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false, disabled = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} disabled={disabled}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50" />
    </label>
  );
}

function Header({ title, close }: { title: string; close: () => void }) {
  return <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
    <h2 className="text-lg font-black text-slate-900">{title}</h2>
    <button type="button" onClick={close} className="h-9 w-9 rounded-lg text-xl text-slate-400 hover:bg-slate-100">×</button>
  </div>;
}

function Actions({ close, saving, text }: { close: () => void; saving: boolean; text: string }) {
  return <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
    <button type="button" onClick={close} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100">انصراف</button>
    <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "در حال ذخیره..." : text}</button>
  </div>;
}
