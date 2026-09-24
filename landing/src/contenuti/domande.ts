/**
 * Le domande frequenti. Fonte UNICA per la pagina (`<details>`) e per il JSON-LD
 * `FAQPage`: due copie divergono alla prima correzione, e quella che diverge è sempre
 * quella che nessuno rilegge, cioè quella che finisce nei risultati di ricerca.
 *
 * ⚠️ Nessuna risposta contiene prezzi o tempi promessi che il servizio non ha ancora
 * misurato su un cliente vero.
 */
export const DOMANDE: ReadonlyArray<readonly [string, string]> = [
  [
    "Dove stanno i miei dati?",
    "Su un server dedicato alla tua azienda, in un data center in Germania. Il database contiene solo i tuoi dati: non li condividi con altri clienti, nemmeno separati da un filtro.",
  ],
  [
    "Posso esportare i dati e andarmene?",
    "Sì. Le liste si esportano in CSV direttamente dall'applicazione. Se decidi di chiudere, ti consegniamo la copia completa del database e dei documenti caricati.",
  ],
  [
    "Serve un tecnico interno per gestirlo?",
    "No. Server, aggiornamenti, backup e certificati li gestiamo noi. Voi usate il programma dal browser, dal computer o dal telefono.",
  ],
  [
    "Quanto ci vuole per partire?",
    "L'istanza si prepara in automatico. Il lavoro vero è portare dentro le vostre anagrafiche, e lo facciamo insieme partendo dai vostri file.",
  ],
  [
    "Posso usare il mio logo e i miei colori?",
    "Sì. Nome, logo e colori sono quelli della tua azienda, e il programma risponde a un indirizzo con il vostro nome.",
  ],
  [
    "Cosa succede se il server si guasta?",
    "Ogni notte una copia completa parte verso un secondo luogo, e ogni mese la ripristiniamo per verificare che funzioni. Il servizio si ricostruisce da quella copia.",
  ],
  [
    "È conforme al GDPR?",
    "I dati restano in Unione Europea e per il trattamento firmiamo con te la nomina a responsabile (art. 28 GDPR). Il modulo Poliambulatori tratta i dati sanitari con i ruoli e le restrizioni che richiedono.",
  ],
  [
    "Funziona dal telefono?",
    "Sì. Il portale degli agenti è pensato per il telefono, e tutto il resto si usa anche da tablet e smartphone.",
  ],
  [
    "Quanto costa?",
    "Dipende da quanti siete e da quali moduli vi servono. Lo definiamo insieme dopo la presentazione, sui vostri numeri.",
  ],
];
