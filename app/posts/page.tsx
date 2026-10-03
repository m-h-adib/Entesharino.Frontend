"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { auth } from "@/lib/auth";

type PostStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type Platform = 1 | 2 | 3 | 4;

type Channel = {
  id: number;
  platform: Platform;
  name: string;
  identifier: string;
  isActive: boolean;
  isConnected: boolean;
};

type Post = {
  id: number;
  title: string;
  status: PostStatus;
  createdAt: string;
  channelCount: number;
  sentChannelCount: number;
  scheduledAt?: string | null;
};

type PostDetails = Post & {
  content?: string | null;
  channels: {
    channelId: number;
    channelName: string;
    platform: Platform;
    status: number;
    scheduledAt?: string | null;
    sentAt?: string | null;
    errorMessage?: string | null;
    retryCount: number;
  }[];
  media: {
    id: number;
    mediaType: number;
    fileName: string;
    fileUrl: string;
    fileSize: number;
  }[];
  schedule?: {
    scheduleType: number;
    scheduledAt?: string | null;
    cronExpression?: string | null;
    timeZone?: string | null;
    nextRunAt?: string | null;
    isCompleted: boolean;
  } | null;
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

const statusInfo: Record<PostStatus, { label: string; className: string }> = {
  1: { label: "پیش‌نویس", className: "bg-slate-100 text-slate-600" },
  2: { label: "زمان‌بندی‌شده", className: "bg-violet-50 text-violet-700" },
  3: { label: "در حال ارسال", className: "bg-amber-50 text-amber-700" },
  4: { label: "تکمیل‌شده", className: "bg-emerald-50 text-emerald-700" },
  5: { label: "ارسال ناقص", className: "bg-orange-50 text-orange-700" },
  6: { label: "ناموفق", className: "bg-red-50 text-red-700" },
  7: { label: "لغوشده", className: "bg-slate-100 text-slate-500" },
};

const platformLabels: Record<Platform, string> = {
  1: "تلگرام",
  2: "ایتا",
  3: "بله",
  4: "روبیکا",
};

const scheduleTypes = [
  { value: 2, label: "یک‌بار" },
  { value: 3, label: "روزانه" },
  { value: 4, label: "هفتگی" },
  { value: 5, label: "ماهانه" },
  { value: 6, label: "Cron" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) +
    "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<PostDetails | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | PostStatus>("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalCount, setTotalCount] = useState(0);

  const [modal, setModal] = useState<"create" | "edit" | "schedule" | "details" | "republish" | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    channelIds: [] as number[],
    scheduleType: 2,
    scheduledAt: "",
    cronExpression: "",
    timeZone: "UTC",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const canView = auth.hasPermission("Posts.View");
  const canCreate = auth.hasPermission("Posts.Create");
  const canManage = auth.hasPermission("Posts.Manage");

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
      if (status) params.set("status", String(status));

      const response = await api.get<ListResponse<Post>>("/api/posts?" + params.toString());
      setPosts(response.data || []);
      setTotalCount(response.totalCount || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت پست‌ها");
    } finally {
      setLoading(false);
    }
  }

  async function loadChannels() {
    try {
      const response = await api.get<ListResponse<Channel>>("/api/channels?page=1&pageSize=100");
      setChannels((response.data || []).filter((x) => x.isActive && x.isConnected));
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت کانال‌ها");
    }
  }

  useEffect(() => {
    if (canView) void load();
    else setLoading(false);
  }, [canView, page, status]);

  useEffect(() => {
    if (canCreate || canManage) void loadChannels();
  }, [canCreate, canManage]);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    if (page === 1) {
      void load();
    } else {
      setPage(1);
    }
  }

  function closeModal() {
    setModal(null);
    setSelected(null);
    setSelectedFile(null);
    setForm({
      title: "",
      content: "",
      channelIds: [],
      scheduleType: 2,
      scheduledAt: "",
      cronExpression: "",
      timeZone: "UTC",
    });
  }

  function openCreate() {
    setSelected(null);
    setSelectedFile(null);
    setForm({
      title: "",
      content: "",
      channelIds: [],
      scheduleType: 2,
      scheduledAt: "",
      cronExpression: "",
      timeZone: "UTC",
    });
    setModal("create");
  }

  async function openEdit(post: Post) {
    setError("");
    try {
      const response = await api.get<ItemResponse<PostDetails>>("/api/posts/" + post.id);
      const details = response.data;
      setSelected(details);
      setForm({
        title: details.title,
        content: details.content || "",
        channelIds: details.channels.map((x) => x.channelId),
        scheduleType: 2,
        scheduledAt: "",
        cronExpression: "",
        timeZone: "UTC",
      });
      setModal("edit");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت پست");
    }
  }

  async function openDetails(post: Post) {
    setError("");
    try {
      const response = await api.get<ItemResponse<PostDetails>>("/api/posts/" + post.id);
      setSelected(response.data);
      setModal("details");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت جزئیات پست");
    }
  }

  function openSchedule(post: Post) {
    setSelected(post as PostDetails);
    setForm({
      ...form,
      scheduleType: 2,
      scheduledAt: "",
      cronExpression: "",
      timeZone: "UTC",
    });
    setModal("schedule");
  }

  async function uploadMediaFile(postId: number, file: File) {
    const token = auth.getToken();
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5000";
    const data = new FormData();
    data.append("file", file);

    const response = await fetch(baseUrl + "/api/posts/" + postId + "/media", {
      method: "POST",
      headers: token ? { Authorization: "Bearer " + token } : undefined,
      body: data,
    });

    const text = await response.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch {}

    if (!response.ok) {
      const message =
        typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
          ? body.message
          : "آپلود فایل انجام نشد.";
      throw new Error(message);
    }
  }

  async function submitPost(e: FormEvent) {
    e.preventDefault();
    if (!form.channelIds.length) {
      setError("حداقل یک کانال متصل و فعال را انتخاب کنید.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const body = {
        title: form.title,
        content: form.content || null,
        channelIds: form.channelIds,
      };

      if (modal === "create") {
        const response = await api.post<ItemResponse<Post>>("/api/posts", body);
        const createdPost = response.data;
        if (selectedFile && createdPost?.id) {
          await uploadMediaFile(createdPost.id, selectedFile);
        }
        setNotice(selectedFile ? "پست و فایل با موفقیت ایجاد شدند." : "پست با موفقیت ایجاد شد.");
      } else if (modal === "edit" && selected) {
        await api.put("/api/posts/" + selected.id, body);
        if (selectedFile) {
          await uploadMediaFile(selected.id, selectedFile);
        }
        setNotice(selectedFile ? "پست و فایل با موفقیت به‌روزرسانی شدند." : "پست با موفقیت به‌روزرسانی شد.");
      }

      closeModal();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره پست انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function schedulePost(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;

    if (form.scheduleType !== 6 && !form.scheduledAt) {
      setError("زمان اجرای پست را انتخاب کنید.");
      return;
    }

    if (form.scheduleType === 6 && !form.cronExpression.trim()) {
      setError("برای Cron وارد کردن عبارت Cron الزامی است.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await api.post("/api/posts/" + selected.id + "/schedule", {
        scheduleType: form.scheduleType,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        cronExpression: form.cronExpression || null,
        timeZone: form.timeZone || "UTC",
      });
      setNotice("پست با موفقیت زمان‌بندی شد.");
      closeModal();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "زمان‌بندی انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function openRepublish(post: Post) {
    setError("");
    setNotice("");

    try {
      const response = await api.get<ItemResponse<PostDetails>>("/api/posts/" + post.id);
      const details = response.data;
      setSelected(details);
      setForm({
        title: details.title,
        content: details.content || "",
        channelIds: details.channels.map((x) => x.channelId),
        scheduleType: 2,
        scheduledAt: "",
        cronExpression: "",
        timeZone: "UTC",
      });
      setModal("republish");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت پست برای بازنشر");
    }
  }

  async function createRepublishedPost() {
    if (!selected) return;
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await api.post<ItemResponse<PostDetails>>(
        "/api/posts/" + selected.id + "/republish"
      );
      const copy = response.data;
      setSelected(copy);
      setForm({
        title: copy.title,
        content: copy.content || "",
        channelIds: copy.channels.map((x) => x.channelId),
        scheduleType: 2,
        scheduledAt: "",
        cronExpression: "",
        timeZone: "UTC",
      });
      setModal("edit");
      setNotice("نسخه جدید با موفقیت ایجاد شد. اکنون می‌توانید آن را ویرایش، منتشر یا زمان‌بندی کنید.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "بازنشر پست انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function publish(post: Post) {
    if (!window.confirm("پست «" + post.title + "» به کانال‌های انتخاب‌شده ارسال شود؟")) return;
    setPublishingId(post.id);
    setError("");
    setNotice("");

    try {
      await api.post("/api/posts/" + post.id + "/publish");
      setNotice("درخواست انتشار پست ارسال شد.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "انتشار پست انجام نشد.");
      await load();
    } finally {
      setPublishingId(null);
    }
  }

  async function remove(post: Post) {
    if (!window.confirm("پست «" + post.title + "» حذف شود؟")) return;
    setDeletingId(post.id);
    setError("");
    setNotice("");

    try {
      await api.delete("/api/posts/" + post.id);
      setNotice("پست حذف شد.");
      if (posts.length === 1 && page > 1) setPage((x) => x - 1);
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حذف پست انجام نشد.");
    } finally {
      setDeletingId(null);
    }
  }

  async function uploadMedia() {
    if (!selected || !fileInput.current?.files?.length) return;

    const file = fileInput.current.files[0];
    setUploading(true);
    setError("");
    setNotice("");

    try {
      const token = auth.getToken();
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5000";
      const data = new FormData();
      data.append("file", file);

      const response = await fetch(baseUrl + "/api/posts/" + selected.id + "/media", {
        method: "POST",
        headers: token ? { Authorization: "Bearer " + token } : undefined,
        body: data,
      });

      const text = await response.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {}

      if (!response.ok) {
        const message =
          typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
            ? body.message
            : "آپلود فایل انجام نشد.";
        throw new Error(message);
      }

      setNotice("فایل با موفقیت آپلود شد.");
      fileInput.current.value = "";
      await refreshDetails(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "آپلود فایل انجام نشد.");
    } finally {
      setUploading(false);
    }
  }

  async function refreshDetails(id: number) {
    const response = await api.get<ItemResponse<PostDetails>>("/api/posts/" + id);
    setSelected(response.data);
  }

  async function deleteMedia(mediaId: number) {
    if (!selected) return;
    if (!window.confirm("این فایل از پست حذف شود؟")) return;

    try {
      await api.delete("/api/posts/" + selected.id + "/media/" + mediaId);
      setNotice("فایل حذف شد.");
      await refreshDetails(selected.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حذف فایل انجام نشد.");
    }
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="text-xl font-black text-red-800">دسترسی غیرمجاز</h1>
        <p className="mt-2 text-sm text-red-600">شما دسترسی مشاهده پست‌ها را ندارید.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">پست‌ها</h1>
          <p className="mt-1 text-sm text-slate-500">مدیریت محتوا، رسانه، انتشار و زمان‌بندی پست‌ها</p>
        </div>
        {canCreate && (
          <button onClick={openCreate} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
            + پست جدید
          </button>
        )}
      </div>

      {(error || notice) && (
        <div className={error ? "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"}>
          {error || notice}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={submitSearch} className="grid gap-3 md:grid-cols-[1fr_190px_auto]">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو بر اساس عنوان پست..." className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
          <select value={status} onChange={(e) => { const value = e.target.value; setStatus(value ? Number(value) as PostStatus : ""); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(statusInfo).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
          </select>
          <button type="submit" className="rounded-xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200">جستجو</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="text-sm font-bold text-slate-800">لیست پست‌ها</div>
          <div className="mt-1 text-xs text-slate-400">{totalCount.toLocaleString("fa-IR")} پست</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-right">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr>
                <th className="px-5 py-4">پست</th>
                <th className="px-5 py-4">وضعیت</th>
                <th className="px-5 py-4">کانال‌ها</th>
                <th className="px-5 py-4">ایجاد</th>
                <th className="px-5 py-4">زمان‌بندی</th>
                <th className="px-5 py-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-400">در حال دریافت پست‌ها...</td></tr>
              ) : posts.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-400">پستی پیدا نشد.</td></tr>
              ) : posts.map((post) => {
                const info = statusInfo[post.status];
                return (
                  <tr key={post.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <button onClick={() => openDetails(post)} className="text-right">
                        <div className="font-bold text-slate-900 hover:text-slate-600">{post.title}</div>
                        <div className="mt-1 text-xs text-slate-400">#{post.id}</div>
                      </button>
                    </td>
                    <td className="px-5 py-4"><span className={"rounded-full px-3 py-1 text-xs font-bold " + info.className}>{info.label}</span></td>
                    <td className="px-5 py-4 text-sm text-slate-500">{post.sentChannelCount.toLocaleString("fa-IR")} از {post.channelCount.toLocaleString("fa-IR")}</td>
                    <td className="px-5 py-4 text-xs text-slate-400">{formatDate(post.createdAt)}</td>
                    <td className="px-5 py-4 text-xs text-slate-400">{formatDate(post.scheduledAt)}</td>
                    <td className="px-5 py-4">
                      {canManage && (
                        <div className="flex flex-wrap justify-end gap-1">
                          {canCreate && (
                            <button onClick={() => void openRepublish(post)} className="rounded-lg px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">بازنشر</button>
                          )}
                          {canManage && (
                            <>
                              <button onClick={() => publish(post)} disabled={publishingId === post.id || post.status === 3 || post.status === 4} className="rounded-lg px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40">{publishingId === post.id ? "در حال ارسال..." : "انتشار"}</button>
                              <button onClick={() => openSchedule(post)} disabled={post.status === 3 || post.status === 4} className="rounded-lg px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-40">زمان‌بندی</button>
                              <button onClick={() => openEdit(post)} disabled={post.status === 3 || post.status === 4} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40">ویرایش</button>
                              <button onClick={() => remove(post)} disabled={deletingId === post.id || post.status === 3} className="rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-40">{deletingId === post.id ? "..." : "حذف"}</button>
                            </>
                          )}

                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          <span className="text-xs text-slate-400">صفحه {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1 || loading} onClick={() => setPage((x) => Math.max(1, x - 1))} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-40">قبلی</button>
            <button disabled={page >= totalPages || loading} onClick={() => setPage((x) => Math.min(totalPages, x + 1))} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-40">بعدی</button>
          </div>
        </div>
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            {modal === "republish" && selected && (
              <div>
                <ModalHeader title={"بازنشر «" + selected.title + "»"} close={closeModal} />
                <div className="max-h-[72vh] space-y-5 overflow-y-auto p-6">
                  <div className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700 whitespace-pre-wrap">
                    {selected.content || "این پست متن ندارد."}
                  </div>
                  {selected.media.length > 0 && (
                    <div>
                      <div className="mb-2 text-sm font-bold text-slate-800">رسانه‌های پست</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {selected.media.map((media) => {
                          const mediaUrl =
                            (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5000") +
                            "/api/posts/media/" + media.id;
                          const isImage = media.mediaType === 1 || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(media.fileName);
                          return (
                            <div key={media.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                              {isImage ? (
                                <img src={mediaUrl} alt={media.fileName} className="h-48 w-full object-contain bg-slate-50" />
                              ) : (
                                <div className="flex h-48 items-center justify-center bg-slate-50 text-sm text-slate-500">فایل: {media.fileName}</div>
                              )}
                              <div className="p-3">
                                <div className="truncate text-sm font-bold text-slate-700">{media.fileName}</div>
                                <div className="mt-1 text-xs text-slate-400">{formatBytes(media.fileSize)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-blue-800">
                    با زدن «ایجاد نسخه بازنشر» نسخه جدید ساخته می‌شود. با «انصراف» هیچ پست جدیدی ایجاد نخواهد شد.
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
                  <button type="button" onClick={closeModal} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100">انصراف</button>
                  <button type="button" onClick={() => void createRepublishedPost()} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                    {saving ? "در حال ایجاد..." : "ایجاد نسخه بازنشر"}
                  </button>
                </div>
              </div>
            )}

            {(modal === "create" || modal === "edit") && (
              <form onSubmit={submitPost}>
                <ModalHeader title={modal === "create" ? "افزودن پست" : "ویرایش پست"} close={closeModal} />
                <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
                  <Field label="عنوان پست" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">متن پست</span>
                    <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={7} className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-7 outline-none focus:border-slate-400" />
                  </label>

                  {modal === "edit" && selected && selected.media.length > 0 && (
                    <div>
                      <div className="mb-2 text-sm font-bold text-slate-800">رسانه‌های فعلی</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {selected.media.map((media) => {
                          const mediaUrl =
                            (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:5000") +
                            "/api/posts/media/" + media.id;
                          const isImage = media.mediaType === 1 || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(media.fileName);
                          return (
                            <div key={media.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                              {isImage ? (
                                <img src={mediaUrl} alt={media.fileName} className="h-40 w-full object-contain bg-slate-50" />
                              ) : (
                                <div className="flex h-40 items-center justify-center bg-slate-50 text-sm text-slate-500">فایل: {media.fileName}</div>
                              )}
                              <div className="p-3 text-xs text-slate-500">{media.fileName}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="mb-2 block text-sm font-bold text-slate-700">فایل پست</span>
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 hover:bg-slate-100">
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-slate-700">{selectedFile ? selectedFile.name : "انتخاب تصویر یا فایل"}</span>
                        <span className="mt-1 block text-xs text-slate-400">{selectedFile ? formatBytes(selectedFile.size) : "می‌توانید پست را همراه فایل منتشر کنید."}</span>
                      </span>
                      <span className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white">انتخاب فایل</span>
                      <input type="file" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                    </label>
                    {selectedFile && <button type="button" onClick={() => setSelectedFile(null)} className="mt-2 text-xs font-bold text-red-600 hover:underline">حذف فایل انتخاب‌شده</button>}
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-bold text-slate-700">کانال‌های انتشار</div>
                    {channels.length === 0 ? (
                      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">کانال فعالی برای انتخاب وجود ندارد.</div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {channels.map((channel) => {
                          const checked = form.channelIds.includes(channel.id);
                          return (
                            <label key={channel.id} className={checked ? "flex cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 p-3" : "flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50"}>
                              <input type="checkbox" checked={checked} onChange={() => setForm({ ...form, channelIds: checked ? form.channelIds.filter((id) => id !== channel.id) : [...form.channelIds, channel.id] })} className="h-4 w-4 accent-slate-900" />
                              <span className="min-w-0"><span className="block text-sm font-bold text-slate-700">{channel.name}</span><span className="text-xs text-slate-400">{platformLabels[channel.platform]} · {channel.identifier}</span></span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <ModalActions close={closeModal} saving={saving} text={modal === "create" ? "ایجاد پست" : "ذخیره تغییرات"} />
              </form>
            )}

            {modal === "schedule" && selected && (
              <form onSubmit={schedulePost}>
                <ModalHeader title={"زمان‌بندی «" + selected.title + "»"} close={closeModal} />
                <div className="space-y-5 p-6">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">نوع زمان‌بندی</span>
                    <select value={form.scheduleType} onChange={(e) => setForm({ ...form, scheduleType: Number(e.target.value) })} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                      {scheduleTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  {form.scheduleType !== 6 && (
                    <Field label="زمان اجرا" type="datetime-local" value={form.scheduledAt} onChange={(value) => setForm({ ...form, scheduledAt: value })} required />
                  )}
                  {form.scheduleType === 6 && (
                    <Field label="Cron Expression" value={form.cronExpression} onChange={(value) => setForm({ ...form, cronExpression: value })} placeholder="مثلاً 0 9 * * *" required />
                  )}
                  <Field label="Time Zone" value={form.timeZone} onChange={(value) => setForm({ ...form, timeZone: value })} />
                </div>
                <ModalActions close={closeModal} saving={saving} text="ذخیره زمان‌بندی" />
              </form>
            )}

            {modal === "details" && selected && (
              <div>
                <ModalHeader title={"جزئیات «" + selected.title + "»"} close={closeModal} />
                <div className="max-h-[72vh] space-y-5 overflow-y-auto p-6">
                  <div className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700 whitespace-pre-wrap">{selected.content}</div>

                  <div>
                    <div className="mb-2 text-sm font-bold text-slate-800">کانال‌ها</div>
                    <div className="space-y-2">
                      {selected.channels.map((channel) => (
                        <div key={channel.channelId} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                          <div><div className="font-bold text-slate-700">{channel.channelName}</div><div className="text-xs text-slate-400">{platformLabels[channel.platform]}</div></div>
                          <span className={"rounded-full px-3 py-1 text-xs font-bold " + (channel.status === 3 ? "bg-emerald-50 text-emerald-700" : channel.status === 2 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500")}>{channel.status === 3 ? "ارسال‌شده" : channel.status === 2 ? "در حال ارسال" : "در انتظار"}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-bold text-slate-800">رسانه‌ها</div>
                      {canManage && <label className="cursor-pointer rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"><input ref={fileInput} type="file" className="hidden" onChange={() => void uploadMedia()} disabled={uploading} />{uploading ? "در حال آپلود..." : "+ افزودن فایل"}</label>}
                    </div>
                    {selected.media.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">رسانه‌ای اضافه نشده است.</div>
                    ) : (
                      <div className="space-y-2">
                        {selected.media.map((media) => (
                          <div key={media.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                            <div className="min-w-0"><div className="truncate text-sm font-bold text-slate-700">{media.fileName}</div><div className="mt-1 text-xs text-slate-400">{formatBytes(media.fileSize)}</div></div>
                            {canManage && <button onClick={() => void deleteMedia(media.id)} className="rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">حذف</button>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selected.schedule && (
                    <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-800">
                      زمان‌بندی: {scheduleTypes.find((x) => x.value === selected.schedule?.scheduleType)?.label || "—"} · {formatDate(selected.schedule.scheduledAt)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400" />
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
      <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "در حال ذخیره..." : text}</button>
    </div>
  );
}
