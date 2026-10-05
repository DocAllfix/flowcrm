/**
 * Scheda del socio (documento Palestra §1, §41): profilo, abbonamenti e
 * carnet, pagamenti, accessi, corsi e personal training, scheda di
 * allenamento e progressi, armadietto, documenti e riscontri.
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Ban, DoorOpen, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { FeedbackSezione } from '@/components/condivisi/FeedbackSezione'
import { useAuth } from '@/hooks/useAuth'
import { useElenco, useRiga, useSalva, useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import { ConSede } from '@/modules/palestra/componenti/ConSede'
import { AbbonamentiSocio } from '@/modules/palestra/componenti/socio/AbbonamentiSocio'
import { PagamentiSocio } from '@/modules/palestra/componenti/socio/PagamentiSocio'
import { AttivitaSocio } from '@/modules/palestra/componenti/socio/AttivitaSocio'
import { AllenamentoSocio } from '@/modules/palestra/componenti/socio/AllenamentoSocio'
import { useCatalogoPalestra, TABELLE_SOCIO, type Armadietto, type Convenzione, type EsitoAccesso, type Socio, type SocioStato } from '@/modules/palestra/queries'
import { usePalestra } from '@/modules/palestra/contesto'
import { SOCIO_STATO, fmtData, fmtEuro, oggiIso } from '@/modules/palestra/stati'

export function SocioPage() {
  return <ConSede><Socio_ /></ConSede>
}

function Socio_() {
  const { id } = useParams<{ id: string }>()
  const { data: s, isLoading } = useRiga<SocioStato>('pal_soci_stato', id, '*', 'socio_id')
  const ingresso = useAzione('pal_registra_ingresso', TABELLE_SOCIO)
  const [scheda, setScheda] = useState('profilo')

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
  if (!s) {
    return <EmptyState icon={UserRound} title="Socio non trovato" description="Forse è stato cancellato."
      action={<Button asChild variant="outline"><Link to="/palestra/soci">Torna ai soci</Link></Button>} />
  }
  const st = SOCIO_STATO[s.stato ?? 'senza_titolo'] ?? SOCIO_STATO.senza_titolo

  return (
    <div>
      <PageHeader title={s.nome ?? 'Socio'} description={`${s.codice} · iscritto dal ${fmtData(s.data_iscrizione)}${s.email ? ` · ${s.email}` : ''}${s.telefono ? ` · ${s.telefono}` : ''}`}
        briciole={[{ label: 'Soci', to: '/palestra/soci' }, { label: s.codice ?? '' }]}
        numeri={[
          { etichetta: 'abbonamento fino al', valore: fmtData(s.scadenza) },
          { etichetta: 'ultimo ingresso', valore: s.ultimo_accesso ? fmtData(s.ultimo_accesso) : 'mai' },
          { etichetta: 'da pagare', valore: fmtEuro(s.da_pagare) },
        ]}
        actions={<>
          <Button asChild variant="outline"><Link to="/palestra/soci"><ArrowLeft className="h-4 w-4" /> Soci</Link></Button>
          <BottoneScrittura disabled={ingresso.isPending} onClick={() => ingresso.mutate({ p_codice: s.socio_id!, p_tipo: 'manuale' }, {
            onSuccess: (r) => {
              const e = r as unknown as EsitoAccesso
              if (e.consentito) toast.success(`Ingresso registrato: ${e.motivo}`)
              else toast.error(`Ingresso negato: ${e.motivo}`)
            }, onError: (e) => toast.error(messaggioErrore(e)) })}><DoorOpen className="h-4 w-4" /> Registra ingresso</BottoneScrittura>
        </>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={st.tone}>{st.label}</Badge>
        {s.bloccato && <Badge tone="danger">Bloccato</Badge>}
        {!s.condizioni_accettate && <Badge tone="warning">Condizioni da firmare</Badge>}
        {(!s.certificato_scadenza || s.certificato_scadenza < oggiIso()) && <Badge tone="warning">Certificato medico {s.certificato_scadenza ? 'scaduto' : 'mancante'}</Badge>}
      </div>

      <Tabs value={scheda} onValueChange={setScheda}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="profilo">Profilo</TabsTrigger>
          <TabsTrigger value="abbonamenti">Abbonamenti e carnet</TabsTrigger>
          <TabsTrigger value="pagamenti">Pagamenti</TabsTrigger>
          <TabsTrigger value="attivita">Ingressi, corsi e PT</TabsTrigger>
          <TabsTrigger value="allenamento">Allenamento e progressi</TabsTrigger>
          <TabsTrigger value="documenti">Documenti</TabsTrigger>
          <TabsTrigger value="riscontri">Riscontri</TabsTrigger>
        </TabsList>
        <TabsContent value="profilo"><Profilo socioId={s.socio_id!} /></TabsContent>
        <TabsContent value="abbonamenti"><AbbonamentiSocio socio={s} /></TabsContent>
        <TabsContent value="pagamenti"><PagamentiSocio socio={s} /></TabsContent>
        <TabsContent value="attivita"><AttivitaSocio socio={s} /></TabsContent>
        <TabsContent value="allenamento"><AllenamentoSocio socio={s} /></TabsContent>
        <TabsContent value="documenti">
          <Card className="p-5">
            <AllegatiSection entita="pal_soci" entitaId={s.socio_id!}
              categorie={['foto', 'contratto', 'condizioni di iscrizione', 'documentazione sottoscritta', 'certificato medico', 'ricevute', 'autorizzazioni', 'comunicazioni', 'servizi']} />
          </Card>
        </TabsContent>
        <TabsContent value="riscontri">
          <FeedbackSezione modulo="palestra" canali={['reception', 'email', 'app', 'telefono', 'recensione online']}
            entita={{ tipo: 'pal_soci', id: s.socio_id!, contatto: { id: s.contatto_id!, nome: s.nome ?? '', cognome: null, telefono: null, email: null } }}
            aspetti={['Corsi', 'Personal trainer', 'Struttura', 'Pulizia']} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

const NESSUNO = 'nessuno'

function Profilo({ socioId }: { socioId: string }) {
  const { sedeId } = usePalestra()
  const { isManager } = useAuth()
  const { trainer } = useCatalogoPalestra(sedeId)
  const { data: so } = useRiga<Socio>('pal_soci', socioId)
  const { data: convenzioni = [] } = useElenco<Convenzione & { organizzazioni: { ragione_sociale: string } | null }>('pal_convenzioni', {
    filtri: { attiva: true }, select: '*, organizzazioni(ragione_sociale)' })
  const { data: armadietti = [] } = useElenco<Armadietto>('pal_armadietti', { filtri: { sede_id: sedeId ?? undefined }, ordine: [{ colonna: 'numero' }], abilitato: !!sedeId })
  const salva = useSalva('pal_soci', TABELLE_SOCIO)
  const salvaArm = useSalva('pal_armadietti', ['pal_armadietti'])
  const [f, setF] = useState<Partial<Socio> | null>(null)
  const [arm, setArm] = useState({ id: '', fino: '' })
  if (!so) return <Skeleton className="h-64" />
  const v = { ...so, ...f }
  const set = <K extends keyof Socio>(k: K, val: Socio[K]) => setF({ ...f, [k]: val })
  const mio = armadietti.find((a) => a.socio_id === socioId)
  const liberi = armadietti.filter((a) => a.stato === 'libero')

  function registra() {
    if (!f) return
    salva.mutate({ id: socioId, values: f }, {
      onSuccess: () => { toast.success('Profilo aggiornato'); setF(null) },
      onError: (e) => toast.error(/23505/.test(JSON.stringify(e)) ? 'Tessera già assegnata a un altro socio' : messaggioErrore(e)),
    })
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="pf-nascita">Data di nascita</Label>
            <Input id="pf-nascita" type="date" value={v.data_nascita ?? ''} onChange={(e) => set('data_nascita', e.target.value || null)} /></div>
          <div className="space-y-1.5"><Label htmlFor="pf-badge">Tessera o badge</Label>
            <Input id="pf-badge" value={v.badge ?? ''} onChange={(e) => set('badge', e.target.value || null)} className="font-mono" /></div>
          <div className="space-y-1.5"><Label htmlFor="pf-emn">Contatto d'emergenza</Label>
            <Input id="pf-emn" value={v.emergenza_nome ?? ''} onChange={(e) => set('emergenza_nome', e.target.value || null)} /></div>
          <div className="space-y-1.5"><Label htmlFor="pf-emt">Telefono d'emergenza</Label>
            <Input id="pf-emt" type="tel" value={v.emergenza_telefono ?? ''} onChange={(e) => set('emergenza_telefono', e.target.value || null)} /></div>
          <div className="space-y-1.5"><Label htmlFor="pf-cert">Certificato medico valido fino al</Label>
            <Input id="pf-cert" type="date" value={v.certificato_scadenza ?? ''} onChange={(e) => set('certificato_scadenza', e.target.value || null)} /></div>
          <div className="space-y-1.5"><Label>Personal trainer</Label>
            <Select value={v.trainer_id ?? NESSUNO} onValueChange={(x) => set('trainer_id', x === NESSUNO ? null : x)}>
              <SelectTrigger aria-label="Personal trainer"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={NESSUNO}>Nessuno</SelectItem>
                {trainer.filter((t) => t.personal_trainer).map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1.5"><Label>Convenzione aziendale</Label>
            <Select value={v.convenzione_id ?? NESSUNO} onValueChange={(x) => set('convenzione_id', x === NESSUNO ? null : x)}>
              <SelectTrigger aria-label="Convenzione aziendale"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={NESSUNO}>Nessuna</SelectItem>
                {convenzioni.map((c) => <SelectItem key={c.id} value={c.id}>{c.organizzazioni?.ragione_sociale ?? c.nome}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="pf-pref">Preferenze</Label>
            <Input id="pf-pref" value={v.preferenze ?? ''} onChange={(e) => set('preferenze', e.target.value || null)} placeholder="Orari, corsi preferiti, obiettivi…" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="pf-note">Note</Label>
            <Textarea id="pf-note" rows={2} value={v.note ?? ''} onChange={(e) => set('note', e.target.value || null)} /></div>
          <div className="space-y-2 rounded-lg border border-border p-3 text-sm sm:col-span-2">
            <label className="flex items-start gap-2 text-foreground"><Checkbox className="mt-0.5" checked={v.condizioni_accettate}
              onCheckedChange={(x) => set('condizioni_accettate', x === true)} />Condizioni d'iscrizione e regolamento firmati
              {so.condizioni_at && <span className="text-xs text-muted-foreground">({fmtData(so.condizioni_at)})</span>}</label>
            <label className="flex items-start gap-2 text-foreground"><Checkbox className="mt-0.5" checked={v.consenso_salute}
              onCheckedChange={(x) => set('consenso_salute', x === true)} />Consenso ai dati sulla salute
              <span className="text-xs text-muted-foreground">(togliendolo, misure e valutazioni si cancellano)</span></label>
          </div>
          {isManager && (
            <div className="space-y-2 rounded-lg border border-border p-3 text-sm sm:col-span-2">
              <label className="flex items-center gap-2 text-foreground"><Checkbox checked={v.bloccato} onCheckedChange={(x) => set('bloccato', x === true)} />
                <Ban className="h-3.5 w-3.5" aria-hidden /> Blocca l'accesso</label>
              {v.bloccato && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
                  <Input value={v.blocco_motivo ?? ''} onChange={(e) => set('blocco_motivo', e.target.value || null)} placeholder="Motivo (lo vede la reception)" aria-label="Motivo del blocco" />
                  <Input type="date" value={v.blocco_fino ?? ''} onChange={(e) => set('blocco_fino', e.target.value || null)} aria-label="Bloccato fino al" />
                </div>
              )}
              {so.prenotazioni_bloccate_fino && so.prenotazioni_bloccate_fino >= oggiIso() && (
                <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Prenotazioni dei corsi sospese fino al {fmtData(so.prenotazioni_bloccate_fino)} per le assenze.</span>
                  <Button size="sm" variant="ghost" onClick={() => salva.mutate({ id: socioId, values: { prenotazioni_bloccate_fino: null } }, { onSuccess: () => toast.success('Prenotazioni riattivate') })}>Riattiva</Button></div>
              )}
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap justify-between gap-2">
          {isManager && !so.ex_socio_at ? (
            <Button variant="ghost" onClick={() => salva.mutate({ id: socioId, values: { ex_socio_at: oggiIso() } }, { onSuccess: () => toast.success('Segnato come ex socio') })}>Segna come ex socio</Button>
          ) : so.ex_socio_at ? <span className="text-sm text-muted-foreground">Ex socio dal {fmtData(so.ex_socio_at)}</span> : <span />}
          <BottoneScrittura onClick={registra} disabled={!f || salva.isPending}>Salva il profilo</BottoneScrittura>
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <h3 className="mb-2 text-title text-foreground">Tessera digitale</h3>
          <p className="text-sm text-muted-foreground">Codice del QR per l'app del socio (predisposta) e per il lettore all'ingresso:</p>
          <p className="mt-2 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">{so.qr_token}</p>
        </Card>
        <Card className="p-5">
          <h3 className="mb-2 text-title text-foreground">Armadietto</h3>
          {mio ? (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-foreground">N. {mio.numero}{mio.zona ? ` · ${mio.zona}` : ''}{mio.assegnato_fino ? ` · fino al ${fmtData(mio.assegnato_fino)}` : ''}
                {Number(mio.cauzione) > 0 && <span className="block text-xs text-muted-foreground">Cauzione {fmtEuro(mio.cauzione)}{mio.cauzione_versata ? ' versata' : ' da versare'}</span>}</span>
              <Button size="sm" variant="outline" onClick={() => salvaArm.mutate({ id: mio.id, values: { socio_id: null } }, { onSuccess: () => toast.success('Armadietto liberato') })}>Libera</Button>
            </div>
          ) : liberi.length === 0 ? <p className="text-sm text-muted-foreground">Nessun armadietto libero.</p> : (
            <div className="flex flex-wrap items-end gap-2">
              <Select value={arm.id} onValueChange={(x) => setArm({ ...arm, id: x })}>
                <SelectTrigger className="w-40" aria-label="Armadietto"><SelectValue placeholder="Scegli…" /></SelectTrigger>
                <SelectContent>{liberi.map((a) => <SelectItem key={a.id} value={a.id}>N. {a.numero}{a.zona ? ` · ${a.zona}` : ''}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" className="w-40" value={arm.fino} onChange={(e) => setArm({ ...arm, fino: e.target.value })} aria-label="Assegnato fino al" />
              <BottoneScrittura variant="outline" disabled={!arm.id} onClick={() => salvaArm.mutate({ id: arm.id, values: { socio_id: socioId, assegnato_fino: arm.fino || null } },
                { onSuccess: () => { toast.success('Armadietto assegnato'); setArm({ id: '', fino: '' }) }, onError: (e) => toast.error(messaggioErrore(e)) })}>Assegna</BottoneScrittura>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
