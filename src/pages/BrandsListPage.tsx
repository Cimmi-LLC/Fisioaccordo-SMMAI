import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Briefcase,
  Plus,
  Check,
  Pencil,
  Trash2,
  ShieldAlert,
  MapPin,
  Users as UsersIcon,
} from 'lucide-react';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { useIsAdmin } from '@/hooks/useIsAdmin';

const BrandsListPage: React.FC = () => {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const { brands, activeBrandId, setActiveBrand, deleteBrand, loading } = useActiveBrand();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const goToCreateBrand = () => navigate('/onboarding?new=1');

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="panel-card">
          <CardContent style={{ padding: '48px 32px', textAlign: 'center' }}>
            <ShieldAlert className="h-10 w-10 mx-auto mb-4" style={{ color: 'var(--rosa)' }} />
            <h2 className="text-[18px] font-bold mb-2" style={{ color: 'var(--ink)' }}>
              Funzione admin
            </h2>
            <p className="text-[13px]" style={{ color: 'var(--ink3)' }}>
              La gestione di più brand è disponibile solo per gli account admin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-black mb-1" style={{ color: 'var(--ink)', letterSpacing: '-0.5px' }}>
            I miei Brand
          </h1>
          <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>
            Gestisci i brand dei tuoi clienti. Seleziona quello attivo per generare contenuti dedicati.
          </p>
        </div>
        <Button
          onClick={goToCreateBrand}
          className="text-white font-bold"
          style={{ backgroundColor: 'var(--rosa)' }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Nuovo Brand
        </Button>
      </div>

      {loading ? (
        <Card className="panel-card">
          <CardContent style={{ padding: '40px', textAlign: 'center' }}>
            <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>Caricamento...</p>
          </CardContent>
        </Card>
      ) : brands.length === 0 ? (
        <Card className="panel-card">
          <CardContent style={{ padding: '60px 40px', textAlign: 'center' }}>
            <Briefcase className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--ink3)', opacity: 0.4 }} />
            <p className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
              Nessun brand creato
            </p>
            <p className="text-[12px] mt-1 mb-4" style={{ color: 'var(--ink3)' }}>
              Crea il primo brand per iniziare a generare contenuti.
            </p>
            <Button
              onClick={goToCreateBrand}
              className="text-white font-bold"
              style={{ backgroundColor: 'var(--rosa)' }}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Crea il primo brand
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((b) => {
            const isActive = b.id === activeBrandId;
            return (
              <Card
                key={b.id}
                className="panel-card relative transition-all"
                style={{
                  border: isActive ? '2px solid var(--rosa)' : '1px solid var(--line)',
                  cursor: 'pointer',
                }}
              >
                <CardContent style={{ padding: '20px' }}>
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute', top: 12, right: 12,
                        backgroundColor: 'var(--rosa)', color: '#fff',
                        fontSize: 9, fontWeight: 800,
                        padding: '3px 8px', borderRadius: 999,
                        letterSpacing: '0.5px',
                      }}
                    >
                      ATTIVO
                    </div>
                  )}

                  <div className="flex items-start gap-3 mb-3">
                    <div
                      style={{
                        width: 40, height: 40, borderRadius: 10,
                        backgroundColor: 'var(--rosa-dim)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Briefcase className="h-5 w-5" style={{ color: 'var(--rosa)' }} />
                    </div>
                    <div className="flex-1 min-w-0 pr-12">
                      <div
                        className="text-[14px] font-bold"
                        style={{
                          color: 'var(--ink)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}
                      >
                        {b.nome_business || 'Senza nome'}
                      </div>
                      {b.citta && (
                        <div className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: 'var(--ink3)' }}>
                          <MapPin className="h-3 w-3" /> {b.citta}
                        </div>
                      )}
                    </div>
                  </div>

                  <p
                    className="text-[12px] mb-4 leading-snug"
                    style={{
                      color: 'var(--ink3)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: 32,
                    }}
                  >
                    {b.target_pazienti || 'Nessuna descrizione del target.'}
                  </p>

                  {(b.servizi?.length || 0) > 0 && (
                    <div className="flex items-center gap-1 mb-3 text-[10px]" style={{ color: 'var(--ink3)' }}>
                      <UsersIcon className="h-3 w-3" />
                      {b.servizi!.length} servizi
                    </div>
                  )}

                  <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
                    {!isActive ? (
                      <Button
                        size="sm"
                        onClick={() => b.id && setActiveBrand(b.id)}
                        className="flex-1 text-white font-bold"
                        style={{ backgroundColor: 'var(--rosa)' }}
                      >
                        <Check className="h-3 w-3 mr-1" /> Attiva
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/brand')}
                        className="flex-1"
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Modifica
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => b.id && setConfirmDelete(b.id)}
                      style={{ color: '#ef4444' }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo brand?</AlertDialogTitle>
            <AlertDialogDescription>
              Tutti i contenuti già generati e programmati per questo brand resteranno, ma non potranno più essere ricollegati. L'azione è irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteBrand(confirmDelete).then(() => setConfirmDelete(null))}
              style={{ backgroundColor: '#ef4444' }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BrandsListPage;
