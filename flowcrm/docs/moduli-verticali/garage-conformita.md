# Garage e autorimesse — conformità al documento di specifica

Verifica sezione per sezione del documento `moduliaggiuntivi2/Garage e autorimesse.docx`
(25 sezioni) contro ciò che il modulo fa. Esiti:

- **Fatto**: disponibile nel prodotto, coperto da test.
- **Predisposto**: dati, stati e punti di aggancio pronti; il collegamento con il fornitore
  esterno si attiva su richiesta.
- **Riuso**: lo fa una parte già esistente del CRM (nucleo o fondamenta).

Cassa e conti, asset e manutenzioni, segnalazioni di sicurezza, turni e campagne sono le
fondamenta con modulo `garage`; clienti nel CRM come contatti o organizzazioni. Ciò che è
solo dell'autorimessa è nelle migrazioni `20261010000001_garage_struttura.sql` (strutture,
posti, clienti, veicoli, tariffari, contratti e rate, convenzioni, accessi autorizzati,
prenotazioni, soste) e `…02_garage_servizi.sql` (chiavi, danni, colonnine e ricariche,
servizi, pneumatici, lista d'attesa, consuntivo e fattura delle convenzioni, giro notturno,
indicatori, cruscotto, segmenti, ricerca). Test: pgTAP `040`–`041` (101 verifiche); e2e
`e2e/garage.spec.ts`.

| § | Sezione | Esito | Dove |
|---|---|---|---|
| 1 | Anagrafica autorimessa: denominazione, indirizzo, tipologia, superficie, piani, posti totali, coperti, scoperti, moto, commerciali, elettrici, altezza e peso massimi, orari, modalità di accesso, responsabile | Fatto | `gar_strutture` (anche più strutture) e scheda «Struttura»; i conteggi dei posti si calcolano dai posti (`gar_strutture_riepilogo`) |
| 2 | Mappa: piani, corsie, aree, posti auto e moto, rampe, ingressi, uscite, colonnine, aree riservate e di servizio; posto selezionabile dalla mappa | Fatto | «Mappa dei posti» piano per piano con le aree (`gar_aree`), l'icona della colonnina e lo stato dal vivo; ogni posto si apre con i suoi dati e le azioni |
| 3 | Posti: codice, piano, zona, numero, tipologia, dimensioni, coperto, riservato, stato, cliente, veicolo, data di assegnazione, canone, note; stati Libero, Occupato, Prenotato, Riservato, In manutenzione, Non disponibile | Fatto | `gar_posti` e la vista `gar_posti_stato` con i sei stati; inserimento a file di posti numerati |
| 4 | Clienti privati e aziendali: anagrafica, CF, P. IVA, recapiti, veicoli, posti, contratti, prenotazioni, accessi, pagamenti, insoluti, comunicazioni | Fatto / Riuso | `gar_clienti` (nasce anche il contatto o l'organizzazione del CRM) e scheda del cliente; le comunicazioni sono nella scheda del CRM e negli avvisi automatici |
| 5 | Veicoli: targa, marca, modello, tipo, colore, alimentazione, cilindrata, dimensioni, peso, proprietario, utilizzatore, assicurazione, note, foto; più veicoli per cliente | Fatto | `gar_veicoli` con la targa normalizzata; foto, libretto e delega tra gli allegati del veicolo |
| 6 | Contratti (abbonamento mensile e annuale, sosta giornaliera, oraria, notturna, posto riservato, custodia, noleggio, convenzione): cliente, veicolo, posto, date, canone, periodicità, deposito, condizioni, rinnovo, recesso | Fatto | `gar_contratti`: un posto mai di due contratti nello stesso periodo (vincolo nel database); recesso con preavviso; fine contratto tra le scadenze |
| 7 | Ingressi e uscite: data, ora, veicolo, targa, cliente, ingresso, uscita, posto, operatore, modalità; integrazione con lettura targhe, badge, RFID, QR, telecomandi, app, controllo accessi | Fatto / Predisposto | `gar_soste` e pagina «Ingressi e uscite» con il registro del giorno; i dispositivi chiamano `gar_ingresso` e `gar_uscita` come l'operatore |
| 8 | Rotazione: ingresso, ticket, posto, durata, tariffa, uscita, pagamento, chiusura; importo calcolato in automatico | Fatto | Ticket e posto assegnati all'ingresso; all'uscita `gar_calcola_tariffa` e il conto di cassa, che saldato chiude la sosta |
| 9 | Tariffari: oraria, giornaliera, notturna, festiva, settimanale, mensile, annuale, abbonamenti, convenzionate, per tipo di veicolo, fasce orarie e condizioni | Fatto | `gar_tariffari`: franchigia, frazioni, notte a prezzo fisso anche a cavallo della mezzanotte, festivi (fissi nazionali più `gar_festivi`), tetto giornaliero, tipo di veicolo, convenzionate; simulatore nella pagina delle tariffe |
| 10 | Prenotazioni: cliente, veicolo, data, ora di ingresso e di uscita, posto, tariffa, pagamento anticipato, stato; prenotazione online | Fatto / Predisposto | `gar_prenotazioni` senza doppioni sullo stesso posto (vincolo), importo previsto, anticipo come conto da incassare e scalato all'uscita; canale online e app predisposti |
| 11 | Abbonamenti: piano, cliente, veicolo, posto, periodicità, data di rinnovo, canone, pagamento automatico, scadenza, sospensione, rinnovo | Fatto / Predisposto | Rate emesse ogni periodo (`gar_rate`), rinnovo automatico, sospensione con date; l'addebito automatico è predisposto |
| 12 | Pagamenti e cassa: incassi, elettronici, contanti, POS, online, fatture, ricevute, abbonamenti, insoluti, rimborsi, note di credito, cassa giornaliera | Fatto / Riuso / Predisposto | Cassa delle fondamenta (sessione giornaliera, pagamenti misti, fattura dal conto); canoni e insoluti; rimborso dell'eccedenza; note di credito dalle fatture del nucleo; pagamenti online e scontrino fiscale predisposti |
| 13 | Clienti aziendali: azienda, posti acquistati, dipendenti e veicoli autorizzati, tariffa convenzionata, contratto, fatturazione periodica, scadenze, consuntivo | Fatto | `gar_convenzioni`: dentro i posti acquistati la sosta è compresa, oltre si paga la tariffa convenzionata; `gar_convenzione_consuntivo` e `gar_fattura_convenzione` (canoni, soste oltre i posti, ricariche; niente si fattura due volte) |
| 14 | Accessi autorizzati: veicoli, persone, fasce orarie, posti, livello, accessi temporanei, ospiti | Fatto | `gar_autorizzazioni` e `gar_verifica_accesso`: fuori fascia o con canone insoluto il titolo non vale e lo si vede |
| 15 | Chiavi: numero, veicolo, cliente, armadietto, posizione, consegna, restituzione, operatore, data e ora, tracciabilità | Fatto | `gar_chiavi` e il registro `gar_chiavi_movimenti`, che non si modifica |
| 16 | Danni e anomalie (ingresso, uscita, incidente, urto, furto, smarrimento, anomalia, contestazione) con foto, video, testimoni, operatore, data, relazione, documenti assicurativi | Fatto | `gar_danni` legato alla sosta, avviso alla direzione; foto, video, verbali e documenti tra gli allegati |
| 17 | Videosorveglianza e sicurezza: telecamere, targhe, accessi, allarmi, antincendio, fumo, CO, emergenze, nel rispetto della privacy | Predisposto / Riuso | Segnalazioni di sicurezza delle fondamenta; il danno conserva solo il riferimento alla registrazione, non le immagini |
| 18 | Manutenzione della struttura: cancelli, serrande, ascensori, impianti, illuminazione, ventilazione, antincendio, pompe, sicurezza, colonnine | Riuso | Asset e interventi delle fondamenta (F0.2) nella pagina «Impianti e sicurezza»; manutenzioni aperte nel cruscotto |
| 19 | Colonnine: colonnina, presa, potenza, stato, veicolo, cliente, inizio e fine, energia, costo, pagamento | Fatto / Predisposto | `gar_colonnine`, `gar_ricariche` (una presa un veicolo; costo = kWh × tariffa); la lettura automatica dei kWh è predisposta |
| 20 | Servizi aggiuntivi (lavaggio, pulizia, sanificazione, gomme, ricarica, piccola manutenzione, revisione, recupero e consegna, custodia chiavi) associati al veicolo e fatturati a parte | Fatto | `gar_servizi_listino` e `gar_servizi`: prezzo di listino, conto a lavoro finito, avviso «veicolo pronto» |
| 21 | Pneumatici: set, marca, misura, stagione, numero di serie, deposito, posizione, stato, restituzione prevista | Fatto | `gar_pneumatici` con la restituzione prevista tra le scadenze |
| 22 | Documenti: contratti, documenti di cliente e veicolo, assicurazioni, deleghe, autorizzazioni, verbali, ricevute, danni | Riuso | Allegati del nucleo sul cliente, sul veicolo, sul danno e sul set di gomme, con le categorie |
| 23 | Comunicazioni automatiche: scadenza abbonamento, mancato pagamento, prenotazione, conferma d'ingresso, disponibilità posto, scadenza contratto, anomalie, veicolo pronto, promozioni | Fatto / Predisposto | Email automatiche (`gar_avvisa`) dal giro notturno e dagli eventi; lista d'attesa (`gar_attese`) per la disponibilità; anomalie alla direzione; promozioni con le campagne e i segmenti del garage. SMS e app predisposti |
| 24 | KPI: occupazione (totali, occupati, tasso, liberi, per fascia oraria, per piano), economici (parcheggio, abbonamenti, servizi, medio per posto e per veicolo, insoluti), operativi (ingressi, uscite, permanenza, prenotazioni, utilizzo, anomalie, danni) | Fatto | `gar_kpi` e pagina «Analisi»; i dati economici solo alla direzione |
| 25 | Dashboard: mappa, liberi, occupati, prenotazioni, veicoli presenti, movimenti dal vivo, abbonamenti in scadenza, incassi del giorno, insoluti, allarmi, manutenzioni, colonnine | Fatto | `gar_cruscotto` e pagina «Cruscotto», aggiornata dal vivo |

## Fuori perimetro, con motivo

- **Lettori di targhe, badge, RFID, telecomandi, app, controllo accessi** (§7, §14):
  predisposti; il collegamento con ogni dispositivo è un lavoro a parte, su richiesta.
- **Videosorveglianza, allarmi, antincendio, rilevatori** (§17): predisposti; il gestionale
  non conserva immagini, come richiede la normativa sulla videosorveglianza.
- **Pagamenti online, addebito ricorrente, scontrino fiscale** (§11–12): predisposti; il conto
  ha il campo per il riferimento del registratore telematico.
- **Prenotazione online** (§10) e **SMS e app** (§23): predisposti.
- **Lettura automatica dell'energia dalle colonnine** (§19): predisposta; oggi i kWh si
  leggono dal display.
