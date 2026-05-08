import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareLiveButtonProps {
  type: 'match' | 'tournament';
  id: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'icon';
  label?: string;
}

export function ShareLiveButton({ type, id, variant = 'outline', size = 'sm', label = 'Condividi Live' }: ShareLiveButtonProps) {
  const handleShare = async () => {
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
  };

  return (
    <Button onClick={handleShare} variant={variant} size={size} className="gap-2">
      <Share2 className="h-4 w-4" />
      {size !== 'icon' && <span>{label}</span>}
    </Button>
  );
}
