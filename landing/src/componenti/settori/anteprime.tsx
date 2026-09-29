import type { IdSettore } from "@/contenuti/settori";
import type { DatiFinestra } from "./Finestra";
import { Anteprima, Chip, Etichetta, Intestazione, RigaBarra, Righe } from "./Pezzi";

/**
 * Le anteprime delle pagine di settore: la finestra dell'hero e le quattro tessere di
 * «Cosa aggiunge», per ciascun modulo. Le chiavi (`cronoprogramma`, `sal`…) sono quelle
 * di `funzioni[].anteprima` in `contenuti/settori.ts`.
 *
 * Dati inventati ma COERENTI dentro ogni settore (lo stesso cantiere, la stessa gara, lo
 * stesso mezzo ricorrono fra finestra e tessere), e parole prese dalle schede vere del
 * modulo. ⚠️ Nessuna cifra in euro.
 */

const BLU = "oklch(0.45 0.09 250)";
const VERDE = "oklch(0.47 0.1 155)";
const VIOLA = "oklch(0.44 0.11 330)";
const OCRA = "oklch(0.5 0.1 70)";

/* ───────────────────────── Cantiere ───────────────────────── */

const FASI = [
  ["Scavi e fondazioni", 0, 30, 100],
  ["Strutture in elevazione", 22, 64, 70],
  ["Impianti", 52, 88, 15],
  ["Finiture", 78, 100, 0],
] as const;

function Cronoprogramma() {
  return (
    <Anteprima>
      <Etichetta>Cronoprogramma · Ampliamento Scuola Verdi</Etichetta>
      <div className="mt-3 space-y-2.5">
        {FASI.map(([fase, da, a, fatto]) => (
          <div key={fase}>
            <p className="text-[0.75rem] font-semibold">{fase}</p>
            <div className="relative mt-1 h-2.5 rounded-sm bg-carta-2">
              <div className="absolute inset-y-0 rounded-sm bg-filo" style={{ left: `${da}%`, width: `${a - da}%` }}>
                <div className="h-full rounded-sm bg-inchiostro" style={{ width: `${fatto}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-sm border border-filo bg-foglio px-3 py-2">
        <p className="text-[0.75rem] font-semibold">Rapportino di oggi · 9 presenti</p>
        <p className="text-[0.75rem] text-tenue">Getto solaio piano primo. Problema: ferro consegnato in ritardo.</p>
      </div>
    </Anteprima>
  );
}

function Sal() {
  return (
    <Anteprima>
      <Etichetta>SAL · Ampliamento Scuola Verdi</Etichetta>
      <div className="mt-3">
        <Righe
          righe={[
            { titolo: "SAL 1 · lavori al 30 giugno", nota: "Fattura 112", stato: "Pagato", tono: "fatto" },
            { titolo: "SAL 2 · lavori al 31 luglio", nota: "Fattura 124", stato: "Pagato", tono: "fatto" },
            { titolo: "SAL 3 · lavori al 30 settembre", nota: "Fattura 131 · approvato dal direttore lavori", stato: "Fatturato", tono: "neutro" },
            { titolo: "SAL 4 · lavori al 31 ottobre", nota: "Libretto delle misure in compilazione", stato: "Bozza", tono: "attesa" },
          ]}
        />
      </div>
    </Anteprima>
  );
}

function Imprese() {
  return (
    <Anteprima>
      <Etichetta>Imprese e subappaltatori</Etichetta>
      <div className="mt-3">
        <Righe
          righe={[
            { titolo: "Impianti Moretti", nota: "Impianti elettrici · DURC", stato: "Scade fra 12 giorni", tono: "accento" },
            { titolo: "Scavi Longo", nota: "Movimento terra · DURC valido", stato: "Fino al 14 gen", tono: "fatto" },
            { titolo: "Ferri & Figli", nota: "Carpenteria · SOA e assicurazione", stato: "In regola", tono: "fatto" },
          ]}
        />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-filo pt-3 text-[0.75rem]">
        <span className="text-tenue">Personale di cantiere presente oggi</span>
        <span className="cifre font-semibold">9 su 11</span>
      </div>
    </Anteprima>
  );
}

function Sicurezza() {
  return (
    <Anteprima>
      <div className="space-y-3">
        {[
          ["Registro sicurezza", "Quasi incidente · ponteggio lato nord", "Chiuso", "fatto"],
          ["Controlli qualità", "Prova sui cubetti di calcestruzzo", "Conforme", "fatto"],
          ["Controlli qualità", "Planarità massetto aula 3", "Non conforme", "accento"],
          ["Registro ambiente", "Conferimento macerie · FIR n. 2231", "Registrato", "neutro"],
        ].map(([registro, cosa, esito, tono]) => (
          <div key={cosa} className="flex items-center gap-3 rounded-sm border border-filo bg-foglio px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block text-[0.6875rem] uppercase tracking-[0.1em] text-tenue">{registro}</span>
              <span className="block truncate text-[0.8125rem] font-semibold">{cosa}</span>
            </span>
            <Chip tono={tono as "fatto" | "accento" | "neutro"}>{esito}</Chip>
          </div>
        ))}
      </div>
    </Anteprima>
  );
}

/* ───────────────────────── Gare ───────────────────────── */

function Requisiti() {
  const voci = [
    ["Iscrizione alla Camera di Commercio", true],
    ["Attestazione SOA OS28 classifica II", true],
    ["Certificazione ISO 9001", true],
    ["Fatturato specifico nel triennio", false],
  ] as const;
  return (
    <Anteprima>
      <Etichetta>Requisiti di partecipazione</Etichetta>
      <ul className="mt-3 space-y-2">
        {voci.map(([voce, ok]) => (
          <li key={voce} className="flex items-center gap-2.5 text-[0.8125rem]">
            <span className={`flex size-4 shrink-0 items-center justify-center rounded-sm ${ok ? "bg-inchiostro text-carta" : "border border-cotto"}`}>
              {ok && (
                <svg width="10" height="10" viewBox="0 0 14 14">
                  <path d="M2 7.5 5.5 11 12 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className={ok ? "" : "font-semibold text-cotto-scuro"}>{voce}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-sm border border-filo bg-foglio px-3 py-2 text-[0.75rem]">
        <p className="font-semibold">Chiarimento 2 · risposta ricevuta</p>
        <p className="text-tenue">Avvalimento ammesso per la SOA, con il contratto allegato all&apos;offerta.</p>
      </div>
    </Anteprima>
  );
}

function Offerta() {
  const colonne = [
    ["In analisi", ["Manutenzione verde", "Pulizie uffici"]],
    ["In preparazione", ["Impianti termici scuole"]],
    ["Presentata", ["Illuminazione pubblica", "Caserma VVF"]],
    ["Aggiudicata", ["Palestra comunale"]],
  ] as const;
  return (
    <Anteprima>
      <div className="grid grid-cols-4 gap-1.5">
        {colonne.map(([fase, gare]) => (
          <div key={fase} className="min-w-0">
            <p className="mb-2 truncate text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-tenue">{fase}</p>
            <div className="space-y-1.5">
              {gare.map((g) => (
                <div key={g} className={`rounded-sm border bg-foglio px-2 py-1.5 text-[0.6875rem] font-semibold leading-tight ${g === "Impianti termici scuole" ? "border-cotto" : "border-filo"}`}>
                  {g}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-filo pt-3 text-[0.75rem]">
        <span className="text-tenue">Decisione go/no-go · Impianti termici scuole</span>
        <Chip tono="fatto">Partecipare</Chip>
      </div>
    </Anteprima>
  );
}

function Cauzioni() {
  return (
    <Anteprima>
      <Etichetta>Cauzioni e garanzie</Etichetta>
      <div className="mt-3">
        <Righe
          righe={[
            { titolo: "Provvisoria · Impianti termici scuole", nota: "Banca · scade il 15 novembre", stato: "Attiva", tono: "neutro" },
            { titolo: "Definitiva · Palestra comunale", nota: "Assicurazione · lavori collaudati", stato: "Da restituire", tono: "accento" },
            { titolo: "Provvisoria · Caserma VVF", nota: "Banca · gara non aggiudicata", stato: "Restituita", tono: "fatto" },
          ]}
        />
      </div>
    </Anteprima>
  );
}

function Esiti() {
  return (
    <Anteprima>
      <Etichetta>Esiti per stazione appaltante</Etichetta>
      <div className="mt-3 space-y-3">
        <RigaBarra etichetta="Comune di Borgoalto" valore="3 vinte su 5" percento={60} />
        <RigaBarra etichetta="Azienda sanitaria locale" valore="2 su 2" percento={100} />
        <RigaBarra etichetta="Provincia" valore="0 su 3" percento={3} accento />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-filo pt-3 text-[0.75rem]">
        <span className="text-tenue">Team di gara · Impianti termici scuole</span>
        <span className="font-semibold">3 persone</span>
      </div>
    </Anteprima>
  );
}

/* ───────────────────────── Automezzi ───────────────────────── */

function Scadenze() {
  return (
    <Anteprima>
      <Etichetta>Scadenziario del parco</Etichetta>
      <div className="mt-3">
        <Righe
          righe={[
            { titolo: "Furgone FG 482 · Revisione", nota: "17 ottobre", stato: "Fra 18 giorni", tono: "accento" },
            { titolo: "Auto EX 119 · Assicurazione", nota: "2 novembre", stato: "Promemoria", tono: "attesa" },
            { titolo: "Autocarro GH 730 · Bollo", nota: "30 novembre", stato: "Promemoria", tono: "attesa" },
          ]}
        />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-filo pt-3 text-[0.75rem]">
        <span className="text-tenue">Richiesta utilizzo mezzo · Sara, venerdì</span>
        <Chip tono="neutro">Da approvare</Chip>
      </div>
    </Anteprima>
  );
}

function Manutenzioni() {
  return (
    <Anteprima>
      <Etichetta>Registro manutenzioni · FG 482</Etichetta>
      <div className="mt-3">
        <Righe
          righe={[
            { titolo: "Tagliando", nota: "2 settembre · Officina Righi · 4 ore di fermo", stato: "Ordinaria", tono: "neutro" },
            { titolo: "Sostituzione frizione", nota: "18 luglio · Officina Righi · 2 giorni di fermo", stato: "Straordinaria", tono: "accento" },
          ]}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-filo pt-3 text-[0.75rem]">
        <div className="rounded-sm border border-filo bg-foglio px-3 py-2">
          <p className="font-semibold">Estivi</p>
          <p className="text-tenue">Montati</p>
        </div>
        <div className="rounded-sm border border-filo bg-foglio px-3 py-2">
          <p className="font-semibold">Invernali</p>
          <p className="text-tenue">A deposito</p>
        </div>
      </div>
    </Anteprima>
  );
}

function Costi() {
  return (
    <Anteprima>
      <Etichetta>Costo al km rispetto alla media del parco</Etichetta>
      <div className="mt-3 space-y-3">
        <RigaBarra etichetta="Furgone FG 482" valore="+18%" percento={82} accento />
        <RigaBarra etichetta="Auto EX 119" valore="−6%" percento={47} />
        <RigaBarra etichetta="Autocarro GH 730" valore="−12%" percento={40} />
      </div>
      <div className="mt-4 flex items-baseline justify-between border-t border-filo pt-3 text-[0.75rem]">
        <span className="text-tenue">Consumo medio FG 482 · ultimi 10 rifornimenti</span>
        <span className="cifre font-semibold">9,1 l/100 km</span>
      </div>
    </Anteprima>
  );
}

function Sinistri() {
  return (
    <Anteprima>
      <Etichetta>Sinistri e multe</Etichetta>
      <div className="mt-3">
        <Righe
          righe={[
            { titolo: "Sinistro · 11 settembre", nota: "Parcheggio del cantiere · con controparte", stato: "In lavorazione", tono: "neutro" },
            { titolo: "Multa · Polizia Locale", nota: "Eccesso di velocità · 3 punti", stato: "Ricorso", tono: "accento" },
            { titolo: "Multa · accesso ZTL", nota: "Conducente: Luca Bianchi", stato: "Pagata", tono: "fatto" },
          ]}
        />
      </div>
    </Anteprima>
  );
}

/* ───────────────────────── Agenti ───────────────────────── */

function Visite() {
  return (
    <Anteprima>
      <Intestazione titolo="Ferramenta Galli · visita di oggi" stato="Esito positivo" tono="fatto" />
      <dl className="mt-3 space-y-1.5 text-[0.75rem]">
        {[
          ["Referenti", "Anna Galli, titolare"],
          ["Opportunità", "Rinnovo delle scaffalature"],
          ["Criticità", "Consegne lente nell'ultimo mese"],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-24 shrink-0 text-tenue">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 border-t border-filo pt-3">
        <Righe
          righe={[
            { titolo: "Bar Centrale", nota: "Martedì", stato: "Da ricontattare", tono: "accento" },
            { titolo: "Edil Casa", nota: "Lunedì", stato: "Neutro", tono: "neutro" },
          ]}
        />
      </div>
    </Anteprima>
  );
}

function Ordini() {
  return (
    <Anteprima>
      <Etichetta>Offerte e ordini · Marco Colombo</Etichetta>
      <div className="mt-3">
        <Righe
          righe={[
            { titolo: "Offerta 207 · Ferramenta Galli", nota: "Valida fino al 30 ottobre", stato: "Inviata", tono: "neutro" },
            { titolo: "Ordine 1893 · Bar Centrale", nota: "Inserito dal telefono", stato: "Confermato", tono: "fatto" },
          ]}
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-sm border border-cotto/40 bg-cotto/5 px-3 py-2 text-[0.75rem]">
        <span>
          <span className="font-semibold">Sconto oltre soglia</span> <span className="text-tenue">· offerta 207</span>
        </span>
        <Chip tono="accento">Alla direzione</Chip>
      </div>
    </Anteprima>
  );
}

function Provvigioni() {
  return (
    <Anteprima>
      <Etichetta>Provvigioni per periodo</Etichetta>
      <div className="mt-3">
        <Righe
          righe={[
            { titolo: "Primo trimestre", stato: "Liquidate", tono: "fatto" },
            { titolo: "Secondo trimestre", stato: "Liquidate", tono: "fatto" },
            { titolo: "Terzo trimestre", nota: "Liquidazione in approvazione", stato: "Da liquidare", tono: "accento" },
          ]}
        />
      </div>
      <div className="mt-4 border-t border-filo pt-3">
        <RigaBarra etichetta="Obiettivo annuale" valore="74%" percento={74} />
      </div>
    </Anteprima>
  );
}

function Mandati() {
  return (
    <Anteprima>
      <Intestazione codice="Mandato 2025" titolo="Brescia e Bergamo · linea ferramenta" stato="Esclusiva" tono="neutro" />
      <p className="mt-1 text-[0.75rem] text-tenue">Scade il 31 marzo · promemoria 60 giorni prima</p>
      <div className="mt-4 border-t border-filo pt-3">
        <Etichetta>Note spese</Etichetta>
        <div className="mt-2">
          <Righe
            righe={[
              { titolo: "Trasferta Bergamo · chilometri", nota: "12 settembre", stato: "Approvata", tono: "fatto" },
              { titolo: "Pranzo con cliente", nota: "26 settembre", stato: "Da approvare", tono: "attesa" },
            ]}
          />
        </div>
      </div>
    </Anteprima>
  );
}

/* ───────────────────────── Poliambulatori ───────────────────────── */

function Paziente() {
  return (
    <Anteprima>
      <Intestazione titolo="Giulia Esposito" stato="In convenzione" tono="neutro" />
      <p className="text-[0.75rem] text-tenue">Fondo sanitario di categoria · medico curante dott. Ferri</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip tono="fatto">Consenso privacy</Chip>
        <Chip tono="fatto">Consenso comunicazioni</Chip>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-sm border border-filo bg-foglio px-3 py-2.5">
        <svg width="14" height="16" viewBox="0 0 14 16" className="shrink-0 text-cotto">
          <rect x="1.5" y="7" width="11" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4 7V4.5a3 3 0 0 1 6 0V7" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <span className="text-[0.75rem]">
          <span className="font-semibold">Contenuto clinico riservato</span>
          <span className="block text-tenue">Anamnesi, diagnosi e referti: solo con l&apos;accesso clinico</span>
        </span>
      </div>
    </Anteprima>
  );
}

function Agenda() {
  const colonne = [
    ["Ambulatorio 1", [["09:30", "Visita cardiologica", "Confermato"], ["10:00", "ECG", "Prenotato"]]],
    ["Ambulatorio 2", [["09:00", "Ecografia addome", "In sala"], ["08:30", "Visita ortopedica", "No show"]]],
  ] as const;
  return (
    <Anteprima>
      <div className="grid grid-cols-2 gap-2">
        {colonne.map(([sala, slot]) => (
          <div key={sala}>
            <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-tenue">{sala}</p>
            <div className="space-y-1.5">
              {slot.map(([ora, cosa, stato]) => (
                <div key={ora} className={`rounded-sm border bg-foglio px-2.5 py-2 ${stato === "In sala" ? "border-cotto" : "border-filo"}`}>
                  <p className="cifre text-[0.6875rem] text-tenue">{ora}</p>
                  <p className="truncate text-[0.75rem] font-semibold leading-tight">{cosa}</p>
                  <p className={`text-[0.6875rem] ${stato === "In sala" ? "font-semibold text-cotto-scuro" : "text-tenue"}`}>{stato}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Anteprima>
  );
}

function Struttura() {
  return (
    <Anteprima>
      <Etichetta>Apparecchiature</Etichetta>
      <div className="mt-3">
        <Righe
          righe={[
            { titolo: "Ecografo", nota: "Ambulatorio 2", stato: "Operativa", tono: "fatto" },
            { titolo: "Holter pressorio", nota: "Rientra dall'assistenza lunedì", stato: "In manutenzione", tono: "accento" },
          ]}
        />
      </div>
      <div className="mt-4 border-t border-filo pt-3">
        <Etichetta>Scadenze della struttura</Etichetta>
        <p className="mt-2 text-[0.8125rem] font-semibold">Taratura elettrocardiografo</p>
        <p className="text-[0.75rem] text-tenue">20 novembre · promemoria inviato</p>
      </div>
    </Anteprima>
  );
}

function Referti() {
  return (
    <Anteprima>
      <Etichetta>Referti</Etichetta>
      <div className="mt-3">
        <Righe
          righe={[
            { titolo: "Ecografia addome · G. Esposito", nota: "Dott.ssa Neri", stato: "Da validare", tono: "accento" },
            { titolo: "ECG · P. Russo", nota: "Dott. Fabbri", stato: "Validato", tono: "neutro" },
            { titolo: "Visita cardiologica · A. Conti", nota: "Dott. Fabbri", stato: "Inviato", tono: "fatto" },
            { titolo: "Visita ortopedica · L. Marini", nota: "Dott. Sala", stato: "Bozza", tono: "attesa" },
          ]}
        />
      </div>
    </Anteprima>
  );
}

/* ───────────────────────── Mappa ───────────────────────── */

export const ANTEPRIME_SETTORE: Record<IdSettore, { finestra: DatiFinestra; tessere: Record<string, React.ComponentType> }> = {
  cantiere: {
    finestra: {
      indirizzo: "edil-garda.pmiflow.it/cantieri",
      sigla: "EG",
      cliente: "Edil Garda",
      tinta: OCRA,
      codice: "CN-2026-014",
      titolo: "Ampliamento Scuola Verdi",
      stato: "Attivo",
      schede: ["Panoramica", "Cronoprogramma", "Rapportini", "Contabilità", "Imprese", "Personale", "Sicurezza"],
      numeri: [
        ["Avanzamento medio", "58%"],
        ["Presenti oggi", "9"],
        ["Scadenze a 30 giorni", "3", true],
      ],
      righe: [
        ["Fase in corso", "Strutture in elevazione"],
        ["Prossimo SAL", "SAL 4 · lavori al 31 ottobre"],
        ["DURC in scadenza", "Impianti Moretti · fra 12 giorni", true],
        ["Direttore lavori", "Ing. Paola Ricci"],
      ],
    },
    tessere: { cronoprogramma: Cronoprogramma, sal: Sal, imprese: Imprese, sicurezza: Sicurezza },
  },
  gare: {
    finestra: {
      indirizzo: "rossi-impianti.pmiflow.it/gare",
      sigla: "RI",
      cliente: "Rossi Impianti",
      tinta: BLU,
      codice: "CIG B7F21A09C4",
      titolo: "Impianti termici delle scuole comunali",
      stato: "In preparazione",
      schede: ["Panoramica", "Requisiti", "Chiarimenti", "Valutazione", "Offerta", "Team"],
      numeri: [
        ["Requisiti verificati", "3 su 4"],
        ["Chiarimenti aperti", "1"],
        ["Giorni al termine", "9", true],
      ],
      righe: [
        ["Stazione appaltante", "Comune di Borgoalto"],
        ["Procedura", "Aperta · offerta più vantaggiosa"],
        ["Cauzione provvisoria", "Attiva · scade il 15 novembre"],
        ["RUP", "Dott. Marco Serra"],
      ],
    },
    tessere: { requisiti: Requisiti, offerta: Offerta, cauzioni: Cauzioni, esiti: Esiti },
  },
  automezzi: {
    finestra: {
      indirizzo: "rossi-impianti.pmiflow.it/automezzi",
      sigla: "RI",
      cliente: "Rossi Impianti",
      tinta: BLU,
      codice: "FG 482",
      titolo: "Furgone della squadra impianti",
      stato: "Assegnato",
      schede: ["Panoramica", "Assegnazioni", "Utilizzi", "Rifornimenti", "Manutenzioni", "Pneumatici", "Sinistri e multe", "Costi"],
      numeri: [
        ["Km attuali", "86.420"],
        ["Consumo medio", "9,1 l/100"],
        ["Revisione", "18 giorni", true],
      ],
      righe: [
        ["Assegnato a", "Luca Bianchi · squadra impianti"],
        ["Alimentazione", "Gasolio · carta carburante aziendale"],
        ["Ultima manutenzione", "Tagliando · 2 settembre"],
        ["Costo al km", "18% sopra la media del parco", true],
      ],
    },
    tessere: { scadenze: Scadenze, manutenzioni: Manutenzioni, costi: Costi, sinistri: Sinistri },
  },
  agenti: {
    finestra: {
      indirizzo: "distribuzione-neri.pmiflow.it/agenti",
      sigla: "DN",
      cliente: "Distribuzione Neri",
      tinta: VERDE,
      titolo: "Marco Colombo",
      stato: "Attivo",
      schede: ["Panoramica", "Portafoglio", "Visite", "Offerte e ordini", "Provvigioni", "Obiettivi", "Mandati", "Note spese"],
      numeri: [
        ["Clienti in portafoglio", "42"],
        ["Offerte / accettate", "18 / 11"],
        ["Obiettivo annuale", "74%"],
      ],
      righe: [
        ["Zona", "Brescia e Bergamo"],
        ["Ultima visita", "Oggi · Ferramenta Galli"],
        ["Provvigioni", "Terzo trimestre da liquidare", true],
        ["Mandato", "Esclusiva · scade il 31 marzo"],
      ],
    },
    tessere: { visite: Visite, ordini: Ordini, provvigioni: Provvigioni, mandati: Mandati },
  },
  poliambulatori: {
    finestra: {
      indirizzo: "sanluca.pmiflow.it/agenda",
      sigla: "SL",
      cliente: "Poliambulatorio San Luca",
      tinta: VIOLA,
      titolo: "Agenda di martedì 14 ottobre",
      stato: "2 in sala",
      schede: ["Tutti i professionisti", "Dott.ssa Neri", "Dott. Fabbri", "Dott. Sala"],
      numeri: [
        ["Appuntamenti oggi", "23"],
        ["Eseguiti", "8"],
        ["Referti da validare", "5", true],
      ],
      righe: [
        ["09:00 · Ecografia addome", "Ambulatorio 2 · In sala", true],
        ["09:30 · Visita cardiologica", "Ambulatorio 1 · Confermato"],
        ["10:00 · ECG", "Ambulatorio 1 · Prenotato"],
        ["08:30 · Visita ortopedica", "No show"],
      ],
    },
    tessere: { paziente: Paziente, agenda: Agenda, struttura: Struttura, referti: Referti },
  },
};
