import { useState, useEffect } from 'react';
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
  const [durationValue, setDurationValue] = useState(defaultDuration.toString());

  // Reset value when dialog opens
  useEffect(() => {
    if (isOpen) {
      setDurationValue(defaultDuration.toString());
    }
  }, [isOpen, defaultDuration]);

  const handleConfirm = () => {
    const numValue = parseInt(durationValue, 10);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 99) {
      onConfirm(numValue);
      onClose();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or any 0-99 (max 2 digits)
    if (/^\d{0,2}$/.test(value)) {
      setDurationValue(value);
    }
  };

  const parsed = durationValue === '' ? NaN : parseInt(durationValue, 10);
  const isValid = !isNaN(parsed) && parsed >= 0 && parsed <= 99;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Position dialog higher on mobile to avoid keyboard overlap */}
      <DialogContent className="max-w-xs top-[15%] translate-y-0 sm:top-[50%] sm:-translate-y-1/2">
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
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={durationValue}
              onChange={handleInputChange}
              onFocus={(e) => e.currentTarget.select()}
              className="text-center text-lg font-bold"
              autoFocus
              placeholder="0-99"
            />
          </div>
          
          {currentPeriod > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Tempo precedente: {defaultDuration} minuti
            </p>
          )}
        </div>

        <DialogFooter className="pb-safe">
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!isValid}
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
