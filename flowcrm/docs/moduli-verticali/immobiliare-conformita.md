# Agenzia immobiliare — conformità al documento di specifica

Verifica sezione per sezione del documento `moduliaggiuntivi2/Agenzia immobiliare.docx`
(29 sezioni) contro ciò che il modulo fa. Esiti:

- **Fatto**: disponibile nel prodotto, coperto da test.
- **Predisposto**: dati, stati e punti di aggancio pronti; il collegamento con il fornitore
  esterno si attiva su richiesta.
- **Riuso**: lo fa una parte già esistente del CRM (nucleo o fondamenta).

Clienti e proprietari sono contatti e organizzazioni del nucleo; acquisizione e trattativa
sono due pipeline del nucleo (`deals` con `immobile_id`), le attività hanno `immobile_id`;
fatture, approvazioni, allegati, scadenze, campagne, riscontri e turni sono del nucleo e
delle fondamenta con modulo `immobiliare`. Ciò che è solo dell'agenzia è nelle migrazioni
`20261011000001_immobiliare_portafoglio.sql` (agenti e rete, immobili, prezzi, proprietari,
documenti, incarichi, valutazioni, annunci e feed, richieste, selezioni, lead, campagne
pubblicitarie, matching) e `…02_immobiliare_trattative.sql` (visite, proposte, preliminari e
rogiti, locazioni e canoni, provvigioni e ripartizioni, modelli e contratti, antiriciclaggio,
privacy, report, giro notturno, indicatori, cruscotto, agenda, segmenti, ricerca).
Test: pgTAP `042`–`043` (98 verifiche); e2e `e2e/immobiliare.spec.ts`.

| § | Sezione | Esito | Dove |
|---|---|---|---|
| 1 | Fascicolo digitale dell'immobile: codice, tipologia, indirizzo, comune, zona, piano, superfici, locali, camere, bagni, balconi, terrazzi, giardino, garage, posto auto, cantina, ascensore, classe energetica, conservazione, anno, riscaldamento, condizionamento, arredato, prezzo, prezzo al m², spese condominiali, stato | Fatto | `imm_immobili` con il prezzo al m² calcolato e la scheda nel fascicolo (dieci schede: scheda, proprietari, documenti, incarico, valutazione, annuncio, clienti compatibili, visite e proposte, report, foto e file) |
| 2 | Tipologie: appartamenti, ville, villette, uffici, negozi, capannoni, terreni, industriali, commerciali, alberghi, ricettive, box, agricoli, nuove costruzioni, fabbricati | Fatto | Le sedici tipologie del documento più «altro» |
| 3 | Proprietari: anagrafica, recapiti, CF, quote, titolo, immobili, storico incarichi, comunicazioni, documenti, situazione economica; più proprietari | Fatto / Riuso | `imm_proprietari` (quote mai oltre il 100% per titolo, referente che riceve il report); anagrafica, comunicazioni e documenti nella scheda del contatto; pagina «Proprietari» |
| 4 | Acquirenti: dati, recapiti, tipo, budget, zona, tipologia, superficie, camere, caratteristiche, finanziamento, tempistica, preferenze, immobili visti, preferiti, visite | Fatto | `imm_richieste` e `imm_selezioni` (proposti, inviati, preferiti, scartati, visitati); visite della richiesta |
| 5 | Locatori e conduttori: requisiti, reddito, garanzie, referenze, immobili di interesse, storico | Fatto | Richiesta «in affitto» con reddito, garanzie e referenze; locazioni nello storico |
| 6 | Incarichi: proprietario, immobile, tipo, conferimento, durata, esclusiva, prezzo richiesto e minimo, provvigione, condizioni, obiettivi, responsabile, scadenza, rinnovo, stato | Fatto | `imm_incarichi`: uno in corso per immobile, scadenza tra le scadenze, rinnovo tacito nel giro notturno, gestiti dalla direzione o dall'agente dell'immobile |
| 7 | Pipeline di acquisizione: lead → contatto → appuntamento → valutazione → proposta di incarico → incarico → pubblicazione → visite → trattativa → conclusione; conversioni | Fatto / Riuso | Pipeline «Immobiliare · Acquisizione» del nucleo: la valutazione, la sua presentazione e l'incarico la fanno avanzare da sole; dopo l'incarico l'immobile segue i suoi stati; conversione negli indicatori |
| 8 | Valutazione: iniziale, di mercato, al m², comparabili, storico prezzi, correttivi, dell'agente, automatica; relazione per il proprietario | Fatto | `imm_stima` sui comparabili dell'archivio (prima i venduti), correttivi in %, forbice ±5%, storico dei prezzi; `imm_valutazioni`; relazione stampabile |
| 9 | Commercializzazione: descrizione, titolo, foto, video, planimetrie, virtual tour, brochure, scheda, prezzo, disponibilità | Fatto / Riuso | `imm_annunci` (si pubblica solo un immobile sul mercato, si ritira da solo a vendita conclusa); foto, planimetrie e brochure tra gli allegati |
| 10 | Portali, sito, landing, social, campagne, con sincronizzazione di prezzo, descrizione, foto, disponibilità, stato | Predisposto | `imm_feed_annunci` produce il file XML degli annunci pubblicati, scaricabile da «Marketing»; la sincronizzazione automatica con ogni portale è su richiesta |
| 11 | Lead: origine, immobile, data, contatti, operatore, stato, priorità, ultima interazione, prossima attività; pipeline | Fatto | `imm_lead` con colonne per stato, avviso all'agente, sollecito oltre il tempo di risposta, conversione in contatto, richiesta e trattativa; l'acquisizione automatica dai portali è predisposta |
| 12 | Matching domanda/offerta, con la lista da sottoporre al cliente | Fatto | `imm_match` (punteggio su 100 e motivi; esclusi contratto, oltre il 10% del budget, tipologia, comune), `imm_match_immobile`, `imm_proponi`, `imm_invia_selezione`; avviso all'agente quando entra un immobile cercato |
| 13 | Visite: cliente, immobile, agente, data e ora, durata, conferma, note, esito, feedback, prossime azioni; notifiche a cliente e agente | Fatto | `imm_visite`: un agente non è in due visite alla stessa ora (vincolo), conferma per email e notifica, seconda visita contata, seguito in agenda |
| 14 | Proposte: prezzi, data, condizioni, caparra, sospensive, mutuo, scadenza, controproposta, accettazione, rifiuto; storico | Fatto | `imm_proposte` in catena (`padre_id`), scadenza tra le scadenze, accettazione che mette l'immobile sotto offerta e fa decadere le altre |
| 15 | Trattativa: interesse → visita → seconda visita → offerta → controproposta → accettazione → preliminare → rogito; responsabile, data, stato, probabilità, valore, prossima attività | Fatto / Riuso | Pipeline «Immobiliare · Trattative» del nucleo, che avanza da sola con visite, proposte, preliminare e rogito; vista a colonne nella pagina «Trattative» |
| 16 | Documentazione: atti, visure, planimetrie, APE, conformità, certificazioni, regolamento, verbali, millesimi, edilizia, permessi, foto, relazioni; scadenze e mancanti | Fatto | `imm_documenti`: i sette che servono sempre nascono con l'immobile, stato e scadenza (APE tra le scadenze), mancanti nel cruscotto; il file è l'allegato della riga |
| 17 | Locazioni: canone richiesto e concordato, deposito, durata, tipo, date, rinnovi, ISTAT, garanzie, conduttore, scadenze | Fatto | `imm_locazioni` (4+4, 3+2, transitorio, studenti, commerciale 6+6), `imm_adegua_istat` con lo storico dei canoni, fine e adeguamento tra le scadenze, rinnovo tacito |
| 18 | Contratti: incarichi, proposte, locazioni, preliminari, vendite, mandati, accordi; modelli e workflow di approvazione e firma | Fatto / Riuso / Predisposto | `imm_modelli` (sei di partenza) e `imm_compila`; `imm_contratti` con l'approvazione della direzione (approvazioni del nucleo); firma elettronica predisposta, copia firmata tra gli allegati |
| 19 | Provvigioni: percentuale, fisso, lati venditore, acquirente, locatore, conduttore, agente, collaboratori, ripartizione, stato incasso | Fatto | `imm_provvigioni` nate da rogito e locazione, `imm_ripartizioni` sempre al 100% (`imm_ripartisci`), `imm_fattura_provvigione` dalla fattura del nucleo, incasso |
| 20 | Agenti: portafoglio, clienti, lead, visite, trattative, acquisizioni, vendite, locazioni, provvigioni, KPI, obiettivi; classifiche e cruscotto personale | Fatto | `imm_agenti` e la vista `imm_agenti_riepilogo` (provvigioni visibili alla direzione e all'agente); classifica del mese con gli obiettivi; agenda per agente |
| 21 | Agenda: appuntamenti, visite, telefonate, acquisizioni, valutazioni, riunioni, rogiti, sopralluoghi, follow-up; attività automatiche dal workflow | Fatto / Riuso | `imm_agenda`; attività del nucleo con `immobile_id`; telefonata dopo ogni visita e seguito post-vendita creati da soli |
| 22 | Marketing: pubblicità, email, SMS, social, newsletter, open house, campagne di acquisizione e per immobile; ROI | Fatto / Riuso / Predisposto | `imm_marketing` con costo e lead collegati, ROI negli indicatori; email e newsletter con le campagne delle fondamenta e i segmenti dell'agenzia; SMS e social predisposti |
| 23 | CRM proprietari: immobili affidati, giorni sul mercato, visite, richieste, prezzo iniziale e attuale, offerte, riduzioni, probabilità, attività; report periodici | Fatto | Pagina «Proprietari», `imm_report` e `imm_invia_report`; invio automatico ogni N giorni dal giro notturno |
| 24 | Post-vendita: rogito, chiavi, provvigioni, documentazione finale, soddisfazione, recensione, referral, follow-up | Fatto / Riuso | Campi post-vendita sulla chiusura, email di benvenuto, seguito a sei mesi in agenda, segmento «chi ha comprato o affittato», riscontri delle fondamenta |
| 25 | KPI di acquisizione, vendita, clienti ed economici (fatturato, provvigioni, media, per agente, marginalità, ROI) | Fatto | `imm_kpi` e pagina «Analisi»; i dati economici solo alla direzione |
| 26 | Dashboard della direzione: portafoglio, incarichi nuovi e in scadenza, lead, visite di oggi, trattative, offerte, vendite, locazioni, pipeline, fatturato previsto, provvigioni, agenti | Fatto | `imm_cruscotto` e «Cruscotto dell'agenzia», aggiornato dal vivo |
| 27 | Rete e collaborazioni: co-mediazioni, agenzie partner, segnalatori, geometri, architetti, notai, consulenti, mediatori creditizi; ripartizione provvigioni | Fatto | `imm_collaboratori` (anche il notaio del rogito e il segnalatore del lead) e ripartizioni con i collaboratori |
| 28 | Scadenze e alert: incarichi, APE, documenti, proposte, preliminari, rogiti, rinnovi, adeguamenti canoni, follow-up, richieste senza risposta | Fatto | Scadenze del nucleo (avvisi a 30, 7, 1 giorni) più `imm_giro_notturno`: incarichi scaduti o rinnovati, proposte scadute, lead senza risposta, locazioni, ISTAT del giorno, report |
| 29 | Compliance e privacy: consensi, informative, trattamento, antiriciclaggio, identificazione, conservazione, tracciabilità, adempimenti | Fatto / Riuso | `imm_aml_verifiche` (verifica rafforzata per PEP o rischio alto, conservazione per dieci anni, riservata; il rogito la richiede per l'acquirente), `imm_privacy` (il consenso al marketing aggiorna il contatto); registro delle attività del nucleo |

## Fuori perimetro, con motivo

- **Pubblicazione automatica sui portali, sito e social** (§10): predisposta con il feed
  XML; il collegamento con ogni portale è un lavoro a parte, su richiesta.
- **Lead automatici dai portali** (§11): il lead ha origine e fonte; l'ingresso automatico
  dalle email o dalle API dei portali è predisposto.
- **Firma elettronica** (§18): predisposta; oggi si stampa, si firma e si carica la copia.
- **SMS, WhatsApp e social** (§22): predisposti, come negli altri moduli.
- **Indice ISTAT automatico** (§17): la variazione FOI si inserisce a mano; il prelievo
  dall'ISTAT è predisposto.
