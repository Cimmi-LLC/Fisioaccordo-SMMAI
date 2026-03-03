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
            Don't worry, it's super easy!
          </DialogTitle>
          <DialogDescription>
            Converting your account is free, takes 30 seconds, and you won't lose anything.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-2">
            <p className="font-semibold text-sm text-green-400 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" />
              What does NOT change
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-center gap-2"><Users className="h-4 w-4 shrink-0" /> Your followers stay</li>
              <li className="flex items-center gap-2"><Image className="h-4 w-4 shrink-0" /> Your posts and stories stay</li>
              <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 shrink-0" /> Your messages stay</li>
              <li className="flex items-center gap-2"><UserCheck className="h-4 w-4 shrink-0" /> Your bio and profile picture stay</li>
            </ul>
          </div>

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
            <p className="text-sm text-blue-400">
              🔄 You can switch back to a personal account <span className="font-semibold">at any time</span> from the same settings.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm">How to do it:</p>
            <ol className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">1</span>
                <span>Open Instagram and go to <strong className="text-foreground">Settings</strong> <Settings className="inline h-3.5 w-3.5" /></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">2</span>
                <span>Tap <strong className="text-foreground">Account</strong> <ArrowRight className="inline h-3 w-3" /> <strong className="text-foreground">Switch to professional account</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">3</span>
                <span>Choose <strong className="text-foreground">Creator</strong> or <strong className="text-foreground">Business</strong> (we recommend Creator)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">4</span>
                <span>Go to <strong className="text-foreground">Settings → Privacy</strong> <ArrowRight className="inline h-3 w-3" /> disable <strong className="text-foreground">"Private account"</strong> <Globe className="inline h-3.5 w-3.5" /></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">5</span>
                <span>Come back here and click <strong className="text-foreground">"Connect Instagram Business"</strong></span>
              </li>
            </ol>
          </div>

          <Button onClick={() => onOpenChange(false)} className="w-full">
            Got it, let me convert 🚀
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonalAccountGuide;
