# Ristorante — conformità al documento di specifica

Verifica sezione per sezione del documento `moduliaggiuntivi2/Ristorante.docx` (40 sezioni)
contro ciò che il modulo fa. Esiti:

- **Fatto**: disponibile nel prodotto, coperto da test.
- **Predisposto**: dati, stati e punti di aggancio pronti; il collegamento con il fornitore
  esterno si attiva su richiesta.
- **Riuso**: lo fa una parte già esistente del CRM (nucleo o fondamenta).

Motore condiviso con il Bar: tabelle `fb_*` (migrazioni `20261005000001`–`05`). Fondamenta
comuni: `20261004000001`–`05`. Test di riferimento: pgTAP `023`–`029`, e2e `e2e/ristorante.spec.ts`.

| § | Sezione | Esito | Dove |
|---|---|---|---|
| 1 | Anagrafica prodotti e piatti: categorie; codice, nome, descrizione, categoria, prezzo, IVA, foto, disponibilità, stagionalità, tempo di preparazione, costo standard, margine, allergeni | Fatto | `fb_prodotti` (codice PRD), `fb_categorie` configurabili; foto negli allegati del prodotto; costo, margine e food cost dalla vista `fb_prodotti_economia`; stagionalità `mesi_disponibili` (fuori stagione non si ordina). Menu degustazione, bambini e stagionali sono menu (§2) o prodotti composti |
| 2 | Menu e listini per giorno, fascia oraria, canale | Fatto | `fb_menu` + `fb_menu_voci` (16 tipi, canale, giorni, fascia anche a cavallo della mezzanotte, validità, priorità, prezzo fisso); prezzo del momento `fb_prezzo` / `fb_listino_attuale` |
| 3 | Ricette: ingredienti, quantità, unità, preparazioni preliminari, procedimento, tempo, porzioni, costi, food cost %, prezzo, margine | Fatto | `distinte_base` + editor «Ricette» (costo totale e per porzione, food cost, margine) |
| 4 | Distinta base e scarico automatico alla vendita | Fatto | Scarico teorico alla preparazione (`fb_riga_scarica` → `scarica_distinta`), per lotto in ordine di scadenza |
| 5 | Preparazioni intermedie e costo lungo la catena | Fatto | Semilavorati annidati, cicli rifiutati, «usata in»; semilavorati prodotti in lotti e tenuti a magazzino (`mag_produci_distinta`) |
| 6 | Allergeni presenti e potenziali, sostituibili, contaminazioni, note; documentazione automatica | Fatto | Allergeni ereditati (`fb_allergeni_prodotto`), tracce, registro stampabile (Reg. UE 1169/2011) |
| 7 | Mappa grafica: sale, terrazza, dehor, sala privata; tavoli, posti, zona; stati | Fatto | `fb_sale`, `fb_tavoli`, mappa con trascinamento; stato calcolato `fb_tavoli_stato` (libero, prenotato, in attesa, occupato, in servizio, conto richiesto, chiuso) |
| 8 | Prenotazioni con tutti i campi; stati Richiesta → Confermata → Arrivata → Servita → Conclusa → No-show | Fatto | `fb_prenotazioni`; tavolo mai prenotato due volte (vincolo di esclusione); arrivo all'apertura della comanda, servita al primo piatto, conclusa alla chiusura del conto |
| 9 | Lista d'attesa: persone, ora, zona, tavolo, attesa, recapito, priorità; avviso automatico | Fatto / Predisposto | `fb_attesa` + `fb_attesa_candidati` (tavolo libero adatto). L'avviso via SMS/WhatsApp è predisposto: oggi «Avvisato» si segna a mano |
| 10 | Comanda: tavolo, cameriere, cliente, portate, quantità, note, personalizzazioni, allergie, priorità, ora | Fatto | `fb_comande`, `fb_comande_righe`; pagina comanda da tablet; cliente collegabile anche senza prenotazione |
| 11 | Uscita delle portate: immediata, differita, pausa, sincronizzazione del tavolo | Fatto | Invio differito e «Marcia» per uscita; uscite automatiche con la pausa del locale (cron ogni minuto); in cucina «2/3 dell'uscita pronti» |
| 12 | KDS per stazioni | Fatto | `fb_stazioni` (categorie o prodotti), schermo `fb_kds` per postazione, in tempo reale |
| 13 | Tempi: ordine, presa, preparazione, pronto, servito; medie, ritardi, performance, tempi anomali | Fatto | Ore su ogni riga; ritardo sul tempo di preparazione; analisi «Tempi di cucina» (`fb_tempi_cucina`) |
| 14 | Asporto: telefono, online, app, sito, banco; ritiro, cliente, pagamento, stato | Fatto / Predisposto | Comanda con canale e orario di ritiro. Ordini online automatici: predisposti |
| 15 | Delivery: indirizzo, fascia, rider, zona, costo, pagamento, stato; piattaforme | Fatto / Predisposto | `fb_consegne` (costo sul conto). Piattaforme esterne: campi `piattaforma`, collegamento su richiesta |
| 16 | CRM clienti: storico visite, prenotazioni, consumazioni, spesa, ticket, preferiti, frequenza | Fatto | `fb_clienti_riepilogo`, `fb_cliente_profilo` (piatti e vini preferiti, visite al mese, no-show) |
| 17 | Customer experience: preferenze, allergie, tavolo preferito, ricorrenze, feedback | Fatto | `fb_clienti`; allergie riportate in prenotazione e mostrate in comanda |
| 18 | Fidelity: tessere, punti, coupon, premi, gift card, cashback, promozioni personalizzate | Fatto | Fondamenta F0.4: tessere, timbri, livelli, presentazioni, gift card e coupon in cassa, punti spendibili (`valore_punto` = cashback), campagne mirate |
| 19 | Magazzino alimentare: materie prime, semilavorati, bevande, vini, consumo, packaging; movimenti, inventari, lotti, scadenze, sfridi, deterioramenti | Fatto | Fondamenta F0.1 |
| 20 | Tracciabilità: fornitore, lotto, date, quantità, temperatura, ubicazione, piatti; richiamo | Fatto | Ricevimento con lotto, scadenza, temperatura; `fb_richiamo_lotto` anche attraverso i semilavorati prodotti |
| 21 | Acquisti: richieste, ordini, ricevimento, DDT, controlli, prezzi, listini, condizioni; riordino | Fatto | Ordini in bozza (= richiesta) e invio, ricevimento per riga, DDT; listini `fornitori_listini` con miglior prezzo; proposta di riordino |
| 22 | Fornitori e vendor rating | Fatto | Anagrafica del nucleo; `fornitori_valutazioni` (prezzo, qualità, puntualità, completezza, continuità, non conformità) |
| 23 | Vini e cantina | Fatto | `fb_vini` sopra l'articolo di magazzino; bottiglia e calice; vendute e rimanenze |
| 24 | Carta vini digitale anche con QR | Fatto / Predisposto | Carta stampabile e funzione pubblica `fb_carta_vini`; pagina pubblica per il QR predisposta |
| 25 | Food cost per piatto, categoria, menu, periodo, chef, canale | Fatto | `fb_food_cost` |
| 26 | Beverage cost e consumo teorico ↔ effettivo | Fatto | `fb_food_cost` per tipo di bevanda; `fb_beverage_controllo` con ammanchi da inventario |
| 27 | Sprechi con analisi economica | Fatto | `fb_sprechi` (scarico e costo) + piatti rifatti, annullati dopo la preparazione e omaggi dalle comande |
| 28 | HACCP: temperature, ricevimento, cottura, raffreddamento, conservazione, pulizie, sanificazione, infestanti, non conformità, azioni correttive, formazione | Fatto / Riuso | Fondamenta F0.7 (esito dalle soglie, registrazioni immutabili, azioni verificate). Formazione: modulo Personale del nucleo |
| 29 | Personale: ruoli, competenze, turni, presenze, ore, assenze, ferie, formazione | Riuso / Fatto | Anagrafica, ferie e formazione nel nucleo; turni e presenze nelle fondamenta F0.5 |
| 30 | Turni: cucina, sala, bar, riposi, sostituzioni, disponibilità, ore; fabbisogno dai coperti | Fatto | Turni senza sovrapposizioni né ferie, sostituzioni, fabbisogno per fascia e `fb_fabbisogno_personale` dai coperti prenotati |
| 31 | Eventi e banqueting | Fatto | Fondamenta F0.8: cliente, invitati con allergie, menu e programma, personale nei turni, fornitori sulle voci, preventivo, margine, conto dell'evento |
| 32 | Menu engineering | Fatto | `fb_menu_engineering` (Kasavana-Smith) con grafico dei quadranti |
| 33 | Cassa: apertura, chiusura, incassi, contanti, POS, elettronici, gift card, buoni, sconti, rimborsi, abbuoni | Fatto / Predisposto | Fondamenta F0.3 con quadratura dei contanti. Il rimborso dopo l'emissione dello scontrino è un'operazione fiscale: passa dal registratore telematico (predisposto) |
| 34 | Conti: unico, separati, per persona, per prodotto, misti, parziali, aziendale | Fatto | Divisione alla romana, per persona, conti separati spostando righe, pagamenti misti e parziali, intestazione aziendale |
| 35 | Fatturazione: scontrini, fatture, elettroniche, note di credito, aziende, convenzioni, eventi | Fatto / Predisposto | Fattura del nucleo dal conto chiuso e dal conto dell'evento. Scontrino e invio allo SdI: predisposti (`rt_riferimento`, stato SdI). Convenzioni: modulo Bar |
| 36 | Marketing: newsletter, email, SMS, WhatsApp, social, promozioni, coupon, stagionali, inattivi, ricorrenze | Fatto / Predisposto | Campagne email con consenso e disiscrizione; segmenti inattivi, abituali, ricorrenze. SMS, WhatsApp e social predisposti |
| 37 | Recensioni e soddisfazione collegate a visita, prenotazione, ordine | Fatto | Feedback e NPS; parere a fine servizio legato alla comanda; reclami in notifica |
| 38 | Manutenzione delle attrezzature | Fatto | Fondamenta F0.2 (piani preventivi, guasti, costi, documenti) |
| 39 | Cruscotto della giornata: sala, cucina, vendite, magazzino | Fatto | `fb_cruscotto` (vendite solo per la direzione) |
| 40 | KPI commerciali, di cucina, economici, sui clienti | Fatto | `fb_kpi`; costo del personale con il costo orario medio del locale |

## Fuori perimetro, con motivo

- **Cassa fiscale e scontrino elettronico**: il conto non è un documento fiscale. Il campo
  `rt_riferimento` è pronto per il registratore telematico.
- **Delivery esterni, ordini online, app, SMS e WhatsApp**: predisposti. Il collegamento con
  ogni fornitore è un lavoro a parte, su richiesta.
