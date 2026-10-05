# Palestra — conformità al documento di specifica

Verifica sezione per sezione del documento `moduliaggiuntivi2/Palestra.docx` (41 sezioni)
contro ciò che il modulo fa. Esiti:

- **Fatto**: disponibile nel prodotto, coperto da test.
- **Predisposto**: dati, stati e punti di aggancio pronti; il collegamento con il fornitore
  esterno si attiva su richiesta.
- **Riuso**: lo fa una parte già esistente del CRM (nucleo o fondamenta).
- **Escluso**: non sviluppato, con il motivo.

Migrazioni: `20261008000001_palestra_soci.sql` (sedi, soci, formule, abbonamenti, carnet,
sospensioni, incassi, accessi, convenzioni, armadietti, prospect, certificazioni),
`…02_palestra_attivita.sql` (corsi, prenotazioni, personal training, schede, dati sulla
salute, wellness), `…03_palestra_analisi.sql` (indicatori, cruscotto, segmenti, fattura alle
aziende, «porta un amico», ricerca), `…04_palestra_interfaccia.sql` (vendita al banco).
Test: pgTAP `035`–`037` (95 verifiche); e2e `e2e/palestra.spec.ts`.

| § | Sezione | Esito | Dove |
|---|---|---|---|
| 1 | Anagrafica iscritti: dati, recapiti, foto, contatti d'emergenza, data d'iscrizione, stato, storico di abbonamenti e pagamenti, accessi, corsi, personal trainer, schede, servizi, note, preferenze; cliente → socio → utilizzatore | Fatto | Contatto del nucleo (cliente) + `pal_soci` (socio: codice, emergenza, tessera, QR, trainer, preferenze) + accessi e servizi (utilizzatore); stato in `pal_soci_stato`; scheda del socio a schede; foto tra i documenti |
| 2 | Prospect: lead, richieste, visite, prove gratuite, appuntamenti, preventivi, follow-up, conversioni, motivi di mancata iscrizione; pipeline Lead → Contatto → Visita → Prova → Offerta → Iscrizione; KPI di conversione | Fatto / Riuso | Pipeline «Palestra · Prospect» del nucleo con le sei fasi più «Persa» e il motivo; `pal_prove` per visite e prove; l'iscrizione chiude la trattativa come vinta; conversione e motivi in `pal_kpi`. Appuntamenti, preventivi e richiami sono attività e offerte del nucleo sul deal |
| 3 | Abbonamenti: mensile, trimestrale, semestrale, annuale, open, fasce orarie, sala pesi, corsi, piscina, wellness, PT, corporate, studenti, famiglie; durata, inizio, fine, prezzo, accessi, fasce, servizi inclusi, limitazioni, rinnovo | Fatto | `pal_formule` (tutti i tipi, fasce, ingressi, servizi, limitazioni, rate, rinnovo automatico) e `pal_abbonamenti` |
| 4 | Pacchetti e carnet (10 e 20 ingressi, 10 lezioni PT, 5 massaggi, 10 corsi, combinati) con decremento automatico | Fatto | `pal_pacchetti` con una o più voci, `pal_carnet` che scala a ogni ingresso, prenotazione, sessione o appuntamento |
| 5 | Sospensione, congelamento, proroga, recupero giorni; motivazione, periodo, autorizzazione; scadenza aggiornata da sola | Fatto | `pal_sospensioni`: la reception chiede, la direzione autorizza, la fine dell'abbonamento si sposta dei giorni |
| 6 | Rinnovi: in scadenza, scaduti, effettuati, persi, automatici; campagna «scade tra 15 giorni» | Fatto | `pal_rinnova`, giro notturno (`pal_rinnovi_notturni`: rinnovo automatico, scadenza, avviso a 15 giorni), scheda «Scadenze e rinnovi», rinnovati e persi in `pal_kpi`, segmento «in scadenza» |
| 7 | Accessi con badge, QR, app, tessera, biometria; data, ingresso, uscita, socio, tipo, sede, servizio | Fatto / Predisposto / Escluso | `pal_accessi` con tutti i campi; ingresso dal codice della tessera, del badge o del QR. Lettori, tornelli e app usano la stessa funzione (predisposti). **Biometria esclusa**: dato particolare (art. 9 GDPR), né sviluppata né predisposta |
| 8 | Controllo accessi: abbonamento attivo, accessi residui, fascia oraria, blocchi, scadenza, morosità, autorizzazioni; può impedire l'accesso | Fatto | `pal_verifica_accesso` con il motivo di ogni no (firma delle condizioni, certificato medico, insoluto, blocco, sospensione, fuori fascia, ingressi finiti, scaduto) |
| 9 | Corsi (yoga … arti marziali, personalizzati): nome, descrizione, sala, giorni, orario, durata, capienza, istruttore, livello, partecipanti | Fatto | `pal_corsi` |
| 10 | Calendario settimanale e mensile: corso, sala, istruttore, orario, posti, iscritti, lista d'attesa, cancellazioni | Fatto | `pal_lezioni` generate dagli orari, `pal_lezioni_posti`; calendario a settimana o a quattro settimane |
| 11 | Prenotazione di corso, giorno, ora, posto; prenotazione → check-in → partecipazione; carnet o abbonamento aggiornati | Fatto / Predisposto | `pal_prenotazioni` con check-in e credito scalato; il posto numerato (bici, tappetino) ha il suo campo, la scelta sulla piantina è predisposta con l'app |
| 12 | Lista d'attesa: inserimento, posizione, notifica, conferma automatica, scorrimento | Fatto | L'ultimo posto va a uno solo (blocco della lezione); `pal_scorri_attesa` alla disdetta, con avviso per email |
| 13 | No-show: penalità, blocco temporaneo, consumo del credito, avviso | Fatto | `pal_chiudi_lezione` con le regole della sede (penale, soglia e finestra, giorni di blocco, credito) |
| 14 | Personal trainer: nome, competenze, specializzazioni, disponibilità, tariffe, clienti, sessioni fatte e residue, compensi | Fatto | `pal_trainer`, `pal_trainer_riepilogo` (i compensi li vedono la direzione e il trainer stesso) |
| 15 | Agenda del PT: appuntamenti, cliente, tipo, durata, sala, stato, note | Fatto | `pal_sessioni_pt` (il trainer non ha due clienti insieme), agenda per giorno e per trainer |
| 16 | Scheda di allenamento: obiettivi, programma, esercizi, serie, ripetizioni, carichi, recuperi, frequenza, note; storico delle modifiche | Fatto | `pal_schede` e `pal_schede_esercizi`; ogni nuova versione lascia la precedente nello storico |
| 17 | Progressi: peso, altezza, misure, performance, carichi, obiettivi; grafici e storico; basi giuridiche e controlli d'accesso per i dati sulla salute | Fatto | `pal_misurazioni` con grafico; visibili solo al trainer assegnato e all'amministratore, con il consenso del socio; fuori dal registro delle modifiche; cancellate alla revoca del consenso |
| 18 | Valutazione iniziale: obiettivi, livello, test funzionali, parametri, valutazione, programma proposto, follow-up | Fatto | `pal_valutazioni` (stesse regole dei dati sulla salute) |
| 19 | Prenotazioni PT: sessioni, pacchetti, durata, trainer, cliente, sala, costo, crediti residui, cancellazioni | Fatto | Sessione dal carnet PT o a tariffa con la rata; annullata = credito o addebito restituito |
| 20 | Wellness: sauna, bagno turco, massaggi, estetica, solarium, SPA, fisioterapia, nutrizione, recovery; appuntamenti autonomi | Fatto | `pal_servizi` e `pal_appuntamenti` con cabina e operatore mai doppi, dal carnet o a listino, anche per clienti esterni |
| 21 | Vendita prodotti con Magazzino e POS | Fatto / Riuso | `pal_vendi_prodotti`: dal magazzino al conto, incasso dalla Cassa delle fondamenta; POS come metodo (terminale collegato predisposto) |
| 22 | Magazzino: carichi, scarichi, inventari, scorte minime, lotti, scadenze | Riuso | Magazzino delle fondamenta (F0.1) |
| 23 | Attrezzature fitness: codice, marca, modello, matricola, acquisto, costo, garanzia, ubicazione, stato, vita utile | Riuso | Asset delle fondamenta (F0.2) con le categorie della palestra |
| 24 | Manutenzione: preventiva, ordinaria, guasti, interventi, tecnici, costi, ricambi, contratti di assistenza, scadenze, alert | Riuso | Piani e interventi degli asset (F0.2), scadenze in notifica |
| 25 | Pulizia e sanificazione di sale, attrezzature, spogliatoi, docce, bagni, reception, aree comuni; attività, operatore, data, ora, esito, anomalie | Riuso | Registri di controllo delle fondamenta (F0.7) |
| 26 | Spogliatoi: armadietti, numero, assegnatario, chiave o badge, cauzione, stato, scadenza | Fatto | `pal_armadietti` con la scadenza dell'assegnazione in notifica |
| 27 | Sale e ambienti con capienza, attrezzature e disponibilità | Fatto | `pal_sale`; una sala non ospita due lezioni insieme |
| 28 | Eventi: open day, workshop, gare, seminari, masterclass, challenge, aziendali; iscrizioni, partecipanti, docenti, costi, ricavi, presenze | Riuso | Eventi delle fondamenta (F0.8) |
| 29 | Corporate wellness: azienda, dipendenti, convenzione, tariffe, servizi, budget, fatturazione, report di utilizzo | Fatto | `pal_convenzioni` (sconto, quota a carico dell'azienda, budget), `pal_convenzioni_utilizzo`, `pal_fattura_convenzione` |
| 30 | Pagamenti: contanti, POS, bonifico, online, addebito ricorrente, rateizzazione, voucher, gift card; riconciliazione | Fatto / Predisposto | `pal_rate` con i metodi e le rate; incasso in cassa con la chiusura di cassa per la riconciliazione; voucher e gift card dalla Cassa. Pagamento online e mandato di addebito con il gestore dei pagamenti predisposti |
| 31 | Fatture, ricevute, note di credito, a privati, aziendali, ricorrenti, rate, insoluti | Fatto / Predisposto | Fattura del nucleo alle aziende (quote della convenzione, conti intestati), rate e insoluti. Ricevuta = documento commerciale dal registratore telematico; fattura al privato, nota di credito e invio allo SdI predisposti |
| 32 | Incassi ricorrenti: scadenza, importo, metodo, esito, retry, insoluto, notifica, blocco dei servizi | Fatto / Predisposto | `pal_esito_addebito` (nuovo tentativo dopo N giorni, insoluto oltre i tentativi), `pal_rate_scadute`, avviso al socio e alla direzione, accesso bloccato. L'esito oggi si registra a mano: il flusso con la banca è predisposto |
| 33 | Campagne per nuovi iscritti, inattivi, in scadenza, ex soci, assidui, utenti dei corsi, clienti PT | Fatto / Riuso | Sette segmenti `seg_pal_*` nelle Campagne delle fondamenta (F0.6) |
| 34 | Loyalty: punti, livelli, premi, sconti, omaggi, accessi bonus, referral («porta un amico → 1 settimana gratuita») | Fatto / Riuso | Fidelizzazione delle fondamenta (F0.4); «porta un amico» con i giorni in regalo come proroga (`pal_referral_premio`) |
| 35 | App del socio: abbonamento, QR, prenotazione corsi, calendario, scheda, progressi, PT, pagamenti, rinnovi, comunicazioni, promozioni | Predisposto | `pal_socio_riepilogo` restituisce in una chiamata ciò che l'app mostra; QR del socio generato; l'app e l'accesso del socio sono un lavoro a parte |
| 36 | Comunicazioni email, SMS, push, WhatsApp per conferma, promemoria, scadenza, pagamento, comunicazioni, eventi, promozioni | Fatto / Predisposto | Email di servizio dalla coda del nucleo (conferma e lista d'attesa, promemoria del giorno prima, scadenza, pagamento non riuscito, lezione annullata); promozioni dalle Campagne. SMS, push e WhatsApp predisposti |
| 37 | Customer satisfaction: questionari, NPS, feedback, reclami, suggerimenti, valutazione di corsi, PT e struttura | Fatto / Riuso | Feedback delle fondamenta, anche nella scheda del socio, con i voti per corsi, personal trainer, struttura e pulizia |
| 38 | Personale (receptionist … direzione): ruolo, competenze, turni, presenze, ore, ferie, formazione, certificazioni | Riuso / Fatto | Turni delle fondamenta (F0.5), dipendenti, assenze e formazione del nucleo; competenze dei trainer; certificazioni (§39) |
| 39 | Certificazioni e abilitazioni: certificazione, tipologia, ente, conseguimento, scadenza, documento, stato; alert | Fatto | `pal_certificazioni` con il documento allegato e la scadenza in notifica |
| 40 | Sicurezza: incidenti, infortuni, segnalazioni, emergenze, evacuazioni, non conformità, presidi, controlli periodici | Riuso | Segnalazioni di sicurezza e registri di controllo delle fondamenta (F0.7); presidi come asset con il loro piano |
| 41 | Documentazione del socio: contratto, condizioni, documenti sottoscritti, ricevute, autorizzazioni, comunicazioni, documenti dei servizi | Fatto | Allegati nella scheda del socio, per categoria |

## Fuori perimetro, con motivo

- **Biometria** (§7): esclusa. È un dato particolare (art. 9 GDPR) e il suo uso per il
  controllo degli accessi non è proporzionato: bastano tessera, badge e QR.
- **Tornelli, lettori di badge e di QR**: predisposti; chiamano `pal_registra_ingresso`.
- **App del socio** (§35), **SMS, push e WhatsApp** (§36): predisposti.
- **Pagamenti online e addebito ricorrente con la banca** (§30, §32): predisposti; l'esito
  dell'addebito oggi si registra dalla scheda del socio.
- **Cassa fiscale, fattura al privato, nota di credito, invio allo SdI** (§31): il conto non
  è un documento fiscale; il campo `rt_riferimento` è pronto per il registratore.
- **Certificato medico**: si registra la scadenza (serve al controllo degli accessi); il
  documento, se caricato, sta tra gli allegati del socio.
