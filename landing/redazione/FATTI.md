# Cosa fa PMIFlow, e cosa no

**Questa è l'unica fonte ammessa per le affermazioni sul prodotto** negli articoli del
blog, scritti a mano o dall'agente di redazione. Se una cosa non è scritta qui, non si
scrive. Ricavato dal codice (`flowcrm/src`, `flowcrm/supabase/migrations`) il
29/09/2026, e per i sette moduli nuovi (dal Ristorante all'Agenzia immobiliare) il
05/10/2026 dalle matrici di conformità in `flowcrm/docs/moduli-verticali`: quando il
prodotto cambia, si aggiorna questo file nella stessa PR.

## Il prodotto in una frase

PMIFlow è un CRM e gestionale per micro e piccole imprese italiane (da 1 a circa 15
utenti). Ogni azienda ha la **propria istanza su un server dedicato**, in un data center
in **Germania** (Unione Europea), con il proprio sottodominio (`nomeazienda.pmiflow.it`),
il proprio logo e i propri colori. Non è un servizio in cui i clienti condividono lo
stesso database. È un'**applicazione web**: si usa dal browser, anche da telefono e
tablet, senza installare niente.

## Il nucleo (in ogni istanza)

- **Clienti:** aziende (organizzazioni) e contatti, con la linea del tempo di chiamate,
  riunioni, offerte e fatture; importazione da file CSV.
- **Vendite:** trattative (deal) su colonne, più pipeline con fasi configurabili, valore
  pesato per fase; kanban delle offerte.
- **Lavoro:** attività, calendario, riunioni, progetti, commesse (la trattativa vinta
  diventa commessa senza ricopiare i dati), canale del team.
- **Amministrazione** (solo per chi ha il ruolo adatto): registro fatture, incassi
  previsti, scadenze fiscali con promemoria, personale.
- **Sotto tutto:** ruoli e permessi imposti dal database (ognuno vede solo ciò che gli
  spetta; l'agente vede i suoi clienti), cruscotti, marchio del cliente.
- **Backup** notturno, con il ripristino provato ogni mese.

## I moduli di settore (si attivano solo se servono)

### Gare d'appalto
- Scheda gara con CIG, CUP, CPV, RUP, procedura, piattaforma, importo a base di gara,
  termini, luogo di esecuzione.
- Stati: in analisi, in preparazione, presentata, aggiudicata, non aggiudicata, annullata;
  vista a colonne (kanban) e cruscotto.
- Requisiti di partecipazione; richieste di chiarimento con risposta ricevuta.
- Valutazione a criteri con voto; decisione di partecipare (go/no-go) come approvazione.
- Approvazioni: offerta tecnica, offerta economica, autorizzazione alla presentazione,
  accettazione dell'aggiudicazione. Protocollo di invio.
- Cauzioni e garanzie con garante, scadenza e restituzione.
- Team di gara con ruoli. Esiti per stazione appaltante e per territorio.
- Dalla gara aggiudicata si avviano la commessa e, con il modulo Cantiere, il cantiere.

### Cantiere
- Scheda cantiere: committente, cliente, contratto, CIG/CUP, categoria lavori, direttore
  lavori, direttore tecnico, capocantiere, apertura, fine prevista, chiusura.
- Stati: pianificato, in apertura, attivo, sospeso, chiuso.
- Cronoprogramma a fasi con inizio, fine e dipendenze.
- Rapportini giornalieri (presenze, lavorazioni, problemi).
- Contabilità: libretto delle misure, costi di cantiere, SAL con stato bozza, emesso,
  fatturato, pagato, collegati al registro fatture.
- Imprese e subappaltatori (sono aziende dell'anagrafica, senza accesso al programma),
  con referente e lavorazioni. DURC, SOA e assicurazioni si caricano nei documenti e si
  seguono nelle scadenze.
- Tipi di scadenza del cantiere: DURC, SOA, assicurazione, visita medica, formazione,
  verifica attrezzatura, autorizzazione, SAL, collaudo, consegna.
- Personale di cantiere con ruolo e presenza del giorno; mezzi dal parco automezzi e
  materiali con giacenze.
- Registro sicurezza (eventi con gravità), controlli qualità (conforme, non conforme,
  in attesa), registro ambiente con i formulari (FIR).
- Approvazioni: SAL, varianti, acquisti, ordini, documenti.

### Automezzi
- Scheda mezzo: categoria, alimentazione, classe ambientale, acquisizione, centro di
  costo, costi fissi, consumo medio, costo totale, costo al km.
- Stati: disponibile, assegnato, in manutenzione, fuori servizio, dismesso.
- Scadenze: assicurazione, bollo, revisione (con promemoria).
- Assegnazioni a persona o reparto; registro utilizzi (conducente, destinazione, km
  iniziali e finali, anomalie); richieste di utilizzo con approvazione.
- Rifornimenti (litri, km, carta carburante, fornitore); manutenzioni ordinarie e
  straordinarie con officina e ore di fermo; pneumatici estivi e invernali (montati o a
  deposito); attrezzature installate.
- Sinistri (controparte, luogo) e multe (ente accertatore, punti, pagamento, ricorso).
- Cruscotto del parco.

### Agenti
- Scheda agente: P.IVA/CF, iscrizione CCIAA, posizione Enasarco, zone, portale agente.
- Portafoglio clienti con classe; riassegnazione del portafoglio con approvazione.
- Rapporti di visita: esito (positivo, neutro, negativo, da ricontattare), referenti
  incontrati, argomenti, opportunità, criticità.
- Offerte e preventivi con validità; ordini.
- Provvigioni per periodo secondo il piano provvigionale; da liquidare; liquidazione con
  approvazione. Sconti oltre soglia e deroghe commerciali con approvazione.
- Obiettivi annuali; mandati e contratti con zone, prodotti assegnati, esclusiva;
  note spese. Direzione commerciale con la vista d'insieme.

### Poliambulatori
- Pazienti (privati o in convenzione) con anagrafica, contatto di emergenza, medico
  curante, consensi, anamnesi, esame obiettivo, diagnosi, documenti.
- **Contenuto clinico riservato**: lo vede solo chi ha l'accesso clinico.
- Agenda per ambulatorio e professionista, con prestazione e apparecchiatura. Stati:
  prenotato, confermato, in sala, eseguito, annullato, no show.
- Referti: bozza, da validare, validato, inviato.
- Struttura: catalogo prestazioni, convenzioni con gli enti, ambulatori, apparecchiature
  (operativa, in manutenzione, fuori servizio), scadenze della struttura.

### Ristorante
- Sala a mappa con sale, zone e tavoli (forma, posti, posizione); stato dei tavoli in
  tempo reale: libero, prenotato, seduti senza ordine, al servizio, al conto.
- Prenotazioni con persone, occasione, allergie e canale; lo stesso tavolo non si
  prenota due volte nella stessa fascia. Lista d'attesa con stima e primo tavolo adatto.
- Comande dal tablet con portate e uscite in ordine; asporto e consegna a domicilio
  come canali della comanda. Cucina per postazioni (cucina, pasticceria, bar) con i
  tempi di preparazione misurati.
- Ricettario con distinta base e semilavorati: food cost per piatto, allergeni ricavati
  dagli ingredienti, registro degli allergeni, menu engineering (stella, cavallo da
  lavoro, enigma, cane). Menu e listini per fascia oraria, promozioni.
- Magazzino con lotti e scadenze, scarico per lotto in ordine di scadenza, proposta di
  riordino, sprechi con il motivo; richiamo di un lotto: piatti e comande coinvolte.
- Cantina e carta dei vini; registri HACCP (temperature, ricevimento, sanificazione,
  olio di frittura) con soglie e azione correttiva; eventi e banchetti con preventivo.
- Cassa non fiscale: conti divisi in parti o per voce, pagamenti misti, fattura del
  registro dal conto chiuso. Clienti abituali con preferenze, fedeltà e recensioni.

### Bar
- Stesso motore del Ristorante (prodotti, magazzino, cassa) con il banco: comande
  smistate per postazione (macchina del caffè, bancone dei cocktail), tempi di attesa.
- Happy hour e promozioni per giorni e orari, anche a cavallo della mezzanotte;
  prendi tre paghi due; listini per fascia.
- Convenzioni con le aziende: listino riservato, dipendenti autorizzati con tessera,
  limite giornaliero e mensile che blocca l'addebito, fattura periodica all'azienda.
- Mescita: bottiglie aperte con versato teorico (dalle ricette vendute) e reale,
  scarto oltre la soglia segnalato. Fedeltà a timbri (per esempio dieci caffè, uno
  offerto). Proposta di riordino.

### Hotel
- Strutture (anche più di una), tipologie e camere per piano; stato di pulizia e fuori
  servizio separati dall'occupazione.
- Planning camere per giorni con trascinamento; una camera non si assegna due volte
  nella stessa notte; overbooking per tipologia segnalato.
- Prenotazioni con stati richiesta, opzionata, confermata, in soggiorno, partita,
  annullata, no show; gruppi con blocchi di camere; intermediari con commissione.
- Piani tariffari (miglior tariffa, non rimborsabile, prenota prima e altri), prezzo
  calcolato notte per notte, soggiorno minimo; trattamenti (colazione, mezza pensione).
- Check-in con i documenti degli ospiti, conto camera con notti, extra, minibar e
  addebiti da ristorante e bar; check-out con la tassa di soggiorno calcolata dalle
  regole del comune (esenzioni e riduzioni per età, notti massime).
- File per gli alloggiati (Questura) e movimenti ISTAT generati dagli ospiti
  registrati, da caricare a mano sui portali ufficiali.
- Pulizie generate da arrivi e partenze, assegnate e verificate; biancheria, guasti,
  oggetti smarriti, sale meeting, transfer, parcheggio.
- Indicatori: occupazione, prezzo medio, ricavo per camera disponibile, durata media,
  cancellazioni, no show, ritmo delle prenotazioni, costo dei portali. Suggerimenti di
  prezzo da regole: il prezzo non cambia mai da solo.

### Palestra
- Soci con codice, QR, certificato medico, consensi; potenziali iscritti su una
  pipeline del nucleo (lead, contatto, visita, prova, offerta, iscrizione).
- Formule (mensili, trimestrali, annuali, a fasce orarie, a ingressi), carnet e
  pacchetti; sospensioni che spostano la scadenza; rinnovi che generano le rate;
  convenzioni aziendali con la quota a carico dell'azienda e la sua fattura.
- Ingressi verificati in reception (tessera, badge, QR o nome): abbonamento, accessi
  residui, fascia oraria, certificato, sospensioni, rate insolute; risposta con il motivo.
- Corsi con calendario, sale e istruttori; prenotazioni con capienza rispettata anche
  sull'ultimo posto, lista d'attesa che scorre, regole per disdette tardive e no show.
- Personal trainer con agenda e pacchetti di sessioni; schede di allenamento con
  versioni, misurazioni e valutazioni: dati sulla salute visibili solo al trainer del
  socio e alla direzione, con il consenso. Wellness, armadietti, vendita di prodotti.

### Fioraio
- Ordini con committente, pagatore, destinatario e mittente del biglietto distinti;
  stati da ricevuto a consegnato e chiuso; canali (negozio, telefono, messaggi, sito).
- Composizioni a catalogo con distinta di fiori e materiali; su misura con stima di
  materiali e manodopera; commessa di laboratorio alla conferma; scarico dei materiali
  quando la composizione è pronta.
- Fiori deperibili: lotti con arrivo e fine della vita commerciale, avviso prima della
  fine, sprechi con il motivo, scorte minime.
- Consegne per zona (costo dalla zona, zona dal CAP) e fascia oraria, con chi riceve e
  l'esito; pagina delle consegne per il telefono.
- Ricorrenze dei clienti con promemoria; abbonamenti floreali che generano gli ordini
  da soli; matrimoni, funerali ed eventi con gli allestimenti; vendita al banco.

### Garage e autorimesse
- Strutture con piani, aree e posti (auto, moto, commerciali, elettrici, disabili);
  mappa con lo stato dei posti in tempo reale.
- Ingressi e uscite per targa o ticket; tariffa calcolata all'uscita da franchigia,
  frazioni, notte, festivi, tetto giornaliero e tipo di veicolo; conto di cassa.
- Clienti privati e aziende (nell'anagrafica del nucleo) con veicoli; contratti mensili
  e annuali con il posto, il canone e le rate; autorizzazioni per fascia oraria;
  convenzioni aziendali con posti acquistati e fattura del consuntivo.
- Prenotazioni del posto senza doppioni, con anticipo e importo previsto; lista d'attesa.
- Chiavi in custodia con armadietto e ogni passaggio di mano; danni e contestazioni con
  foto e responsabilità; colonnine di ricarica (energia per tariffa); lavaggi, deposito
  gomme e altri servizi sul conto.

### Agenzia immobiliare
- Fascicolo dell'immobile: caratteristiche, classe energetica, prezzo al metro, storico
  dei prezzi, proprietari con le quote, documenti da raccogliere con le scadenze, foto.
- Incarichi con esclusiva, durata, prezzo minimo e provvigione; stima del valore sui
  comparabili dell'archivio; annunci con il file per i portali.
- Richieste di acquirenti e inquilini; lead dai portali, dal sito e dai segnalatori,
  assegnati all'agente e convertiti in contatto e trattativa; matching con punteggio su
  cento e i motivi, selezione inviata al cliente.
- Due pipeline del nucleo: acquisizione degli immobili e trattative con i clienti.
- Visite con conferma ed esito (un agente mai in due visite insieme); proposte e
  controproposte con lo storico; preliminare e rogito; locazioni con l'adeguamento
  ISTAT del canone.
- Provvigioni dei due lati con la ripartizione fra agenti e collaboratori e la fattura;
  ogni agente vede le proprie, la direzione tutte. Report al proprietario per email;
  contratti da modello approvati dalla direzione.
- Antiriciclaggio: adeguata verifica dell'acquirente (identificazione, titolare
  effettivo, rischio, conservazione per dieci anni), richiesta per registrare il rogito.
  Registro dei consensi privacy.

## Cosa PMIFlow NON fa (oggi)

- Non invia le fatture elettroniche allo SdI: la fattura si emette con il proprio
  programma di fatturazione e in PMIFlow si registra (l'invio è in programma, non c'è).
- Non scarica i bandi dalle piattaforme: le gare si inseriscono a mano.
- Non calcola i contributi Enasarco.
- Non ha un'app da installare dagli store: è un'applicazione web.
- Non traccia i mezzi con il GPS.
- Non firma digitalmente i referti.
- Non pubblica prezzi: il costo si definisce dopo una presentazione.
- Non è un registratore di cassa: lo scontrino lo emette la cassa fiscale del locale
  (ristorante, bar, fioraio, garage, palestra); il collegamento è predisposto.
- Non riceve da solo gli ordini delle piattaforme di consegna, dell'e-commerce o dei
  marketplace floreali: si inseriscono indicando il canale (collegamento predisposto).
- Non è collegato a channel manager, portali di prenotazione, GDS o booking engine:
  disponibilità e prezzi sono pronti per esserlo, il collegamento non è attivo.
- Non apre tornelli, sbarre o porte e non legge targhe, badge o tessere RFID da solo:
  la verifica è pronta, l'hardware non è collegato.
- Non addebita le rate in automatico sulla carta o sul conto del cliente (predisposto).
- Non pubblica gli annunci sui portali immobiliari: produce il file da caricare.
- Non invia SMS o messaggi WhatsApp (predisposto); invia email.
- Non usa dati biometrici.

## Da non scrivere

Il controllo `npm run verifica-articoli` blocca un articolo che contiene uno di questi
testi (senza distinguere maiuscole e minuscole). Un articolo che parla di questi temi in
generale li descrive con altre parole e dice chiaramente che PMIFlow non li fa.

- `invio allo SdI`
- `inviare le fatture allo SdI`
- `invia le fatture allo SdI`
- `app da scaricare`
- `App Store`
- `Google Play`
- `tracciamento GPS`
- `localizzazione GPS`
- `scarica automaticamente i bandi`
- `calcolo automatico dei contributi Enasarco`
- `firma digitale dei referti`
- `prova gratuita`
- `gratis`
- `gratuito`
- `emette lo scontrino`
- `channel manager integrato`
- `sincronizzazione con i portali`
- `lettura automatica delle targhe`
- `apre i tornelli`
- `addebito automatico delle rate`
- `pubblica automaticamente sui portali`
