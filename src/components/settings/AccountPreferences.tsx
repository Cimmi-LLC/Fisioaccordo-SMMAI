
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Calendar } from 'lucide-react';

interface AccountPreferencesProps {
  user: any;
}

const AccountPreferences: React.FC<AccountPreferencesProps> = ({ user }) => {
  const firstName = user?.user_metadata?.first_name || '';
  const lastName = user?.user_metadata?.last_name || '';
  const email = user?.email || '';
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="space-y-4 max-w-md">
      <Card className="panel-card">
        <CardHeader style={{ padding: '22px 24px', borderBottom: '1px solid var(--line)' }}>
          <CardTitle
            className="flex items-center gap-2"
            style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}
          >
            <User className="h-4 w-4" style={{ color: 'var(--viola)' }} />
            Informazioni Account
          </CardTitle>
        </CardHeader>
        <CardContent style={{ padding: '22px 24px' }} className="space-y-4">
          {(firstName || lastName) && (
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
                Nome
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {[firstName, lastName].filter(Boolean).join(' ')}
              </p>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase flex items-center gap-1" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
              <Mail className="h-3 w-3" /> Email
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--ink2)' }}>
              {email || '—'}
            </p>
          </div>

          {createdAt && (
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase flex items-center gap-1" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
                <Calendar className="h-3 w-3" /> Account creato il
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--ink2)' }}>
                {createdAt}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="panel-card">
        <CardHeader style={{ padding: '22px 24px', borderBottom: '1px solid var(--line)' }}>
          <CardTitle
            style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}
          >
            Preferenze Generazione
          </CardTitle>
        </CardHeader>
        <CardContent style={{ padding: '22px 24px' }}>
          <p className="text-xs" style={{ color: 'var(--ink3)' }}>
            Le preferenze di generazione sono memorizzate nell'<strong style={{ color: 'var(--ink2)' }}>AI Memory</strong>. Aggiungi istruzioni nel tab "AI Memory" per personalizzare il tono, lo stile e le regole di scrittura dell'AI.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountPreferences;
