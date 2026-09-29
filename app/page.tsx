import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white">
          ا
        </div>
        <h1 className="text-2xl font-bold text-slate-900">انتشارینو</h1>
        <p className="mt-2 text-sm text-slate-500">
          سامانه مدیریت و انتشار محتوا
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          ورود به سامانه
        </Link>
      </div>
    </main>
  );
}
