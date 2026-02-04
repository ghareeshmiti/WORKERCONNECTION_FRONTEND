import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, CreditCard, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface AddWorkerDialogProps {
    establishmentId: string;
    mappedBy: string;
}

export function AddWorkerDialog({ establishmentId, mappedBy }: AddWorkerDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"details" | "card">("details");
    const [createdWorker, setCreatedWorker] = useState<{ id: string; worker_id: string; name: string } | null>(null);

    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        workerId: "",
        phone: "",
        state: "Telangana", // Default
        district: "Hyderabad", // Default
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.workerId || !formData.firstName || !formData.lastName) {
            toast.error("Please fill in required fields");
            return;
        }

        setLoading(true);
        try {
            // 1. Check if worker ID exists
            const { data: existing } = await supabase
                .from("workers")
                .select("id")
                .eq("worker_id", formData.workerId)
                .maybeSingle();

            if (existing) {
                toast.error("Worker ID already exists");
                setLoading(false);
                return;
            }

            // 2. Create Worker
            const { data: worker, error: workerError } = await supabase
                .from("workers")
                .insert({
                    worker_id: formData.workerId,
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    phone: formData.phone || null,
                    state: formData.state,
                    district: formData.district,
                    is_active: true,
                })
                .select()
                .single();

            if (workerError) throw workerError;

            // 3. Map to Establishment
            const { error: mapError } = await supabase
                .from("worker_mappings")
                .insert({
                    worker_id: worker.id,
                    establishment_id: establishmentId,
                    mapped_by: mappedBy,
                    is_active: true,
                });

            if (mapError) throw mapError;

            toast.success("Worker created and mapped successfully");
            setCreatedWorker({ id: worker.id, worker_id: worker.worker_id, name: `${worker.first_name} ${worker.last_name}` });
            setStep("card");
            queryClient.invalidateQueries({ queryKey: ["establishment-workers"] });

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to create worker");
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterCard = async () => {
        if (!createdWorker) return;

        try {
            const { registerUser } = await import("@/lib/api");
            toast.info("Follow browser prompts to register FIDO card...");

            // Register using the Worker ID (which is treated as username in our FIDO system)
            const success = await registerUser(createdWorker.worker_id);

            if (success) {
                toast.success(`Card assigned to ${createdWorker.name}!`);
                setOpen(false);
                resetForm();
            } else {
                toast.error("Card registration failed.");
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Registration failed: " + e.message);
        }
    };

    const resetForm = () => {
        setStep("details");
        setCreatedWorker(null);
        setFormData({
            firstName: "",
            lastName: "",
            workerId: "",
            phone: "",
            state: "Telangana",
            district: "Hyderabad",
        });
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) resetForm();
        }}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Worker
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {step === "details" ? "Add New Worker" : "Assign Card"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === "details"
                            ? "Enter worker details to create a profile."
                            : `Profile created for ${createdWorker?.name}. Assign a FIDO card now?`}
                    </DialogDescription>
                </DialogHeader>

                {step === "details" ? (
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name *</Label>
                                <Input
                                    id="firstName"
                                    required
                                    value={formData.firstName}
                                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name *</Label>
                                <Input
                                    id="lastName"
                                    required
                                    value={formData.lastName}
                                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="workerId">Worker ID (Unique) *</Label>
                            <Input
                                id="workerId"
                                required
                                placeholder="WKR..."
                                value={formData.workerId}
                                onChange={e => setFormData({ ...formData, workerId: e.target.value.toUpperCase() })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                Create & Continue
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-muted/50">
                            <CreditCard className="w-12 h-12 text-primary mb-2" />
                            <p className="text-sm text-center text-muted-foreground">
                                Tap "Register Card" and touch the FIDO key/card to assign it to <strong>{createdWorker?.worker_id}</strong>.
                            </p>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setOpen(false)}>
                                Skip for Now
                            </Button>
                            <Button onClick={handleRegisterCard} className="gap-2">
                                <CreditCard className="w-4 h-4" />
                                Register Card
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
