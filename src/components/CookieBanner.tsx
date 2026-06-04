import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

/**
 * GDPR-compliant cookie banner.
 *
 * 3 categories:
 *  - essential (always on, can't be disabled)
 *  - functional (saves preferences like active brand, completed tour)
 *  - marketing (not used today, kept for future)
 *
 * Persisted in localStorage under 'fisioaccordo:cookie_consent'.
 * Listens to 'fisioaccordo:open-cookie-settings' custom event to re-open settings.
 */

const LS_KEY = 'fisioaccordo:cookie_consent';
const POLICY_VERSION = 1;

interface Consent {
  essential: true;
  functional: boolean;
  marketing: boolean;
  ts: string;
  version: number;
}

function loadConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== POLICY_VERSION) return null;
    return parsed;
  } catch { return null; }
}

function saveConsent(c: Consent) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

const CookieBanner: React.FC = () => {
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [functional, setFunctional] = useState(true);

  // Show banner on mount if no consent saved
  useEffect(() => {
    const existing = loadConsent();
    if (!existing) setShow(true);
    else setFunctional(existing.functional);
  }, []);

  // Listen for the "open cookie settings" custom event (from CookiePolicy page)
  useEffect(() => {
    const handler = () => {
      const existing = loadConsent();
      if (existing) setFunctional(existing.functional);
      setShow(true);
      setShowDetails(true);
    };
    window.addEventListener('fisioaccordo:open-cookie-settings', handler);
    return () => window.removeEventListener('fisioaccordo:open-cookie-settings', handler);
  }, []);

  const accept = (functionalChoice: boolean) => {
    saveConsent({
      essential: true,
      functional: functionalChoice,
      marketing: false,
      ts: new Date().toISOString(),
      version: POLICY_VERSION,
    });
    setShow(false);
    setShowDetails(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Banner consenso cookie"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 460,
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.06)',
        zIndex: 9998,
        fontFamily: '"Inter", -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 18px 0 18px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Cookie style={{ width: 22, height: 22, color: '#E6007E', flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a2e', letterSpacing: '-0.2px' }}>
            Cookie e privacy
          </div>
          <div style={{ fontSize: 12.5, color: '#5a5a6a', lineHeight: 1.5, marginTop: 6 }}>
            Usiamo cookie tecnici per il funzionamento del Servizio e — se vuoi — cookie funzionali per ricordare le tue preferenze (es. brand attivo, tutorial completato).
            <br /><br />
            Non usiamo cookie di profilazione o marketing.
            Leggi di più nella <Link to="/cookie-policy" style={{ color: '#E6007E', textDecoration: 'underline' }}>Cookie Policy</Link> e nella <Link to="/privacy" style={{ color: '#E6007E', textDecoration: 'underline' }}>Privacy</Link>.
          </div>
        </div>
        <button
          onClick={() => accept(true)}
          aria-label="Chiudi"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 2, color: '#a0a0a8', lineHeight: 1,
          }}
        ><X style={{ width: 16, height: 16 }} /></button>
      </div>

      {/* Details (expanded) */}
      {showDetails && (
        <div style={{ padding: '12px 18px 0', borderTop: '1px solid #f0f0f4', marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0' }}>
            <input type="checkbox" checked disabled style={{ marginTop: 3, accentColor: '#1a1a2e' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a2e' }}>Cookie tecnici</div>
              <div style={{ fontSize: 11.5, color: '#7a7a8a', lineHeight: 1.4, marginTop: 2 }}>
                Sempre attivi. Necessari per login e funzionamento dell'app.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderTop: '1px solid #f8f8fa' }}>
            <input
              type="checkbox"
              checked={functional}
              onChange={(e) => setFunctional(e.target.checked)}
              style={{ marginTop: 3, accentColor: '#1a1a2e', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a2e' }}>Cookie funzionali</div>
              <div style={{ fontSize: 11.5, color: '#7a7a8a', lineHeight: 1.4, marginTop: 2 }}>
                Memorizzano brand attivo, completamento tutorial, layout preferiti. Migliorano l'esperienza.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid #f0f0f4',
        marginTop: showDetails ? 6 : 12,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap',
      }}>
        {!showDetails ? (
          <button
            onClick={() => setShowDetails(true)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#7a7a8a', fontSize: 11.5, fontWeight: 500,
              padding: '7px 4px',
            }}
          >Personalizza</button>
        ) : (
          <button
            onClick={() => setShowDetails(false)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#7a7a8a', fontSize: 11.5, fontWeight: 500,
              padding: '7px 4px',
            }}
          >Nascondi dettagli</button>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => accept(false)}
            style={{
              background: '#ffffff', color: '#1a1a2e',
              border: '1px solid #e0e0e6', borderRadius: 6,
              fontSize: 11.5, fontWeight: 500,
              cursor: 'pointer', padding: '7px 12px',
            }}
          >Solo essenziali</button>
          <button
            onClick={() => accept(showDetails ? functional : true)}
            style={{
              background: '#1a1a2e', color: '#ffffff',
              border: 'none', borderRadius: 6,
              fontSize: 11.5, fontWeight: 600,
              cursor: 'pointer', padding: '7px 14px',
            }}
          >{showDetails ? 'Salva preferenze' : 'Accetta tutti'}</button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
