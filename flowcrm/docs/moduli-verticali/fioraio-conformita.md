# Fioraio — conformità al documento di specifica

Verifica sezione per sezione del documento `moduliaggiuntivi2/Fioraio.docx` (27 sezioni)
contro ciò che il modulo fa. Esiti:

- **Fatto**: disponibile nel prodotto, coperto da test.
- **Predisposto**: dati, stati e punti di aggancio pronti; il collegamento con il fornitore
  esterno si attiva su richiesta.
- **Riuso**: lo fa una parte già esistente del CRM (nucleo o fondamenta).

Catalogo, lotti deperibili, composizioni standard (distinta base), fornitori, cassa, eventi,
fidelizzazione e campagne sono le fondamenta con modulo `fioraio`. Ciò che è solo del
fiorista è nelle migrazioni `20261009000001_fioraio_ordini.sql` (ordini, composizioni su
misura, produzione, consegne, ricorrenze, abbonamenti, cerimonie) e
`…02_fioraio_analisi.sql` (banco e resi, fabbisogno, sprechi, indicatori, agenda, clienti,
segmenti, canali). Test: pgTAP `038`–`039` (54 verifiche); e2e `e2e/fioraio.spec.ts`.

| § | Sezione | Esito | Dove |
|---|---|---|---|
| 1 | Anagrafica prodotti (fiori recisi … prodotti stagionali): codice, descrizione, categoria, varietà, colore, dimensione, unità, prezzo, costo, fornitore, foto, stagionalità, disponibilità, durata media, deperibilità | Fatto / Riuso | Articoli del magazzino (F0.1) con le categorie del fiorista, prezzo di vendita e IVA; varietà, colore e dimensione negli attributi; stagionalità, vita commerciale, deperibilità; foto dalla riga dell'articolo; disponibilità = giacenza |
| 2 | Fiori e piante deperibili: acquisto, arrivo, lotto, provenienza, inserimento in negozio, durata, stato di conservazione, temperatura, disponibile, deteriorato, invenduto, smaltimento; alert di fine vita | Fatto / Riuso | Lotti del magazzino con la scheda del lotto (provenienza, in negozio dal, stato, smaltimento) e la temperatura al ricevimento; deteriorato e invenduto come uscite; lotti a fine vita tra le scadenze e nel cruscotto |
| 3 | Magazzino floreale: carichi, scarichi, consumi, sfridi, deterioramenti, inventari, rettifiche | Riuso | Magazzino delle fondamenta (F0.1) |
| 4 | Catalogo composizioni (bouquet … omaggi): fiori, quantità, accessori, packaging, tempo, costo standard, prezzo, margine, fotografia | Fatto / Riuso | Distinta base delle fondamenta con i tipi del fiorista: costo dai componenti più la manodopera, prezzo e margine; foto e varianti dalla scheda «Foto e varianti» |
| 5 | Composizioni personalizzate: tipo, colori, fiori, dimensioni, stile, budget, accessori, messaggio, foto di riferimento, note; costo stimato e prezzo calcolati | Fatto | Riga «su misura» con la richiesta e l'elenco dei materiali; `fior_stima` (materiali + manodopera, poi il ricarico del negozio); foto di riferimento tra gli allegati dell'ordine |
| 6 | Ordini: cliente, data, prodotti, composizioni, quantità, prezzo, sconti, messaggio, data e ora, destinatario, indirizzo, fascia, addetti, stato; Ricevuto → Confermato → In preparazione → Pronto → In consegna → Consegnato → Chiuso | Fatto | `fior_ordini` e righe; stati solo in avanti, più l'annullamento; il conto di cassa saldato chiude l'ordine |
| 7 | Ordini per ricorrenze (compleanni … commemorative), registrate automaticamente nel CRM del cliente | Fatto | Occasione sull'ordine; con «ricordala ogni anno» nasce la ricorrenza del cliente (`fior_ricorrenze`), con promemoria al negozio una settimana prima |
| 8 | Consegne: destinatario, indirizzo, telefono, data, fascia, autista, veicolo, ordine, importo, stato, firma, foto, note; consegne multiple e ottimizzazione dei percorsi | Fatto / Predisposto | `fior_consegne`: giro del giorno per zona e CAP con tappe numerate, chi ha ritirato, esito, foto e firma tra gli allegati; link alla mappa. Il calcolo del percorso su strada è predisposto |
| 9 | Destinatari diversi dal cliente: committente, pagatore, destinatario, mittente del messaggio | Fatto | I quattro ruoli sono campi distinti dell'ordine; il conto si intesta al pagatore |
| 10 | Messaggi e biglietti: messaggio, biglietto, dedica, firma, anonimo, stampabile, generato automaticamente | Fatto | Messaggio, firma e anonimato sull'ordine; biglietto stampabile dalla scheda e segnalato in laboratorio finché non è stampato |
| 11 | Cerimonie e matrimoni: sposi, data, location, invitati, budget, tema, colori, fiori, bouquet, bottoniere, centrotavola, addobbi, arco, consegna, montaggio, smontaggio | Fatto / Riuso | Evento delle fondamenta (F0.8) più `fior_cerimonie`: tema, colori, fiori, elenco degli allestimenti con quantità e stato, consegna, montaggio e smontaggio in agenda |
| 12 | Funerali e servizi commemorativi: corone, cuscini, composizioni, nastri, messaggi, luogo, data e ora, consegna, agenzia funebre | Fatto / Riuso | Come §11 con il tipo «funerale»: allestimenti dedicati, luogo della cerimonia, «in memoria di», agenzia funebre dalle organizzazioni; ordini collegati all'evento |
| 13 | Eventi aziendali: azienda, evento, data, location, partecipanti, allestimenti, budget, consegne, montaggio, servizi ricorrenti | Fatto / Riuso | Come §11 con il tipo «aziendale» e il servizio ricorrente |
| 14 | Abbonamenti floreali (bouquet settimanale … manutenzione del verde): piano, frequenza, prezzo, rinnovo, consegna, prodotti, pagamento ricorrente | Fatto / Predisposto | `fior_abbonamenti`: gli ordini nascono da soli in anticipo sulla consegna; rinnovo. L'addebito automatico è predisposto |
| 15 | Clienti e CRM (privati … fioristi partner): ordini, preferenze, ricorrenze, storico, spesa, preferiti, ultimo acquisto, frequenza, comunicazioni | Fatto / Riuso | Contatti e organizzazioni del nucleo; `fior_clienti_riepilogo` e `fior_cliente_profilo` (spesa, frequenza, preferiti, destinatari abituali, ricorrenze) |
| 16 | Fornitori (floricoltori … accessori): prezzi, disponibilità, tempi di consegna, qualità, stagionalità, condizioni | Riuso | Fornitori, listini, ordini con data di consegna e valutazioni delle fondamenta (F0.1) |
| 17 | Approvvigionamento da giacenza, ordini ricevuti, eventi, stagionalità, vendite storiche, previsioni, scorte minime | Fatto | `fior_fabbisogno`: fiori e materiali per gli ordini da produrre e gli eventi in programma, consumo medio e scorta minima, meno la giacenza; diventa ordine al fornitore dalla scheda «Riordino» |
| 18 | Punto vendita: cassa, POS, vendita al banco, scontrini, resi, buoni regalo, gift card, promozioni, sconti, fidelity | Fatto / Riuso / Predisposto | `fior_vendi_banco` dal catalogo visuale, con scarico immediato; Cassa delle fondamenta (pagamenti misti, gift card, coupon, sconti); resi con rientro in magazzino o perdita; fidelity (F0.4). Scontrino fiscale predisposto |
| 19 | E-commerce: catalogo online, disponibilità in tempo reale, ordini web, pagamenti, ritiro, consegna, coupon, promozioni, cross-selling | Predisposto | `fior_composizioni_disponibili` (prezzo e quante se ne possono fare con i fiori in casa) è ciò che un sito legge; gli ordini entrano con il canale «sito» e il loro riferimento |
| 20 | Marketplace, social commerce, WhatsApp Business, Google Business Profile | Predisposto | Canale e riferimento sull'ordine; il cruscotto conta gli ordini arrivati dai canali online. Il collegamento con ogni piattaforma è su richiesta |
| 21 | Agenda: ordini da preparare, consegne, eventi, matrimoni, funerali, allestimenti, ritiri, appuntamenti, scadenze fornitori | Fatto | `fior_agenda` e pagina Agenda; gli appuntamenti con i clienti sono attività del nucleo |
| 22 | Produzione: commessa per ordine con composizione, materiali, fiori, quantità, operatore, tempo, data e ora di consegna, stato | Fatto | `fior_produzione`: nasce alla conferma, mostra richiesta e materiali, e quando è pronta scarica fiori e materiali; l'ordine la segue |
| 23 | Sprechi: fiori deteriorati, piante invendute, materiali, sfridi, scarti, resi, perdite economiche; per prodotto, fornitore e periodo | Fatto | `fior_sprechi` e scheda «Sprechi» del magazzino |
| 24 | Catalogo visuale: foto, varianti, colori, dimensioni, prezzo, disponibilità, personalizzazioni; da tablet o smartphone | Fatto | Catalogo visuale con le foto, usato anche al banco per vendere |
| 25 | Marketing e fidelizzazione: newsletter, promozioni, coupon, compleanni, anniversari, ricorrenze, San Valentino, Festa della Mamma, campagne stagionali dallo storico | Fatto / Riuso | Campagne delle fondamenta (F0.6) con i segmenti del fiorista: ricorrenze in arrivo, chi ha ordinato per la stessa festa, inattivi, abituali |
| 26 | KPI commerciali, di prodotto, operativi, di magazzino, degli eventi | Fatto | `fior_kpi` e pagina Analisi |
| 27 | Dashboard direzionale: ordini di oggi e da preparare, consegne, eventi imminenti, fatturato, ordini online, incassi, giacenze, prodotti in scadenza, sprechi, marginalità, personale | Fatto | `fior_cruscotto` e pagina «Oggi in negozio» (il margine solo alla direzione) |

## Fuori perimetro, con motivo

- **E-commerce, marketplace, social, WhatsApp Business, Google Business Profile** (§19–20):
  predisposti; il collegamento con ogni piattaforma è un lavoro a parte, su richiesta.
- **Scontrino fiscale e pagamenti online**: il conto non è un documento fiscale; il campo
  `rt_riferimento` è pronto per il registratore telematico.
- **Percorso ottimizzato su strada** (§8): il giro si ordina per zona e CAP, con le tappe
  modificabili a mano; il calcolo con un servizio di mappe è predisposto.
- **Addebito ricorrente degli abbonamenti** (§14): predisposto.
