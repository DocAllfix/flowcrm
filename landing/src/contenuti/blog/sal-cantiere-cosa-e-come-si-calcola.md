---
titolo: "SAL di cantiere: cos'è, come si calcola e chi lo approva"
descrizione: "Il SAL misura quanto lavoro è stato fatto e quanto si può fatturare. Come si calcola, chi lo firma e come non perdere il filo tra misure, SAL e fatture."
data: 2026-09-30
autore: alessandro
settore: cantiere
parolaChiave: "SAL cantiere"
bozza: false
origine: umano
---

Il SAL, stato di avanzamento lavori, è il documento che dice quanta parte dell'opera è stata eseguita fino a una certa data e, quindi, quanta parte del prezzo l'impresa può fatturare. Si calcola partendo dalle misure dei lavori fatti, si confronta con il contratto e, una volta approvato, diventa la base della fattura.

Sembra una questione da ufficio tecnico, ma è il punto in cui un cantiere smette di essere lavoro e diventa incasso. Un SAL fatto tardi, o fatto male, sposta in avanti i soldi e apre discussioni con il committente. Vediamo come funziona, passo per passo, con un esempio.

## Cos'è il SAL e a cosa serve

Nei contratti di appalto il prezzo non si paga quasi mai tutto alla fine. Si paga a rate, e ogni rata corrisponde a un pezzo di lavoro eseguito e verificato. Il SAL è il documento che fotografa quel pezzo: elenca le lavorazioni fatte dall'inizio del contratto fino alla data del SAL, le quantità, il valore maturato, quanto è già stato pagato con i SAL precedenti e quanto resta da pagare ora.

Serve a tre cose:

- **all'impresa**, per sapere cosa può fatturare e quando;
- **al committente**, per pagare solo ciò che è stato davvero eseguito;
- **a tutti e due**, come riferimento se nasce una contestazione su quantità o qualità.

Il contratto stabilisce ogni quanto si emette il SAL: a scadenze fisse (per esempio ogni due mesi) oppure al raggiungimento di una soglia di lavori eseguiti (per esempio ogni 20% dell'opera).

## Da dove nascono i numeri: misure, libretto e registro

Il SAL non si inventa a fine mese: si ricava da documenti che si tengono durante i lavori. Negli appalti pubblici l'elenco è preciso ed è nell'[Allegato II.14 del Codice dei contratti pubblici](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2023-03-31;36), all'articolo 12 sui documenti contabili:

1. il **giornale dei lavori**, con quello che succede ogni giorno in cantiere;
2. i **libretti delle misure**, dove si annotano le quantità eseguite, misurate in contraddittorio con l'impresa;
3. il **registro di contabilità**, che riporta le misure e le trasforma in importi secondo i prezzi del contratto;
4. lo **stato di avanzamento lavori**, che riassume tutto il lavoro eseguito fino a quel momento;
5. il **certificato di pagamento**, che autorizza il pagamento della rata.

Nei lavori privati la forma è più libera, ma la logica è la stessa: senza misure affidabili, il SAL è un'opinione.

> [!nota]
> Il rapportino giornaliero di cantiere non è il libretto delle misure, ma lo aiuta molto: se ogni giorno il capocantiere annota cosa è stato fatto e dove, a fine periodo misurare diventa verificare, non ricostruire.

## Come si calcola un SAL, con un esempio

Il calcolo, a parole, è questo: **quantità eseguita di ogni lavorazione × prezzo unitario del contratto**, sommato per tutte le lavorazioni. Dal totale maturato si tolgono i SAL già pagati e, se il contratto le prevede, le ritenute a garanzia.

Prendiamo un ampliamento di una scuola, con tre lavorazioni principali. Per non entrare in cifre di prezzo, ragioniamo in percentuale del valore di ciascuna lavorazione:

| Lavorazione | Quantità da contratto | Eseguita al SAL 3 | Avanzamento |
|---|---|---|---|
| Scavi e fondazioni | 420 m³ | 420 m³ | 100% |
| Strutture in elevazione | 180 m³ di calcestruzzo | 126 m³ | 70% |
| Impianti | 1 impianto completo | tracce e tubazioni | 15% |

Se le tre lavorazioni pesano, sul valore del contratto, rispettivamente il 20%, il 45% e il 35%, l'avanzamento complessivo è:

- scavi: 20% × 100% = 20 punti;
- strutture: 45% × 70% = 31,5 punti;
- impianti: 35% × 15% = 5,25 punti.

In totale, **56,75% del contratto maturato**. Se i SAL 1 e 2 avevano già riconosciuto il 38%, il SAL 3 vale il 18,75% del contratto, meno le eventuali ritenute. È questa la parte che si potrà fatturare quando il SAL sarà approvato.

## Chi prepara, chi firma, chi approva

Qui gli errori costano settimane.

**Negli appalti pubblici** il SAL lo redige il **direttore dei lavori**, che lo trasmette subito al **RUP**, il responsabile unico del progetto. Il RUP, dopo aver verificato la regolarità contributiva dell'impresa (il DURC), emette il **certificato di pagamento**, e solo allora la stazione appaltante paga. Se il DURC non è regolare, il pagamento si blocca: per questo conviene tenere d'occhio la scadenza del proprio DURC e di quello dei subappaltatori.

**Nei lavori privati** i ruoli li decide il contratto. Di solito l'impresa prepara il SAL, il direttore dei lavori del committente lo verifica e il committente lo approva. Il contratto dovrebbe dire in quanti giorni il committente deve rispondere: se non lo dice, il SAL può restare in sospeso a lungo.

> [!attenzione]
> Gli errori più comuni: misure prese senza il contraddittorio con il direttore dei lavori, varianti eseguite prima di essere approvate (e quindi non pagabili), SAL che mischiano lavori finiti e lavori solo iniziati. Ognuno di questi si trasforma in una contestazione proprio quando serve l'incasso.

## Dal SAL alla fattura

Una volta approvato, il SAL diventa una fattura. È il passaggio in cui si perdono più informazioni, perché di solito il SAL vive in un foglio di calcolo dell'ufficio tecnico e la fattura in un altro programma dell'amministrazione.

Per non perdere il filo, ogni SAL dovrebbe avere uno **stato** chiaro, sempre aggiornato:

1. **bozza**: le misure sono in compilazione;
2. **emesso**: il SAL è stato trasmesso per l'approvazione;
3. **fatturato**: è stata emessa la fattura corrispondente, con il suo numero;
4. **pagato**: l'incasso è arrivato.

Con questi quattro stati, chiunque in azienda può rispondere alla domanda che il titolare fa più spesso: quanto ci devono ancora su questo cantiere, e perché.

In PMIFlow, con il [modulo Cantiere](/moduli/cantiere), ogni SAL ha proprio questi stati ed è collegato alla fattura del registro fatture, accanto al libretto delle misure e ai costi del cantiere. La fattura elettronica la emetti con il tuo programma di fatturazione, e in PMIFlow la registri collegata al SAL.

## Ogni quanto fare il SAL

Dipende dal contratto, ma due regole pratiche valgono quasi sempre:

- **non aspettare la scadenza per misurare.** Le misure si prendono mentre il lavoro è visibile: un solaio si misura prima che venga coperto dal massetto, non dopo;
- **allinea il SAL al cronoprogramma.** Se il cronoprogramma dice che a fine mese le strutture saranno al 70%, e il SAL dice 50%, il ritardo è scritto nero su bianco: meglio saperlo subito che scoprirlo all'ultimo SAL.

Per le imprese piccole, che hanno pochi cantieri ma poca liquidità, un SAL ogni mese, quando il contratto lo permette, rende l'incasso più regolare e le discussioni più brevi.

## In breve

- Il SAL dice quanto lavoro è stato eseguito e quanto si può fatturare.
- Si calcola da misure affidabili: libretto delle misure e registro di contabilità.
- Negli appalti pubblici lo redige il direttore dei lavori e il RUP emette il certificato di pagamento, dopo aver verificato il DURC.
- Ogni SAL deve avere uno stato chiaro, da bozza a pagato, ed essere collegato alla sua fattura.

Chi segue più cantieri insieme può vedere com'è organizzato tutto questo aprendo il Cantiere nella demo di PMIFlow, senza registrazione.
