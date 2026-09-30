# Come si scrive un articolo

Un articolo è un file `.md` in questa cartella. Il nome del file diventa l'indirizzo:
`gestione-sal-cantiere.md` → `pmiflow.eu/blog/gestione-sal-cantiere`. Minuscole e
trattini, niente accenti. I file che iniziano con `_` (come questo) non si pubblicano.

## L'intestazione

In cima al file, tra due righe `---`:

```yaml
---
titolo: "Come tenere sotto controllo i SAL di cantiere senza Excel"   # 30–65 caratteri
descrizione: "Chi approva il SAL, quando si fattura, come non perdere il filo tra misure e fatture: un metodo pratico per imprese fino a 15 persone."   # 120–160
data: 2026-10-15          # il giorno in cui esce; una data futura lo programma
aggiornato: 2026-10-20    # facoltativo, se lo rivedi dopo l'uscita
autore: alessandro
settore: cantiere         # cantiere, gare, automezzi, agenti, poliambulatori, nucleo
parolaChiave: "gestione SAL cantiere"   # la ricerca a cui risponde; una sola per articolo
immagine: /blog/gestione-sal-cantiere/copertina.png   # facoltativa
bozza: false              # true = non esce, anche se la data è passata
---
```

## Il testo

- Si parte dai sottotitoli `## …`: il titolo lo mette la pagina, nel testo non si usa `# …`.
- Riquadri: una citazione che comincia con `[!nota]` o `[!attenzione]`.
  ```
  > [!nota]
  > Il SAL è lo stato di avanzamento dei lavori.
  ```
- Immagini in `landing/public/blog/<nome-articolo>/`, sempre con il testo alternativo:
  `![Il cronoprogramma del cantiere](/blog/gestione-sal-cantiere/cronoprogramma.png "Didascalia facoltativa")`
- Collegamenti alle pagine del sito con il percorso: `[il modulo Cantiere](/moduli/cantiere)`.
- **Mai prezzi**, né «€» né «euro»: il controllo blocca l'articolo.
- Almeno 900 parole.
- Su PMIFlow si scrive solo ciò che c'è in `landing/redazione/FATTI.md`.

## Prima di pubblicare

```
cd landing
npm run verifica-articoli
```

Se è tutto verde, l'articolo esce alla sua `data`: ogni mattina il sito si ricompila
da solo quando c'è un articolo del giorno.
