"use client";

import { useEffect, useRef, useState } from "react";
import { MODULI } from "@/contenuti/moduli";
import { IMPRESA } from "@/lib/sito";

const MOTIVI = [
  ["presentazione", "Una presentazione"],
  ["appuntamento", "Un appuntamento"],
  ["acquisto", "Informazioni per l'acquisto"],
] as const;

/**
 * Il modulo contatti. Si monta solo con `CONTATTI_ATTIVI` (vedi `lib/sito.ts`).
 *
 * Tre freni ai robot, nessuno di terzi (reCAPTCHA porta cookie e un trasferimento
 * verso gli USA): il campo trappola `sito`, il tempo minimo di compilazione, il limite
 * di frequenza sulla rotta. Il motivo arriva già scelto da `?motivo=`, così un pulsante
 * «Fissa un appuntamento» dentro la demo porta qui senza un passaggio in più.
 */
export function ModuloContatti() {
  const [stato, setStato] = useState<"pronto" | "invio" | "errore">("pronto");
  const [errore, setErrore] = useState("");
  const [motivo, setMotivo] = useState<string>("presentazione");
  const inizio = useRef(0);

  useEffect(() => {
    inizio.current = Date.now();
    const m = new URLSearchParams(window.location.search).get("motivo");
    if (m && MOTIVI.some(([v]) => v === m)) setMotivo(m);
  }, []);

  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStato("invio");
    const dati = new FormData(e.currentTarget);
    const corpo = {
      nome: dati.get("nome"),
      azienda: dati.get("azienda"),
      email: dati.get("email"),
      utenti: dati.get("utenti"),
      moduli: dati.getAll("moduli"),
      motivo: dati.get("motivo"),
      messaggio: dati.get("messaggio"),
      sito: dati.get("sito"),
      trascorsi: Date.now() - inizio.current,
    };
    try {
      const r = await fetch("/api/contatti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; errore?: string };
      if (r.ok && j.ok) {
        window.location.assign("/grazie");
        return;
      }
      setErrore(j.errore ?? "Non siamo riusciti a inviare la richiesta. Riprova fra qualche minuto.");
    } catch {
      setErrore("Connessione assente. Controlla la rete e riprova.");
    }
    setStato("errore");
  }

  const campo =
    "mt-2 block w-full rounded-sm border border-filo bg-foglio px-4 py-3 text-[1rem] text-inchiostro placeholder:text-tenue/70 focus:border-inchiostro";

  return (
    <form onSubmit={invia} className="grid gap-6" noValidate={false}>
      <fieldset className="grid gap-3">
        <legend className="text-[0.9375rem] font-semibold">Cosa ti serve</legend>
        <div className="flex flex-wrap gap-2">
          {MOTIVI.map(([v, etichetta]) => (
            <label key={v} className="cursor-pointer">
              <input type="radio" name="motivo" value={v} checked={motivo === v} onChange={() => setMotivo(v)} className="peer sr-only" />
              <span className="inline-block rounded-sm border border-filo px-4 py-2 text-[0.9375rem] peer-checked:border-inchiostro peer-checked:bg-inchiostro peer-checked:text-carta peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cotto">
                {etichetta}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block text-[0.9375rem] font-semibold">
          Nome e cognome
          <input name="nome" required minLength={2} maxLength={120} autoComplete="name" className={campo} />
        </label>
        <label className="block text-[0.9375rem] font-semibold">
          Azienda
          <input name="azienda" required minLength={2} maxLength={160} autoComplete="organization" className={campo} />
        </label>
        <label className="block text-[0.9375rem] font-semibold">
          Email di lavoro
          <input name="email" type="email" required maxLength={200} autoComplete="email" className={campo} />
        </label>
        <label className="block text-[0.9375rem] font-semibold">
          Quante persone lo useranno
          <select name="utenti" required defaultValue="" className={campo}>
            <option value="" disabled>
              Scegli
            </option>
            <option value="1-5">Da 1 a 5</option>
            <option value="6-15">Da 6 a 15</option>
            <option value="oltre-15">Più di 15</option>
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="text-[0.9375rem] font-semibold">
          Moduli di settore che ti interessano <span className="font-normal text-tenue">(facoltativo)</span>
        </legend>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
          {MODULI.map((m) => (
            <label key={m.nome} className="flex items-center gap-2 text-[0.9375rem]">
              <input type="checkbox" name="moduli" value={m.nome} className="size-4 accent-[var(--color-cotto)]" />
              {m.nome}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-[0.9375rem] font-semibold">
        Qualcosa da sapere prima <span className="font-normal text-tenue">(facoltativo)</span>
        <textarea name="messaggio" rows={4} maxLength={2000} className={campo} />
      </label>

      {/* Trappola per i robot: un umano non la vede e non la compila. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label>
          Sito web
          <input name="sito" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {/* Informativa art. 13 GDPR AL MOMENTO della raccolta, con il titolare nominato. */}
      <p className="prosa text-[0.875rem] leading-relaxed text-tenue">
        Usiamo questi dati solo per risponderti. Titolare del trattamento: {IMPRESA.ragioneSociale}. Non li salviamo in un
        archivio: arrivano come email e restano nella corrispondenza. Dettagli e diritti nell&apos;
        <a href="/privacy" className="underline underline-offset-2">
          informativa sulla privacy
        </a>
        .
      </p>

      <div className="flex flex-wrap items-center gap-6">
        <button type="submit" disabled={stato === "invio"} className="bottone bottone-primario disabled:opacity-60">
          {stato === "invio" ? "Invio in corso" : "Invia la richiesta"}
        </button>
        <p role="status" aria-live="polite" className="text-[0.9375rem] text-cotto-scuro">
          {stato === "errore" ? errore : ""}
        </p>
      </div>
    </form>
  );
}
