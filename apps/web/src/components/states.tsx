"use client";

import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground max-w-xs">{description}</p>}
    </div>
  );
}

export function ErrorState({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-semibold text-destructive">Algo salió mal</p>
      <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
    </div>
  );
}
