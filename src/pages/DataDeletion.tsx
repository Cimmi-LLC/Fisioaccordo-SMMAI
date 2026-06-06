import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';

const DataDeletion = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center mb-8 text-sm" style={{ color: 'var(--viola)' }}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Torna all'app
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Trash2 className="h-8 w-8" style={{ color: 'var(--rosa)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>Eliminazione dei dati</h1>
        </div>

        <div className="space-y-6 text-[14px] leading-relaxed" style={{ color: 'var(--ink2)' }}>
          <p className="text-sm" style={{ color: 'var(--ink3)' }}>Ultimo aggiornamento: 5 giugno 2026</p>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>Italiano</h2>
            <p>
              Puoi richiedere in qualsiasi momento l'eliminazione del tuo account e di tutti i dati
              personali associati (Brand Kit, contenuti generati, token Instagram, recensioni importate,
              log di utilizzo) seguendo una di queste 3 modalità:
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2" style={{ color: 'var(--ink)' }}>1. Dall'app (consigliato)</h3>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Accedi al tuo account su <a href="https://fisioaccordo-smm-ai.vercel.app" style={{ color: 'var(--rosa)' }}>fisioaccordo-smm-ai.vercel.app</a></li>
              <li>Vai su <strong>Impostazioni → Account</strong></li>
              <li>Clicca <strong>"Elimina account"</strong> in fondo alla pagina</li>
              <li>Conferma la cancellazione (irreversibile)</li>
            </ol>

            <h3 className="text-base font-semibold mt-4 mb-2" style={{ color: 'var(--ink)' }}>2. Disconnessione da Instagram</h3>
            <p>
              Per disconnettere SOLO il tuo account Instagram (mantenendo il tuo account app):
            </p>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Accedi al tuo account Instagram</li>
              <li>Vai su <strong>Impostazioni → Apps e siti web</strong></li>
              <li>Cerca <strong>"Fisioaccordo Social Manager AI"</strong></li>
              <li>Clicca <strong>"Rimuovi"</strong></li>
            </ol>
            <p className="mt-2">
              Riceveremo automaticamente la notifica di disconnessione da Meta ed elimineremo i token
              associati entro 24 ore.
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2" style={{ color: 'var(--ink)' }}>3. Richiesta via email</h3>
            <p>
              Se non riesci a usare i metodi sopra, scrivici a
              <a href="mailto:teamcimmi@gmail.com?subject=Richiesta eliminazione account" style={{ color: 'var(--rosa)' }}> teamcimmi@gmail.com</a> indicando:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>L'email del tuo account</li>
              <li>(Opzionale) il motivo per cui richiedi l'eliminazione</li>
            </ul>
            <p className="mt-2">
              Risponderemo entro <strong>30 giorni lavorativi</strong> come previsto dal GDPR (art. 17).
            </p>
          </section>

          <section className="mt-8 pt-6" style={{ borderTop: '1px solid var(--line)' }}>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>Cosa viene eliminato</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Dati account (email, nome, password cifrata)</li>
              <li>Brand Kit (colori, font, logo, descrizione, servizi, foto)</li>
              <li>Contenuti generati (post, caroselli, storie, script reel)</li>
              <li>Token di accesso Instagram/Meta</li>
              <li>Recensioni importate</li>
              <li>Log di utilizzo</li>
              <li>Memoria AI (se presente)</li>
            </ul>
            <p className="mt-3">
              <strong>Non viene eliminato</strong>: log tecnici anonimizzati di Sentry (error monitoring),
              cancellati dopo 90 giorni.
            </p>
          </section>

          <section className="mt-8 pt-6" style={{ borderTop: '1px solid var(--line)' }}>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>English (for Meta review)</h2>
            <p>
              You can request deletion of your account and all associated personal data
              (Brand Kit, generated content, Instagram tokens, imported reviews, usage logs)
              at any time using one of these 3 methods:
            </p>
            <ol className="list-decimal pl-6 space-y-1 mt-2">
              <li>
                <strong>In-app:</strong> Sign in at <a href="https://fisioaccordo-smm-ai.vercel.app" style={{ color: 'var(--rosa)' }}>fisioaccordo-smm-ai.vercel.app</a>,
                go to <em>Settings → Account → Delete account</em>.
              </li>
              <li>
                <strong>From Instagram:</strong> Settings → Apps and Websites → find "Fisioaccordo Social Manager AI" → Remove.
                We auto-receive the deletion webhook from Meta and erase tokens within 24h.
              </li>
              <li>
                <strong>By email:</strong> Send a request to
                <a href="mailto:teamcimmi@gmail.com" style={{ color: 'var(--rosa)' }}> teamcimmi@gmail.com</a>
                with your account email. We reply within 30 business days (GDPR art. 17).
              </li>
            </ol>
          </section>

          <section className="mt-8 pt-6" style={{ borderTop: '1px solid var(--line)' }}>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>Contatti</h2>
            <p>
              <strong>Cimmi LLC</strong> — Titolare del trattamento<br />
              Email: <a href="mailto:teamcimmi@gmail.com" style={{ color: 'var(--rosa)' }}>teamcimmi@gmail.com</a>
            </p>
            <p className="mt-2">
              Vedi anche: <Link to="/privacy" style={{ color: 'var(--rosa)' }}>Privacy Policy</Link> ·
              <Link to="/cookie-policy" style={{ color: 'var(--rosa)' }}> Cookie Policy</Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DataDeletion;
