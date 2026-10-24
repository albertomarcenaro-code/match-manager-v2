import { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
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

export function ShareLiveButton({ type, id, variant = 'outline', size = 'sm', label = 'Condividi Live' }: ShareLiveButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      // Opt-in: flip the row to public so anon viewers can fetch it via the live page.
      const table = type === 'match' ? 'matches' : 'tournaments';
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
        await supabase
          .from('matches')
          .update({ is_public: true })
          .eq('tournament_id', id);
      }

      const url = `${window.location.origin}/live/${type}/${id}`;
      const title = type === 'match' ? 'Segui la partita Live' : 'Segui il torneo Live';

      if (navigator.share) {
        try {
          await navigator.share({ title, text: title, url });
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
      setIsSharing(false);
    }
  };

  return (
    <Button onClick={handleShare} disabled={isSharing} variant={variant} size={size} className="gap-2">
      {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
      {size !== 'icon' && <span>{label}</span>}
    </Button>
  );
}
