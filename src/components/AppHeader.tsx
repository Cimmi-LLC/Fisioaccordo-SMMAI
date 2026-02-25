
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
    <header className="bg-gray-900/90 backdrop-blur-sm border-b border-gray-700">
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
            variant="secondary"
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-lg"
          >
            <Brain className="h-4 w-4 mr-2" />
            {showCopyImprover ? 'Hide' : 'Copy AI Pro'}
          </Button>
          <span className="text-gray-300 hidden sm:inline">
            Ciao, {user?.user_metadata?.first_name || 'Utente'}!
          </span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onSignOut}
            className="bg-gray-700 hover:bg-gray-600 text-white border-0"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Log Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
