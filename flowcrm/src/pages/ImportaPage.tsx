import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Upload, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { parseCsv, type ParsedCsv } from '@/lib/csv'

interface Campo { key: string; label: string; required?: boolean }
interface EntitaConfig {
  tabella: 'organizzazioni' | 'contatti'
  titolo: string
  descrizione: string
  campi: Campo[]
}

/** Configurazione per entità: un solo importer, guidato dall'entità. */
const ENTITA: Record<string, EntitaConfig> = {
  organizzazioni: {
    tabella: 'organizzazioni',
    titolo: 'Importa organizzazioni',
    descrizione: 'Carica un CSV, mappa le colonne e importa. Le righe senza ragione sociale finiscono negli scarti.',
    campi: [
      { key: 'ragione_sociale', label: 'Ragione sociale *', required: true },
      { key: 'piva', label: 'P.IVA' },
      { key: 'email', label: 'Email' },
      { key: 'telefono', label: 'Telefono' },
      { key: 'citta', label: 'Città' },
      { key: 'settore', label: 'Settore' },
    ],
  },
  contatti: {
    tabella: 'contatti',
    titolo: 'Importa contatti',
    descrizione: "Carica un CSV, mappa le colonne e importa. Le righe senza nome finiscono negli scarti. L'organizzazione si assegna poi dalla scheda del contatto.",
    campi: [
      { key: 'nome', label: 'Nome *', required: true },
      { key: 'cognome', label: 'Cognome' },
      { key: 'email', label: 'Email' },
      { key: 'telefono', label: 'Telefono' },
      { key: 'ruolo_aziendale', label: 'Ruolo aziendale' },
    ],
  },
}

const NESSUNA = '__nessuna__'

interface Esito {
  importate: number
  scarti: { riga: number; motivo: string }[]
}

export function ImportaPage() {
  const { userProfile } = useAuth()
  const [params] = useSearchParams()
  const config = ENTITA[params.get('tipo') ?? 'organizzazioni'] ?? ENTITA.organizzazioni
  const requiredKey = config.campi.find((c) => c.required)!.key

  const [csv, setCsv] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [esito, setEsito] = useState<Esito | null>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result))
      if (parsed.rows.length === 0) { toast.error('CSV vuoto o non valido'); return }
      setCsv(parsed)
      setEsito(null)
      const auto: Record<string, string> = {}
      config.campi.forEach((c) => {
        const h = parsed.headers.find((x) => x.toLowerCase().replace(/[^a-z]/g, '') === c.key.replace(/[^a-z]/g, ''))
        if (h) auto[c.key] = h
      })
      setMapping(auto)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function importa() {
    if (!csv) return
    const colReq = mapping[requiredKey]
    if (!colReq) { toast.error(`Mappa almeno «${config.campi[0].label.replace(' *', '')}»`); return }

    setImporting(true)
    const scarti: Esito['scarti'] = []
    const validi: Record<string, string | null>[] = []

    csv.rows.forEach((row, i) => {
      const val = row[colReq]?.trim()
      if (!val) {
        scarti.push({ riga: i + 2, motivo: `${config.campi[0].label.replace(' *', '')} mancante` })
        return
      }
      const record: Record<string, string | null> = {
        [requiredKey]: val,
        created_by: userProfile?.id ?? null,
      }
      config.campi.filter((c) => !c.required).forEach((c) => {
        const col = mapping[c.key]
        if (col && row[col]?.trim()) record[c.key] = row[col].trim()
      })
      validi.push(record)
    })

    let importate = 0
    for (let i = 0; i < validi.length; i += 100) {
      const blocco = validi.slice(i, i + 100)
      const { error } = await supabase.from(config.tabella).insert(blocco as never)
      if (error) {
        blocco.forEach((_, j) => scarti.push({ riga: i + j + 2, motivo: error.message }))
      } else {
        importate += blocco.length
      }
    }

    setEsito({ importate, scarti })
    setImporting(false)
    if (importate > 0) toast.success(`${importate} ${config.tabella} importate`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={config.titolo} description={config.descrizione} />

      {!csv ? (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card py-12 text-center transition-colors hover:border-primary/40 hover:bg-muted/20">
          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Scegli un file CSV</span>
          <span className="mt-1 text-xs text-muted-foreground">La prima riga deve contenere le intestazioni</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} data-testid="import-file" />
        </label>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Mappa le colonne ({csv.rows.length} righe rilevate)
            </h2>
            <div className="space-y-3">
              {config.campi.map((c) => (
                <div key={c.key} className="flex items-center gap-3">
                  <Label className="w-40 shrink-0">{c.label}</Label>
                  <Select
                    value={mapping[c.key] ?? NESSUNA}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [c.key]: v === NESSUNA ? '' : v }))}
                  >
                    <SelectTrigger className="flex-1"><SelectValue placeholder="— colonna CSV —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NESSUNA}>— nessuna —</SelectItem>
                      {csv.headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={importa} disabled={importing} data-testid="import-conferma">
                {importing ? 'Importazione…' : 'Importa'}
              </Button>
              <Button variant="outline" onClick={() => { setCsv(null); setEsito(null) }}>
                Annulla
              </Button>
            </div>
          </div>

          {esito && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold" data-testid="import-esito">{esito.importate} importate</span>
              </div>
              {esito.scarti.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-warning-foreground">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium">{esito.scarti.length} scarti</span>
                  </div>
                  <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {esito.scarti.map((s, i) => (
                      <li key={i}>Riga {s.riga}: {s.motivo}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
