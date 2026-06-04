import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center mb-8 text-sm" style={{ color: 'var(--viola)' }}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Torna all'app
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8" style={{ color: 'var(--rosa)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--ink)' }}>Informativa Privacy</h1>
        </div>

        <div className="space-y-6 text-[14px] leading-relaxed" style={{ color: 'var(--ink2)' }}>
          <p className="text-sm" style={{ color: 'var(--ink3)' }}>Ultimo aggiornamento: 31 maggio 2026</p>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>1. Titolare del trattamento</h2>
            <p>
              Il Titolare del trattamento dei dati personali è <strong>Cimmi LLC</strong> ("Titolare", "noi"), che gestisce
              l'applicazione <strong>Fisioaccordo Social Media Manager AI</strong> ("App", "Servizio").
            </p>
            <p>Per qualsiasi richiesta in materia di privacy puoi contattarci all'indirizzo: <a href="mailto:teamcimmi@gmail.com" style={{ color: 'var(--rosa)' }}>teamcimmi@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>2. Tipologie di dati raccolti</h2>
            <p>Trattiamo le seguenti categorie di dati personali:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Dati di registrazione:</strong> nome, cognome, email, password (in forma cifrata).</li>
              <li><strong>Dati del Brand Kit:</strong> nome attività, descrizione, città, servizi, target, colori, font, mission, logo, foto della tua struttura.</li>
              <li><strong>Contenuti generati:</strong> post, caroselli, storie e script video prodotti dall'AI in base ai tuoi input.</li>
              <li><strong>Token di accesso Meta:</strong> token OAuth necessari per pubblicare su Instagram, conservati cifrati at-rest tramite Supabase Vault.</li>
              <li><strong>Dati di pubblicazione:</strong> data, ora e stato dei contenuti pubblicati o programmati su Instagram.</li>
              <li><strong>Recensioni importate:</strong> testo e metadati delle recensioni che decidi di importare da Google Maps o MioDottore.</li>
              <li><strong>Dati di utilizzo:</strong> log tecnici delle chiamate API (es. errori, prestazioni) anonimizzati o pseudonimizzati.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>3. Finalità del trattamento</h2>
            <p>Utilizziamo i tuoi dati per:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Erogare il Servizio e consentirti di generare contenuti tramite AI.</li>
              <li>Pubblicare contenuti su Instagram tramite l'integrazione Meta Graph API, su tua autorizzazione esplicita.</li>
              <li>Memorizzare le tue preferenze e i contenuti creati.</li>
              <li>Migliorare il Servizio e prevenire abusi.</li>
              <li>Adempiere a obblighi di legge.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>4. Base giuridica</h2>
            <p>Trattiamo i tuoi dati sulla base di:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Esecuzione del contratto</strong> (art. 6.1.b GDPR): per fornirti il Servizio.</li>
              <li><strong>Consenso</strong> (art. 6.1.a GDPR): per la connessione a Meta/Instagram e per cookie non essenziali.</li>
              <li><strong>Interesse legittimo</strong> (art. 6.1.f GDPR): per sicurezza, prevenzione frodi e miglioramento del Servizio.</li>
              <li><strong>Obblighi di legge</strong> (art. 6.1.c GDPR): per adempimenti fiscali o richieste delle autorità.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>5. Servizi di terze parti e trasferimenti</h2>
            <p>Per fornire il Servizio utilizziamo i seguenti fornitori (Responsabili del trattamento ex art. 28 GDPR):</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Supabase Inc.</strong> (USA, con server EU): autenticazione, database PostgreSQL, storage. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rosa)' }}>Privacy Supabase</a>.</li>
              <li><strong>Google LLC / Google Cloud (Gemini AI)</strong>: generazione testuale dei contenuti tramite Gemini 2.5 Flash. I prompt vengono inviati per l'elaborazione. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rosa)' }}>Privacy Google</a>.</li>
              <li><strong>Pixabay GmbH</strong> (Germania): ricerca di immagini stock. Inviamo solo le keyword di ricerca, mai dati personali. <a href="https://pixabay.com/it/service/privacy/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rosa)' }}>Privacy Pixabay</a>.</li>
              <li><strong>Apify (Apify Technologies s.r.o.)</strong> (UE - Repubblica Ceca): scraping di recensioni pubbliche di Google Maps quando lo richiedi esplicitamente. <a href="https://apify.com/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rosa)' }}>Privacy Apify</a>.</li>
              <li><strong>Meta Platforms Ireland Limited</strong>: pubblicazione su Instagram Business via Graph API. <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rosa)' }}>Privacy Meta</a>.</li>
              <li><strong>Vercel Inc.</strong> (USA): hosting dell'applicazione frontend. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rosa)' }}>Privacy Vercel</a>.</li>
              <li><strong>Functional Software, Inc. dba Sentry</strong> (USA, server EU - Francoforte): monitoraggio errori run-time per migliorare stabilità. Raccoglie stack trace e contesto tecnico SENZA dati personali (PII disabilitati). <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rosa)' }}>Privacy Sentry</a>.</li>
            </ul>
            <p className="mt-2">
              Alcuni di questi fornitori sono situati al di fuori dello Spazio Economico Europeo. In tali casi, ci affidiamo
              alle <strong>Clausole Contrattuali Standard</strong> approvate dalla Commissione Europea e ai meccanismi previsti
              dal Capo V del GDPR per garantire un livello di protezione adeguato.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>6. Periodo di conservazione</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Dati dell'account:</strong> per tutta la durata del rapporto contrattuale + 12 mesi dopo la chiusura.</li>
              <li><strong>Contenuti generati e Brand Kit:</strong> finché non li elimini o chiudi l'account.</li>
              <li><strong>Token Meta:</strong> finché non revochi l'autorizzazione (su Instagram o dal pannello App).</li>
              <li><strong>Log tecnici:</strong> 90 giorni, poi cancellati o anonimizzati.</li>
              <li><strong>Recensioni importate:</strong> finché non le elimini.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>7. I tuoi diritti (artt. 15-22 GDPR)</h2>
            <p>Hai il diritto di:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Accedere ai tuoi dati personali e ottenerne copia.</li>
              <li>Rettificare dati inesatti o incompleti.</li>
              <li>Richiedere la cancellazione ("diritto all'oblio").</li>
              <li>Limitare o opporti al trattamento.</li>
              <li>Ricevere i tuoi dati in formato strutturato (portabilità).</li>
              <li>Revocare il consenso in qualsiasi momento.</li>
              <li>Proporre reclamo al <strong>Garante per la protezione dei dati personali</strong> (<a href="https://www.gpdp.it" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rosa)' }}>www.gpdp.it</a>).</li>
            </ul>
            <p className="mt-2">Per esercitare i tuoi diritti scrivi a <a href="mailto:teamcimmi@gmail.com" style={{ color: 'var(--rosa)' }}>teamcimmi@gmail.com</a>. Risponderemo entro 30 giorni.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>8. Sicurezza</h2>
            <p>Adottiamo misure tecniche e organizzative adeguate per proteggere i tuoi dati, tra cui:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Connessioni cifrate HTTPS/TLS.</li>
              <li>Password salvate in forma cifrata (bcrypt).</li>
              <li>Token Meta cifrati at-rest tramite Supabase Vault (pgcrypto).</li>
              <li>Row Level Security (RLS) sul database per isolare i dati di ciascun utente.</li>
              <li>JWT per autenticazione, autorizzazione granulare sulle Edge Functions.</li>
              <li>Validazione e sanificazione input contro injection (SQL, XSS, SSRF).</li>
              <li>CORS whitelist e rate limiting sulle API.</li>
              <li>Backup automatici del database.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>9. Cookie</h2>
            <p>
              Utilizziamo cookie tecnici essenziali per il funzionamento del Servizio (es. mantenimento della sessione).
              Per maggiori dettagli consulta la nostra <Link to="/cookie-policy" style={{ color: 'var(--rosa)' }}>Cookie Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>10. Minori</h2>
            <p>Il Servizio è rivolto a professionisti maggiorenni. Non raccogliamo intenzionalmente dati di minori di 18 anni.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>11. Modifiche all'informativa</h2>
            <p>
              Potremmo aggiornare questa informativa in caso di modifiche legali o operative. La data di "Ultimo aggiornamento"
              in cima alla pagina indica la versione attuale. Per modifiche sostanziali ti notificheremo via email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--ink)' }}>12. Contatti</h2>
            <p>
              Per qualsiasi domanda relativa al trattamento dei tuoi dati personali contattaci all'indirizzo
              <a href="mailto:teamcimmi@gmail.com" style={{ color: 'var(--rosa)' }}> teamcimmi@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
