

## Recupero Password + Mostra/Nascondi Password

### Cosa viene aggiunto

1. **Icona occhio** sui campi password (login e registrazione) per mostrare/nascondere la password digitata
2. **Link "Password dimenticata?"** sotto il form di login che apre un dialog per inserire l'email e ricevere il link di reset
3. **Pagina `/reset-password`** per impostare la nuova password dopo aver cliccato il link nell'email

### Dettagli tecnici

**File: `src/pages/Auth.tsx`**
- Aggiungere stato `showPassword` (boolean) per toggle visibilita' password
- Cambiare `type` dell'input password da `"password"` a `showPassword ? "text" : "password"`
- Aggiungere icona `Eye`/`EyeOff` da lucide-react come bottone dentro il campo password (sia login che registrazione)
- Aggiungere stato `showForgotPassword` per il dialog di recupero
- Aggiungere link "Password dimenticata?" tra il checkbox "Resta collegato" e il bottone "Accedi"
- Dialog con input email + bottone che chiama `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`

**File: `src/pages/ResetPassword.tsx`** (nuovo)
- Pagina pubblica su route `/reset-password`
- Controlla `type=recovery` nell'URL hash
- Form con due campi "Nuova password" e "Conferma password" (entrambi con toggle visibilita')
- Chiama `supabase.auth.updateUser({ password })` per aggiornare
- Dopo il successo, redirect a `/auth`

**File: `src/App.tsx`**
- Aggiungere route `<Route path="/reset-password" element={<ResetPassword />} />`

### Struttura UI

**Login - campo password con toggle:**
```text
[Password          ] [icona occhio]
[x] Resta collegato
Password dimenticata?      <-- link cliccabile
[     Accedi     ]
```

**Dialog recupero password:**
```text
Recupera Password
Inserisci la tua email e ti invieremo un link per reimpostare la password.
[Email                    ]
[  Invia link di recupero  ]
```

**Pagina /reset-password:**
```text
Reimposta Password
[Nuova password       ] [occhio]
[Conferma password    ] [occhio]
[  Aggiorna Password  ]
```

