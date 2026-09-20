import { CATEGORIA_LABEL, ALIMENTAZIONE_LABEL, ACQUISIZIONE_LABEL, fmtImporto, fmtData } from '@/modules/automezzi/stati'
import { useAuth } from '@/hooks/useAuth'
import { useAutomezzoConsumi, useAutomezzoCostoKm, type Automezzo } from '@/modules/automezzi/queries/automezzi'
import { Riga, card, fmtKm } from '@/modules/automezzi/dettaglio/comuni'

export // ── Panoramica ───────────────────────────────────────────────────
function TabPanoramica({ mezzo }: { mezzo: Automezzo }) {
  const { isManager } = useAuth()
  const { data: consumi } = useAutomezzoConsumi(mezzo.id)
  const { data: costoKm } = useAutomezzoCostoKm(mezzo.id)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Anagrafica</h3>
        <Riga label="Targa">{mezzo.targa ?? '—'}</Riga>
        <Riga label="Telaio (VIN)">{mezzo.telaio ?? '—'}</Riga>
        <Riga label="Categoria">{CATEGORIA_LABEL[mezzo.categoria]}</Riga>
        <Riga label="Alimentazione">{mezzo.alimentazione ? ALIMENTAZIONE_LABEL[mezzo.alimentazione] : '—'}</Riga>
        <Riga label="Classe ambientale">{mezzo.classe_euro ?? '—'}</Riga>
        <Riga label="Immatricolazione">{mezzo.anno_immatricolazione ?? '—'}</Riga>
        <Riga label="Acquisizione">
          {ACQUISIZIONE_LABEL[mezzo.acquisizione]}{mezzo.data_acquisto ? ` (${fmtData(mezzo.data_acquisto)})` : ''}
        </Riga>
        <Riga label="Proprietario">{mezzo.proprietario ?? '—'}</Riga>
        <Riga label="Centro di costo">{mezzo.centro_costo ?? '—'}</Riga>
        <Riga label="Sede">{mezzo.sede ?? '—'}</Riga>
      </div>

      <div className={card}>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Utilizzo e consumi</h3>
        <Riga label="Km attuali">{fmtKm(mezzo.km_attuali)}</Riga>
        <Riga label="Litri totali">{Number(consumi?.litri_totali ?? 0)} l</Riga>
        <Riga label="Spesa carburante">{fmtImporto(Number(consumi?.costo_carburante ?? 0))}</Riga>
        <Riga label="Consumo medio">
          {consumi?.consumo_medio_100km != null ? `${consumi.consumo_medio_100km} l/100km` : '—'}
        </Riga>
        <Riga label="Ore di fermo">{Number(consumi?.ore_fermo ?? 0)} h</Riga>
        <Riga label="Guasti (straordinarie)">{consumi?.n_guasti ?? 0}</Riga>
        <Riga label="Spesa manutenzione">{fmtImporto(Number(consumi?.costo_manutenzione ?? 0))}</Riga>
        <Riga label="MTBF (km tra guasti)">
          {(consumi?.n_guasti ?? 0) > 0 && consumi?.km_max != null && consumi?.km_min != null
            ? fmtKm(Math.round((Number(consumi.km_max) - Number(consumi.km_min)) / Number(consumi.n_guasti)))
            : '—'}
        </Riga>
        <Riga label="MTTR (ore medie riparazione)">
          {(consumi?.n_guasti ?? 0) > 0
            ? `${(Number(consumi?.ore_fermo ?? 0) / Number(consumi?.n_guasti)).toFixed(1)} h`
            : '—'}
        </Riga>
      </div>

      {isManager && costoKm && (
        <div className={card + ' lg:col-span-2'}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Costi del mezzo (riservato)</h3>
          <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-3 lg:grid-cols-5">
            <Riga label="Costi fissi">{fmtImporto(Number(costoKm.costi_fissi ?? 0))}</Riga>
            <Riga label="Carburante">{fmtImporto(Number(costoKm.carburante ?? 0))}</Riga>
            <Riga label="Manutenzione">{fmtImporto(Number(costoKm.manutenzione ?? 0))}</Riga>
            <Riga label="Costo totale">{fmtImporto(Number(costoKm.costo_totale ?? 0))}</Riga>
            <Riga label="Costo / km">
              {costoKm.costo_km != null ? `€ ${Number(costoKm.costo_km).toFixed(3)}` : '—'}
            </Riga>
          </div>
        </div>
      )}

      {mezzo.stato === 'dismesso' && (
        <div className={card + ' lg:col-span-2'}>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Dismissione</h3>
          <Riga label="Data">{fmtData(mezzo.dismesso_il)}</Riga>
          <Riga label="Modalità">{mezzo.dismissione_tipo ?? '—'}</Riga>
          {mezzo.dismissione_valore != null && (
            <Riga label="Valore realizzato">{fmtImporto(Number(mezzo.dismissione_valore))}</Riga>
          )}
          {mezzo.dismissione_note && <p className="mt-1 text-sm text-muted-foreground">{mezzo.dismissione_note}</p>}
        </div>
      )}
    </div>
  )
}
