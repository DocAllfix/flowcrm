# Versione dimostrativa in sola lettura

La demo distribuibile si **naviga per intero** (ogni pagina, scheda, dashboard,
grafico, ricerca) ma **non accetta scritture** dagli utenti finali: ogni
tentativo mostra *"Funzione disponibile solo nella versione completa. Contatta
per attivarla."*

La barriera è nel **database**, non nei bottoni: il trigger
`blocca_scrittura_demo()` è agganciato a tutte le tabelle di dominio e nega
INSERT/UPDATE/DELETE quando l'istanza è in sola lettura e l'utente non è un
manutentore. Bloccare solo la UI lascerebbe passare chi chiama l'API dalla
console del browser; così invece è impossibile aggirarla.

## Come funziona

- Interruttore d'istanza: `impostazioni_istanza.sola_lettura` (riga singola).
- Whitelist: `user_profiles.manutentore = true` → può scrivere anche in sola
  lettura (account di manutenzione e account di test automatici).
- Bypass tecnico: test pgTAP e operazioni di manutenzione (psql / SQL editor)
  girano come `postgres`, non come `authenticator`, quindi non sono mai
  bloccati. Solo le richieste reali via API (PostgREST = `authenticator`) sono
  soggette al blocco.

## Credenziali demo (istanza online con i dati di test)

Quattro account **admin in sola lettura** (vedono tutto, non toccano niente),
utilizzabili anche **in contemporanea** senza conflitti (la sola lettura
elimina ogni rischio di collisione):

| Email | Password |
|---|---|
| `demo1@flowcrm.local` | `DemoFlowCRM2026` |
| `demo2@flowcrm.local` | `DemoFlowCRM2026` |
| `demo3@flowcrm.local` | `DemoFlowCRM2026` |
| `demo4@flowcrm.local` | `DemoFlowCRM2026` |

Account **di manutenzione** (può scrivere, per curare i dati della demo):
`manutenzione@flowcrm.local` / `Manutenzione2026!`

## Comandi di gestione (come `postgres`, es. SQL editor Supabase o db query)

```sql
-- Accendere / spegnere la sola lettura sull'istanza
UPDATE impostazioni_istanza SET sola_lettura = true;   -- demo (default consegnato)
UPDATE impostazioni_istanza SET sola_lettura = false;  -- istanza cliente normale

-- Aggiungere un account demo (sola lettura): crearlo e lasciarlo manutentore=false.
-- Promuovere un account a manutentore (può scrivere anche in demo):
UPDATE user_profiles SET manutentore = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'nome@dominio');

-- Revocare un manutentore:
UPDATE user_profiles SET manutentore = false
WHERE id = (SELECT id FROM auth.users WHERE email = 'nome@dominio');
```

Su un'**istanza cliente** (non demo) basta lasciare `sola_lettura = false`: il
trigger c'è ma non blocca nulla, quindi il CRM funziona in scrittura come sempre.
