import type { IdSettore } from "@/contenuti/settori";
import type { DatiFinestra } from "./Finestra";
import { Anteprima, Chip, Etichetta, Intestazione, RigaBarra, Righe, type Tono } from "./Pezzi";

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

/* ─────────────── Pezzi delle anteprime dei moduli nuovi ─────────────── */
/* Sette moduli, ventotto tessere: le compongono quattro forme ricorrenti (righe,
   barre, griglia di posti, registri), così la grammatica resta quella del resto. */

type RigaDati = { titolo: string; nota?: string; stato?: string; tono?: Tono };

function TesseraRighe({ etichetta, righe, piede }: { etichetta: string; righe: RigaDati[]; piede?: [string, string] }) {
  return (
    <Anteprima>
      <Etichetta>{etichetta}</Etichetta>
      <div className="mt-3">
        <Righe righe={righe} />
      </div>
      {piede && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-filo pt-3 text-[0.75rem]">
          <span className="text-tenue">{piede[0]}</span>
          <span className="cifre shrink-0 font-semibold">{piede[1]}</span>
        </div>
      )}
    </Anteprima>
  );
}

function TesseraBarre({ etichetta, barre, nota }: { etichetta: string; barre: [string, string, number, boolean?][]; nota?: [string, string] }) {
  return (
    <Anteprima>
      <Etichetta>{etichetta}</Etichetta>
      <div className="mt-3 space-y-3">
        {barre.map(([e, v, p, a]) => (
          <RigaBarra key={e} etichetta={e} valore={v} percento={p} accento={a} />
        ))}
      </div>
      {nota && (
        <div className="mt-4 rounded-sm border border-filo bg-foglio px-3 py-2">
          <p className="text-[0.75rem] font-semibold">{nota[0]}</p>
          <p className="text-[0.75rem] text-tenue">{nota[1]}</p>
        </div>
      )}
    </Anteprima>
  );
}

type StatoCella = "libero" | "occupato" | "riservato" | "attesa";
const CELLE: Record<StatoCella, string> = {
  libero: "border-filo bg-foglio text-tenue",
  occupato: "border-inchiostro bg-inchiostro text-carta",
  riservato: "border-filo bg-carta-2 text-inchiostro",
  attesa: "border-cotto bg-cotto/10 text-cotto-scuro",
};

function TesseraGriglia({ etichetta, colonne, celle, legenda, piede }: { etichetta: string; colonne: number; celle: [string, StatoCella][]; legenda: [StatoCella, string][]; piede?: string }) {
  return (
    <Anteprima>
      <Etichetta>{etichetta}</Etichetta>
      <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${colonne}, minmax(0, 1fr))` }}>
        {celle.map(([nome, stato]) => (
          <span key={nome} className={`truncate rounded-sm border px-1 py-1.5 text-center text-[0.6875rem] font-semibold ${CELLE[stato]}`}>
            {nome}
          </span>
        ))}
      </div>
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] text-tenue">
        {legenda.map(([stato, testo]) => (
          <span key={stato} className="flex items-center gap-1.5">
            <span className={`inline-block size-2.5 rounded-[2px] border ${CELLE[stato]}`} /> {testo}
          </span>
        ))}
      </p>
      {piede && <p className="mt-3 border-t border-filo pt-3 text-[0.75rem] font-semibold">{piede}</p>}
    </Anteprima>
  );
}

function TesseraRegistri({ voci }: { voci: [string, string, string, Tono][] }) {
  return (
    <Anteprima>
      <div className="space-y-3">
        {voci.map(([registro, cosa, esito, tono]) => (
          <div key={cosa} className="flex items-center gap-3 rounded-sm border border-filo bg-foglio px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block text-[0.6875rem] uppercase tracking-[0.1em] text-tenue">{registro}</span>
              <span className="block truncate text-[0.8125rem] font-semibold">{cosa}</span>
            </span>
            <Chip tono={tono}>{esito}</Chip>
          </div>
        ))}
      </div>
    </Anteprima>
  );
}

/* ───────────────────────── Ristorante ───────────────────────── */

const SalaRistorante = () => (
  <TesseraGriglia
    etichetta="Sala interna · stasera"
    colonne={4}
    celle={[["1", "libero"], ["2", "occupato"], ["3", "riservato"], ["4", "occupato"], ["5", "attesa"], ["6", "riservato"], ["7", "libero"], ["8", "riservato"]]}
    legenda={[["libero", "Libero"], ["occupato", "Al servizio"], ["riservato", "Prenotato"], ["attesa", "Seduti, da ordinare"]]}
    piede="Lista d'attesa · Pellegrini, 3 persone · circa 25 minuti"
  />
);
const CucinaRistorante = () => (
  <TesseraRighe
    etichetta="Cucina · postazione primi e secondi"
    righe={[
      { titolo: "2 × Risotto ai porcini", nota: "Tavolo 2 · uno senza formaggio", stato: "In preparazione", tono: "accento" },
      { titolo: "1 × Tagliata di manzo", nota: "Tavolo 2 · cottura media", stato: "Attende il via", tono: "attesa" },
      { titolo: "4 × Casoncelli", nota: "Tavolo 4 · seconda uscita", stato: "Pronti", tono: "fatto" },
    ]}
    piede={["Tempo medio di preparazione stasera", "11 minuti"]}
  />
);
const RicetteRistorante = () => (
  <TesseraBarre
    etichetta="Food cost per piatto"
    barre={[["Risotto ai porcini", "24%", 24], ["Tagliata di manzo", "33%", 33, true], ["Casoncelli alla bergamasca", "22%", 22], ["Tiramisù della casa", "18%", 18]]}
    nota={["Allergeni · Risotto ai porcini", "Latte, sedano (dal brodo vegetale)"]}
  />
);
const HaccpRistorante = () => (
  <TesseraRegistri
    voci={[
      ["Temperature", "Frigo carni · 2,5 °C", "Nella soglia", "fatto"],
      ["Temperature", "Frigo carni · 6,5 °C ieri sera", "Azione correttiva", "accento"],
      ["Sanificazione", "Piani di lavoro · chiusura", "Fatto", "fatto"],
      ["Eventi", "Pranzo di comunione · 34 coperti", "Confermato", "neutro"],
    ]}
  />
);

/* ───────────────────────── Bar ───────────────────────── */

const BancoBar = () => (
  <TesseraRighe
    etichetta="Banco · comande in corso"
    righe={[
      { titolo: "2 × Espresso, 1 × Cappuccino", nota: "Macchina del caffè · banco", stato: "Pronto", tono: "fatto" },
      { titolo: "2 × Spritz, 1 × Gin tonic", nota: "Bancone cocktail · tavolino T3", stato: "In preparazione", tono: "accento" },
      { titolo: "1 × Spremuta", nota: "Bancone · asporto", stato: "Da fare", tono: "attesa" },
    ]}
    piede={["Attesa media al banco oggi", "3 minuti"]}
  />
);
const PromozioniBar = () => (
  <TesseraRighe
    etichetta="Promozioni attive"
    righe={[
      { titolo: "Happy hour cocktail", nota: "Da lunedì a sabato · 18:00-20:00", stato: "In corso", tono: "accento" },
      { titolo: "Prendi 3 paghi 2 · birre", nota: "Venerdì · 21:00-01:00", stato: "Stasera", tono: "neutro" },
      { titolo: "Colazione completa", nota: "Tutti i giorni · 7:00-10:30", stato: "Chiusa", tono: "attesa" },
    ]}
  />
);
const ConvenzioniBar = () => (
  <TesseraBarre
    etichetta="Convenzione · Uffici Alfa"
    barre={[["Spesa del mese sul limite aziendale", "62%", 62], ["Mario Rossi · limite di oggi", "80%", 80, true], ["Lucia Neri · limite di oggi", "35%", 35]]}
    nota={["14 dipendenti autorizzati", "Listino riservato · fattura a fine mese"]}
  />
);
const MescitaBar = () => (
  <TesseraRighe
    etichetta="Mescita · teorico e reale"
    righe={[
      { titolo: "Gin London Dry", nota: "Scarto oltre la soglia del locale", stato: "Da verificare", tono: "accento" },
      { titolo: "Vermouth rosso", nota: "Versato in linea con le ricette", stato: "In linea", tono: "fatto" },
      { titolo: "Tessera di Carla", nota: "Caffè sospeso · 9 timbri su 10", stato: "Quasi premio", tono: "neutro" },
    ]}
    piede={["Proposta di riordino", "Acqua tonica, 2 casse"]}
  />
);

/* ───────────────────────── Hotel ───────────────────────── */

function PlanningHotel() {
  const righe = [
    ["101", [[0, 3, "Galli"], [4, 7, "Conti"]]],
    ["102", [[1, 5, "Longo"]]],
    ["201", [[0, 1, "Caruso"], [2, 6, "Ferrara"]]],
    ["202", [[0, 2, "Vitale"], [3, 7, "Coppola"]]],
    ["301", [[0, 4, "Weber", true]]],
  ] as const;
  return (
    <Anteprima>
      <Etichetta>Planning · settimana</Etichetta>
      <div className="mt-3 space-y-1.5">
        {righe.map(([camera, soggiorni]) => (
          <div key={camera} className="flex items-center gap-2">
            <span className="w-8 shrink-0 font-mono text-[0.6875rem] text-tenue">{camera}</span>
            <div className="relative h-5 flex-1 rounded-sm bg-carta-2">
              {soggiorni.map(([da, a, nome, evidenza]) => (
                <span
                  key={nome}
                  className={`absolute inset-y-0 truncate rounded-sm border px-1 text-[0.625rem] font-semibold leading-[1.15rem] ${evidenza ? "border-cotto bg-cotto/10 text-cotto-scuro" : "border-inchiostro/30 bg-foglio"}`}
                  style={{ left: `${(da / 7) * 100}%`, width: `${((a - da) / 7) * 100}%` }}
                >
                  {nome}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-filo pt-3 text-[0.75rem] text-tenue">Una camera non si assegna mai due volte nella stessa notte.</p>
    </Anteprima>
  );
}
const TariffeHotel = () => (
  <TesseraRighe
    etichetta="Piani tariffari · Doppia vista lago"
    righe={[
      { titolo: "Miglior tariffa", nota: "Fine settimana più cara · soggiorno minimo 2 notti", stato: "Base", tono: "neutro" },
      { titolo: "Non rimborsabile", nota: "Sconto sulla miglior tariffa", stato: "Attivo", tono: "fatto" },
      { titolo: "Prenota prima", nota: "Almeno 30 giorni di anticipo", stato: "Attivo", tono: "fatto" },
      { titolo: "Portale online", nota: "Commissione dell'intermediario", stato: "18%", tono: "accento" },
    ]}
  />
);
const ContoHotel = () => (
  <TesseraRighe
    etichetta="Check-out · camera 301"
    righe={[
      { titolo: "4 notti in mezza pensione", nota: "Addebitate dalla chiusura notturna", stato: "Sul conto", tono: "fatto" },
      { titolo: "Ristorante e minibar", nota: "Cena di giovedì · due bottiglie d'acqua", stato: "Sul conto", tono: "fatto" },
      { titolo: "Tassa di soggiorno", nota: "2 adulti · bambino esente sotto i 14 anni", stato: "Calcolata", tono: "neutro" },
      { titolo: "Ospiti registrati", nota: "3 su 3 · file Alloggiati pronto", stato: "Pronto", tono: "accento" },
    ]}
  />
);
const IndicatoriHotel = () => (
  <TesseraBarre
    etichetta="Ultimi 30 giorni"
    barre={[["Occupazione", "71%", 71], ["Prenotazioni dirette", "49%", 49], ["Prenotazioni dai portali", "40%", 40, true], ["Cancellazioni", "4%", 4]]}
    nota={["Suggerimento", "Weekend al 92%: valuta un aumento sulla Junior suite"]}
  />
);

/* ───────────────────────── Palestra ───────────────────────── */

const SociPalestra = () => (
  <TesseraRighe
    etichetta="Scadenze e rinnovi"
    righe={[
      { titolo: "Martina Locatelli", nota: "Open trimestrale · rinnovo automatico", stato: "Scade fra 6 giorni", tono: "accento" },
      { titolo: "Federico Mazzoleni", nota: "Sospeso per infortunio · fine prorogata", stato: "Sospeso", tono: "attesa" },
      { titolo: "Chiara Arnoldi", nota: "Annuale · convenzione Brembo Logistica", stato: "Attivo", tono: "fatto" },
    ]}
    piede={["Abbonamenti in scadenza entro 7 giorni", "11"]}
  />
);
const ReceptionPalestra = () => (
  <TesseraRighe
    etichetta="Reception · ingressi di stamattina"
    righe={[
      { titolo: "Simone Carminati", nota: "Badge · sala pesi", stato: "Entrato", tono: "fatto" },
      { titolo: "Riccardo Belotti", nota: "Rata insoluta da 12 giorni", stato: "Non entra", tono: "accento" },
      { titolo: "Elena Gamba", nota: "QR · fascia mattina", stato: "Entrata", tono: "fatto" },
      { titolo: "Nicola Magni", nota: "Certificato medico scaduto", stato: "Non entra", tono: "accento" },
    ]}
  />
);
const CorsiPalestra = () => (
  <TesseraBarre
    etichetta="Lezioni di oggi"
    barre={[["18:30 · Pilates", "14 su 14 · 2 in attesa", 100, true], ["19:30 · Spinning", "11 su 14", 79], ["20:30 · Zumba", "16 su 20", 80]]}
    nota={["Disdetta dell'ultimo minuto", "Il posto al Pilates passa al primo in lista"]}
  />
);
const TrainerPalestra = () => (
  <TesseraRighe
    etichetta="Personal training · Sara"
    righe={[
      { titolo: "Scheda di ottobre · Alessia Rota", nota: "Versione 3 · forza e postura", stato: "In corso", tono: "neutro" },
      { titolo: "Valutazione iniziale · Luca Bergamelli", nota: "Consenso ai dati sulla salute registrato", stato: "Fatta", tono: "fatto" },
      { titolo: "Sessione delle 17:00", nota: "Pacchetto 10 sessioni · 4 rimaste", stato: "Oggi", tono: "accento" },
    ]}
  />
);

/* ───────────────────────── Fioraio ───────────────────────── */

const OrdiniFioraio = () => (
  <TesseraRighe
    etichetta="Consegne di oggi · per zona"
    righe={[
      { titolo: "Nonna Lina · Borgo Palazzo", nota: "Da Marta Pedrini · entro le 15", stato: "In consegna", tono: "accento" },
      { titolo: "Dott.ssa Carrara · Centro", nota: "Da Paola Vavassori · 10:00", stato: "Pronta", tono: "fatto" },
      { titolo: "Reception Studio Ferri", nota: "Abbonamento settimanale", stato: "Da assegnare", tono: "attesa" },
    ]}
    piede={["Ritiri in negozio oggi", "2"]}
  />
);
const LaboratorioFioraio = () => (
  <TesseraRighe
    etichetta="Laboratorio · commesse"
    righe={[
      { titolo: "Cuscino di lilium e rose bianche", nota: "Esequie Ruggeri · 45 minuti", stato: "Da fare", tono: "attesa" },
      { titolo: "Bouquet 12 rose rosse", nota: "Distinta: rose, eucalipto, nastro", stato: "In corso", tono: "accento" },
      { titolo: "Mazzo di tulipani", nota: "Ritiro alle 18", stato: "Pronta", tono: "fatto" },
    ]}
    piede={["Materiali scaricati quando la composizione è pronta", "Sì"]}
  />
);
const MagazzinoFioraio = () => (
  <TesseraBarre
    etichetta="Fiori · vita commerciale residua"
    barre={[["Peonie · arrivate 3 giorni fa", "1 giorno", 20, true], ["Tulipani", "2 giorni", 35, true], ["Rose rosse Freedom", "5 giorni", 70], ["Lilium bianco", "7 giorni", 90]]}
    nota={["Sotto scorta", "Rose bianche e spugna da fiori"]}
  />
);
const RicorrenzeFioraio = () => (
  <TesseraRighe
    etichetta="Ricorrenze e abbonamenti"
    righe={[
      { titolo: "Compleanno della moglie Elisa", nota: "Roberto Agostinelli · fra 5 giorni", stato: "Promemoria", tono: "accento" },
      { titolo: "Fiori della hall · Albergo San Marco", nota: "Settimanale · prossima consegna giovedì", stato: "Attivo", tono: "fatto" },
      { titolo: "Matrimonio Pedrini · Bonomi", nota: "Arco, 12 centrotavola, bouquet", stato: "Confermato", tono: "neutro" },
    ]}
  />
);

/* ───────────────────────── Garage ───────────────────────── */

const MappaGarage = () => (
  <TesseraGriglia
    etichetta="Piano -1 · corsia A"
    colonne={6}
    celle={[["A01", "occupato"], ["A02", "libero"], ["A03", "occupato"], ["A04", "occupato"], ["A05", "libero"], ["A06", "occupato"], ["A07", "riservato"], ["A08", "occupato"], ["A09", "libero"], ["A10", "attesa"], ["A11", "occupato"], ["A12", "libero"]]}
    legenda={[["libero", "Libero"], ["occupato", "Occupato"], ["riservato", "Prenotato"], ["attesa", "In manutenzione"]]}
    piede="Uscita FK 201 TT · 3 ore e 20 minuti · tariffa calcolata"
  />
);
const AbbonamentiGarage = () => (
  <TesseraRighe
    etichetta="Abbonamenti e convenzioni"
    righe={[
      { titolo: "Studio Notarile Morelli", nota: "Annuale · posti B07 e B08", stato: "In regola", tono: "fatto" },
      { titolo: "Ilaria Moioli", nota: "Mensile · scade fra 9 giorni, senza rinnovo", stato: "In scadenza", tono: "accento" },
      { titolo: "Assicurazioni Orobie", nota: "Convenzione · 4 posti · 2 autorizzati", stato: "Consuntivo", tono: "neutro" },
    ]}
  />
);
const ChiaviGarage = () => (
  <TesseraRighe
    etichetta="Chiavi in custodia"
    righe={[
      { titolo: "K01 · EZ 903 KD", nota: "Armadio 1 · gancio 1", stato: "In armadio", tono: "fatto" },
      { titolo: "K02 · GE 110 AA", nota: "Consegnata a Paolo Cornago · 9:40", stato: "Fuori", tono: "accento" },
      { titolo: "Prenotazione · GC 512 DM", nota: "Domani 8:30-18:30 · posto A20", stato: "Confermata", tono: "neutro" },
    ]}
  />
);
const ServiziGarage = () => (
  <TesseraRegistri
    voci={[
      ["Danni e contestazioni", "Graffio portiera · FT 671 PP", "Da accertare", "accento"],
      ["Ricarica", "Colonnina EV1 · 22 kW", "In corso", "neutro"],
      ["Servizi", "Lavaggio esterno · GA 115 TR", "Sul conto", "fatto"],
      ["Deposito gomme", "Treno invernale · cliente Gritti", "In deposito", "fatto"],
    ]}
  />
);

/* ───────────────────────── Agenzia immobiliare ───────────────────────── */

const FascicoloImmobile = () => (
  <TesseraRighe
    etichetta="Documenti · Trilocale in Città Alta"
    righe={[
      { titolo: "Atto di provenienza", nota: "Caricato", stato: "Presente", tono: "fatto" },
      { titolo: "Planimetria e visura catastale", nota: "Conformi", stato: "Presente", tono: "fatto" },
      { titolo: "Attestato di prestazione energetica", nota: "Richiesto al tecnico", stato: "Mancante", tono: "accento" },
    ]}
    piede={["Storico del prezzo", "Un ribasso in 70 giorni"]}
  />
);
const MatchingImmobile = () => (
  <TesseraBarre
    etichetta="Clienti compatibili"
    barre={[["Stefano Carrara · famiglia", "92 su 100", 92, true], ["Omar Benali · investitore", "74 su 100", 74], ["Valeria Mologni", "58 su 100", 58]]}
    nota={["Perché 92", "Zona, budget, camere, ascensore e terrazzo come richiesto"]}
  />
);
const TrattativaImmobile = () => (
  <TesseraRighe
    etichetta="Trattativa · Quadrilocale in Borgo Palazzo"
    righe={[
      { titolo: "Seconda visita · Stefano Carrara", nota: "Con i genitori · vuole offrire", stato: "Svolta", tono: "fatto" },
      { titolo: "Proposta d'acquisto", nota: "Subordinata al mutuo", stato: "Respinta", tono: "neutro" },
      { titolo: "Controproposta del proprietario", nota: "Scade fra 3 giorni", stato: "In attesa", tono: "accento" },
    ]}
  />
);
const ProvvigioniImmobile = () => (
  <TesseraBarre
    etichetta="Ripartizione della provvigione"
    barre={[["Agente dell'immobile", "50%", 50], ["Agente del cliente", "40%", 40], ["Segnalatore", "10%", 10, true]]}
    nota={["Antiriciclaggio dell'acquirente", "Adeguata verifica fatta · da conservare per 10 anni"]}
  />
);

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
  ristorante: {
    finestra: {
      indirizzo: "osteria-del-borgo.pmiflow.it/ristorante/analisi",
      sigla: "OB",
      cliente: "Osteria del Borgo",
      tinta: OCRA,
      titolo: "Analisi degli ultimi sette giorni",
      stato: "Servizio aperto",
      schede: ["KPI", "Menu engineering", "Food cost", "Tempi di cucina", "Bevande", "Sprechi"],
      numeri: [
        ["Coperti", "412"],
        ["Food cost", "27%"],
        ["Lotti in scadenza", "3", true],
      ],
      righe: [
        ["Piatto più venduto", "Casoncelli alla bergamasca"],
        ["Menu engineering", "Tagliata di manzo · piatto stella"],
        ["Lotto da usare per primo", "Funghi porcini · fra 2 giorni", true],
        ["Tempo medio di cucina", "11 minuti"],
      ],
    },
    tessere: { sala: SalaRistorante, cucina: CucinaRistorante, ricette: RicetteRistorante, haccp: HaccpRistorante },
  },
  bar: {
    finestra: {
      indirizzo: "caffe-centrale.pmiflow.it/bar/mescita",
      sigla: "CC",
      cliente: "Caffè Centrale",
      tinta: BLU,
      titolo: "Mescita della settimana",
      stato: "3 bottiglie aperte",
      schede: ["In uso", "Chiuse", "Teorico e reale"],
      numeri: [
        ["Versato teorico", "1,42 l"],
        ["Versato reale", "1,51 l"],
        ["Scarto", "6%", true],
      ],
      righe: [
        ["Gin London Dry", "Oltre la soglia del locale", true],
        ["Vermouth rosso", "In linea con le ricette"],
        ["Happy hour", "Oggi 18:00-20:00 · cocktail"],
        ["Prossimo riordino", "Acqua tonica · 2 casse"],
      ],
    },
    tessere: { banco: BancoBar, promozioni: PromozioniBar, convenzioni: ConvenzioniBar, mescita: MescitaBar },
  },
  hotel: {
    finestra: {
      indirizzo: "hotel-belvedere.pmiflow.it/hotel/prenotazioni",
      sigla: "HB",
      cliente: "Hotel Belvedere",
      tinta: BLU,
      codice: "PRN-2026-0142",
      titolo: "Famiglia Weber · camera 301",
      stato: "In soggiorno",
      schede: ["Ospiti", "Soggiorno", "Notti", "Servizi", "Caparra e garanzie", "Documenti"],
      numeri: [
        ["Notti", "4"],
        ["Ospiti", "3"],
        ["Partenza", "sabato", true],
      ],
      righe: [
        ["Trattamento", "Mezza pensione"],
        ["Canale", "Portale online · commissione 18%"],
        ["Late check-out", "Richiesto per le 12", true],
        ["Ospiti registrati", "3 su 3 · file Alloggiati pronto"],
      ],
    },
    tessere: { planning: PlanningHotel, tariffe: TariffeHotel, conto: ContoHotel, indicatori: IndicatoriHotel },
  },
  palestra: {
    finestra: {
      indirizzo: "fitlab.pmiflow.it/palestra/soci",
      sigla: "FL",
      cliente: "Fit Lab",
      tinta: VIOLA,
      codice: "SOC-2026-0118",
      titolo: "Martina Locatelli",
      stato: "In regola",
      schede: ["Profilo", "Abbonamenti e carnet", "Pagamenti", "Ingressi, corsi e PT", "Allenamento e progressi", "Documenti"],
      numeri: [
        ["Ingressi del mese", "14"],
        ["Lezioni prenotate", "3"],
        ["Abbonamento", "6 giorni", true],
      ],
      righe: [
        ["Formula", "Open trimestrale · rinnovo automatico"],
        ["Certificato medico", "Valido fino a marzo"],
        ["Prossima lezione", "Pilates · domani alle 18:30"],
        ["Rinnovo", "Rata generata alla scadenza", true],
      ],
    },
    tessere: { soci: SociPalestra, reception: ReceptionPalestra, corsi: CorsiPalestra, trainer: TrainerPalestra },
  },
  fioraio: {
    finestra: {
      indirizzo: "fiori-citta-alta.pmiflow.it/fioraio/ordini",
      sigla: "FA",
      cliente: "Fiori di Città Alta",
      tinta: VERDE,
      codice: "FIO-2026-0231",
      titolo: "Bouquet di peonie per Nonna Lina",
      stato: "In consegna",
      schede: ["Prodotti", "Destinatario e biglietto", "Produzione e consegna", "Resi", "Foto"],
      numeri: [
        ["Consegna", "oggi, 15:00"],
        ["Zona", "Borgo Palazzo"],
        ["Composizioni", "1"],
      ],
      righe: [
        ["Ordinato da", "Marta Pedrini"],
        ["Destinatario", "Lina Pedrini · via Borgo Palazzo"],
        ["Biglietto", "«Tanti auguri nonna!» · Marta e Luca"],
        ["Ricorrenza", "Compleanno · salvata per il prossimo anno", true],
      ],
    },
    tessere: { ordini: OrdiniFioraio, laboratorio: LaboratorioFioraio, magazzino: MagazzinoFioraio, ricorrenze: RicorrenzeFioraio },
  },
  garage: {
    finestra: {
      indirizzo: "autorimessa-matteotti.pmiflow.it/garage/clienti",
      sigla: "AM",
      cliente: "Autorimessa Matteotti",
      tinta: OCRA,
      titolo: "Studio Notarile Morelli",
      stato: "Abbonato",
      schede: ["Anagrafica", "Veicoli", "Contratti", "Accessi autorizzati", "Pagamenti", "Ingressi", "Prenotazioni e servizi", "Documenti"],
      numeri: [
        ["Posti riservati", "2"],
        ["Ingressi del mese", "38"],
        ["Rate scadute", "0"],
      ],
      righe: [
        ["Contratto", "Annuale · posti B07 e B08"],
        ["Veicolo", "GE 110 AA · Mercedes Classe C"],
        ["Accessi autorizzati", "Dal lunedì al venerdì, 7-20"],
        ["Chiave in custodia", "K02 · consegnata alle 9:40", true],
      ],
    },
    tessere: { mappa: MappaGarage, abbonamenti: AbbonamentiGarage, chiavi: ChiaviGarage, servizi: ServiziGarage },
  },
  immobiliare: {
    finestra: {
      indirizzo: "casa-orobica.pmiflow.it/immobiliare/immobili",
      sigla: "CO",
      cliente: "Casa Orobica",
      tinta: BLU,
      codice: "IMM-2026-0034",
      titolo: "Trilocale con terrazzo in Città Alta",
      stato: "Disponibile",
      schede: ["Scheda", "Proprietari", "Documenti", "Incarico", "Valutazione", "Annuncio", "Clienti compatibili", "Visite e proposte", "Report"],
      numeri: [
        ["Superficie", "95 m²"],
        ["Clienti compatibili", "6"],
        ["Giorni sul mercato", "41"],
      ],
      righe: [
        ["Incarico", "Esclusiva · scade fra 3 mesi"],
        ["Proprietari", "2 · quote al 50%"],
        ["Documenti", "APE da raccogliere", true],
        ["Prossima visita", "Oggi alle 18 · Stefano Carrara"],
      ],
    },
    tessere: { fascicolo: FascicoloImmobile, matching: MatchingImmobile, trattativa: TrattativaImmobile, provvigioni: ProvvigioniImmobile },
  },
};
