import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { fmtImporto, fmtData } from '@/modules/cantiere/stati'
import { useAuth } from '@/hooks/useAuth'
import { useCantiereEconomia, useCantiereKpi, type Cantiere } from '@/modules/cantiere/queries/cantieri'
import { Riga, DocumentazioneMancante, card } from '@/modules/cantiere/dettaglio/comuni'

export // ── Panoramica (info + KPI + economia manager) ───────────────────
function TabPanoramica({ cantiere }: { cantiere: Cantiere }) {
  const { isManager } = useAuth()
  const { data: kpi } = useCantiereKpi(cantiere.id)
  const { data: eco } = useCantiereEconomia(cantiere.id)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Committenza e riferimenti</h3>
        <Riga label="Cliente">
          {cantiere.cliente ? (
            <Link to={`/organizzazioni/${cantiere.cliente.id}`} className="text-primary-testo hover:underline">
              {cantiere.cliente.ragione_sociale}
            </Link>
          ) : '—'}
        </Riga>
        <Riga label="Committente">{cantiere.committente?.ragione_sociale ?? '—'}</Riga>
        <Riga label="Direttore lavori">{cantiere.direttore_lavori ?? '—'}</Riga>
        <Riga label="RUP">{cantiere.rup ?? '—'}</Riga>
        <Riga label="CIG / CUP">{[cantiere.cig, cantiere.cup].filter(Boolean).join(' / ') || '—'}</Riga>
        <Riga label="Categoria lavori">{cantiere.categoria_lavori ?? '—'}</Riga>
        <Riga label="Responsabile interno">
          {cantiere.responsabile ? `${cantiere.responsabile.nome} ${cantiere.responsabile.cognome ?? ''}` : '—'}
        </Riga>
        <Riga label="Capocantiere">
          {cantiere.capocantiere ? `${cantiere.capocantiere.nome} ${cantiere.capocantiere.cognome ?? ''}` : '—'}
        </Riga>
        <Riga label="Direttore tecnico">{cantiere.direttore_tecnico ?? '—'}</Riga>
        <Riga label="Resp. sicurezza">{cantiere.responsabile_sicurezza ?? '—'}</Riga>
      </div>

      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Andamento</h3>
        <Riga label="Apertura">{fmtData(cantiere.data_apertura)}</Riga>
        <Riga label="Fine prevista">{fmtData(cantiere.data_fine_prevista)}</Riga>
        {cantiere.data_chiusura && <Riga label="Chiusura">{fmtData(cantiere.data_chiusura)}</Riga>}
        <Riga label="Avanzamento medio">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2 w-24 overflow-hidden rounded-full bg-muted align-middle">
              <span className="block h-full rounded-full bg-primary"
                style={{ width: `${kpi?.avanzamento_medio ?? 0}%` }} />
            </span>
            {kpi?.avanzamento_medio ?? 0}%
          </span>
        </Riga>
        <Riga label="Ore lavorate">{Number(kpi?.ore_totali ?? 0)} h</Riga>
        <Riga label="Rapportini">{kpi?.rapportini ?? 0}</Riga>
        <Riga label="Sicurezza: eventi aperti">
          {(kpi?.sicurezza_aperti ?? 0) > 0
            ? <Badge tone="danger">{kpi?.sicurezza_aperti}</Badge>
            : <Badge tone="success">0</Badge>}
        </Riga>
        <Riga label="Non conformità qualità">{kpi?.qualita_non_conformi ?? 0}</Riga>
        {(cantiere.commessa_id || cantiere.gara_id) && (
          <Riga label="Collegamenti">
            <span className="space-x-2">
              {cantiere.commessa_id && (
                <Link to={`/commesse/${cantiere.commessa_id}`} className="text-primary-testo hover:underline">commessa</Link>
              )}
              {cantiere.gara_id && (
                <Link to={`/gare/${cantiere.gara_id}`} className="text-primary-testo hover:underline">gara</Link>
              )}
            </span>
          </Riga>
        )}
      </div>

      {isManager && eco && (
        <div className={card + ' lg:col-span-2'}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Gestione economica (riservata)</h3>
          <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-3 lg:grid-cols-5">
            <Riga label="Contratto">{fmtImporto(Number(eco.importo_contrattuale ?? 0))}</Riga>
            <Riga label="SAL emessi">{fmtImporto(Number(eco.sal_emessi ?? 0))}</Riga>
            <Riga label="SAL pagati">{fmtImporto(Number(eco.sal_pagati ?? 0))}</Riga>
            <Riga label="Costi totali">{fmtImporto(Number(eco.costi_totali ?? 0))}</Riga>
            <Riga label="Utile maturato">
              <span className={Number(eco.utile_maturato ?? 0) >= 0 ? 'text-success' : 'text-destructive'}>
                {fmtImporto(Number(eco.utile_maturato ?? 0))}
              </span>
            </Riga>
          </div>
        </div>
      )}

      <DocumentazioneMancante cantiere={cantiere} />

      {cantiere.note && (
        <div className={card + ' lg:col-span-2'}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Note</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{cantiere.note}</p>
        </div>
      )}
    </div>
  )
}
