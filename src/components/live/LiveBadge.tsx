import { cn } from '@/lib/utils';

interface LiveBadgeProps {
  isLive: boolean;
  className?: string;
}

export function LiveBadge({ isLive, className }: LiveBadgeProps) {
  if (!isLive) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-bold uppercase tracking-wider', className)}>
        Finale
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider shadow-md', className)}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
      </span>
      Live
    </span>
  );
}
