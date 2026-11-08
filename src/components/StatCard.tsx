interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
}

export default function StatCard({
  title,
  value,
  description,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">
        {title}
      </p>

      <h2 className="mt-2 text-3xl font-bold">
        {value}
      </h2>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}