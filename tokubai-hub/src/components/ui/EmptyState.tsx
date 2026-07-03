import Link from "next/link";
import Button from "./Button";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="animate-fade-in flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 text-4xl">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-bold text-stone-900">{title}</h3>
      {description && <p className="mb-6 max-w-sm text-sm text-stone-500">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-surface overflow-hidden">
          <div className="skeleton h-36 w-full rounded-none" />
          <div className="space-y-2 p-4">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
