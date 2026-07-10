import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useFattura } from '@/lib/queries/amministrazione'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { StoricoSection } from '@/components/StoricoSection'

const fmtEuro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)

const STATO_TONE = { da_pagare: 'warning', pagata: 'success', scaduta: 'danger', parziale: 'info' } as const

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

export function FatturaDettaglioPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: f, isLoading } = useFattura(id)

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!f) return <p className="text-sm text-muted-foreground">Fattura non trovata.</p>

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={() => navigate('/fatture')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Registro fatture
      </button>

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Fattura {f.direzione === 'attiva' ? 'attiva (cliente)' : 'passiva (fornitore)'}
            </span>
            <h1 className="mt-1 text-2xl font-bold text-foreground">{f.numero}</h1>
            {f.organizzazione && <p className="mt-0.5 text-sm text-muted-foreground">{f.organizzazione.ragione_sociale}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{fmtEuro(Number(f.totale))}</p>
            <Badge tone={STATO_TONE[f.stato]} className="mt-1">{f.stato.replace('_', ' ')}</Badge>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
          <Info label="Data" value={new Date(f.data).toLocaleDateString('it-IT')} />
          <Info label="Scadenza" value={new Date(f.scadenza).toLocaleDateString('it-IT')} />
          <Info label="Imponibile" value={fmtEuro(Number(f.imponibile))} />
          <Info label="Totale" value={fmtEuro(Number(f.totale))} />
        </div>
      </div>

      <Tabs defaultValue="allegati">
        <TabsList>
          <TabsTrigger value="allegati">Allegati</TabsTrigger>
          <TabsTrigger value="storico">Storico</TabsTrigger>
        </TabsList>
        <TabsContent value="allegati" className="mt-4">
          <AllegatiSection entita="fatture" entitaId={f.id} />
        </TabsContent>
        <TabsContent value="storico" className="mt-4">
          <StoricoSection entita="fatture" entitaId={f.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
