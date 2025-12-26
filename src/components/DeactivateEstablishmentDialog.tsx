import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, XCircle, Building2, MapPin, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EstablishmentPreview {
  id: string;
  name: string;
  code: string;
  district?: string;
  state?: string;
  address_line?: string;
  department_name?: string;
  card_reader_id?: string | null;
}

interface DeactivateEstablishmentDialogProps {
  establishment: EstablishmentPreview | null;
  onClose: () => void;
}

export function DeactivateEstablishmentDialog({ establishment, onClose }: DeactivateEstablishmentDialogProps) {
  const [cardRecovered, setCardRecovered] = useState<'yes' | 'no' | null>(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleDeactivate = async () => {
    if (!establishment || cardRecovered === null) {
      toast.error('Please confirm if the card reader was recovered');
      return;
    }

    setLoading(true);

    try {
      const updateData: Record<string, any> = {
        is_approved: false,
      };

      // If card reader was recovered, clear the card_reader_id
      if (cardRecovered === 'yes') {
        updateData.card_reader_id = null;
      }
      // If not recovered, keep the existing card_reader_id for reference

      const { error } = await supabase
        .from('establishments')
        .update(updateData)
        .eq('id', establishment.id);

      if (error) throw error;

      toast.success('Establishment Deactivated', {
        description: `${establishment.name} has been deactivated.${cardRecovered === 'yes' ? ' Card reader ID has been cleared.' : ''}`,
      });

      queryClient.invalidateQueries({ queryKey: ['department-establishments'] });
      queryClient.invalidateQueries({ queryKey: ['department-stats'] });
      queryClient.invalidateQueries({ queryKey: ['establishment'] });
      
      setCardRecovered(null);
      onClose();
    } catch (error) {
      console.error('Deactivation error:', error);
      toast.error('Failed to deactivate establishment');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCardRecovered(null);
    onClose();
  };

  return (
    <Dialog open={!!establishment} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            Deactivate Establishment
          </DialogTitle>
          <DialogDescription>
            Deactivating will disable worker mapping and attendance tracking for this establishment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Banner */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Workers will not be able to check in/out at this establishment while it is inactive.
            </p>
          </div>

          {/* Establishment Preview (Read-only) */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Building2 className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="font-medium">{establishment?.name}</p>
                <p className="text-sm text-muted-foreground">Code: {establishment?.code}</p>
              </div>
            </div>
            
            {establishment?.department_name && (
              <div className="text-sm">
                <span className="text-muted-foreground">Department:</span>{' '}
                <span className="font-medium">{establishment.department_name}</span>
              </div>
            )}
            
            {(establishment?.district || establishment?.state) && (
              <div className="text-sm flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {[establishment?.district, establishment?.state].filter(Boolean).join(', ')}
              </div>
            )}

            {establishment?.card_reader_id && (
              <div className="text-sm">
                <span className="text-muted-foreground">Card Reader ID:</span>{' '}
                <span className="font-mono">{establishment.card_reader_id}</span>
              </div>
            )}
          </div>

          {/* Card Reader Recovery Question */}
          <div className="space-y-3">
            <Label>Card reader recovered from establishment? *</Label>
            <RadioGroup
              value={cardRecovered || ''}
              onValueChange={(value) => setCardRecovered(value as 'yes' | 'no')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="recovered-yes" />
                <Label htmlFor="recovered-yes" className="font-normal cursor-pointer">
                  Yes - Clear card reader ID
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="recovered-no" />
                <Label htmlFor="recovered-no" className="font-normal cursor-pointer">
                  No - Keep card reader ID on record
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeactivate} 
            disabled={loading || cardRecovered === null}
            variant="destructive"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Deactivate Establishment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
