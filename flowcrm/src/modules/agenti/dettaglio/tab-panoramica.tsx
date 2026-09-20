import { TIPOLOGIA_LABEL, fmtImporto, fmtData } from '@/modules/agenti/stati'
import { useAgentiKpi, type Agente } from '@/modules/agenti/queries/agenti'
import { Riga, card } from '@/modules/agenti/dettaglio/comuni'

export // ── Panoramica ───────────────────────────────────────────────────
function TabPanoramica({ agente }: { agente: Agente }) {
  const { data: kpi = [] } = useAgentiKpi()
  const mio = kpi.find((k) => k.agente_id === agente.id)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Fascicolo</h3>
        <Riga label="Tipologia">{TIPOLOGIA_LABEL[agente.tipologia]}</Riga>
        <Riga label="P.IVA / CF">{[agente.piva, agente.codice_fiscale].filter(Boolean).join(' / ') || '—'}</Riga>
        <Riga label="ENASARCO">{agente.enasarco ?? '—'}</Riga>
        <Riga label="CCIAA">{agente.cciaa ?? '—'}</Riga>
        <Riga label="Inizio collaborazione">{fmtData(agente.data_inizio)}</Riga>
        <Riga label="Area / Zone">{[agente.area_geografica, agente.zone].filter(Boolean).join(' · ') || '—'}</Riga>
        <Riga label="Settori">{agente.settori ?? '—'}</Riga>
        <Riga label="Contatti">{[agente.email, agente.telefono].filter(Boolean).join(' · ') || '—'}</Riga>
        <Riga label="Portale agente">{agente.user_id ? 'Accesso attivo' : 'Non attivo'}</Riga>
      </div>

      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Andamento anno</h3>
        <Riga label="Visite">{mio?.visite ?? 0}</Riga>
        <Riga label="Ordini">{mio?.ordini ?? 0}</Riga>
        <Riga label="Valore ordinato">{fmtImporto(Number(mio?.valore_ordini ?? 0))}</Riga>
        <Riga label="Offerte inviate / accettate">
          {mio?.offerte_inviate ?? 0} / {mio?.offerte_accettate ?? 0}
        </Riga>
        <Riga label="Tasso di conversione">
          {mio?.tasso_conversione != null ? `${mio.tasso_conversione}%` : '—'}
        </Riga>
        <Riga label="Clienti in portafoglio">{mio?.clienti ?? 0}</Riga>
        <Riga label="Fatturato per visita">
          {mio?.fatturato_per_visita != null ? fmtImporto(Number(mio.fatturato_per_visita)) : '—'}
        </Riga>
        <Riga label="Provvigioni maturate (anno)">{fmtImporto(Number(mio?.provvigioni_anno ?? 0))}</Riga>
      </div>

      {agente.note && (
        <div className={card + ' lg:col-span-2'}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Note</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{agente.note}</p>
        </div>
      )}
    </div>
  )
}
