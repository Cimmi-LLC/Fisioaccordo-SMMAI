import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Users, Image, MessageCircle, Settings, UserCheck, Globe, ArrowRight, CheckCircle } from "lucide-react";

interface PersonalAccountGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PersonalAccountGuide: React.FC<PersonalAccountGuideProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Non preoccuparti, è semplicissimo!
          </DialogTitle>
          <DialogDescription>
            Convertire il tuo account è gratuito, richiede 30 secondi e non perderai nulla.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-2">
            <p className="font-semibold text-sm text-green-400 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" />
              Cosa NON cambia
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-center gap-2"><Users className="h-4 w-4 shrink-0" /> I tuoi follower rimangono</li>
              <li className="flex items-center gap-2"><Image className="h-4 w-4 shrink-0" /> I tuoi post e storie rimangono</li>
              <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 shrink-0" /> I tuoi messaggi rimangono</li>
              <li className="flex items-center gap-2"><UserCheck className="h-4 w-4 shrink-0" /> La tua bio e foto profilo rimangono</li>
            </ul>
          </div>

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
            <p className="text-sm text-blue-400">
              🔄 Puoi tornare a un account personale <span className="font-semibold">in qualsiasi momento</span> dalle stesse impostazioni.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm">Come fare:</p>
            <ol className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">1</span>
                <span>Apri Instagram e vai su <strong className="text-foreground">Impostazioni</strong> <Settings className="inline h-3.5 w-3.5" /></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">2</span>
                <span>Tocca <strong className="text-foreground">Account</strong> <ArrowRight className="inline h-3 w-3" /> <strong className="text-foreground">Passa a un account professionale</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">3</span>
                <span>Scegli <strong className="text-foreground">Creator</strong> o <strong className="text-foreground">Business</strong> (consigliamo Creator)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">4</span>
                <span>Vai su <strong className="text-foreground">Impostazioni → Privacy</strong> <ArrowRight className="inline h-3 w-3" /> disabilita <strong className="text-foreground">"Account privato"</strong> <Globe className="inline h-3.5 w-3.5" /></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">5</span>
                <span>Torna qui e clicca <strong className="text-foreground">"Connetti Instagram Business"</strong></span>
              </li>
            </ol>
          </div>

          <Button onClick={() => onOpenChange(false)} className="w-full">
            Capito, vado a convertire 🚀
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonalAccountGuide;
