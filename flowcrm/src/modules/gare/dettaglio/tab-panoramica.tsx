import { Button } from '@/components/ui/button'
import { CheckCircle2, Briefcase, ExternalLink } from 'lucide-react'
import { fmtImporto, fmtData } from '@/modules/gare/stati'
import { moduloBySlug } from '@/config/moduli.config'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useCreateCantiere } from '@/modules/cantiere/queries/cantieri'
import { useCreateCommessa } from '@/lib/queries/commesse'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUpdateGara, useGaraOfferta, type Gara } from '@/modules/gare/queries/gare'
import { Riga, SezioneEsito, card } from '@/modules/gare/dettaglio/comuni'

export // ── Panoramica ───────────────────────────────────────────────────
function TabPanoramica({ gara }: { gara: Gara }) {
  const navigate = useNavigate()
  const update = useUpdateGara()
  const creaCommessa = useCreateCommessa()
  const creaCantiere = useCreateCantiere()
  const qc = useQueryClient()
  const moduloCantiereAttivo = !!moduloBySlug('cantiere')
  const { data: offerta } = useGaraOfferta(gara.id)
  // Il cantiere nato da questa gara (cantieri.gara_id), se esiste
  const { data: cantiereCollegato } = useQuery({
    queryKey: ['gare', gara.id, 'cantiere-collegato'],
    enabled: moduloCantiereAttivo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cantieri').select('id, codice').eq('gara_id', gara.id).maybeSingle()
      if (error) throw error
      return data
    },
  })

  async function handleCreaCantiere() {
    try {
      const cantiere = await creaCantiere.mutateAsync({
        denominazione: gara.titolo,
        cliente_id: gara.ente_appaltante_id,
        stazione_appaltante_id: gara.ente_appaltante_id,
        cig: gara.cig, cup: gara.cup,
        importo_contrattuale: Number(offerta?.importo_offerto ?? gara.importo_base),
        gara_id: gara.id,
        commessa_id: gara.commessa_id,
        stato: 'pianificato',
      })
      toast.success(`Cantiere ${cantiere.codice} creato dalla gara`)
      qc.invalidateQueries({ queryKey: ['gare', gara.id, 'cantiere-collegato'] })
      navigate(`/cantieri/${cantiere.id}`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function handleCreaCommessa() {
    if (!gara.ente_appaltante_id) {
      toast.error('Per creare la commessa collega l\'ente appaltante a un\'organizzazione in anagrafica')
      return
    }
    try {
      const commessa = await creaCommessa.mutateAsync({
        organizzazione_id: gara.ente_appaltante_id,
        descrizione: `${gara.codice} — ${gara.titolo}`,
        importo: Number(offerta?.importo_offerto ?? gara.importo_base),
      })
      await update.mutateAsync({ id: gara.id, values: { commessa_id: commessa.id } })
      toast.success(`Commessa ${commessa.codice} creata dalla gara`)
      navigate(`/commesse/${commessa.id}`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Procedura</h3>
        <Riga label="Tipologia">{gara.tipologia}</Riga>
        <Riga label="Procedura">{gara.procedura.replaceAll('_', ' ')}</Riga>
        <Riga label="CIG">{gara.cig ?? '—'}</Riga>
        <Riga label="CUP">{gara.cup ?? '—'}</Riga>
        <Riga label="CPV">{gara.cpv ?? '—'}</Riga>
        <Riga label="RUP">{gara.rup ?? '—'}</Riga>
        <Riga label="Piattaforma">
          {gara.piattaforma_url ? (
            <a href={gara.piattaforma_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary-testo hover:underline">
              {gara.piattaforma ?? 'link'} <ExternalLink className="h-3 w-3" />
            </a>
          ) : (gara.piattaforma ?? '—')}
        </Riga>
        <Riga label="Luogo di esecuzione">{gara.luogo_esecuzione ?? '—'}</Riga>
        <Riga label="Durata">{gara.durata_mesi != null ? `${gara.durata_mesi} mesi` : '—'}</Riga>
      </div>

      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Importi e termini</h3>
        <Riga label="Importo a base d'asta">{fmtImporto(Number(gara.importo_base))}</Riga>
        <Riga label="Oneri sicurezza">{gara.oneri_sicurezza != null ? fmtImporto(Number(gara.oneri_sicurezza)) : '—'}</Riga>
        <Riga label="Pubblicazione">{fmtData(gara.data_pubblicazione)}</Riga>
        <Riga label="Termine chiarimenti">{fmtData(gara.termine_chiarimenti)}</Riga>
        <Riga label="Termine presentazione">
          {gara.termine_presentazione
            ? new Date(gara.termine_presentazione).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
            : '—'}
        </Riga>
        <Riga label="Apertura offerte">
          {gara.data_apertura_offerte
            ? new Date(gara.data_apertura_offerte).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
            : '—'}
        </Riga>
        <Riga label="Classificazione">
          {[gara.settore, gara.categoria_soa, gara.territorio].filter(Boolean).join(' · ') || '—'}
        </Riga>
        <Riga label="Fonte">{gara.fonte ?? '—'}</Riga>
      </div>

      {['presentata', 'aggiudicata', 'non_aggiudicata', 'annullata'].includes(gara.stato) && (
        <SezioneEsito gara={gara} />
      )}

      {gara.stato === 'aggiudicata' && (
        <div className={card}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Avvio commessa</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            La gara è aggiudicata: avvia l'esecuzione con la commessa
            (e, se serve, il cantiere collegato).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {gara.commessa_id ? (
              <span className="inline-flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <Link to={`/commesse/${gara.commessa_id}`} className="font-medium text-primary-testo hover:underline">
                  Apri la commessa
                </Link>
              </span>
            ) : (
              <Button onClick={() => void handleCreaCommessa()} disabled={creaCommessa.isPending}>
                <Briefcase className="h-4 w-4" />
                {creaCommessa.isPending ? 'Creazione…' : 'Crea commessa'}
              </Button>
            )}
            {moduloCantiereAttivo && (cantiereCollegato ? (
              <span className="inline-flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <Link to={`/cantieri/${cantiereCollegato.id}`} className="font-medium text-primary-testo hover:underline">
                  Apri il cantiere {cantiereCollegato.codice}
                </Link>
              </span>
            ) : (
              <Button variant="outline" onClick={() => void handleCreaCantiere()}
                disabled={creaCantiere.isPending}>
                {creaCantiere.isPending ? 'Creazione…' : 'Crea cantiere'}
              </Button>
            ))}
          </div>
        </div>
      )}

      {gara.note && (
        <div className={card + ' lg:col-span-2'}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Note</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{gara.note}</p>
        </div>
      )}
    </div>
  )
}
