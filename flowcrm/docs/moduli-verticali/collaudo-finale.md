# Collaudo finale dei moduli verticali (Sprint 8)

Collaudo dei dodici moduli insieme, a programma concluso, sullo stack locale con tutte
le licenze accese (`VITE_MODULES` con i dodici slug). Data: 5 ottobre 2026.

## Cosa è stato verificato

| Verifica | Esito |
|---|---|
| pgTAP su database pulito (tutte le migrazioni da zero) | 1081 / 1081 |
| Tipi (`tsc -b`), lint (`oxlint`) | nessun errore |
| Test unitari (vitest) | 676 / 676 (nuovo: `moduli-installazione.test.ts`) |
| Build di produzione e peso di avvio (senza `.env.local`) | 306 kB gzip, tetto 313 kB |
| e2e Playwright, suite completa | 45 passati, 2 saltati (richiedono credenziali non presenti in locale) |
| Giro di tutte le pagine dei moduli (117 percorsi letti dai menu) | 0 errori in console, 0 risposte HTTP ≥ 400, 0 scorrimenti orizzontali, 0 pagine vuote |
| … da amministratore, da operatore, al telefono (390 px), in tema scuro | come sopra in tutte e quattro le combinazioni |
| Collaudo funzionale modulo per modulo (flusso principale, ruoli, tablet, telefono, scuro) | fatto a ogni sprint; per Garage e Agenzia immobiliare rifatto in questo ramo |
| Matrici di conformità ai documenti | sette matrici in questa cartella, ogni sezione con un esito |

## Difetti trovati e corretti

Trovati dal collaudo trasversale, quindi validi per tutta l'applicazione:

1. **Installazione Docker**: `docker-entrypoint.sh` e `preflight.sh` accettavano solo i cinque
   moduli vecchi; un'istanza con `MODULES=ristorante` non sarebbe partita. Elenchi aggiornati e
   protetti dal test `moduli-installazione.test.ts`, che li confronta con il registro.
2. **Copilot**: conosceva solo i cinque moduli vecchi. Ora legge prenotazioni, ordini, contratti,
   soste, immobili, richieste e lead (sempre con la RLS dell'utente), apre le pagine dei moduli
   nuovi e ha lo strumento `cruscotto_modulo` sui cruscotti di ristorante, bar, hotel, palestra,
   fioraio, garage e agenzia.
3. **Selettore dei moduli**: con dodici voci superava l'altezza dello schermo. Ora è raggruppato
   per famiglia (Edilizia e appalti, Ospitalità e ristorazione, Servizi e commercio, Sanità) e
   scorre.
4. **Stati vuoti**: trentadue stati vuoti senza un passo successivo né il segno `filtrato`
   (regola di `DESIGN.md`), nei moduli vecchi e nelle guardie di configurazione viste
   dall'operatore. Le pagine elenco ora offrono «Nuovo…», i riquadri informativi sono marcati.
5. Corretti durante gli sprint e validi per tutti: finestre di dialogo alte non scorrevano;
   schede che andando a capo si sovrapponevano; la cassa mostrava «Cassa chiusa» mentre
   caricava; la ricerca Ctrl+K mandava hotel, palestra e fioraio alla pagina dei contatti.

## Note

- `/ristorante` e `/bar` non arrivano mai a «rete ferma»: cassa e cucina si aggiornano
  continuamente per scelta. Non è lentezza: la pagina è pronta in meno di due secondi.
- Le integrazioni esterne (cassa fiscale, portali, OTA, badge e targhe, pagamenti online, SMS)
  restano predisposte e non collegate, come deciso; ogni matrice le elenca.

## Prossimo passo

Sprint 9, rilascio: migrazioni sul database della demo (con il via libera esplicito), moduli
spenti in produzione finché non servono (licenza e `VITE_MODULES`), controlli dopo il rilascio,
ritorno indietro possibile (migrazioni solo aggiuntive, modulo spegnibile).
