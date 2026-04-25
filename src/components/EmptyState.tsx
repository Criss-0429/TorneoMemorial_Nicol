import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card-bold flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--color-tournament-border)]/30">
        <Icon className="h-8 w-8" style={{ color: 'var(--color-tournament-text-muted)' }} />
      </div>
      <h3 className="text-xl font-black uppercase tracking-tight text-[color:var(--color-tournament-text)] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[color:var(--color-tournament-text-muted)] max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && <div className="w-full max-w-xs">{action}</div>}
    </div>
  );
}
