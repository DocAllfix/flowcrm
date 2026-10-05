/**
 * Analisi della direzione: soci e abbandoni, rinnovi fatti e persi, ingressi
 * per fascia oraria, riempimento dei corsi e assenze, incassi per voce e
 * insoluti, conversione dei prospect.
 */
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { ManagerOnly } from '@/components/ManagerOnly'
import { useRpc } from '@/lib/queries/fondamenta'
import { usePalestra } from '@/modules/palestra/contesto'
import { ConSede, SelettoreSede } from '@/modules/palestra/componenti/ConSede'
import { fmtEuro, fmtNumero, oggiIso, piuGiorni } from '@/modules/palestra/stati'

type N = number | null
interface Kpi {
  soci: { attivi: number; sospesi: number; morosi: number; scaduti: number; nuovi: number; usciti: number; inattivi_30: number }
  rinnovi: { in_scadenza_30: number; scaduti: number; rinnovati: number; persi: number; automatici: number; tasso_rinnovo: N }
  accessi: { ingressi: number; negati: number; per_socio: N; per_ora: Record<string, number>; motivi_negati: Record<string, number> }
  corsi: { lezioni: number; riempimento: N; presenze: N; no_show: number; tasso_no_show: N; per_corso: { corso: string; lezioni: number; presenze: number; riempimento: N }[] }
  economia: { incassato: number; fatturato_aziende: number; da_incassare: number; insoluti: number; prodotti: number; ricavo_medio_socio: N
    per_voce: { abbonamenti: number; carnet: number; personal_training: number; penali: number } } | null
  prospect: { lead: number; iscritti: number; persi: number; aperti: number; conversione: N; prove_svolte: number; prove_iscritti: number }
}

const tooltipStyle = { borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }
const pct = (v: N) => (v == null ? '—' : `${fmtNumero(v, 1)}%`)

export function AnalisiPalestraPage() {
  return <ManagerOnly><ConSede><Analisi_ /></ConSede></ManagerOnly>
}

function Analisi_() {
  const { sedeId } = usePalestra()
  const [dal, setDal] = useState(piuGiorni(oggiIso(), -29))
  const [al, setAl] = useState(oggiIso())
  const { data: k, isLoading } = useRpc<Kpi>('pal_kpi', { p_sede: sedeId, p_dal: dal, p_al: al }, { abilitato: !!sedeId })
  const voce = (l: string, v: string) => <div key={l} className="flex items-center justify-between py-1.5"><dt className="text-muted-foreground">{l}</dt><dd className="tabular-nums text-foreground">{v}</dd></div>
  const ore = k ? Object.entries(k.accessi.per_ora).map(([h, n]) => ({ ora: `${h}`, ingressi: n })).sort((a, b) => Number(a.ora) - Number(b.ora)) : []
  const e = k?.economia

  return (
    <div>
      <PageHeader title="Analisi" description="I numeri della direzione: soci, rinnovi, frequenza, corsi, incassi e conversione."
        numeri={[
          { etichetta: 'soci attivi', valore: k?.soci.attivi, inCaricamento: isLoading },
          { etichetta: 'tasso di rinnovo', valore: k ? pct(k.rinnovi.tasso_rinnovo) : undefined, inCaricamento: isLoading },
          { etichetta: 'incassato', valore: e ? fmtEuro(e.incassato) : undefined, inCaricamento: isLoading },
          { etichetta: 'conversione dei lead', valore: k ? pct(k.prospect.conversione) : undefined, inCaricamento: isLoading },
        ]} actions={<SelettoreSede />} />
      <Card className="mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5"><Label htmlFor="an-dal">Dal</Label><Input id="an-dal" type="date" value={dal} onChange={(ev) => ev.target.value && setDal(ev.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="an-al">Al</Label><Input id="an-al" type="date" value={al} onChange={(ev) => ev.target.value && setAl(ev.target.value)} /></div>
        {([['30 giorni', 29], ['90 giorni', 89], ['12 mesi', 364]] as const).map(([l, g]) => (
          <Button key={l} variant="ghost" onClick={() => { setDal(piuGiorni(oggiIso(), -g)); setAl(oggiIso()) }}>{l}</Button>))}
      </Card>
      {isLoading || !k ? <Skeleton className="h-96" /> : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-2 text-title text-foreground">Soci</h2>
            <dl className="divide-y divide-border text-sm">{[
              voce('Attivi oggi', fmtNumero(k.soci.attivi)), voce('Sospesi', fmtNumero(k.soci.sospesi)), voce('Morosi', fmtNumero(k.soci.morosi)),
              voce('Con abbonamento scaduto', fmtNumero(k.soci.scaduti)), voce('Nuovi iscritti nel periodo', fmtNumero(k.soci.nuovi)),
              voce('Usciti nel periodo', fmtNumero(k.soci.usciti)), voce('Attivi senza ingressi da 30 giorni', fmtNumero(k.soci.inattivi_30)),
            ]}</dl>
          </Card>
          <Card className="p-5">
            <h2 className="mb-2 text-title text-foreground">Rinnovi</h2>
            <dl className="divide-y divide-border text-sm">{[
              voce('Abbonamenti finiti nel periodo', fmtNumero(k.rinnovi.scaduti)), voce('Rinnovati', fmtNumero(k.rinnovi.rinnovati)),
              voce('di cui automatici', fmtNumero(k.rinnovi.automatici)), voce('Persi', fmtNumero(k.rinnovi.persi)),
              voce('Tasso di rinnovo', pct(k.rinnovi.tasso_rinnovo)), voce('In scadenza nei prossimi 30 giorni', fmtNumero(k.rinnovi.in_scadenza_30)),
            ]}</dl>
          </Card>
          <Card className="p-5">
            <h2 className="mb-2 text-title text-foreground">Ingressi per fascia oraria</h2>
            <p className="mb-2 text-sm text-muted-foreground">{fmtNumero(k.accessi.ingressi)} ingressi, {k.accessi.per_socio != null ? `${fmtNumero(k.accessi.per_socio, 1)} a socio` : '—'}; {fmtNumero(k.accessi.negati)} negati.</p>
            {ore.length === 0 ? <p className="text-sm text-muted-foreground">Nessun ingresso nel periodo.</p> : (
              <div role="img" aria-label={`Ingressi per ora: picco alle ${[...ore].sort((a, b) => b.ingressi - a.ingressi)[0].ora}`}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ore}>
                    <XAxis dataKey="ora" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                    <Tooltip formatter={(x) => [fmtNumero(Number(x)), 'Ingressi']} labelFormatter={(l) => `Ore ${l}`} contentStyle={tooltipStyle} />
                    <Bar dataKey="ingressi" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {Object.keys(k.accessi.motivi_negati).length > 0 && (
              <dl className="mt-2 divide-y divide-border text-sm">{Object.entries(k.accessi.motivi_negati).sort((a, b) => b[1] - a[1]).map(([m, n]) => voce(`Negato · ${m}`, fmtNumero(n)))}</dl>)}
          </Card>
          <Card className="p-5">
            <h2 className="mb-2 text-title text-foreground">Corsi</h2>
            <p className="mb-2 text-sm text-muted-foreground">{fmtNumero(k.corsi.lezioni)} {k.corsi.lezioni === 1 ? 'lezione' : 'lezioni'}, riempimento {pct(k.corsi.riempimento)}, {fmtNumero(k.corsi.presenze ?? 0)} presenze, {fmtNumero(k.corsi.no_show)} assenze ({pct(k.corsi.tasso_no_show)}).</p>
            {k.corsi.per_corso.length > 0 && (
              <div className="overflow-x-auto"><Table>
                <TableHeader><TableRow><TableHead>Corso</TableHead><TableHead className="text-right">Lezioni</TableHead><TableHead className="text-right">Presenze</TableHead><TableHead className="text-right">Riempimento</TableHead></TableRow></TableHeader>
                <TableBody>{k.corsi.per_corso.map((c) => (
                  <TableRow key={c.corso}><TableCell className="text-foreground">{c.corso}</TableCell><TableCell numerica>{c.lezioni}</TableCell>
                    <TableCell numerica>{c.presenze}</TableCell><TableCell numerica>{pct(c.riempimento)}</TableCell></TableRow>))}</TableBody>
              </Table></div>)}
          </Card>
          {e && (
            <Card className="p-5">
              <h2 className="mb-2 text-title text-foreground">Incassi</h2>
              <dl className="divide-y divide-border text-sm">{[
                voce('Incassato nel periodo', fmtEuro(e.incassato)), voce('· abbonamenti', fmtEuro(e.per_voce.abbonamenti)), voce('· carnet', fmtEuro(e.per_voce.carnet)),
                voce('· personal training', fmtEuro(e.per_voce.personal_training)), voce('· penali', fmtEuro(e.per_voce.penali)),
                voce('Prodotti venduti in cassa', fmtEuro(e.prodotti)), voce('Fatturato alle aziende', fmtEuro(e.fatturato_aziende)),
                voce('Da incassare', fmtEuro(e.da_incassare)), voce('Insoluti', fmtEuro(e.insoluti)),
                voce('Ricavo medio per socio attivo', e.ricavo_medio_socio != null ? fmtEuro(e.ricavo_medio_socio) : '—'),
              ]}</dl>
            </Card>
          )}
          <Card className="p-5">
            <h2 className="mb-2 text-title text-foreground">Prospect</h2>
            <dl className="divide-y divide-border text-sm">{[
              voce('Lead nel periodo', fmtNumero(k.prospect.lead)), voce('Iscritti', fmtNumero(k.prospect.iscritti)), voce('Persi', fmtNumero(k.prospect.persi)),
              voce('Ancora aperti', fmtNumero(k.prospect.aperti)), voce('Conversione', pct(k.prospect.conversione)),
              voce('Prove svolte → iscritti', `${fmtNumero(k.prospect.prove_iscritti)} su ${fmtNumero(k.prospect.prove_svolte)}`),
            ]}</dl>
          </Card>
        </div>
      )}
    </div>
  )
}
