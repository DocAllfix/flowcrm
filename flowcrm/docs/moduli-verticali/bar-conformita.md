# Bar — conformità al documento di specifica

Verifica sezione per sezione del documento `moduliaggiuntivi2/Bar.docx` (33 sezioni)
contro ciò che il modulo fa. Esiti:

- **Fatto**: disponibile nel prodotto, coperto da test.
- **Predisposto**: dati, stati e punti di aggancio pronti; il collegamento con il fornitore
  esterno si attiva su richiesta.
- **Riuso**: lo fa una parte già esistente del CRM (nucleo o fondamenta).

Il Bar usa il motore `fb_*` del Ristorante (sala, comande, postazioni, listini,
promozioni, cassa) con la licenza `bar`. Quello che il documento aggiunge è nella
migrazione `20261006000001_bar.sql`. Test di riferimento: pgTAP `030_bar.sql` più
`023`–`029`; e2e `e2e/bar.spec.ts`.

| § | Sezione | Esito | Dove |
|---|---|---|---|
| 1 | Anagrafica prodotti per categoria (caffetteria … asporto); codice, descrizione, categoria, prezzo, IVA, unità di misura, foto, fornitore, costo, margine, disponibilità, stato | Fatto | `fb_prodotti` (codice, `unita_vendita`, `fornitore_id`, stato, allegati per la foto); categorie del bar proposte alla configurazione, compresi confezionati e asporto |
| 2 | Listini: standard, colazione, aperitivo, pranzo, serale, asporto, delivery, eventi, convenzionato; prezzi per fascia, canale, tipologia di cliente, stagione, promozioni | Fatto | `fb_menu` (tutti i tipi, giorni, fascia, canale, validità = stagione, tipologia di cliente); listino convenzionato riservato all'azienda (`bar_convenzioni.menu_id`) |
| 3 | Ricette e distinta base (cappuccino, cocktail): costo ricetta e porzione, margine, consumo delle materie prime | Fatto | Distinta base delle fondamenta; scarico alla preparazione |
| 4 | Ingredienti: quantità, unità, costo, lotto, scadenza, fornitore, ubicazione | Riuso | Magazzino delle fondamenta (F0.1) |
| 5 | Magazzino: carichi, scarichi, consumi, trasferimenti, inventari, sfridi, rotture, omaggi, consumi interni; alta rotazione | Riuso / Fatto | Movimenti delle fondamenta; alta rotazione nel riordino previsionale (§22) |
| 6 | Lotti e scadenze con avvisi | Riuso | `mag_lotti` e scadenze in notifica |
| 7 | Mappa del locale: tavoli, posti, zona, stato, cameriere; stati libero, occupato, prenotato, in attesa, conto richiesto, chiuso | Fatto | Mappa della sala del motore; banco come sala di tipo `banco` |
| 8 | Comande: tavolo, cliente, cameriere, prodotti, quantità, personalizzazioni, note, ora, priorità | Fatto | `fb_comande`, `fb_comande_righe` («latte di soia», «poco ghiaccio») |
| 9 | Invio automatico alle postazioni (cocktail al banco, panino in cucina, caffè alla macchina) | Fatto | `fb_stazioni` per categoria; il bar nasce con Banco bar, Macchina del caffè e Cucina |
| 10 | Dashboard del banco: da preparare, priorità, tempo trascorso, completati, in attesa | Fatto | Schermo «Banco» con vista per ordine: «Tutto pronto», «Consegnato», completati del giorno, in attesa di partire |
| 11 | Asporto con ritiro prenotabile | Fatto | Comanda di asporto con ora di ritiro |
| 12 | Delivery: indirizzo, fascia, rider, costo, pagamento, stato; piattaforme esterne | Fatto / Predisposto | `fb_consegne`; piattaforme esterne predisposte |
| 13 | Prenotazione tavoli con disponibilità | Fatto | Prenotazioni del motore |
| 14 | CRM: preferenze, storico, frequenza, spesa media, preferiti, ultima visita | Fatto | Clienti del motore (`fb_cliente_profilo`) |
| 15 | Fidelity: tessere, punti, cashback, coupon, premi, buoni, gift card; «10 caffè → 1 caffè omaggio» | Fatto | Fondamenta F0.4 più i timbri per prodotto o categoria (`fid_programmi.timbri_prodotti`) e l'omaggio tolto dal conto alla cassa (`fid_omaggio_su_conto`) |
| 16 | Promozioni: happy hour, colazione, aperitivo, 2×1, sconti, combo, menu del giorno, stagionali; prodotto + fascia + prezzo automatico | Fatto | `fb_promozioni` e prodotti composti; il prezzo cambia da solo nella fascia |
| 17 | Cassa con riconciliazione giornaliera | Fatto / Predisposto | Fondamenta F0.3 con quadratura dei contanti; il rimborso dopo lo scontrino passa dal registratore telematico (predisposto) |
| 18 | Conti: unico, separati, divisi, parziali, misti, al tavolo, alla cassa | Fatto | Cassa delle fondamenta (alla romana, per persona, separati) |
| 19 | Fatturazione: scontrini, immediate, differite, note di credito, aziende, convenzioni | Fatto / Predisposto | Fattura immediata dal conto; differita = fattura periodica della convenzione (`bar_fattura_convenzione`); scontrino, invio allo SdI e nota di credito predisposti (un addebito già fatturato non si storna dalla cassa) |
| 20 | Clienti aziendali e convenzioni: azienda, dipendenti autorizzati, listino, consumazioni, limiti di spesa, fatturazione periodica | Fatto | `bar_convenzioni`, dipendenti con tessera, addebito alla cassa (`bar_addebita_convenzione`) con limiti giornalieri, mensili e dell'azienda controllati nel database |
| 21 | Fornitori: listini, condizioni, ordini, tempi di consegna, performance, scadenze dei pagamenti | Riuso | `fornitori_listini` (condizioni, giorni di consegna), ordini, valutazioni; scadenze di pagamento delle fatture passive del nucleo |
| 22 | Riordino da scorta minima, vendite storiche, consumo medio, stagionalità, ordini futuri, eventi | Fatto | `fb_proposta_riordino`: consumo medio di 4 settimane corretto con lo stesso periodo dell'anno prima, eventi confermati, ordini già presi, merce in arrivo |
| 23 | Personale con turni, presenze, ore, assenze, ferie, permessi, ruoli | Riuso | Personale del nucleo e turni delle fondamenta |
| 24 | Turni mattina, pomeriggio, sera, riposi, sostituzioni, ore; avviso di carenza | Riuso | Fondamenta F0.5 |
| 25 | HACCP | Riuso | Registri di controllo delle fondamenta (F0.7) |
| 26 | Attrezzature (macchine da caffè, spillatori…) | Riuso | Asset delle fondamenta (F0.2) |
| 27 | Manutenzione preventiva, ordinaria, straordinaria; contratti di assistenza | Riuso | Asset, piani e interventi delle fondamenta |
| 28 | Eventi (aperitivi, feste, lauree, degustazioni): menu, budget, personale, fornitori, allestimento, costi, ricavi | Riuso | Eventi delle fondamenta (F0.8) |
| 29 | Mescita: bottiglia acquistata, quantità iniziale, erogata, residua, sfrido, consumo teorico contro reale, anomalie | Fatto | `bar_mescite` (una bottiglia o un fusto in uso per prodotto), erogato dalle vendite anche dentro i cocktail, chiusura con lo sfrido a magazzino e l'avviso alla direzione sopra soglia |
| 30 | Food e beverage cost, margine per prodotto, categoria e fascia oraria | Fatto | `fb_food_cost` (nuova dimensione «fascia»), menu engineering |
| 31 | KPI commerciali: fatturato, scontrini, ordini, ticket medio, vendite per fascia e per giorno, più e meno venduti, clienti attivi, nuovi, ricorrenti, frequenza, spesa | Fatto | `fb_kpi` esteso |
| 32 | KPI operativi: preparazione, servizio, ordini evasi e annullati, errori, attese, occupazione e rotazione dei tavoli | Fatto | `fb_kpi` esteso (errori nelle comande, attesa al banco e per il tavolo) |
| 33 | Cruscotto della direzione: incasso, tavoli, ordini, clienti presenti; fatturato, margine, food e beverage cost; scorte critiche, scadenze, consumi anomali; presenze, turni, ore | Fatto | `fb_cruscotto` esteso (personale, consumi anomali della mescita, margini del giorno) |

## Fuori perimetro, con motivo

- **Scontrino elettronico e cassa fiscale**: il conto non è un documento fiscale; il campo
  `rt_riferimento` è pronto per il registratore telematico.
- **Piattaforme di delivery**: predisposte, il collegamento con ogni fornitore è su richiesta.
