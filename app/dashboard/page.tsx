const stats = [
  { title: "کل کانال‌ها", value: "۱۲", detail: "۹ کانال فعال", icon: "◉" },
  { title: "پست‌های منتشرشده", value: "۲۴۸", detail: "در ۳۰ روز اخیر", icon: "↗" },
  { title: "در انتظار ارسال", value: "۱۷", detail: "نیازمند بررسی", icon: "◷" },
  { title: "ارسال ناموفق", value: "۶", detail: "در ۳۰ روز اخیر", icon: "!" },
];

const deliveries = [
  { channel: "کانال اطلاع‌رسانی", platform: "تلگرام", status: "موفق", time: "امروز، ۱۷:۲۴", statusClass: "bg-emerald-50 text-emerald-700" },
  { channel: "خبرهای روز", platform: "بله", status: "موفق", time: "امروز، ۱۶:۵۸", statusClass: "bg-emerald-50 text-emerald-700" },
  { channel: "رسانه رسمی", platform: "ایتا", status: "ناموفق", time: "امروز، ۱۵:۴۱", statusClass: "bg-red-50 text-red-700" },
  { channel: "اخبار مجموعه", platform: "روبیکا", status: "در انتظار", time: "امروز، ۱۵:۱۲", statusClass: "bg-amber-50 text-amber-700" },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">داشبورد</h1>
          <p className="mt-1.5 text-xs text-slate-500 sm:text-sm">
            نمای کلی وضعیت انتشار و ارسال محتوای شما
          </p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800">
          <span className="text-base leading-none">+</span>
          ایجاد پست جدید
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">{stat.title}</p>
                <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{stat.value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-700">
                {stat.icon}
              </div>
            </div>
            <p className="mt-4 text-[11px] text-slate-400">{stat.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-black text-slate-900">وضعیت ارسال‌ها</h2>
              <p className="mt-1 text-[11px] text-slate-400">آخرین فعالیت‌های انتشار محتوا</p>
            </div>
            <button className="text-xs font-bold text-slate-500 hover:text-slate-900">مشاهده همه</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] text-slate-400">
                  <th className="px-5 py-3 font-medium">کانال</th>
                  <th className="px-5 py-3 font-medium">سکو</th>
                  <th className="px-5 py-3 font-medium">وضعیت</th>
                  <th className="px-5 py-3 font-medium">زمان</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((item) => (
                  <tr key={item.channel} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-4 text-xs font-bold text-slate-700">{item.channel}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{item.platform}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${item.statusClass}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[11px] text-slate-400">{item.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-sm font-black text-slate-900">خلاصه عملکرد</h2>
            <p className="mt-1 text-[11px] text-slate-400">۳۰ روز گذشته</p>
          </div>

          <div className="mt-7">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-black text-slate-950">۹۶٪</div>
                <div className="mt-1 text-[11px] text-slate-400">نرخ موفقیت ارسال</div>
              </div>
              <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">+۴.۲٪</span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[96%] rounded-full bg-slate-900" />
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-lg font-black text-slate-900">۲۴۸</div>
              <div className="mt-1 text-[10px] text-slate-400">ارسال موفق</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-lg font-black text-slate-900">۶</div>
              <div className="mt-1 text-[10px] text-slate-400">ارسال ناموفق</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900">دسترسی سریع</h2>
            <p className="mt-1 text-[11px] text-slate-400">عملیات پرکاربرد سامانه</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["ساخت پست", "یک محتوای جدید ایجاد کنید"],
            ["افزودن کانال", "یک کانال جدید متصل کنید"],
            ["مدیریت کاربران", "کاربران و دسترسی‌ها"],
            ["گزارش ارسال‌ها", "مشاهده جزئیات ارسال"],
          ].map(([title, description]) => (
            <button
              key={title}
              className="rounded-xl border border-slate-200 p-4 text-right transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="text-xs font-bold text-slate-800">{title}</div>
              <div className="mt-1.5 text-[10px] leading-5 text-slate-400">{description}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
