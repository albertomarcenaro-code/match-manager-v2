import { useEffect, useState } from 'react';
import { Share2, Loader2, Radio, Link2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ShareLiveButtonProps {
  type: 'match' | 'tournament';
  id: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'icon';
  label?: string;
}

type ShareTable = 'matches' | 'tournaments';

export function ShareLiveButton({ type, id, variant = 'outline', size = 'sm', label = 'Condividi Live' }: ShareLiveButtonProps) {
  const table: ShareTable = type === 'match' ? 'matches' : 'tournaments';
  const [isBusy, setIsBusy] = useState(false);
  // null = still unknown; revoking must be possible only once we know it is on.
  const [isPublic, setIsPublic] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from(table)
        .select('is_public')
        .eq('id', id)
        .maybeSingle();
      if (!active || error || !data) return;
      setIsPublic(Boolean((data as { is_public?: boolean }).is_public));
    })();
    return () => {
      active = false;
    };
  }, [table, id]);

  const liveUrl = () => `${window.location.origin}/live/${type}/${id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(liveUrl());
      toast.success('Link Live copiato!', {
        description: 'Invialo su WhatsApp ai tuoi tifosi',
      });
    } catch {
      toast.error('Impossibile copiare il link');
    }
  };

  const handleShare = async () => {
    setIsBusy(true);
    try {
      // Opt-in: flip the row to public so anon viewers can fetch it via the live page.
      const { error: pubErr } = await supabase
        .from(table)
        .update({ is_public: true })
        .eq('id', id);
      if (pubErr) {
        console.error('Failed to mark as public:', pubErr);
        toast.error('Impossibile abilitare la condivisione pubblica');
        return;
      }

      // If sharing a tournament, also mark its matches public so the live page can load them.
      if (type === 'tournament') {
        const { error: matchesErr } = await supabase
          .from('matches')
          .update({ is_public: true })
          .eq('tournament_id', id);
        if (matchesErr) console.error('Failed to mark tournament matches as public:', matchesErr);
      }

      setIsPublic(true);
      toast.success('Condivisione Live attiva', {
        description: 'Solo chi possiede il link può vedere la partita.',
      });

      const url = liveUrl();
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Segui la partita Live', text: 'Segui la partita Live', url });
          return;
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link Live copiato!', {
          description: 'Invialo su WhatsApp ai tuoi tifosi',
        });
      } catch {
        toast.error('Impossibile copiare il link');
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleRevoke = async () => {
    setIsBusy(true);
    try {
      const { error } = await supabase
        .from(table)
        .update({ is_public: false })
        .eq('id', id);
      if (error) {
        console.error('Failed to revoke public sharing:', error);
        toast.error('Impossibile disattivare la condivisione pubblica');
        return;
      }

      // Same cascade as sharing, otherwise tournament pages keep leaking matches.
      if (type === 'tournament') {
        const { error: matchesErr } = await supabase
          .from('matches')
          .update({ is_public: false })
          .eq('tournament_id', id);
        if (matchesErr) console.error('Failed to revoke tournament matches:', matchesErr);
      }

      setIsPublic(false);
      toast.success('Condivisione disattivata', {
        description: 'Il link non è più accessibile ai visitatori.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  if (isPublic) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-600">
          <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
          Live attivo
        </span>
        <Button variant={variant} size={size} onClick={copyLink} disabled={isBusy} className="gap-2">
          <Link2 className="h-4 w-4" />
          Copia link
        </Button>
        <Button variant="ghost" size={size} onClick={handleRevoke} disabled={isBusy} className="gap-2">
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
          Disattiva
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleShare} disabled={isBusy} variant={variant} size={size} className="gap-2">
      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
      {size !== 'icon' && <span>{label}</span>}
    </Button>
  );
}
