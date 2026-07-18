-- ═══════════════════════════════════════════════════════════════════
-- SEED DEMO MODULI — dati realistici per le dimostrazioni dei
-- rappresentanti. IDEMPOTENTE (UUID fissi + ON CONFLICT/WHERE NOT
-- EXISTS): rieseguibile senza duplicare. Da lanciare con service_role/
-- postgres (l'installer) su un'istanza con i moduli licenziati.
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_admin UUID;
BEGIN
  SELECT id INTO v_admin FROM user_profiles WHERE ruolo = 'admin' AND attivo LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Serve almeno un utente admin per il seed';
  END IF;

  -- ── Organizzazioni di contorno ─────────────────────────────────
  INSERT INTO organizzazioni (id, ragione_sociale, citta, settore, created_by) VALUES
    ('de300000-0000-0000-0000-000000000001', 'Comune di Brescia', 'Brescia', 'Pubblica amministrazione', v_admin),
    ('de300000-0000-0000-0000-000000000002', 'Immobiliare Aurora Srl', 'Milano', 'Immobiliare', v_admin),
    ('de300000-0000-0000-0000-000000000003', 'Elettro Impianti Snc', 'Bergamo', 'Impiantistica', v_admin)
  ON CONFLICT (id) DO NOTHING;

  -- ── MODULO GARE ────────────────────────────────────────────────
  INSERT INTO gare (id, titolo, ente_appaltante_id, cig, tipologia, procedura,
                    importo_base, categoria_soa, territorio, settore, stato,
                    data_pubblicazione, termine_chiarimenti, termine_presentazione, created_by)
  SELECT 'de310000-0000-0000-0000-000000000001',
         'Riqualificazione energetica scuola primaria Manzoni',
         'de300000-0000-0000-0000-000000000001', 'A01B2C3D4E', 'lavori', 'aperta',
         480000, 'OG1 III', 'Lombardia', 'Edilizia pubblica', 'in_preparazione',
         CURRENT_DATE - 10, CURRENT_DATE + 6, NOW() + interval '12 days', v_admin
  WHERE NOT EXISTS (SELECT 1 FROM gare WHERE id = 'de310000-0000-0000-0000-000000000001');

  INSERT INTO gare (id, titolo, ente_appaltante_id, tipologia, procedura,
                    importo_base, categoria_soa, territorio, stato, created_by)
  SELECT 'de310000-0000-0000-0000-000000000002',
         'Manutenzione ordinaria immobili comunali 2026',
         'de300000-0000-0000-0000-000000000001', 'lavori', 'negoziata',
         350000, 'OG1 II', 'Lombardia', 'aggiudicata', v_admin
  WHERE NOT EXISTS (SELECT 1 FROM gare WHERE id = 'de310000-0000-0000-0000-000000000002');

  INSERT INTO gare_requisiti (gara_id, tipo, descrizione, soddisfatto, created_by)
  SELECT 'de310000-0000-0000-0000-000000000001', 'soa', 'Attestazione SOA OG1 classifica III', true, v_admin
  WHERE NOT EXISTS (SELECT 1 FROM gare_requisiti
    WHERE gara_id = 'de310000-0000-0000-0000-000000000001' AND tipo = 'soa');
  INSERT INTO gare_requisiti (gara_id, tipo, descrizione, soddisfatto, created_by)
  SELECT 'de310000-0000-0000-0000-000000000001', 'certificazione', 'Certificazione ISO 9001', false, v_admin
  WHERE NOT EXISTS (SELECT 1 FROM gare_requisiti
    WHERE gara_id = 'de310000-0000-0000-0000-000000000001' AND tipo = 'certificazione');

  -- ── MODULO CANTIERE ────────────────────────────────────────────
  INSERT INTO cantieri (id, denominazione, cliente_id, citta, indirizzo, stato,
                        importo_contrattuale, categoria_lavori, data_apertura,
                        data_fine_prevista, created_by)
  SELECT 'de320000-0000-0000-0000-000000000001',
         'Ristrutturazione palazzina uffici via Verdi 8',
         'de300000-0000-0000-0000-000000000002', 'Milano', 'Via Verdi 8', 'attivo',
         650000, 'OG1', CURRENT_DATE - 60, CURRENT_DATE + 120, v_admin
  WHERE NOT EXISTS (SELECT 1 FROM cantieri WHERE id = 'de320000-0000-0000-0000-000000000001');

  INSERT INTO cantiere_fasi (id, cantiere_id, nome, avanzamento, ordine, created_by) VALUES
    ('de320000-0000-0000-0000-00000000fa01', 'de320000-0000-0000-0000-000000000001', 'Demolizioni e strip-out', 100, 1, v_admin),
    ('de320000-0000-0000-0000-00000000fa02', 'de320000-0000-0000-0000-000000000001', 'Opere strutturali', 70, 2, v_admin),
    ('de320000-0000-0000-0000-00000000fa03', 'de320000-0000-0000-0000-000000000001', 'Impianti e finiture', 20, 3, v_admin)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO cantiere_imprese (cantiere_id, organizzazione_id, lavorazioni, importo_affidato, created_by)
  SELECT 'de320000-0000-0000-0000-000000000001', 'de300000-0000-0000-0000-000000000003',
         'Impianti elettrici e speciali', 85000, v_admin
  WHERE NOT EXISTS (SELECT 1 FROM cantiere_imprese
    WHERE cantiere_id = 'de320000-0000-0000-0000-000000000001'
      AND organizzazione_id = 'de300000-0000-0000-0000-000000000003');

  INSERT INTO cantiere_rapportini (id, cantiere_id, data, lavorazioni, personale, meteo, created_by)
  SELECT 'de320000-0000-0000-0000-00000000aa11', 'de320000-0000-0000-0000-000000000001',
         CURRENT_DATE, 'Getto solaio piano primo, posa tubazioni impianto elettrico',
         '4 operai interni, 2 elettricisti Elettro Impianti', 'sereno', v_admin
  WHERE NOT EXISTS (SELECT 1 FROM cantiere_rapportini WHERE id = 'de320000-0000-0000-0000-00000000aa11');

  INSERT INTO cantiere_sal (id, cantiere_id, numero, descrizione, importo, stato, created_by)
  SELECT 'de320000-0000-0000-0000-00000000aa21', 'de320000-0000-0000-0000-000000000001',
         1, 'Lavori eseguiti al 30 giugno', 180000, 'emesso', v_admin
  WHERE NOT EXISTS (SELECT 1 FROM cantiere_sal WHERE id = 'de320000-0000-0000-0000-00000000aa21');

  INSERT INTO cantiere_costi (cantiere_id, tipo, descrizione, importo, created_by)
  SELECT 'de320000-0000-0000-0000-000000000001', 'materiali', 'Calcestruzzo e acciaio', 62000, v_admin
  WHERE NOT EXISTS (SELECT 1 FROM cantiere_costi
    WHERE cantiere_id = 'de320000-0000-0000-0000-000000000001' AND descrizione = 'Calcestruzzo e acciaio');

  INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
  SELECT 'cantiere', 'cantieri', 'de320000-0000-0000-0000-000000000001', 'DURC',
         'DURC Elettro Impianti Snc', CURRENT_DATE + 18,
         '/cantieri/de320000-0000-0000-0000-000000000001', v_admin
  WHERE NOT EXISTS (SELECT 1 FROM scadenze_moduli
    WHERE entita = 'cantieri' AND entita_id = 'de320000-0000-0000-0000-000000000001' AND tipo = 'DURC');

  -- ── MODULO AUTOMEZZI ───────────────────────────────────────────
  INSERT INTO automezzi (id, targa, marca, modello, categoria, alimentazione,
                         stato, km_attuali, centro_costo, created_by) VALUES
    ('de330000-0000-0000-0000-000000000001', 'GA512KW', 'Iveco', 'Daily 35S14',
     'furgone', 'diesel', 'assegnato', 84200, 'Cantieri Nord', v_admin),
    ('de330000-0000-0000-0000-000000000002', 'FX208NC', 'MAN', 'TGL 12.220',
     'camion', 'diesel', 'disponibile', 152300, 'Logistica', v_admin),
    ('de330000-0000-0000-0000-000000000003', NULL, 'Caterpillar', '320 GC',
     'escavatore', 'diesel', 'in_manutenzione', 0, 'Cantieri Nord', v_admin)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO automezzi_rifornimenti (automezzo_id, data, litri, costo, km, created_by)
  SELECT 'de330000-0000-0000-0000-000000000001', CURRENT_DATE - 3, 62, 108.50, 84200, v_admin
  WHERE NOT EXISTS (SELECT 1 FROM automezzi_rifornimenti
    WHERE automezzo_id = 'de330000-0000-0000-0000-000000000001');

  INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
  SELECT 'automezzi', 'automezzi', 'de330000-0000-0000-0000-000000000001', 'Revisione',
         'Revisione ministeriale Iveco Daily GA512KW', CURRENT_DATE + 20,
         '/automezzi/de330000-0000-0000-0000-000000000001', v_admin
  WHERE NOT EXISTS (SELECT 1 FROM scadenze_moduli
    WHERE entita = 'automezzi' AND entita_id = 'de330000-0000-0000-0000-000000000001' AND tipo = 'Revisione');
  INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, solo_manager, created_by)
  SELECT 'automezzi', 'automezzi', 'de330000-0000-0000-0000-000000000002', 'Assicurazione',
         'RCA MAN TGL FX208NC', CURRENT_DATE + 45,
         '/automezzi/de330000-0000-0000-0000-000000000002', true, v_admin
  WHERE NOT EXISTS (SELECT 1 FROM scadenze_moduli
    WHERE entita = 'automezzi' AND entita_id = 'de330000-0000-0000-0000-000000000002' AND tipo = 'Assicurazione');

  -- ── MODULO AGENTI ──────────────────────────────────────────────
  INSERT INTO agenti (id, nome, cognome, tipologia, zone, area_geografica, created_by) VALUES
    ('de340000-0000-0000-0000-000000000001', 'Laura', 'Bianchi', 'plurimandatario',
     'Milano, Monza', 'Lombardia', v_admin),
    ('de340000-0000-0000-0000-000000000002', 'Franco', 'Esposito', 'monomandatario',
     'Torino, Cuneo', 'Piemonte', v_admin)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO agenti_piani_provvigionali (agente_id, percentuale_base, created_by)
  SELECT 'de340000-0000-0000-0000-000000000001', 5, v_admin
  WHERE NOT EXISTS (SELECT 1 FROM agenti_piani_provvigionali
    WHERE agente_id = 'de340000-0000-0000-0000-000000000001');

  INSERT INTO agenti_clienti (agente_id, organizzazione_id, classificazione, created_by)
  SELECT 'de340000-0000-0000-0000-000000000001', 'de300000-0000-0000-0000-000000000002', 'A', v_admin
  WHERE NOT EXISTS (SELECT 1 FROM agenti_clienti
    WHERE agente_id = 'de340000-0000-0000-0000-000000000001'
      AND organizzazione_id = 'de300000-0000-0000-0000-000000000002');

  INSERT INTO agenti_ordini (id, agente_id, organizzazione_id, stato, data, created_by)
  SELECT 'de340000-0000-0000-0000-00000000aa31', 'de340000-0000-0000-0000-000000000001',
         'de300000-0000-0000-0000-000000000002', 'consegnato', CURRENT_DATE - 5, v_admin
  WHERE NOT EXISTS (SELECT 1 FROM agenti_ordini WHERE id = 'de340000-0000-0000-0000-00000000aa31');
  INSERT INTO agenti_ordini_righe (ordine_id, prodotto, quantita, prezzo_unitario, created_by)
  SELECT 'de340000-0000-0000-0000-00000000aa31', 'Fornitura serramenti PVC', 24, 380, v_admin
  WHERE NOT EXISTS (SELECT 1 FROM agenti_ordini_righe
    WHERE ordine_id = 'de340000-0000-0000-0000-00000000aa31');

  INSERT INTO agenti_obiettivi (agente_id, anno, importo_obiettivo, created_by)
  SELECT 'de340000-0000-0000-0000-000000000001', EXTRACT(YEAR FROM CURRENT_DATE)::int, 150000, v_admin
  WHERE NOT EXISTS (SELECT 1 FROM agenti_obiettivi
    WHERE agente_id = 'de340000-0000-0000-0000-000000000001');

  -- ── MODULO POLIAMBULATORI ──────────────────────────────────────
  INSERT INTO professionisti (id, nome, cognome, specializzazione, colore, created_by) VALUES
    ('de350000-0000-0000-0000-000000000001', 'Elena', 'Cardiologa', 'Cardiologia', '#3b82f6', v_admin),
    ('de350000-0000-0000-0000-000000000002', 'Marco', 'Fisiatra', 'Fisioterapia', '#10b981', v_admin)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO ambulatori (id, nome, created_by) VALUES
    ('de350000-0000-0000-0000-00000000ab01', 'Ambulatorio 1', v_admin),
    ('de350000-0000-0000-0000-00000000ab02', 'Palestra riabilitativa', v_admin)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO prestazioni (id, nome, tipo, durata_minuti, tariffa_privata, created_by) VALUES
    ('de350000-0000-0000-0000-00000000ac01', 'Visita cardiologica con ECG', 'visita', 30, 120, v_admin),
    ('de350000-0000-0000-0000-00000000ac02', 'Ecocardiogramma', 'esame', 30, 90, v_admin),
    ('de350000-0000-0000-0000-00000000ac03', 'Seduta fisioterapica', 'terapia', 45, 55, v_admin)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO pazienti (id, nome, cognome, telefono, data_nascita, created_by) VALUES
    ('de350000-0000-0000-0000-00000000ad01', 'Giulia', 'Ferraro', '333 1112223', '1978-05-12', v_admin),
    ('de350000-0000-0000-0000-00000000ad02', 'Antonio', 'Greco', '334 4445556', '1962-11-03', v_admin),
    ('de350000-0000-0000-0000-00000000ad03', 'Sara', 'Moretti', '335 7778889', '1990-02-27', v_admin)
  ON CONFLICT (id) DO NOTHING;

  -- Appuntamenti nei prossimi giorni (orari NON sovrapposti per medico)
  INSERT INTO appuntamenti (id, paziente_id, professionista_id, ambulatorio_id, prestazione_id,
                            inizio, durata_minuti, stato, created_by) VALUES
    ('de350000-0000-0000-0000-00000000ae01', 'de350000-0000-0000-0000-00000000ad01',
     'de350000-0000-0000-0000-000000000001', 'de350000-0000-0000-0000-00000000ab01',
     'de350000-0000-0000-0000-00000000ac01',
     date_trunc('day', NOW()) + interval '1 day 9 hours', 30, 'confermato', v_admin),
    ('de350000-0000-0000-0000-00000000ae02', 'de350000-0000-0000-0000-00000000ad02',
     'de350000-0000-0000-0000-000000000001', 'de350000-0000-0000-0000-00000000ab01',
     'de350000-0000-0000-0000-00000000ac02',
     date_trunc('day', NOW()) + interval '1 day 9 hours 30 minutes', 30, 'prenotato', v_admin),
    ('de350000-0000-0000-0000-00000000ae03', 'de350000-0000-0000-0000-00000000ad03',
     'de350000-0000-0000-0000-000000000002', 'de350000-0000-0000-0000-00000000ab02',
     'de350000-0000-0000-0000-00000000ac03',
     date_trunc('day', NOW()) + interval '1 day 10 hours', 45, 'prenotato', v_admin)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO magazzino_sanitario (id, descrizione, tipo, lotto, scadenza, quantita, created_by)
  SELECT 'de350000-0000-0000-0000-00000000af01', 'Guanti nitrile taglia M', 'consumo',
         'L2026-07A', CURRENT_DATE + 24, 60, v_admin
  WHERE NOT EXISTS (SELECT 1 FROM magazzino_sanitario
    WHERE id = 'de350000-0000-0000-0000-00000000af01');
END $$;

SELECT
  (SELECT count(*) FROM gare)        AS gare,
  (SELECT count(*) FROM cantieri)    AS cantieri,
  (SELECT count(*) FROM automezzi)   AS automezzi,
  (SELECT count(*) FROM agenti)      AS agenti,
  (SELECT count(*) FROM pazienti)    AS pazienti,
  (SELECT count(*) FROM appuntamenti) AS appuntamenti;
