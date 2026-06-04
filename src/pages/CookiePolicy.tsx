import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Cookie } from 'lucide-react';

const CookiePolicy = () => {
  const openCookieSettings = () => {
    // Trigger by dispatching a custom event the banner listens for
    window.dispatchEvent(new CustomEvent('fisioaccordo:open-cookie-settings'));
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center mb-8 text-sm" style={{ color: 'var(--viola)' }}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Torna all'app
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Cookie className="h-8 w-8" style={{ color: 'var(--rosa)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>Cookie Policy</h1>
        </div>

        <div className="space-y-6 text-[14px] leading-relaxed" style={{ color: 'var(--ink2)' }}>
          <p className="text-sm" style={{ color: 'var(--ink3)' }}>Ultimo aggiornamento: 31 maggio 2026</p>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>Cosa sono i cookie</h2>
            <p>
              I cookie sono piccoli file di testo memorizzati dal tuo browser durante la navigazione di un sito web.
              Servono a far funzionare l'applicazione, ricordare le tue preferenze e fornirti un'esperienza personalizzata.
            </p>
            <p className="mt-2">
              In aggiunta ai cookie, utilizziamo tecnologie simili come <strong>localStorage</strong> e <strong>sessionStorage</strong>
              per memorizzare dati locali sul tuo dispositivo, senza inviarli a server di terze parti.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>Tipologie di cookie utilizzati</h2>

            <h3 className="text-base font-semibold mt-4 mb-2" style={{ color: 'var(--ink)' }}>🟢 Cookie tecnici (sempre attivi)</h3>
            <p>Necessari per il funzionamento del Servizio. Non richiedono consenso.</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm border-collapse" style={{ border: '1px solid var(--line)' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg)' }}>
                    <th className="px-3 py-2 text-left" style={{ border: '1px solid var(--line)' }}>Nome</th>
                    <th className="px-3 py-2 text-left" style={{ border: '1px solid var(--line)' }}>Tipo</th>
                    <th className="px-3 py-2 text-left" style={{ border: '1px solid var(--line)' }}>Scopo</th>
                    <th className="px-3 py-2 text-left" style={{ border: '1px solid var(--line)' }}>Durata</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2" style={{ border: '1px solid var(--line)' }}><code>sb-*-auth-token</code></td>
                    <td className="px-3 py-2" style={{ border: '1px solid var(--line)' }}>localStorage</td>
                    <td className="px-3 py-2" style={{ border: '1px solid var(--line)' }}>Mantiene la sessione di login (Supabase Auth).</td>
                    <td className="px-3 py-2" style={{ border: '1px solid var(--line)' }}>1 ora (refresh automatico)</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2" style={{ border: '1px solid var(--line)' }}><code>fisioaccordo:cookie_consent</code></td>
                    <td className="px-3 py-2" style={{ border: '1px solid var(--line)' }}>localStorage</td>
                    <td className="px-3 py-2" style={{ border: '1px solid var(--line)' }}>Memorizza le tue preferenze sui cookie.</td>
                    <td className="px-3 py-2" style={{ border: '1px solid var(--line)' }}>12 mesi</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-base font-semibold mt-6 mb-2" style={{ color: 'var(--ink)' }}>🟡 Cookie funzionali</h3>
            <p>Memorizzano le tue preferenze nell'app. Puoi disattivarli, ma alcune funzionalità potrebbero non funzionare correttamente.</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm border-collapse" style={{ border: '1px solid var(--line)' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg)' }}>
                    <th className="px-3 py-2 text-left" style={{ border: '1px solid var(--line)' }}>Nome</th>
                    <th className="px-3 py-2 text-left" style={{ border: '1px solid var(--line)' }}>Scopo</th>
                    <th className="px-3 py-2 text-left" style={{ border: '1px solid var(--line)' }}>Durata</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2" style={{ border: '1px solid var(--line)' }}><code>fisioaccordo:active_brand_id</code></td>
                    <td className="px-3 py-2" style={{ border: '1px solid var(--line)' }}>Brand selezionato come attivo (admin multi-brand).</td>
                    <td className="px-3 py-2" style={{ border: '1px solid var(--line)' }}>Persistente</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2" style={{ border: '1px solid var(--line)' }}><code>fisioaccordo:tour_completed:*</code></td>
                    <td className="px-3 py-2" style={{ border: '1px solid var(--line)' }}>Indica se hai completato il tutorial.</td>
                    <td className="px-3 py-2" style={{ border: '1px solid var(--line)' }}>Persistente</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-base font-semibold mt-6 mb-2" style={{ color: 'var(--ink)' }}>🔴 Cookie di profilazione / marketing</h3>
            <p><strong>Non utilizziamo cookie di profilazione o pubblicitari.</strong> Non condividiamo dati con piattaforme di marketing terze parti.</p>

            <h3 className="text-base font-semibold mt-6 mb-2" style={{ color: 'var(--ink)' }}>🔵 Cookie di terze parti</h3>
            <p>Quando ti connetti a Instagram tramite il nostro Servizio, Meta può impostare i propri cookie sul tuo browser secondo la sua privacy policy. Non abbiamo controllo su questi cookie.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>Gestione del consenso</h2>
            <p>
              Al primo accesso ti chiediamo se accetti i cookie non essenziali (al momento solo funzionali).
              Puoi modificare la tua scelta in qualsiasi momento.
            </p>
            <button
              onClick={openCookieSettings}
              className="mt-3 inline-flex items-center gap-2 text-[13px] font-bold uppercase px-4 py-2.5 rounded-lg"
              style={{ backgroundColor: 'var(--rosa)', color: '#fff', border: 'none', cursor: 'pointer', letterSpacing: '0.4px' }}
            >
              <Cookie className="h-4 w-4" />
              Modifica preferenze cookie
            </button>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>Disabilitare i cookie dal browser</h2>
            <p>Puoi disabilitare i cookie direttamente dalle impostazioni del tuo browser:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rosa)' }}>Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/it/kb/Attivare%20e%20disattivare%20i%20cookie" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rosa)' }}>Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/it-it/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rosa)' }}>Safari</a></li>
              <li><a href="https://support.microsoft.com/it-it/microsoft-edge/eliminare-i-cookie-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rosa)' }}>Microsoft Edge</a></li>
            </ul>
            <p className="mt-2">
              <strong>Attenzione:</strong> disabilitando i cookie tecnici essenziali (es. sessione di login) il Servizio non potrà funzionare correttamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>Contatti</h2>
            <p>
              Per domande su questa Cookie Policy contattaci a
              <a href="mailto:teamcimmi@gmail.com" style={{ color: 'var(--rosa)' }}> teamcimmi@gmail.com</a>.
            </p>
            <p className="mt-2">
              Vedi anche la nostra <Link to="/privacy" style={{ color: 'var(--rosa)' }}>Informativa Privacy</Link> completa.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
