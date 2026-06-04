
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Link2, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import MetaConnection from '@/components/MetaConnection';
import AccountPreferences from '@/components/settings/AccountPreferences';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="bg-white border-b sticky top-0 z-10"
        style={{ borderColor: 'var(--line)' }}
      >
        <div className="max-w-3xl mx-auto px-4 h-[58px] flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-1.5 text-xs bg-transparent hover:bg-transparent px-0"
            style={{ color: 'var(--ink3)' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Torna all'app
          </Button>
          <div className="w-px h-5" style={{ backgroundColor: 'var(--line)' }} />
          <span className="text-sm" style={{ fontWeight: 800, color: 'var(--ink)' }}>
            Impostazioni
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Tabs defaultValue="social">
          <TabsList
            className="w-full justify-start rounded-none bg-transparent h-auto p-0 mb-6"
            style={{ borderBottom: '1.5px solid var(--line)' }}
          >
            {[
              { value: 'social', label: 'Connessioni Social', Icon: Link2 },
              { value: 'account', label: 'Account', Icon: User },
            ].map(({ value, label, Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="relative rounded-none border-0 bg-transparent px-4 pb-2.5 pt-2 text-[11px] font-black uppercase tracking-wider shadow-none
                  data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[var(--ink)]
                  data-[state=inactive]:text-[var(--ink3)]
                  hover:text-[var(--viola)]
                  data-[state=active]:[&::after]:content-[''] data-[state=active]:[&::after]:absolute data-[state=active]:[&::after]:bottom-[-1.5px] data-[state=active]:[&::after]:left-0 data-[state=active]:[&::after]:right-0 data-[state=active]:[&::after]:h-[2px] data-[state=active]:[&::after]:bg-[var(--rosa)] data-[state=active]:[&::after]:rounded-t"
                style={{ letterSpacing: '0.6px' }}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5 inline-block" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="social">
            <div className="max-w-md">
              <MetaConnection />
            </div>
          </TabsContent>

          <TabsContent value="account">
            <AccountPreferences user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
