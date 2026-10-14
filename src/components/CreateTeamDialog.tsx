import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Loader2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { InviteMemberDialog } from "@/components/InviteMemberDialog";
import { TeamSetupStepper } from "@/components/TeamSetupStepper";
import { haptic } from "@/lib/haptics";

export function CreateTeamDialog({ open, onOpenChange, onCreate }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { name: string; description: string; color: string }) => Promise<unknown>;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invited, setInvited] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => { if (open) { setStep(0); setName(""); setDescription(""); setError(""); setInvited(false); } }, [open]);
  const go = (next: number) => { haptic("selection"); setStep(next); };
  return <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
    <DialogContent className="text-foreground" onInteractOutside={(event) => { if (busy) event.preventDefault(); }} onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}>
      <DialogHeader><DialogTitle>{step === 0 ? "Create your team" : step === 1 ? "Invite your people" : "Your team is ready"}</DialogTitle><DialogDescription>{name && step > 0 ? name : "Team setup"}</DialogDescription></DialogHeader>
      <TeamSetupStepper current={step === 2 ? 3 : step} onStepSelect={(next) => { if (next === 1 && step === 2) go(1); }} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} initial={reduced ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduced ? 0 : -12 }} transition={{ duration: reduced ? 0 : 0.18 }}>
          {step === 0 && <form className="space-y-5" onSubmit={async (event) => {
            event.preventDefault(); if (!name.trim() || busy) return;
            setBusy(true); setError("");
            try { await onCreate({ name: name.trim(), description: description.trim(), color: "bg-pink-500" }); haptic("success"); setStep(1); }
            catch { setError("Your team could not be created. Please try again."); haptic("error"); }
            finally { setBusy(false); }
          }}>
            <div className="space-y-2"><Label htmlFor="setup-team-name">Team name</Label><Input id="setup-team-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="My salon team" maxLength={100} required disabled={busy} /></div>
            <div className="space-y-2"><Label htmlFor="setup-team-description">Description <span className="text-muted-foreground">(optional)</span></Label><Textarea id="setup-team-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} disabled={busy} /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={!name.trim() || busy} className="w-full">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}Create team & continue<ChevronRight className="ml-2 h-4 w-4" /></Button>
          </form>}
          {step === 1 && <><InviteMemberDialog inline open={open} onOpenChange={() => {}} onInvited={() => { setInvited(true); go(2); }} /><Button variant="ghost" className="w-full mt-3" onClick={() => go(2)}>Invite later</Button></>}
          {step === 2 && <div className="text-center space-y-5 pb-2"><Check className="h-12 w-12 mx-auto text-primary" /><p className="text-sm text-muted-foreground">{invited ? "Invitation sent. Your colleague can join from their email." : "Team created. You can invite colleagues at any time."}</p><Button className="w-full" onClick={() => onOpenChange(false)}>Done</Button><Button variant="ghost" className="w-full" onClick={() => go(1)}><ChevronLeft className="mr-2 h-4 w-4" />{invited ? "Invite another colleague" : "Invite by email"}</Button></div>}
        </motion.div>
      </AnimatePresence>
    </DialogContent>
  </Dialog>;
}