
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Brain, LogOut, Settings } from "lucide-react";
import logo from "@/assets/logo-fisioaccordo.png";

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
    <header
      className="bg-white border-b"
      style={{ borderColor: 'var(--line)', minHeight: '58px' }}
    >
      <div className="max-w-7xl mx-auto px-4 h-[58px] flex items-center justify-between gap-4">
        {/* Left: logo + brand */}
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="FisioAccordo PoliPartner Logo"
            className="h-9 w-auto flex-shrink-0"
          />

          {/* Separator */}
          <div className="w-px h-6 hidden sm:block" style={{ backgroundColor: 'var(--line)' }} />

          <span
            className="text-sm hidden sm:block"
            style={{ fontWeight: 800, color: 'var(--ink)' }}
          >
            Social Post Generator
          </span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onToggleCopyImprover}
            size="sm"
            className="text-white uppercase text-[10px] font-black rounded-[7px] px-3 border-0"
            style={{
              backgroundColor: showCopyImprover ? 'var(--viola)' : 'var(--rosa)',
              letterSpacing: '0.5px',
            }}
          >
            <Brain className="h-3.5 w-3.5 mr-1.5" />
            {showCopyImprover ? 'Nascondi' : 'Copy AI Pro'}
          </Button>

          <span
            className="text-xs hidden md:inline"
            style={{ color: 'var(--ink3)' }}
          >
            Ciao, {user?.user_metadata?.first_name || 'Utente'}
          </span>

          <Link to="/settings">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs bg-transparent hover:bg-transparent"
              style={{
                border: '1px solid var(--line)',
                color: 'var(--ink3)',
              }}
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Impostazioni</span>
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="text-xs bg-transparent hover:bg-transparent"
            style={{
              border: '1px solid var(--line)',
              color: 'var(--ink3)',
            }}
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            <span className="hidden sm:inline">Esci</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
