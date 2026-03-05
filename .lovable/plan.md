
## Diagnosi

Il problema è chiaro dai log:
- L'utente `gianfrancodurand@gmail.com` è **già registrato** nel database Supabase
- Supabase restituisce errore 422 `user_already_exists`
- Il codice attuale mostra solo un toast generico "Registration error: User already registered"
- **Nessun bug nel codice** — il codice funziona correttamente, ma la UX è pessima: l'utente non capisce cosa fare

## Soluzione: UX migliorata nella pagina Auth

Due interventi in `src/pages/Auth.tsx`:

**1. Gestione intelligente dell'errore "user already registered"**  
Quando il signup fallisce con `user_already_exists`, invece del toast generico:
- Mostrare un toast con messaggio chiaro in italiano: "Email già registrata — accedi con il tab Login"
- Switchare **automaticamente** al tab "Login" 
- Pre-compilare il campo email nel form di login

**2. Aggiungere `activeTab` come stato controllato**  
I `Tabs` di Radix devono diventare controllati (`value` + `onValueChange`) per poter switchare tab programmaticamente dall'handler di signup.

## File da modificare

| File | Modifica |
|------|----------|
| `src/pages/Auth.tsx` | Aggiungere `activeTab` state, gestire errore `user_already_exists` con auto-switch al Login tab |

### Dettaglio tecnico

```tsx
// Aggiungere stato
const [activeTab, setActiveTab] = useState('signin');

// Nel handleSignUp, intercettare l'errore specifico
if (error.message.includes('already registered') || error.code === 'user_already_exists') {
  toast({
    title: "Email già registrata",
    description: "Hai già un account. Ti portiamo al Login!",
  });
  setActiveTab('signin'); // switch automatico al tab Login
  setFormData(prev => ({ ...prev, email: formData.email })); // email già pre-compilata
  return;
}

// Tabs diventano controllati
<Tabs value={activeTab} onValueChange={setActiveTab}>
```
