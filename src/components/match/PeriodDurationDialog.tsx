import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface PeriodDurationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (duration: number) => void;
  currentPeriod: number;
  defaultDuration: number;
}

export function PeriodDurationDialog({
  isOpen,
  onClose,
  onConfirm,
  currentPeriod,
  defaultDuration,
}: PeriodDurationDialogProps) {
  const [duration, setDuration] = useState(defaultDuration);

  const handleConfirm = () => {
    if (duration > 0 && duration <= 60) {
      onConfirm(duration);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Durata {currentPeriod === 0 ? '1° tempo' : `${currentPeriod + 1}° tempo`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="period-duration">Durata del tempo (minuti)</Label>
            <Input
              id="period-duration"
              type="number"
              min="1"
              max="60"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || defaultDuration)}
              className="text-center text-lg font-bold"
              autoFocus
            />
          </div>
          
          {currentPeriod > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Tempo precedente: {defaultDuration} minuti
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button 
            onClick={handleConfirm}
            className="gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            <Play className="h-4 w-4" />
            Avvia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}