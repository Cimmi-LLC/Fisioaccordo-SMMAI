
import React from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, LogOut } from "lucide-react";

interface AppHeaderProps {
  user: any;
  showCopyImprover: boolean;
  onToggleCopyImprover: () => void;
  onSignOut: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  user, 
  showCopyImprover, 
  onToggleCopyImprover, 
  onSignOut 
}) => {
  return (
    <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img 
            src="/lovable-uploads/217c8d5c-ce96-40c5-ab52-ff057f4b0d15.png" 
            alt="FisioAccordo Logo" 
            className="h-10 w-auto"
          />
          <h1 className="text-xl font-bold text-white">
            Generatore di Post Social <Sparkles className="inline h-5 w-5 text-purple-300 ml-2" />
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={onToggleCopyImprover}
            variant="outline"
            size="sm"
            className="text-white border-gray-600 hover:bg-gray-700"
          >
            <Brain className="h-4 w-4 mr-2" />
            {showCopyImprover ? 'Nascondi' : 'Copy AI Pro'}
          </Button>
          <span className="text-gray-300">
            Ciao, {user?.user_metadata?.first_name || 'Utente'}!
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onSignOut}
            className="text-white border-gray-600 hover:bg-gray-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
