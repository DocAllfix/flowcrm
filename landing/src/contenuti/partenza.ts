/**
 * «Come si parte». NIENTE PREZZI: decisione del committente, 24/09/2026. Si vende su
 * presentazione, quindi questa sezione dice cosa è incluso e come si comincia.
 */
export const INCLUSO = [
  "Server dedicato in Unione Europea",
  "Backup notturno con ripristino provato ogni mese",
  "Aggiornamenti installati da noi, fuori orario",
  "Il tuo marchio e il tuo sottodominio",
  "Assistenza in italiano, da chi ha scritto il prodotto",
  "I moduli di settore che ti servono, solo quelli",
] as const;

export const PASSI = [
  {
    titolo: "Una presentazione",
    testo: "Mezz'ora, sui tuoi casi: ci racconti come lavorate oggi e ti mostriamo come si fa con PMIFlow.",
  },
  {
    titolo: "La tua istanza di prova",
    testo: "Sul tuo sottodominio, con il tuo logo. Ci carichiamo le tue anagrafiche e la provate in squadra.",
  },
  {
    titolo: "In produzione",
    testo: "Quando decidete voi. I dati della prova restano: non si ricomincia da capo.",
  },
] as const;
