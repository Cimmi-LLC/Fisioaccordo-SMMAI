

## Dove sono i checkbox e cosa serve aggiungere

### Stato attuale

Il checkbox per accettare **Terms of Service** e **Privacy Policy** esiste gia' nella pagina di **registrazione** (`/auth` → tab "Sign Up"). Quando un utente si registra, deve spuntare il checkbox prima di poter creare l'account.

### Cosa manca per Meta

Meta vuole vedere che l'utente acconsente esplicitamente ai permessi **anche quando connette Instagram**. Attualmente il componente `MetaConnection` non ha alcun checkbox di consenso — l'utente clicca "Connect Instagram Business" e parte direttamente l'OAuth.

### Piano

Aggiungere un **checkbox di consenso dati** nel componente `MetaConnection.tsx`, visibile PRIMA del pulsante "Connect Instagram Business". Il checkbox deve:

- Contenere un testo tipo: *"I agree to share my Instagram data (username, access token) with this app as described in the [Privacy Policy](/privacy) and [Terms of Service](/terms)"*
- Disabilitare il pulsante "Connect Instagram Business" finche' non viene spuntato
- Essere ben visibile nello screenshot/video per Meta

**File da modificare: `src/components/MetaConnection.tsx`**

Aggiungere:
1. Stato `agreedToConnect` (boolean, default false)
2. Checkbox con label che linka a `/privacy` e `/terms`
3. Il pulsante "Connect Instagram Business" diventa `disabled` se `!agreedToConnect`

### Riepilogo per gli screenshot Meta

Dopo questa modifica, potrai mostrare a Meta:
1. **Screenshot 1**: Pagina Sign Up con checkbox Terms/Privacy spuntato
2. **Screenshot 2**: Sezione Instagram Connection con checkbox consenso dati spuntato, prima di cliccare "Connect"

Un solo file modificato, modifica minima.

