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
import { Loader2, CheckCircle, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

interface ApproveEstablishmentDialogProps {
  establishment: {
    id: string;
    name: string;
    code: string;
    is_approved?: boolean;
  } | null;
  onClose: () => void;
}

export function ApproveEstablishmentDialog({ establishment, onClose }: ApproveEstablishmentDialogProps) {
  const [cardReaderId, setCardReaderId] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleApprove = async () => {
    if (!establishment || !cardReaderId.trim()) {
      toast.error('Card Reader ID is required');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('establishments')
        .update({
          is_approved: true,
          card_reader_id: cardReaderId.trim().toUpperCase(),
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', establishment.id);

      if (error) throw error;

      toast.success('Establishment Approved', {
        description: `${establishment.name} has been approved successfully.`,
      });

      queryClient.invalidateQueries({ queryKey: ['department-establishments'] });
      queryClient.invalidateQueries({ queryKey: ['establishment'] });
      
      setCardReaderId('');
      onClose();
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve establishment');
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
            Approve Establishment
          </DialogTitle>
          <DialogDescription>
            Approve this establishment to allow worker mapping and attendance tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Building2 className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="font-medium">{establishment?.name}</p>
                <p className="text-sm text-muted-foreground">Code: {establishment?.code}</p>
              </div>
            </div>
          </div>

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
            onClick={handleApprove} 
            disabled={loading || !cardReaderId.trim()}
            className="bg-success hover:bg-success/90"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Approve Establishment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}