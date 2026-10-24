import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Clock, Hash } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface MatchSettingsProps {
  periodDuration: number;
  totalPeriods: number;
  onPeriodDurationChange: (minutes: number) => void;
  onTotalPeriodsChange: (periods: number) => void;
  disabled: boolean;
}

export function MatchSettings({
  periodDuration,
  totalPeriods,
  onPeriodDurationChange,
  onTotalPeriodsChange,
  disabled,
}: MatchSettingsProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" disabled={disabled}>
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Impostazioni Partita</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="duration" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Durata tempo (minuti)
            </Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="60"
              value={periodDuration}
              onChange={(e) => onPeriodDurationChange(parseInt(e.target.value) || 20)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="periods" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Numero tempi
            </Label>
            <Input
              id="periods"
              type="number"
              min="1"
              max="4"
              value={totalPeriods}
              onChange={(e) => onTotalPeriodsChange(parseInt(e.target.value) || 2)}
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Le impostazioni possono essere modificate solo prima dell'inizio partita
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
