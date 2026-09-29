# Cosa fa PMIFlow, e cosa no

**Questa è l'unica fonte ammessa per le affermazioni sul prodotto** negli articoli del
blog, scritti a mano o dall'agente di redazione. Se una cosa non è scritta qui, non si
scrive. Ricavato dal codice (`flowcrm/src`, `flowcrm/supabase/migrations`) il
29/09/2026: quando il prodotto cambia, si aggiorna questo file nella stessa PR.

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

## Cosa PMIFlow NON fa (oggi)

- Non invia le fatture elettroniche allo SdI: la fattura si emette con il proprio
  programma di fatturazione e in PMIFlow si registra (l'invio è in programma, non c'è).
- Non scarica i bandi dalle piattaforme: le gare si inseriscono a mano.
- Non calcola i contributi Enasarco.
- Non ha un'app da installare dagli store: è un'applicazione web.
- Non traccia i mezzi con il GPS.
- Non firma digitalmente i referti.
- Non pubblica prezzi: il costo si definisce dopo una presentazione.

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
