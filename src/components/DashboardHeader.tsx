export default function DashboardHeader() {
  return (
    <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
      <div>
        <h1 className="text-2xl font-bold tracking-wide">
          LOKTANTRA
        </h1>

        <p className="text-xs tracking-widest text-slate-400">
          THE REPUBLIC&apos;S MANDATE
        </p>
      </div>

      <div className="text-right">
        <p className="text-sm font-semibold text-white">
          CAMPAIGN MODE
        </p>

        <p className="text-xs text-slate-400">
          INDIA · 2027
        </p>
      </div>
    </header>
  );
}