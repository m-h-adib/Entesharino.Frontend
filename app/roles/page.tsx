"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import { auth } from "@/lib/auth";

type Role = {
  id: number;
  name: string;
  displayName: string;
  isActive: boolean;
  permissionCount: number;
};

type Permission = {
  id: number;
  code: string;
  title: string;
};

type RoleDetails = Role & {
  permissions: Permission[];
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

const emptyForm = { name: "", displayName: "" };

function permissionGroup(code: string) {
  const prefix = code.split(".")[0];
  const labels: Record<string, string> = {
    Users: "کاربران",
    Roles: "نقش‌ها و دسترسی‌ها",
    Channels: "کانال‌ها",
    Posts: "پست‌ها",
    Reports: "گزارش‌ها",
  };
  return labels[prefix] || prefix;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selected, setSelected] = useState<RoleDetails | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [modal, setModal] = useState<"create" | "edit" | "permissions" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canView = auth.hasPermission("Roles.View");
  const canManage = auth.hasPermission("Roles.Manage");

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((groups, permission) => {
      const group = permissionGroup(permission.code);
      (groups[group] ??= []).push(permission);
      return groups;
    }, {});
  }, [permissions]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        api.get<ListResponse<Role>>("/api/roles"),
        api.get<ListResponse<Permission>>("/api/roles/permissions"),
      ]);
      setRoles(rolesResponse.data || []);
      setPermissions(permissionsResponse.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت نقش‌ها");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canView) void load();
    else setLoading(false);
  }, [canView]);

  function closeModal() {
    setModal(null);
    setSelected(null);
    setSelectedPermissionIds([]);
    setForm(emptyForm);
  }

  function openCreate() {
    setForm(emptyForm);
    setModal("create");
  }

  function openEdit(role: Role) {
    setSelected(role as RoleDetails);
    setForm({ name: role.name, displayName: role.displayName });
    setModal("edit");
  }

  async function openPermissions(role: Role) {
    setError("");
    try {
      const response = await api.get<ItemResponse<RoleDetails>>("/api/roles/" + role.id);
      setSelected(response.data);
      setSelectedPermissionIds((response.data.permissions || []).map((x) => x.id));
      setModal("permissions");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت دسترسی‌های نقش");
    }
  }

  async function submitRole(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (modal === "create") {
        await api.post("/api/roles", form);
        setNotice("نقش با موفقیت ایجاد شد.");
      } else if (modal === "edit" && selected) {
        await api.put("/api/roles/" + selected.id, {
          displayName: form.displayName,
        });
        setNotice("اطلاعات نقش به‌روزرسانی شد.");
      }
      closeModal();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "عملیات انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function savePermissions(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await api.put("/api/roles/" + selected.id + "/permissions", {
        permissionIds: selectedPermissionIds,
      });
      setNotice("دسترسی‌های نقش با موفقیت ذخیره شد.");
      closeModal();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره دسترسی‌ها انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(role: Role) {
    try {
      await api.patch("/api/roles/" + role.id + "/active", {
        isActive: !role.isActive,
      });
      setNotice(role.isActive ? "نقش غیرفعال شد." : "نقش فعال شد.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تغییر وضعیت نقش انجام نشد.");
    }
  }

  async function remove(role: Role) {
    if (!window.confirm("نقش «" + (role.displayName || role.name) + "» حذف شود؟")) return;
    try {
      await api.delete("/api/roles/" + role.id);
      setNotice("نقش حذف شد.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حذف نقش انجام نشد.");
    }
  }

  function togglePermission(id: number) {
    setSelectedPermissionIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function toggleGroup(groupPermissions: Permission[]) {
    const ids = groupPermissions.map((x) => x.id);
    const allSelected = ids.every((id) => selectedPermissionIds.includes(id));
    setSelectedPermissionIds((current) =>
      allSelected
        ? current.filter((id) => !ids.includes(id))
        : Array.from(new Set([...current, ...ids])),
    );
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="text-xl font-black text-red-800">دسترسی غیرمجاز</h1>
        <p className="mt-2 text-sm text-red-600">شما دسترسی مشاهده نقش‌ها و دسترسی‌ها را ندارید.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">نقش‌ها و دسترسی‌ها</h1>
          <p className="mt-1 text-sm text-slate-500">مدیریت نقش‌ها و تعیین مجوزهای هر نقش</p>
        </div>
        {canManage && (
          <button onClick={openCreate} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
            + نقش جدید
          </button>
        )}
      </div>

      {(error || notice) && (
        <div className={error
          ? "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"}>
          {error || notice}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="text-sm font-bold text-slate-800">لیست نقش‌ها</div>
          <div className="mt-1 text-xs text-slate-400">{roles.length.toLocaleString("fa-IR")} نقش</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr>
                <th className="px-5 py-4">نقش</th>
                <th className="px-5 py-4">نام سیستمی</th>
                <th className="px-5 py-4">دسترسی‌ها</th>
                <th className="px-5 py-4">وضعیت</th>
                <th className="px-5 py-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-400">در حال دریافت نقش‌ها...</td></tr>
              ) : roles.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-400">نقشی پیدا نشد.</td></tr>
              ) : roles.map((role) => (
                <tr key={role.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-900">{role.displayName || role.name}</div>
                    <div className="mt-1 text-xs text-slate-400">{role.name}</div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">{role.name}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {role.permissionCount.toLocaleString("fa-IR")} مجوز
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {canManage ? (
                      <button onClick={() => toggleActive(role)} className={role.isActive
                        ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                        : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500"}>
                        {role.isActive ? "فعال" : "غیرفعال"}
                      </button>
                    ) : (
                      <span className={role.isActive
                        ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                        : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500"}>
                        {role.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap justify-end gap-1">
                      {canManage && <button onClick={() => openPermissions(role)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">دسترسی‌ها</button>}
                      {canManage && <button onClick={() => openEdit(role)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">ویرایش</button>}
                      {canManage && <button onClick={() => remove(role)} className="rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">حذف</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            {(modal === "create" || modal === "edit") && (
              <form onSubmit={submitRole}>
                <ModalHeader title={modal === "create" ? "افزودن نقش" : "ویرایش نقش"} close={closeModal} />
                <div className="space-y-5 p-6">
                  <Field
                    label="نام سیستمی"
                    value={form.name}
                    onChange={(value) => setForm({ ...form, name: value })}
                    disabled={modal === "edit"}
                    required
                  />
                  <Field
                    label="عنوان نمایشی"
                    value={form.displayName}
                    onChange={(value) => setForm({ ...form, displayName: value })}
                    required
                  />
                  {modal === "create" && (
                    <p className="text-xs leading-6 text-slate-400">
                      نام سیستمی برای استفاده داخلی برنامه است؛ مثال: Editor
                    </p>
                  )}
                </div>
                <ModalActions close={closeModal} saving={saving} text={modal === "create" ? "ایجاد نقش" : "ذخیره تغییرات"} />
              </form>
            )}

            {modal === "permissions" && (
              <form onSubmit={savePermissions}>
                <ModalHeader title={"دسترسی‌های «" + (selected?.displayName || selected?.name) + "»"} close={closeModal} />
                <div className="max-h-[65vh] overflow-y-auto p-6">
                  <div className="mb-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">مجوزهای انتخاب‌شده</span>
                    <span className="font-black text-slate-900">{selectedPermissionIds.length.toLocaleString("fa-IR")}</span>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(groupedPermissions).map(([group, groupPermissions]) => {
                      const allSelected = groupPermissions.every((permission) => selectedPermissionIds.includes(permission.id));
                      return (
                        <div key={group} className="rounded-2xl border border-slate-200">
                          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <div className="font-bold text-slate-800">{group}</div>
                            <button
                              type="button"
                              onClick={() => toggleGroup(groupPermissions)}
                              className="text-xs font-bold text-slate-500 hover:text-slate-900"
                            >
                              {allSelected ? "لغو انتخاب همه" : "انتخاب همه"}
                            </button>
                          </div>
                          <div className="grid gap-2 p-3 sm:grid-cols-2">
                            {groupPermissions.map((permission) => {
                              const checked = selectedPermissionIds.includes(permission.id);
                              return (
                                <label key={permission.id} className={checked
                                  ? "flex cursor-pointer items-start gap-3 rounded-xl border border-slate-300 bg-slate-50 p-3"
                                  : "flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50"}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePermission(permission.id)}
                                    className="mt-1 h-4 w-4 accent-slate-900"
                                  />
                                  <span>
                                    <span className="block text-sm font-bold text-slate-700">{permission.title || permission.code}</span>
                                    <span className="mt-1 block text-[11px] text-slate-400">{permission.code}</span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <ModalActions close={closeModal} saving={saving} text="ذخیره دسترسی‌ها" />
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
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
      />
    </label>
  );
}

function ModalHeader({ title, close }: { title: string; close: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
      <h2 className="text-lg font-black text-slate-900">{title}</h2>
      <button type="button" onClick={close} className="h-9 w-9 rounded-lg text-xl text-slate-400 hover:bg-slate-100">×</button>
    </div>
  );
}

function ModalActions({ close, saving, text }: { close: () => void; saving: boolean; text: string }) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
      <button type="button" onClick={close} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100">انصراف</button>
      <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
        {saving ? "در حال ذخیره..." : text}
      </button>
    </div>
  );
}
