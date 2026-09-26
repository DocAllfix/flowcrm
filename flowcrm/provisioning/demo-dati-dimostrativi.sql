-- ═══════════════════════════════════════════════════════════════════
-- Dati dimostrativi della DEMO PMIFlow (demo.pmiflow.eu), per i video e
-- per i clienti. Scritto il 26/09/2026.
--
-- RIPETIBILE: le date sono relative a current_date, quindi quando la demo
-- invecchia (tutto «scaduto») si rilancia così com'è e torna credibile.
-- Tutto in un blocco: o passa tutto o non cambia niente.
--
-- Come si lancia (token in ~/.config/flotta/supabase.env): con la
-- Management API, POST /v1/projects/<ref>/database/query col contenuto
-- del file, oppure incollandolo nel SQL Editor del pannello Supabase.
-- Gira come postgres, quindi il blocco di sola lettura non lo ferma.
--
-- SOLO per la demo: gli UUID di pipeline, fasi e utente titolare sono
-- quelli del progetto `flowcrm` (ref ozwqvriqhkckzxcumelr). L'utente
-- titolare.video@pmiflow.eu va creato prima dall'API di autenticazione;
-- la password sta in ~/.config/flotta/pmiflow-demo-video.env.
-- ═══════════════════════════════════════════════════════════════════
DO $$
DECLARE
  U  uuid := '20cf924e-6dc9-401f-9ff4-f506eb042455';           -- titolare dei video
  PIPE uuid := '912a30b5-0e68-4c0f-9a64-72c71845de75';
  S_PROP uuid := 'f2b37016-fd72-4998-ab51-bc003134f798';
  S_NEG  uuid := 'ff482997-80f5-4992-bc98-b3e6e4537d71';
  S_VINTO uuid := 'b59cfe72-d68c-445f-9c5f-527d5ddf28b5';
  S_PERSO uuid := '398b4d6e-d07a-4022-b065-aebea5a80da4';
  o_verdi uuid; o_rossi uuid; o_bianchi uuid; o_gialli uuid; o_blu uuid;
  o_neri uuid; o_elettro uuid; o_aurora uuid;
  o_bassi uuid; o_ferri uuid; o_tecno uuid; o_garda uuid;
  c_bianchi uuid; c_rossi uuid;
  d_bassi uuid; d_ferri uuid; d_tecno uuid; d_rossi uuid;
  m_bassi uuid; m_ferri uuid; m_verdi uuid;
  f_sal1 uuid; f_sal2 uuid; f uuid;
  v_cant uuid;
  oggi date := current_date;
BEGIN
  -- ── 0. Profilo del titolare ─────────────────────────────────────
  UPDATE user_profiles SET nome = 'Giulia', cognome = 'Martini', ruolo = 'admin', manutentore = false WHERE id = U;
  IF NOT FOUND THEN RAISE EXCEPTION 'profilo del titolare mancante'; END IF;

  -- ── 1. Pulizia: dati vecchi (luglio-agosto) e resti delle suite di test ──
  DELETE FROM attivita WHERE gara_id IS NULL AND cantiere_id IS NULL AND automezzo_id IS NULL AND agente_id IS NULL;
  UPDATE cantiere_sal SET fattura_id = NULL WHERE fattura_id IS NOT NULL;
  -- Prima gli incassi, poi le fatture: una fattura con un incasso registrato
  -- è protetta dalla cancellazione (protect_fattura_delete), e al secondo lancio
  -- di questo script le fatture incassate ci sono.
  DELETE FROM scadenze_pagamento;
  DELETE FROM fatture;
  DELETE FROM scadenze_tasse;
  DELETE FROM commesse;
  DELETE FROM deal_stage_history;
  DELETE FROM deals;
  DELETE FROM milestone WHERE progetto_id IN (SELECT id FROM progetti WHERE nome = 'Prova CRM');
  DELETE FROM progetti WHERE nome = 'Prova CRM';
  DELETE FROM contatti WHERE (nome, coalesce(cognome, '')) IN (('A','B'),('PINCO','PALLA'),('S','V'),('Mario',''))
                          OR (nome = 'Mario' AND cognome = 'Rossi' AND email IS NULL);
  DELETE FROM organizzazioni_ruoli WHERE organizzazione_id IN (
    SELECT id FROM organizzazioni WHERE ragione_sociale ~ '^(Cliente Fatt|Org F7|Alfa|Beta) [0-9]{13}' OR ragione_sociale = 'jnsjnj');
  DELETE FROM organizzazioni WHERE ragione_sociale ~ '^(Cliente Fatt|Org F7|Alfa|Beta) [0-9]{13}' OR ragione_sociale = 'jnsjnj';
  -- ripetibilità: le quattro aziende che questo script crea, con i loro contatti
  DELETE FROM contatti WHERE organizzazione_id IN (SELECT id FROM organizzazioni WHERE ragione_sociale IN
    ('Autotrasporti Bassi Srl', 'Studio Ferri Commercialisti', 'Tecnoservice Srl', 'Edil Garda Srl'));
  DELETE FROM organizzazioni_ruoli WHERE organizzazione_id IN (SELECT id FROM organizzazioni WHERE ragione_sociale IN
    ('Autotrasporti Bassi Srl', 'Studio Ferri Commercialisti', 'Tecnoservice Srl', 'Edil Garda Srl'));
  DELETE FROM organizzazioni WHERE ragione_sociale IN
    ('Autotrasporti Bassi Srl', 'Studio Ferri Commercialisti', 'Tecnoservice Srl', 'Edil Garda Srl');

  -- ── 2. Anagrafiche ──────────────────────────────────────────────
  SELECT id INTO o_verdi   FROM organizzazioni WHERE ragione_sociale = 'Verdi Software SRL';
  SELECT id INTO o_rossi   FROM organizzazioni WHERE ragione_sociale = 'Rossi Costruzioni SRL';
  SELECT id INTO o_bianchi FROM organizzazioni WHERE ragione_sociale = 'Bianchi Consulting SPA';
  SELECT id INTO o_gialli  FROM organizzazioni WHERE ragione_sociale = 'Gialli Marketing';
  SELECT id INTO o_blu     FROM organizzazioni WHERE ragione_sociale = 'Studio Blu';
  SELECT id INTO o_neri    FROM organizzazioni WHERE ragione_sociale = 'Ferramenta Neri';
  SELECT id INTO o_elettro FROM organizzazioni WHERE ragione_sociale = 'Elettro Impianti Snc';
  SELECT id INTO o_aurora  FROM organizzazioni WHERE ragione_sociale = 'Immobiliare Aurora Srl';
  IF o_verdi IS NULL OR o_rossi IS NULL OR o_bianchi IS NULL OR o_gialli IS NULL OR o_blu IS NULL
     OR o_neri IS NULL OR o_elettro IS NULL OR o_aurora IS NULL THEN
    RAISE EXCEPTION 'anagrafica esistente non trovata';
  END IF;

  INSERT INTO organizzazioni (ragione_sociale, settore, citta, provincia, dipendenti)
    VALUES ('Autotrasporti Bassi Srl', 'Logistica', 'Brescia', 'BS', 24) RETURNING id INTO o_bassi;
  INSERT INTO organizzazioni (ragione_sociale, settore, citta, provincia, dipendenti)
    VALUES ('Studio Ferri Commercialisti', 'Consulenza fiscale', 'Cremona', 'CR', 9) RETURNING id INTO o_ferri;
  INSERT INTO organizzazioni (ragione_sociale, settore, citta, provincia, dipendenti)
    VALUES ('Tecnoservice Srl', 'Manutenzioni', 'Mantova', 'MN', 15) RETURNING id INTO o_tecno;
  INSERT INTO organizzazioni (ragione_sociale, settore, citta, provincia, dipendenti)
    VALUES ('Edil Garda Srl', 'Edilizia', 'Desenzano del Garda', 'BS', 32) RETURNING id INTO o_garda;

  INSERT INTO contatti (nome, cognome, ruolo_aziendale, organizzazione_id) VALUES
    ('Marco', 'Bassi', 'Titolare', o_bassi),
    ('Elena', 'Ferri', 'Socia', o_ferri),
    ('Davide', 'Conti', 'Responsabile tecnico', o_tecno),
    ('Paolo', 'Lanfranchi', 'Direttore tecnico', o_garda);
  SELECT id INTO c_bianchi FROM contatti WHERE nome = 'Laura' AND cognome = 'Bianchi';
  SELECT id INTO c_rossi   FROM contatti WHERE nome = 'Marco' AND cognome = 'Rossi';

  -- ── 3. Trattative: 10, da qualche migliaio a qualche decina di migliaia ──
  INSERT INTO deals (nome, organizzazione_id, pipeline_id, stage_id, importo, valuta, data_chiusura_prevista, responsabile_id) VALUES
    ('Manutenzione impianti 2027',           o_verdi, PIPE, S_PROP, 9600,  'EUR', oggi + 30, U),
    ('Adeguamento antincendio magazzino',     o_bassi, PIPE, S_PROP, 22400, 'EUR', oggi + 40, U),
    ('Impianto fotovoltaico sede',           o_rossi, PIPE, S_PROP, 38500, 'EUR', oggi + 60, U),
    ('Rinnovo contratto di assistenza',       o_bianchi, PIPE, S_NEG, 6200, 'EUR', oggi + 10, U),
    ('Illuminazione LED uffici',             o_ferri, PIPE, S_NEG, 7900,  'EUR', oggi + 14, U),
    ('Cablaggio rete dati nuova sede',        o_gialli, PIPE, S_NEG, 11300, 'EUR', oggi + 7, U);
  INSERT INTO deals (nome, organizzazione_id, pipeline_id, stage_id, importo, valuta, data_chiusura_prevista, responsabile_id)
    VALUES ('Climatizzazione sala riunioni', o_tecno, PIPE, S_PROP, 14800, 'EUR', oggi + 25, U) RETURNING id INTO d_tecno;
  INSERT INTO deals (nome, organizzazione_id, pipeline_id, stage_id, importo, valuta, data_chiusura_prevista, chiuso_at, responsabile_id)
    VALUES ('Climatizzazione uffici e magazzino', o_bassi, PIPE, S_VINTO, 28500, 'EUR', oggi - 20, now() - interval '20 days', U) RETURNING id INTO d_bassi;
  INSERT INTO deals (nome, organizzazione_id, pipeline_id, stage_id, importo, valuta, data_chiusura_prevista, chiuso_at, responsabile_id)
    VALUES ('Adeguamento impianto elettrico studio', o_ferri, PIPE, S_VINTO, 14200, 'EUR', oggi - 45, now() - interval '45 days', U) RETURNING id INTO d_ferri;
  INSERT INTO deals (nome, organizzazione_id, pipeline_id, stage_id, importo, valuta, data_chiusura_prevista, chiuso_at, motivo_perdita, responsabile_id)
    VALUES ('Videosorveglianza parcheggio', o_blu, PIPE, S_PERSO, 4800, 'EUR', oggi - 15, now() - interval '15 days', 'Scelto un fornitore della zona', U);
  INSERT INTO deals (nome, organizzazione_id, contatto_id, pipeline_id, stage_id, importo, valuta, data_chiusura_prevista, responsabile_id)
    VALUES ('Impianto elettrico nuovo capannone', o_rossi, c_rossi, PIPE, S_NEG, 16900, 'EUR', oggi + 21, U) RETURNING id INTO d_rossi;

  -- ── 4. Commesse ─────────────────────────────────────────────────
  INSERT INTO commesse (organizzazione_id, deal_id, descrizione, importo, data_inizio, data_fine_prevista, stato)
    VALUES (o_bassi, d_bassi, 'Climatizzazione uffici e magazzino', 28500, oggi - 18, oggi + 40, 'attiva') RETURNING id INTO m_bassi;
  INSERT INTO commesse (organizzazione_id, deal_id, descrizione, importo, data_inizio, data_fine_prevista, stato)
    VALUES (o_ferri, d_ferri, 'Adeguamento impianto elettrico studio', 14200, oggi - 40, oggi - 5, 'completata') RETURNING id INTO m_ferri;
  INSERT INTO commesse (organizzazione_id, descrizione, importo, data_inizio, data_fine_prevista, stato)
    VALUES (o_verdi, 'Manutenzione programmata impianti 2026', 9600, oggi - 200, oggi + 95, 'attiva') RETURNING id INTO m_verdi;

  -- ── 5. Fatture attive (la scadenza d'incasso la crea il trigger) ──
  -- incassate: storico per il grafico del fatturato mensile
  FOR f IN
    WITH nuove(numero, d, s, org, comm, imp) AS (VALUES
      ('2026/021', oggi - 150, oggi - 120, o_bianchi, NULL::uuid, 5100),
      ('2026/024', oggi - 125, oggi - 95,  o_gialli,  NULL::uuid, 3800),
      ('2026/027', oggi - 100, oggi - 70,  o_verdi,   m_verdi,    2400),
      ('2026/030', oggi - 75,  oggi - 45,  o_blu,     NULL::uuid, 1850),
      ('2026/033', oggi - 55,  oggi - 25,  o_ferri,   m_ferri,    7100))
    INSERT INTO fatture (direzione, numero, data, scadenza, organizzazione_id, commessa_id, imponibile, aliquota_iva, stato, sdi_stato)
    SELECT 'attiva', numero, d, s, org, comm, imp, 22, 'da_pagare', 'consegnata' FROM nuove
    RETURNING id
  LOOP
    UPDATE scadenze_pagamento SET stato = 'incassato', incassato_at = data_prevista + 3 WHERE fattura_id = f;
  END LOOP;

  -- scadute: da sollecitare (pochi giorni, niente arretrati di mesi)
  WITH nuove(numero, d, s, org, comm, imp) AS (VALUES
    ('2026/035', oggi - 35, oggi - 5,  o_verdi,  m_verdi,    2400),
    ('2026/036', oggi - 32, oggi - 2,  o_gialli, NULL::uuid, 3200),
    ('2026/037', oggi - 30, oggi - 12, o_rossi,  NULL::uuid, 1950))
  INSERT INTO fatture (direzione, numero, data, scadenza, organizzazione_id, commessa_id, imponibile, aliquota_iva, stato, sdi_stato)
  SELECT 'attiva', numero, d, s, org, comm, imp, 22, 'scaduta', 'consegnata' FROM nuove;
  UPDATE scadenze_pagamento SET stato = 'in_ritardo'
   WHERE fattura_id IN (SELECT id FROM fatture WHERE numero IN ('2026/035','2026/036','2026/037'));

  -- da incassare nelle prossime settimane
  INSERT INTO fatture (direzione, numero, data, scadenza, organizzazione_id, commessa_id, imponibile, aliquota_iva, stato, sdi_stato) VALUES
    ('attiva', '2026/038', oggi - 15, oggi + 15, o_ferri, m_ferri, 7100, 22, 'da_pagare', 'consegnata'),
    ('attiva', '2026/039', oggi - 18, oggi + 12, o_bassi, m_bassi, 8550, 22, 'da_pagare', 'consegnata');

  -- SAL del cantiere: il primo incassato, il secondo in scadenza fra 5 giorni
  INSERT INTO fatture (direzione, numero, data, scadenza, organizzazione_id, imponibile, aliquota_iva, stato, sdi_stato, note)
    VALUES ('attiva', '2026/028', oggi - 80, oggi - 50, o_aurora, 48000, 22, 'da_pagare', 'consegnata', 'SAL 1, palazzina uffici via Verdi 8')
    RETURNING id INTO f_sal1;
  UPDATE scadenze_pagamento SET stato = 'incassato', incassato_at = oggi - 48 WHERE fattura_id = f_sal1;
  INSERT INTO fatture (direzione, numero, data, scadenza, organizzazione_id, imponibile, aliquota_iva, stato, sdi_stato, note)
    VALUES ('attiva', '2026/034', oggi - 25, oggi + 5, o_aurora, 39500, 22, 'da_pagare', 'consegnata', 'SAL 2, palazzina uffici via Verdi 8')
    RETURNING id INTO f_sal2;

  -- fatture passive (fornitori)
  INSERT INTO fatture (direzione, numero, data, scadenza, organizzazione_id, imponibile, aliquota_iva, stato, sdi_stato, pagata_at) VALUES
    ('passiva', 'FT-4471', oggi - 20, oggi + 3,  o_neri,    1240, 22, 'da_pagare', 'non_applicabile', NULL),
    ('passiva', 'A/318',   oggi - 50, oggi - 20, o_elettro, 3900, 22, 'pagata',    'non_applicabile', oggi - 20);

  -- ── 6. Cantiere: stessa scheda, proporzioni da piccola impresa, date da oggi ──
  SELECT id INTO v_cant FROM cantieri ORDER BY created_at LIMIT 1;
  IF v_cant IS NULL THEN RAISE EXCEPTION 'cantiere non trovato'; END IF;
  UPDATE cantieri SET denominazione = 'Riqualificazione palazzina uffici via Verdi 8',
         importo_contrattuale = 186000, importo_lavori = 186000,
         data_apertura = oggi - 75, data_fine_prevista = oggi + 60, stato = 'attivo'
   WHERE id = v_cant;
  UPDATE cantiere_sal SET data = oggi - 80, descrizione = 'Demolizioni e strip-out',        importo = 48000, fattura_id = f_sal1 WHERE cantiere_id = v_cant AND numero = 1;
  UPDATE cantiere_sal SET data = oggi - 25, descrizione = 'Opere strutturali al 70%',       importo = 39500, fattura_id = f_sal2 WHERE cantiere_id = v_cant AND numero = 2;
  UPDATE cantiere_sal SET data = oggi - 3,  descrizione = 'Impianti e finiture, primo stato', importo = 27000, fattura_id = NULL, stato = 'emesso' WHERE cantiere_id = v_cant AND numero = 3;

  -- ── 7. Scadenze fiscali ─────────────────────────────────────────
  INSERT INTO scadenze_tasse (tipo_tassa, importo, scadenza, stato, data_pagamento) VALUES
    ('Rata F24 rateizzazione IRPEF', 860,  oggi + 4,  'da_pagare', NULL),
    ('F24 IVA mensile',              3420, oggi + 20, 'da_pagare', NULL),
    ('Ritenute d''acconto dipendenti', 2180, oggi + 20, 'da_pagare', NULL),
    ('Contributi INPS',              4650, oggi + 20, 'da_pagare', NULL),
    ('F24 IVA mese precedente',      2950, oggi - 10, 'pagata',    oggi - 10);

  -- ── 8. Attività del titolare: cosa scade questa settimana ───────
  INSERT INTO attivita (tipo, titolo, descrizione, stato, priorita, scadenza, assegnato_a, organizzazione_id) VALUES
    ('chiamata', 'Sollecitare la fattura 2026/035', 'Scaduta da 5 giorni', 'da_fare', 'alta', (oggi + time '12:00') AT TIME ZONE 'Europe/Rome', U, o_verdi),
    ('chiamata', 'Sollecitare la fattura 2026/037', 'Scaduta da 12 giorni', 'da_fare', 'alta', (oggi + 1 + time '12:00') AT TIME ZONE 'Europe/Rome', U, o_rossi);
  INSERT INTO attivita (tipo, titolo, stato, priorita, scadenza, assegnato_a, cantiere_id) VALUES
    ('task', 'Preparare la documentazione del SAL 3, via Verdi 8', 'da_fare', 'alta', (oggi + 3 + time '17:00') AT TIME ZONE 'Europe/Rome', U, v_cant),
    ('task', 'Verificare il DURC del subappaltatore', 'da_fare', 'media', (oggi + 6 + time '17:00') AT TIME ZONE 'Europe/Rome', U, v_cant);
  INSERT INTO attivita (tipo, titolo, stato, priorita, inizio, durata_minuti, luogo, assegnato_a, cantiere_id)
    VALUES ('riunione', 'Sopralluogo con la direzione lavori', 'da_fare', 'media', (oggi + 2 + time '10:00') AT TIME ZONE 'Europe/Rome', 90, 'Cantiere via Verdi 8, Milano', U, v_cant);
  INSERT INTO attivita (tipo, titolo, stato, priorita, scadenza, assegnato_a, organizzazione_id, deal_id)
    VALUES ('task', 'Inviare l''offerta di climatizzazione', 'da_fare', 'media', (oggi + 2 + time '17:00') AT TIME ZONE 'Europe/Rome', U, o_tecno, d_tecno);
  INSERT INTO attivita (tipo, titolo, stato, priorita, inizio, durata_minuti, luogo, assegnato_a, organizzazione_id, deal_id)
    VALUES ('riunione', 'Presentazione offerta impianto elettrico', 'da_fare', 'media', (oggi + 5 + time '15:00') AT TIME ZONE 'Europe/Rome', 60, 'Sede del cliente, Milano', U, o_rossi, d_rossi);
  INSERT INTO attivita (tipo, titolo, stato, priorita, scadenza, assegnato_a, organizzazione_id, contatto_id)
    VALUES ('chiamata', 'Richiamare Laura Bianchi per il rinnovo', 'da_fare', 'media', (oggi + 4 + time '11:00') AT TIME ZONE 'Europe/Rome', U, o_bianchi, c_bianchi);
  INSERT INTO attivita (tipo, titolo, stato, priorita, scadenza, assegnato_a, organizzazione_id, commessa_id) VALUES
    ('riunione', 'Avvio lavori climatizzazione', 'completata', 'media', (oggi - 15 + time '09:00') AT TIME ZONE 'Europe/Rome', U, o_bassi, m_bassi),
    ('task', 'Consegnare la dichiarazione di conformità', 'completata', 'alta', (oggi - 6 + time '17:00') AT TIME ZONE 'Europe/Rome', U, o_ferri, m_ferri);

  -- ── 9. Progetti: date da oggi ───────────────────────────────────
  UPDATE progetti SET scadenza = oggi + 35 WHERE nome = 'Sito e-commerce Verdi';
  UPDATE progetti SET scadenza = oggi + 50 WHERE nome = 'Migrazione gestionale interno';
END $$;
