import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: string; // Tailwind color class like 'text-blue-500'
}

export function StatsCard({ label, value, icon: Icon, trend, trendUp, color = "text-primary" }: StatsCardProps) {
  return (
    <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/50 hover:shadow-md transition-shadow duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl bg-secondary ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={`text-sm font-medium px-2 py-1 rounded-full ${trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-3xl font-bold font-display tracking-tight text-foreground">{value}</h3>
        <p className="text-muted-foreground font-medium mt-1">{label}</p>
      </div>
    </div>
  );
}
