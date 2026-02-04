import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, CheckCircle, Building2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

interface EstablishmentPreview {
  id: string;
  name: string;
  code: string;
  district?: string;
  state?: string;
  address_line?: string;
  department_name?: string;
}

interface ActivateEstablishmentDialogProps {
  establishment: EstablishmentPreview | null;
  onClose: () => void;
}

export function ActivateEstablishmentDialog({ establishment, onClose }: ActivateEstablishmentDialogProps) {
  const [cardReaderId, setCardReaderId] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleActivate = async () => {
    if (!establishment || !cardReaderId.trim()) {
      toast.error('Card Reader Unique Number is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/approve-establishment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishmentId: establishment.id,
          cardReaderId: cardReaderId.trim().toUpperCase(),
          approvedBy: user?.id,
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      toast.success('Establishment Activated', {
        description: `${establishment.name} has been activated successfully.`,
      });

      queryClient.invalidateQueries({ queryKey: ['department-establishments'] });
      queryClient.invalidateQueries({ queryKey: ['department-stats'] });
      queryClient.invalidateQueries({ queryKey: ['establishment'] });

      setCardReaderId('');
      onClose();
    } catch (error) {
      console.error('Activation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to activate establishment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!establishment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Activate Establishment
          </DialogTitle>
          <DialogDescription>
            Activate this establishment to allow worker mapping and attendance tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

            {establishment?.address_line && (
              <div className="text-sm text-muted-foreground">
                {establishment.address_line}
              </div>
            )}
          </div>

          {/* Card Reader Input */}
          <div className="space-y-2">
            <Label htmlFor="cardReaderId">Card Reader Unique Number *</Label>
            <Input
              id="cardReaderId"
              placeholder="Enter card reader ID"
              value={cardReaderId}
              onChange={(e) => setCardReaderId(e.target.value.toUpperCase())}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              This is the unique identifier for the card reader device at this establishment.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleActivate}
            disabled={loading || !cardReaderId.trim()}
            className="bg-success hover:bg-success/90"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Activate Establishment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}