# Email Templates — Da configurare in Supabase

Per personalizzare le email transazionali di Supabase Auth, vai su:
👉 https://supabase.com/dashboard/project/cktdoqvyyvjlkpahbjyi/auth/templates

Modifica ognuna delle 4 sezioni qui sotto.

---

## 1) Confirm signup (email di conferma registrazione)

**Subject heading**: `Conferma il tuo account su Fisioaccordo Social Manager AI`

**Message body** (incolla in HTML editor):

```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
</head>
<body style="margin:0;padding:0;background-color:#f6f6f8;font-family:Inter,-apple-system,sans-serif;color:#1a1a2e;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:32px 32px 0;">
              <div style="font-size:11px;font-weight:700;color:#E6007E;letter-spacing:1px;text-transform:uppercase;">FISIOACCORDO POLIPARTNER</div>
              <div style="font-size:14px;font-weight:500;color:#1a1a2e;margin-top:2px;letter-spacing:0.3px;">Social Media Manager AI</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px;">
              <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#1a1a2e;letter-spacing:-0.5px;">Benvenuto!</h1>
              <p style="font-size:14px;line-height:1.5;color:#5a5a6a;margin:0 0 24px;">
                Grazie per esserti registrato a Fisioaccordo Social Manager AI.<br>
                Clicca il bottone qui sotto per confermare il tuo indirizzo email e iniziare a generare contenuti per il tuo studio.
              </p>
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1a1a2e;color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:0.3px;">
                Conferma email
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="border-top:1px solid #f0f0f4;padding-top:20px;font-size:11px;color:#a0a0a8;line-height:1.5;">
                Se non hai richiesto la creazione di un account, ignora pure questa email.<br><br>
                Hai bisogno di aiuto? Scrivici a <a href="mailto:teamcimmi@gmail.com" style="color:#E6007E;">teamcimmi@gmail.com</a>.<br>
                <br>
                <strong style="color:#5a5a6a;">Cimmi LLC</strong> — Fisioaccordo Social Media Manager AI
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2) Reset password (recupero password)

**Subject heading**: `Reimposta la tua password — Fisioaccordo Social Manager AI`

**Message body**:

```html
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f6f6f8;font-family:Inter,-apple-system,sans-serif;color:#1a1a2e;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="padding:32px 32px 0;">
          <div style="font-size:11px;font-weight:700;color:#E6007E;letter-spacing:1px;text-transform:uppercase;">FISIOACCORDO POLIPARTNER</div>
          <div style="font-size:14px;font-weight:500;color:#1a1a2e;margin-top:2px;letter-spacing:0.3px;">Social Media Manager AI</div>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;">
          <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#1a1a2e;letter-spacing:-0.5px;">Reimposta password</h1>
          <p style="font-size:14px;line-height:1.5;color:#5a5a6a;margin:0 0 24px;">
            Hai richiesto di reimpostare la password del tuo account.<br>
            Clicca il bottone qui sotto per scegliere una nuova password. Il link è valido per 1 ora.
          </p>
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1a1a2e;color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:0.3px;">
            Reimposta password
          </a>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="border-top:1px solid #f0f0f4;padding-top:20px;font-size:11px;color:#a0a0a8;line-height:1.5;">
            Se non hai richiesto il reset della password puoi ignorare questa email — la tua password attuale resta valida.<br><br>
            Hai bisogno di aiuto? <a href="mailto:teamcimmi@gmail.com" style="color:#E6007E;">teamcimmi@gmail.com</a>.<br><br>
            <strong style="color:#5a5a6a;">Cimmi LLC</strong>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 3) Magic Link (se attivato)

**Subject heading**: `Il tuo link di accesso a Fisioaccordo Social Manager AI`

**Message body**:

```html
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f6f6f8;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="padding:32px 32px 0;">
          <div style="font-size:11px;font-weight:700;color:#E6007E;letter-spacing:1px;text-transform:uppercase;">FISIOACCORDO POLIPARTNER</div>
          <div style="font-size:14px;font-weight:500;color:#1a1a2e;margin-top:2px;letter-spacing:0.3px;">Social Media Manager AI</div>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;">
          <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#1a1a2e;letter-spacing:-0.5px;">Accedi al tuo account</h1>
          <p style="font-size:14px;line-height:1.5;color:#5a5a6a;margin:0 0 24px;">
            Clicca il bottone qui sotto per entrare nel tuo account. Il link è valido per 1 ora.
          </p>
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1a1a2e;color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">
            Entra ora
          </a>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="border-top:1px solid #f0f0f4;padding-top:20px;font-size:11px;color:#a0a0a8;line-height:1.5;">
            Se non hai richiesto questo link puoi ignorare l'email.<br><br>
            <strong style="color:#5a5a6a;">Cimmi LLC</strong> — <a href="mailto:teamcimmi@gmail.com" style="color:#E6007E;">teamcimmi@gmail.com</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 4) Change email address (conferma cambio email)

**Subject heading**: `Conferma il nuovo indirizzo email`

**Message body**:

```html
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f6f6f8;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="padding:32px 32px 0;">
          <div style="font-size:11px;font-weight:700;color:#E6007E;letter-spacing:1px;text-transform:uppercase;">FISIOACCORDO POLIPARTNER</div>
          <div style="font-size:14px;font-weight:500;color:#1a1a2e;margin-top:2px;letter-spacing:0.3px;">Social Media Manager AI</div>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;">
          <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#1a1a2e;letter-spacing:-0.5px;">Conferma il nuovo indirizzo</h1>
          <p style="font-size:14px;line-height:1.5;color:#5a5a6a;margin:0 0 24px;">
            Hai richiesto di cambiare l'email associata al tuo account. Conferma cliccando qui sotto.
          </p>
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1a1a2e;color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">
            Conferma nuovo indirizzo
          </a>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="border-top:1px solid #f0f0f4;padding-top:20px;font-size:11px;color:#a0a0a8;line-height:1.5;">
            Non hai richiesto questa modifica? Scrivici subito a <a href="mailto:teamcimmi@gmail.com" style="color:#E6007E;">teamcimmi@gmail.com</a>.<br><br>
            <strong style="color:#5a5a6a;">Cimmi LLC</strong>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## Setup SMTP custom (opzionale)

Di default Supabase invia da `noreply@supabase.io` (limite 3 email/ora in free tier).

Per usare un mittente professionale (`noreply@fisioaccordo.it`) configura SMTP custom su:
👉 Auth → Settings → SMTP Settings

Provider consigliati (free tier generosi):
- **Resend**: 100 email/giorno gratis, $20/mese 50k
- **Brevo (ex Sendinblue)**: 300 email/giorno gratis
- **SendGrid**: 100 email/giorno gratis

Servono solo: SMTP host, port, username, password (di solito API key).
