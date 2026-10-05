-- ═══════════════════════════════════════════════════════════════════
-- DEMO PUBBLICA di PMIFlow: dati dimostrativi dei SETTE MODULI NUOVI
-- (ristorante, bar, hotel, palestra, fioraio, garage, agenzia immobiliare).
-- Solo per il database della demo, come `demo-dati-dimostrativi.sql`.
--
-- L'ospite non scrive sulle tabelle dei moduli (non sono in
-- `demo_tabelle_ospite`): il seme si rifà ogni notte solo perché le date
-- restino attorno a oggi (prenotazioni di stasera, arrivi di domani,
-- lezioni della settimana). Per questo è una pulizia completa seguita da
-- una semina: niente fotografia, niente stato da conservare.
--
-- Lanciare questo file = INSTALLARE o AGGIORNARE le funzioni.
-- Le chiama `ripristina_demo()` (demo-dati-dimostrativi.sql), prima la
-- pulizia e in fondo la semina. A mano: SELECT public.demo_semina_moduli_nuovi();
--
-- Gli identificativi sono fissi (demo_id('chiave')): rilanci e notti
-- diverse producono le stesse righe, e le pagine si possono collegare.
-- Cominciano tutti con de70de70: così la pulizia riconosce anche i contatti
-- e le aziende del seme, che stanno nelle tabelle del nucleo.
-- Gira come postgres. La pulizia spegne i trigger (session_replication_role)
-- perché le protezioni di settore (rogito, soste chiuse, provvigioni
-- fatturate) rifiutano giustamente le cancellazioni degli utenti.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.demo_id(p_chiave text)
RETURNS uuid LANGUAGE sql IMMUTABLE AS $$ SELECT ('de70de70' || substr(md5('pmiflow-demo:' || p_chiave), 9))::uuid $$;
REVOKE ALL ON FUNCTION public.demo_id(text) FROM PUBLIC, anon, authenticated;

-- Istante di oggi (o di oggi ± giorni) all'ora data, ora di Roma.
CREATE OR REPLACE FUNCTION public.demo_ora(p_giorni int, p_ora time)
RETURNS timestamptz LANGUAGE sql STABLE AS $$
  SELECT ((NOW() AT TIME ZONE 'Europe/Rome')::date + p_giorni + p_ora) AT TIME ZONE 'Europe/Rome'
$$;
REVOKE ALL ON FUNCTION public.demo_ora(int, time) FROM PUBLIC, anon, authenticated;

-- ── Pulizia: tutte le righe dei moduli nuovi e delle fondamenta ──────
-- Le fondamenta (magazzino, cassa, eventi…) in demo le usano solo i moduli
-- nuovi. Restano le righe che arrivano dalle migrazioni: modelli di
-- contratto, segmenti delle campagne, tabelle dell'ospite.
CREATE OR REPLACE FUNCTION public.demo_pulisci_moduli_nuovi()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $fn$
DECLARE
  t text;
  p text;
  q text;
  v text[];
  v_prefissi text[] := '{}';
  v_anno int := EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Europe/Rome'));
  v_n int;
  v_max int;
  -- tabelle dei moduli nuovi e delle fondamenta (le stesse che si svuotano)
  c_tabelle CONSTANT text := '^(fb|bar|hotel|pal|fior|gar|imm|mag|asset|cassa|conti|fid|gift_card|coupon|turni|controlli|eventi)_';
BEGIN
  -- Prefissi dei codici in uso (PRD-, FIO-, IMM-…): dopo la pulizia il contatore
  -- torna al massimo rimasto, così i codici non crescono a ogni notte.
  FOR t, p IN SELECT c.table_name, c.column_name FROM information_schema.columns c JOIN pg_tables g ON g.schemaname = 'public' AND g.tablename = c.table_name
            WHERE c.table_schema = 'public' AND c.column_name IN ('codice', 'ticket') AND c.data_type = 'text'
              AND (c.table_name ~ c_tabelle OR c.table_name IN ('asset', 'conti', 'eventi', 'campagne', 'distinte_base'))
  LOOP
    EXECUTE format('SELECT array_agg(DISTINCT split_part(%1$I, ''-'', 1)) FROM public.%2$I WHERE %1$I ~ ''^[A-Z]+-\d{4}-\d+$''', p, t) INTO v;
    v_prefissi := v_prefissi || COALESCE(v, '{}');
  END LOOP;

  SET LOCAL session_replication_role = replica;
  -- Contatti e aziende del seme: quelli con l'identificativo dimostrativo e
  -- quelli che l'anagrafica del garage crea da sé per i suoi clienti.
  CREATE TEMP TABLE IF NOT EXISTS demo_anagrafiche (id uuid PRIMARY KEY) ON COMMIT DROP;
  INSERT INTO demo_anagrafiche
    SELECT id FROM contatti WHERE id::text LIKE 'de70de70%'
    UNION SELECT id FROM organizzazioni WHERE id::text LIKE 'de70de70%'
    UNION SELECT contatto_id FROM gar_clienti WHERE contatto_id IS NOT NULL
    UNION SELECT organizzazione_id FROM gar_clienti WHERE organizzazione_id IS NOT NULL
  ON CONFLICT DO NOTHING;
  DELETE FROM deals WHERE pipeline_id = pal_pipeline()
     OR contatto_id IN (SELECT id FROM demo_anagrafiche) OR organizzazione_id IN (SELECT id FROM demo_anagrafiche);
  DELETE FROM attivita WHERE contatto_id IN (SELECT id FROM demo_anagrafiche) OR organizzazione_id IN (SELECT id FROM demo_anagrafiche);
  UPDATE deals SET immobile_id = NULL WHERE immobile_id IS NOT NULL;
  UPDATE attivita SET immobile_id = NULL WHERE immobile_id IS NOT NULL;
  DELETE FROM deals WHERE pipeline_id IN (SELECT id FROM pipelines WHERE nome LIKE 'Immobiliare%');
  FOR t IN
    SELECT tablename FROM pg_tables
     WHERE schemaname = 'public'
       AND (tablename ~ c_tabelle
            OR tablename IN ('asset', 'conti', 'feedback', 'turni', 'campagne', 'campagne_destinatari', 'distinte_base',
                             'distinte_base_righe', 'fornitori_valutazioni', 'fornitori_listini', 'segnalazioni_sicurezza',
                             'eventi', 'gift_card', 'coupon'))
       AND tablename NOT IN ('imm_modelli', 'campagne_segmenti')
  LOOP
    EXECUTE format('DELETE FROM public.%I', t);
  END LOOP;
  DELETE FROM scadenze_moduli WHERE modulo IN ('fb', 'ristorante', 'bar', 'hotel', 'palestra', 'fioraio', 'garage', 'immobiliare');
  DELETE FROM approvazioni WHERE modulo IN ('fb', 'ristorante', 'bar', 'hotel', 'palestra', 'fioraio', 'garage', 'immobiliare');
  DELETE FROM organizzazioni_ruoli WHERE organizzazione_id IN (SELECT id FROM demo_anagrafiche);
  DELETE FROM contatti WHERE id IN (SELECT id FROM demo_anagrafiche);
  DELETE FROM organizzazioni WHERE id IN (SELECT id FROM demo_anagrafiche);
  SET LOCAL session_replication_role = origin;
  DROP TABLE demo_anagrafiche;

  FOR p IN SELECT DISTINCT unnest(v_prefissi) LOOP
    v_max := 0;
    FOR t, q IN SELECT c.table_name, c.column_name FROM information_schema.columns c JOIN pg_tables g ON g.schemaname = 'public' AND g.tablename = c.table_name
              WHERE c.table_schema = 'public' AND c.column_name IN ('codice', 'ticket', 'numero') AND c.data_type = 'text'
    LOOP
      EXECUTE format('SELECT max(split_part(%1$I, ''-'', 3)::int) FROM public.%2$I WHERE %1$I ~ %3$L', q, t, '^' || p || '-' || v_anno || '-\d+$') INTO v_n;
      v_max := GREATEST(v_max, COALESCE(v_n, 0));
    END LOOP;
    UPDATE codici_progressivi SET ultimo = v_max WHERE prefisso = p AND anno = v_anno;
  END LOOP;
END $fn$;
REVOKE ALL ON FUNCTION public.demo_pulisci_moduli_nuovi() FROM PUBLIC, anon, authenticated;

-- ═══ RISTORANTE E BAR (motore fb) ═══════════════════════════════════
CREATE OR REPLACE FUNCTION public.demo_semina_fb(U uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $fn$
DECLARE
  L uuid := demo_id('fb.locale.osteria');
  B uuid := demo_id('fb.locale.bar');
  S1 uuid := demo_id('fb.sala.interna');
  S2 uuid := demo_id('fb.sala.dehor');
  SB uuid := demo_id('fb.sala.banco');
  k uuid;
  r record;
  i int;
BEGIN
  -- ── Magazzino e ricette ────────────────────────────────────────────
  INSERT INTO mag_articoli (id, modulo, descrizione, unita_misura, costo_unitario, scorta_minima, allergeni) VALUES
    (demo_id('mag.riso'),     'fb', 'Riso Carnaroli',          'kg', 2.80, 5,  '{}'),
    (demo_id('mag.porcini'),  'fb', 'Funghi porcini',          'kg', 18,   2,  '{}'),
    (demo_id('mag.burro'),    'fb', 'Burro',                   'kg', 9,    2,  '{latte}'),
    (demo_id('mag.grana'),    'fb', 'Grana Padano 24 mesi',    'kg', 16,   2,  '{latte}'),
    (demo_id('mag.farina'),   'fb', 'Farina 00',               'kg', 0.90, 10, '{glutine}'),
    (demo_id('mag.uova'),     'fb', 'Uova fresche',            'pz', 0.35, 60, '{uova}'),
    (demo_id('mag.manzo'),    'fb', 'Controfiletto di manzo',  'kg', 32,   3,  '{}'),
    (demo_id('mag.mascarpone'), 'fb', 'Mascarpone',            'kg', 7.50, 2,  '{latte}'),
    (demo_id('mag.pane'),     'fb', 'Pane casereccio',         'kg', 3,    3,  '{glutine}'),
    (demo_id('mag.pomodori'), 'fb', 'Pomodorini',              'kg', 3.20, 4,  '{}'),
    (demo_id('mag.caffe'),    'fb', 'Caffè in grani',          'kg', 19,   3,  '{}'),
    (demo_id('mag.latte'),    'fb', 'Latte intero',            'l',  1.10, 10, '{latte}'),
    (demo_id('mag.gin'),      'fb', 'Gin London Dry',          'l',  24,   2,  '{}'),
    (demo_id('mag.tonica'),   'fb', 'Acqua tonica',            'pz', 0.60, 24, '{}'),
    (demo_id('mag.acqua'),    'fb', 'Acqua minerale 75 cl',    'pz', 0.35, 48, '{}'),
    (demo_id('mag.birra'),    'fb', 'Birra artigianale 33 cl', 'pz', 1.40, 24, '{glutine}'),
    (demo_id('mag.barolo'),   'fb', 'Barolo DOCG 2019',        'bottiglia', 24, 6, '{solfiti}'),
    (demo_id('mag.lugana'),   'fb', 'Lugana DOC 2023',         'bottiglia', 8.50, 6, '{solfiti}'),
    (demo_id('mag.franciacorta'), 'fb', 'Franciacorta Brut',   'bottiglia', 14, 6, '{solfiti}');

  INSERT INTO mag_lotti (id, articolo_id, codice_lotto, data_scadenza) VALUES
    (demo_id('lotto.riso'),     demo_id('mag.riso'),     'RC-2611', current_date + 280),
    (demo_id('lotto.porcini'),  demo_id('mag.porcini'),  'FP-0412', current_date + 2),
    (demo_id('lotto.burro'),    demo_id('mag.burro'),    'BU-1190', current_date + 18),
    (demo_id('lotto.grana'),    demo_id('mag.grana'),    'GP-24M',  current_date + 120),
    (demo_id('lotto.farina'),   demo_id('mag.farina'),   'FA-3301', current_date + 200),
    (demo_id('lotto.uova'),     demo_id('mag.uova'),     'UO-7781', current_date + 9),
    (demo_id('lotto.manzo'),    demo_id('mag.manzo'),    'MZ-5520', current_date + 4),
    (demo_id('lotto.mascarpone'), demo_id('mag.mascarpone'), 'MS-118', current_date + 6),
    (demo_id('lotto.pane'),     demo_id('mag.pane'),     'PN-OGGI', current_date + 1),
    (demo_id('lotto.pomodori'), demo_id('mag.pomodori'), 'PM-2201', current_date + 5),
    (demo_id('lotto.caffe'),    demo_id('mag.caffe'),    'CF-0909', current_date + 240),
    (demo_id('lotto.latte'),    demo_id('mag.latte'),    'LT-4410', current_date + 3),
    (demo_id('lotto.gin'),      demo_id('mag.gin'),      'GN-77',   current_date + 900),
    (demo_id('lotto.tonica'),   demo_id('mag.tonica'),   'TN-12',   current_date + 300),
    (demo_id('lotto.acqua'),    demo_id('mag.acqua'),    'AQ-55',   current_date + 400),
    (demo_id('lotto.birra'),    demo_id('mag.birra'),    'BI-31',   current_date + 150),
    (demo_id('lotto.barolo'),   demo_id('mag.barolo'),   'BA-19',   NULL),
    (demo_id('lotto.lugana'),   demo_id('mag.lugana'),   'LU-23',   NULL),
    (demo_id('lotto.franciacorta'), demo_id('mag.franciacorta'), 'FR-NV', NULL);
  -- Le giacenze nascono dai carichi; il latte e la tonica sotto scorta.
  INSERT INTO mag_movimenti (articolo_id, lotto_id, tipo, quantita) VALUES
    (demo_id('mag.riso'),     demo_id('lotto.riso'),     'carico', 20),
    (demo_id('mag.porcini'),  demo_id('lotto.porcini'),  'carico', 4),
    (demo_id('mag.burro'),    demo_id('lotto.burro'),    'carico', 5),
    (demo_id('mag.grana'),    demo_id('lotto.grana'),    'carico', 6),
    (demo_id('mag.farina'),   demo_id('lotto.farina'),   'carico', 25),
    (demo_id('mag.uova'),     demo_id('lotto.uova'),     'carico', 180),
    (demo_id('mag.manzo'),    demo_id('lotto.manzo'),    'carico', 6),
    (demo_id('mag.mascarpone'), demo_id('lotto.mascarpone'), 'carico', 4),
    (demo_id('mag.pane'),     demo_id('lotto.pane'),     'carico', 6),
    (demo_id('mag.pomodori'), demo_id('lotto.pomodori'), 'carico', 8),
    (demo_id('mag.caffe'),    demo_id('lotto.caffe'),    'carico', 8),
    (demo_id('mag.latte'),    demo_id('lotto.latte'),    'carico', 6),
    (demo_id('mag.gin'),      demo_id('lotto.gin'),      'carico', 5),
    (demo_id('mag.tonica'),   demo_id('lotto.tonica'),   'carico', 18),
    (demo_id('mag.acqua'),    demo_id('lotto.acqua'),    'carico', 120),
    (demo_id('mag.birra'),    demo_id('lotto.birra'),    'carico', 72),
    (demo_id('mag.barolo'),   demo_id('lotto.barolo'),   'carico', 18),
    (demo_id('mag.lugana'),   demo_id('lotto.lugana'),   'carico', 24),
    (demo_id('mag.franciacorta'), demo_id('lotto.franciacorta'), 'carico', 12);

  INSERT INTO distinte_base (id, modulo, nome, tipo, resa, unita_resa) VALUES
    (demo_id('db.brodo'),    'fb', 'Brodo vegetale',          'semilavorato', 2, 'l'),
    (demo_id('db.risotto'),  'fb', 'Risotto ai porcini',      'ricetta', 1, 'porzione'),
    (demo_id('db.tagliata'), 'fb', 'Tagliata di manzo',       'ricetta', 1, 'porzione'),
    (demo_id('db.tiramisu'), 'fb', 'Tiramisù della casa',     'ricetta', 1, 'porzione'),
    (demo_id('db.bruschetta'), 'fb', 'Bruschetta al pomodoro', 'ricetta', 1, 'porzione'),
    (demo_id('db.espresso'), 'fb', 'Espresso',                'ricetta', 1, 'tazza'),
    (demo_id('db.cappuccino'), 'fb', 'Cappuccino',            'ricetta', 1, 'tazza'),
    (demo_id('db.gintonic'), 'fb', 'Gin tonic',               'ricetta', 1, 'bicchiere');
  INSERT INTO distinte_base_righe (distinta_id, articolo_id, sotto_distinta_id, quantita) VALUES
    (demo_id('db.brodo'),    demo_id('mag.pomodori'), NULL, 0.3),
    (demo_id('db.risotto'),  demo_id('mag.riso'),     NULL, 0.09),
    (demo_id('db.risotto'),  demo_id('mag.porcini'),  NULL, 0.06),
    (demo_id('db.risotto'),  demo_id('mag.burro'),    NULL, 0.015),
    (demo_id('db.risotto'),  demo_id('mag.grana'),    NULL, 0.02),
    (demo_id('db.risotto'),  NULL, demo_id('db.brodo'), 0.25),
    (demo_id('db.tagliata'), demo_id('mag.manzo'),    NULL, 0.22),
    (demo_id('db.tagliata'), demo_id('mag.grana'),    NULL, 0.015),
    (demo_id('db.tiramisu'), demo_id('mag.mascarpone'), NULL, 0.08),
    (demo_id('db.tiramisu'), demo_id('mag.uova'),     NULL, 1),
    (demo_id('db.bruschetta'), demo_id('mag.pane'),   NULL, 0.08),
    (demo_id('db.bruschetta'), demo_id('mag.pomodori'), NULL, 0.06),
    (demo_id('db.espresso'), demo_id('mag.caffe'),    NULL, 0.007),
    (demo_id('db.cappuccino'), demo_id('mag.caffe'),  NULL, 0.007),
    (demo_id('db.cappuccino'), demo_id('mag.latte'),  NULL, 0.12),
    (demo_id('db.gintonic'), demo_id('mag.gin'),      NULL, 0.05),
    (demo_id('db.gintonic'), demo_id('mag.tonica'),   NULL, 1);

  -- ── Locali, sale, tavoli ───────────────────────────────────────────
  INSERT INTO fb_locali (id, modulo, nome, indirizzo, costo_orario_medio) VALUES
    (L, 'ristorante', 'Osteria del Borgo', 'Via Garibaldi 14, Bergamo', 16),
    (B, 'bar', 'Caffè Centrale', 'Piazza Vecchia 3, Bergamo', 14);
  INSERT INTO fb_sale (id, locale_id, nome, tipo, ordine) VALUES
    (S1, L, 'Sala interna', 'sala', 0),
    (S2, L, 'Dehor', 'dehor', 1),
    (SB, B, 'Banco e tavolini', 'banco', 0);
  -- Sala interna: due file di tavoli; dehor: rotondi.
  FOR i IN 1..8 LOOP
    INSERT INTO fb_tavoli (id, sala_id, numero, posti, posti_max, forma, x, y, larghezza, altezza)
    VALUES (demo_id('fb.tavolo.' || i), S1, i::text, CASE WHEN i IN (3, 6) THEN 6 WHEN i IN (1, 8) THEN 2 ELSE 4 END,
            CASE WHEN i IN (3, 6) THEN 8 WHEN i IN (1, 8) THEN 2 ELSE 6 END,
            CASE WHEN i IN (3, 6) THEN 'rettangolare' ELSE 'quadrato' END,
            120 + ((i - 1) % 4) * 210, CASE WHEN i <= 4 THEN 150 ELSE 430 END,
            CASE WHEN i IN (3, 6) THEN 150 ELSE 90 END, 90);
  END LOOP;
  FOR i IN 11..14 LOOP
    INSERT INTO fb_tavoli (id, sala_id, numero, posti, posti_max, forma, x, y, larghezza, altezza)
    VALUES (demo_id('fb.tavolo.' || i), S2, i::text, 4, 4, 'rotondo', 140 + (i - 11) * 200, 300, 100, 100);
  END LOOP;
  FOR i IN 21..24 LOOP
    INSERT INTO fb_tavoli (id, sala_id, numero, posti, posti_max, forma, x, y)
    VALUES (demo_id('fb.tavolo.' || i), SB, 'T' || (i - 20), 2, 3, 'rotondo', 160 + (i - 21) * 180, 420);
  END LOOP;

  -- ── Categorie, postazioni, prodotti ────────────────────────────────
  INSERT INTO fb_categorie (id, nome, area, uscita) VALUES
    (demo_id('fb.cat.antipasti'), 'Antipasti', 'food', 1),
    (demo_id('fb.cat.primi'),     'Primi', 'food', 2),
    (demo_id('fb.cat.secondi'),   'Secondi', 'food', 3),
    (demo_id('fb.cat.dolci'),     'Dolci', 'food', 4),
    (demo_id('fb.cat.vini'),      'Vini', 'beverage', 0),
    (demo_id('fb.cat.bevande'),   'Bevande', 'beverage', 0),
    (demo_id('fb.cat.caffetteria'), 'Caffetteria', 'beverage', 0),
    (demo_id('fb.cat.cocktail'),  'Cocktail', 'beverage', 0);
  INSERT INTO fb_stazioni (id, locale_id, nome, tipo, categorie, predefinita) VALUES
    (demo_id('fb.staz.cucina'), L, 'Cucina', 'cucina',
     ARRAY[demo_id('fb.cat.antipasti'), demo_id('fb.cat.primi'), demo_id('fb.cat.secondi')], true),
    (demo_id('fb.staz.pasticceria'), L, 'Pasticceria', 'cucina', ARRAY[demo_id('fb.cat.dolci')], false),
    (demo_id('fb.staz.bar.osteria'), L, 'Bar di sala', 'bar',
     ARRAY[demo_id('fb.cat.vini'), demo_id('fb.cat.bevande'), demo_id('fb.cat.caffetteria')], false),
    (demo_id('fb.staz.banco'), B, 'Banco', 'banco', ARRAY[demo_id('fb.cat.cocktail'), demo_id('fb.cat.bevande')], true),
    (demo_id('fb.staz.caffe'), B, 'Macchina del caffè', 'bar', ARRAY[demo_id('fb.cat.caffetteria')], false);

  INSERT INTO fb_prodotti (id, nome, categoria_id, prezzo, aliquota_iva, distinta_id, articolo_id, articolo_quantita, costo_manuale, beverage_tipo, tempo_preparazione_min) VALUES
    (demo_id('fb.p.bruschetta'), 'Bruschetta al pomodoro', demo_id('fb.cat.antipasti'), 6,  10, demo_id('db.bruschetta'), NULL, 1, NULL, NULL, 6),
    (demo_id('fb.p.tagliere'),   'Tagliere di salumi bergamaschi', demo_id('fb.cat.antipasti'), 14, 10, NULL, NULL, 1, 4.80, NULL, 8),
    (demo_id('fb.p.risotto'),    'Risotto ai porcini', demo_id('fb.cat.primi'), 15, 10, demo_id('db.risotto'), NULL, 1, NULL, NULL, 18),
    (demo_id('fb.p.casoncelli'), 'Casoncelli alla bergamasca', demo_id('fb.cat.primi'), 13, 10, NULL, NULL, 1, 2.90, NULL, 12),
    (demo_id('fb.p.tagliata'),   'Tagliata di manzo', demo_id('fb.cat.secondi'), 22, 10, demo_id('db.tagliata'), NULL, 1, NULL, NULL, 15),
    (demo_id('fb.p.polenta'),    'Polenta e brasato', demo_id('fb.cat.secondi'), 18, 10, NULL, NULL, 1, 5.20, NULL, 10),
    (demo_id('fb.p.tiramisu'),   'Tiramisù della casa', demo_id('fb.cat.dolci'), 6, 10, demo_id('db.tiramisu'), NULL, 1, NULL, NULL, 3),
    (demo_id('fb.p.torta'),      'Torta di grano saraceno', demo_id('fb.cat.dolci'), 6, 10, NULL, NULL, 1, 1.40, NULL, 3),
    (demo_id('fb.p.acqua'),      'Acqua minerale', demo_id('fb.cat.bevande'), 3, 10, NULL, demo_id('mag.acqua'), 1, NULL, 'acqua', NULL),
    (demo_id('fb.p.birra'),      'Birra artigianale', demo_id('fb.cat.bevande'), 6, 22, NULL, demo_id('mag.birra'), 1, NULL, 'birra', NULL),
    (demo_id('fb.p.barolo'),     'Barolo DOCG 2019 (bottiglia)', demo_id('fb.cat.vini'), 58, 22, NULL, demo_id('mag.barolo'), 1, NULL, 'vino', NULL),
    (demo_id('fb.p.lugana'),     'Lugana DOC 2023 (bottiglia)', demo_id('fb.cat.vini'), 26, 22, NULL, demo_id('mag.lugana'), 1, NULL, 'vino', NULL),
    (demo_id('fb.p.lugana.calice'), 'Lugana DOC 2023 (calice)', demo_id('fb.cat.vini'), 6, 22, NULL, demo_id('mag.lugana'), 0.2, NULL, 'vino', NULL),
    (demo_id('fb.p.espresso'),   'Espresso', demo_id('fb.cat.caffetteria'), 1.30, 10, demo_id('db.espresso'), NULL, 1, NULL, 'caffetteria', 1),
    (demo_id('fb.p.cappuccino'), 'Cappuccino', demo_id('fb.cat.caffetteria'), 1.60, 10, demo_id('db.cappuccino'), NULL, 1, NULL, 'caffetteria', 2),
    (demo_id('fb.p.gintonic'),   'Gin tonic', demo_id('fb.cat.cocktail'), 9, 22, demo_id('db.gintonic'), NULL, 1, NULL, 'cocktail', 3),
    (demo_id('fb.p.spritz'),     'Spritz', demo_id('fb.cat.cocktail'), 7, 22, NULL, NULL, 1, 1.60, 'cocktail', 2);

  INSERT INTO fb_vini (articolo_id, prodotto_bottiglia_id, prodotto_calice_id, cantina, denominazione, annata, regione, vitigno, formato, tipologia, temperatura_servizio, abbinamenti, in_carta) VALUES
    (demo_id('mag.barolo'), demo_id('fb.p.barolo'), NULL, 'Cantina Bricco', 'Barolo DOCG', 2019, 'Piemonte', 'Nebbiolo', '0,75 l', 'rosso', '18 °C', 'Brasato, tagliata, formaggi stagionati', true),
    (demo_id('mag.lugana'), demo_id('fb.p.lugana'), demo_id('fb.p.lugana.calice'), 'Ca'' dei Frati', 'Lugana DOC', 2023, 'Lombardia', 'Turbiana', '0,75 l', 'bianco', '10 °C', 'Risotti, pesce di lago', true),
    (demo_id('mag.franciacorta'), NULL, NULL, 'Tenuta Castello', 'Franciacorta DOCG Brut', NULL, 'Lombardia', 'Chardonnay, Pinot nero', '0,75 l', 'bollicine', '7 °C', 'Aperitivo, antipasti', false);

  INSERT INTO fb_menu (id, locale_id, nome, tipo, ora_inizio, ora_fine) VALUES
    (demo_id('fb.menu.pranzo'), L, 'Pranzo di lavoro', 'pranzo', '12:00', '14:30');
  INSERT INTO fb_menu_voci (menu_id, prodotto_id, prezzo) VALUES
    (demo_id('fb.menu.pranzo'), demo_id('fb.p.casoncelli'), 11),
    (demo_id('fb.menu.pranzo'), demo_id('fb.p.polenta'), 15);
  INSERT INTO fb_promozioni (locale_id, nome, tipo, categorie, prezzo, ora_inizio, ora_fine) VALUES
    (B, 'Happy hour', 'prezzo_speciale', ARRAY[demo_id('fb.cat.cocktail')], 6, '18:00', '20:00');

  -- ── Clienti abituali ───────────────────────────────────────────────
  INSERT INTO contatti (id, nome, cognome, telefono, email, created_by) VALUES
    (demo_id('c.fb.ferrari'),  'Paolo',    'Ferrari',  '335 610 2231', 'paolo.ferrari@example.com', U),
    (demo_id('c.fb.colombo'),  'Silvia',   'Colombo',  '347 228 9910', 'silvia.colombo@example.com', U),
    (demo_id('c.fb.ricci'),    'Davide',   'Ricci',    '333 771 4402', NULL, U),
    (demo_id('c.fb.marino'),   'Chiara',   'Marino',   '340 118 6635', 'chiara.marino@example.com', U),
    (demo_id('c.fb.gallo'),    'Andrea',   'Gallo',    '328 904 5517', NULL, U);
  INSERT INTO fb_clienti (contatto_id, preferenze, allergie, tavolo_preferito_id, compleanno, note) VALUES
    (demo_id('c.fb.ferrari'), 'Tavolo tranquillo, vino rosso', '{}', demo_id('fb.tavolo.8'), (current_date + 9 - interval '52 years')::date, 'Cliente dal 2019'),
    (demo_id('c.fb.colombo'), 'Menu vegetariano', '{frutta_a_guscio}', NULL, NULL, NULL),
    (demo_id('c.fb.marino'),  NULL, '{glutine}', demo_id('fb.tavolo.11'), (current_date + 2 - interval '34 years')::date, 'Celiaca: avvisare la cucina');

  -- ── Prenotazioni di oggi e domani, lista d'attesa ──────────────────
  INSERT INTO fb_prenotazioni (id, locale_id, contatto_id, nome, telefono, inizio, persone, tavoli, stato, canale, occasione) VALUES
    (demo_id('fb.pren.1'), L, demo_id('c.fb.ferrari'), 'Ferrari', '335 610 2231', demo_ora(0, '20:00'), 2, ARRAY[demo_id('fb.tavolo.8')], 'confermata', 'telefono', 'Anniversario'),
    (demo_id('fb.pren.2'), L, demo_id('c.fb.colombo'), 'Colombo', '347 228 9910', demo_ora(0, '20:30'), 6, ARRAY[demo_id('fb.tavolo.3')], 'confermata', 'sito', NULL),
    (demo_id('fb.pren.3'), L, NULL, 'Studio Ferri', '035 220 118', demo_ora(0, '21:00'), 4, ARRAY[demo_id('fb.tavolo.5')], 'richiesta', 'email', 'Cena di lavoro'),
    (demo_id('fb.pren.4'), L, demo_id('c.fb.marino'), 'Marino', '340 118 6635', demo_ora(1, '13:00'), 4, ARRAY[demo_id('fb.tavolo.11')], 'confermata', 'telefono', 'Compleanno'),
    (demo_id('fb.pren.5'), L, NULL, 'Bonetti', '339 552 0981', demo_ora(1, '20:00'), 5, ARRAY[demo_id('fb.tavolo.6')], 'confermata', 'telefono', NULL),
    (demo_id('fb.pren.6'), L, NULL, 'Gruppo CAI Bergamo', '035 112 900', demo_ora(2, '20:00'), 12, ARRAY[demo_id('fb.tavolo.3'), demo_id('fb.tavolo.6')], 'confermata', 'email', 'Cena sociale');
  INSERT INTO fb_attesa (locale_id, nome, telefono, persone, attesa_stimata_min, note) VALUES
    (L, 'Pellegrini', '346 210 7781', 3, 25, 'Va bene anche il dehor');

  -- ── Comande: storico degli ultimi giorni (chiuse) e tavoli aperti ──
  -- Si chiudono davvero (pagamento + chiusura del conto); poi le date si
  -- riportano ai giorni scorsi.
  FOR i IN 1..14 LOOP
    k := demo_id('fb.comanda.storico.' || i);
    INSERT INTO fb_comande (id, locale_id, tavolo_id, coperti, contatto_id)
    VALUES (k, L, demo_id('fb.tavolo.' || (1 + i % 7)), 2 + i % 3, CASE WHEN i % 4 = 0 THEN demo_id('c.fb.ferrari') WHEN i % 5 = 0 THEN demo_id('c.fb.gallo') END);
    INSERT INTO fb_comande_righe (comanda_id, prodotto_id, quantita) VALUES
      (k, demo_id('fb.p.bruschetta'), 1 + i % 2),
      (k, CASE WHEN i % 3 = 0 THEN demo_id('fb.p.risotto') ELSE demo_id('fb.p.casoncelli') END, 2),
      (k, CASE WHEN i % 2 = 0 THEN demo_id('fb.p.tagliata') ELSE demo_id('fb.p.polenta') END, 1 + i % 3),
      (k, demo_id('fb.p.tiramisu'), 1 + i % 2),
      (k, CASE WHEN i % 3 = 1 THEN demo_id('fb.p.barolo') ELSE demo_id('fb.p.lugana') END, 1),
      (k, demo_id('fb.p.acqua'), 2);
    UPDATE fb_comande_righe SET stato = 'servita' WHERE comanda_id = k;
    INSERT INTO conti_pagamenti (conto_id, metodo, importo)
      SELECT c.conto_id, CASE WHEN i % 3 = 0 THEN 'contanti' ELSE 'pos' END::pagamento_metodo, s.totale
        FROM fb_comande c JOIN conti_saldi s ON s.conto_id = c.conto_id WHERE c.id = k;
    PERFORM chiudi_conto(conto_id) FROM fb_comande WHERE id = k;
  END LOOP;
  -- Bar: colazioni e aperitivi
  FOR i IN 1..20 LOOP
    k := demo_id('fb.bar.storico.' || i);
    INSERT INTO fb_comande (id, locale_id, canale) VALUES (k, B, 'banco');
    INSERT INTO fb_comande_righe (comanda_id, prodotto_id, quantita) VALUES
      (k, demo_id('fb.p.espresso'), 1 + i % 3),
      (k, demo_id('fb.p.cappuccino'), i % 2 + 1);
    IF i % 3 = 0 THEN
      INSERT INTO fb_comande_righe (comanda_id, prodotto_id, quantita) VALUES
        (k, demo_id('fb.p.gintonic'), 1), (k, demo_id('fb.p.spritz'), 2);
    END IF;
    UPDATE fb_comande_righe SET stato = 'servita' WHERE comanda_id = k;
    INSERT INTO conti_pagamenti (conto_id, metodo, importo)
      SELECT c.conto_id, CASE WHEN i % 2 = 0 THEN 'contanti' ELSE 'pos' END::pagamento_metodo, s.totale
        FROM fb_comande c JOIN conti_saldi s ON s.conto_id = c.conto_id WHERE c.id = k;
    PERFORM chiudi_conto(conto_id) FROM fb_comande WHERE id = k;
  END LOOP;
  -- Riporta lo storico agli ultimi sette giorni (mai oggi: il seme gira di notte,
  -- e una comanda chiusa «stasera» sarebbe nel futuro).
  SET LOCAL session_replication_role = replica;
  FOR r IN SELECT id, conto_id, locale_id = B AS al_bar,
                  row_number() OVER (PARTITION BY locale_id ORDER BY id) AS n
             FROM fb_comande WHERE locale_id IN (L, B) AND stato = 'chiusa' LOOP
    UPDATE fb_comande
       SET aperta_at = demo_ora(-(1 + r.n % 7)::int, CASE WHEN r.al_bar THEN '07:40' ELSE '19:50' END::time) + (r.n % 5) * interval '23 minutes',
           chiusa_at = demo_ora(-(1 + r.n % 7)::int, CASE WHEN r.al_bar THEN '07:52' ELSE '21:35' END::time) + (r.n % 5) * interval '23 minutes'
     WHERE id = r.id;
    -- tempi di cucina: inviata all'apertura, pronta dopo il tempo di preparazione (+ qualche minuto), servita subito dopo
    UPDATE fb_comande_righe g
       SET ordinata_at = c.aperta_at, inviata_at = c.aperta_at + interval '2 minutes',
           presa_at = c.aperta_at + interval '3 minutes',
           pronta_at = c.aperta_at + make_interval(mins => 3 + COALESCE(p.tempo_preparazione_min, 1) + (r.n % 4)::int),
           servita_at = c.aperta_at + make_interval(mins => 5 + COALESCE(p.tempo_preparazione_min, 1) + (r.n % 4)::int)
      FROM fb_comande c, fb_prodotti p
     WHERE c.id = r.id AND g.comanda_id = c.id AND p.id = g.prodotto_id;
    UPDATE conti SET aperto_at = c.aperta_at, chiuso_at = c.chiusa_at FROM fb_comande c WHERE c.id = r.id AND conti.id = r.conto_id;
    UPDATE conti_pagamenti SET pagato_at = c.chiusa_at FROM fb_comande c WHERE c.id = r.id AND conti_pagamenti.conto_id = r.conto_id;
  END LOOP;
  SET LOCAL session_replication_role = origin;

  -- Tavoli aperti adesso: il 2 al secondo, il 4 appena seduto.
  INSERT INTO fb_comande (id, locale_id, tavolo_id, coperti, cameriere_id) VALUES
    (demo_id('fb.comanda.aperta.1'), L, demo_id('fb.tavolo.2'), 3, U),
    (demo_id('fb.comanda.aperta.2'), L, demo_id('fb.tavolo.4'), 4, U);
  INSERT INTO fb_comande_righe (comanda_id, prodotto_id, quantita, invio, personalizzazioni) VALUES
    (demo_id('fb.comanda.aperta.1'), demo_id('fb.p.tagliere'), 1, 'immediato', NULL),
    (demo_id('fb.comanda.aperta.1'), demo_id('fb.p.risotto'), 2, 'immediato', 'uno senza formaggio'),
    (demo_id('fb.comanda.aperta.1'), demo_id('fb.p.tagliata'), 1, 'differito', 'cottura media'),
    (demo_id('fb.comanda.aperta.1'), demo_id('fb.p.lugana'), 1, 'immediato', NULL),
    (demo_id('fb.comanda.aperta.2'), demo_id('fb.p.acqua'), 2, 'immediato', NULL);
  -- Il seme gira di notte: niente piatti mandati in cucina e lasciati lì per ore.
  -- Al 2 antipasto, primi e vino serviti, la tagliata attende il via; al 4 l'acqua.
  UPDATE fb_comande_righe SET stato = 'servita'
   WHERE comanda_id IN (demo_id('fb.comanda.aperta.1'), demo_id('fb.comanda.aperta.2')) AND invio = 'immediato';

  -- ── Sprechi, HACCP, eventi ─────────────────────────────────────────
  INSERT INTO fb_sprechi (locale_id, causale, articolo_id, quantita, registrato_at, note) VALUES
    (L, 'deterioramento', demo_id('mag.pomodori'), 0.8, NOW() - interval '2 days', 'Cassetta arrivata ammaccata'),
    (L, 'scarto_preparazione', demo_id('mag.manzo'), 0.35, NOW() - interval '1 day', 'Rifilatura'),
    (L, 'scadenza', demo_id('mag.latte'), 1, NOW() - interval '3 days', NULL);

  INSERT INTO controlli_punti (id, modulo, nome, tipo, ubicazione, ogni_ore, unita, soglia_min, soglia_max) VALUES
    (demo_id('haccp.frigo1'), 'fb', 'Frigo carni', 'temperatura', 'Cucina', 12, '°C', 0, 4),
    (demo_id('haccp.frigo2'), 'fb', 'Frigo verdure', 'temperatura', 'Cucina', 12, '°C', 0, 8),
    (demo_id('haccp.abbattitore'), 'fb', 'Abbattitore', 'temperatura', 'Cucina', 24, '°C', -40, -18),
    (demo_id('haccp.sanif'), 'fb', 'Sanificazione piani di lavoro', 'sanificazione', 'Cucina', 24, NULL, NULL, NULL),
    (demo_id('haccp.olio'), 'fb', 'Olio della friggitrice', 'olio_frittura', 'Cucina', 24, '% composti polari', 0, 25);
  FOR i IN 0..5 LOOP
    INSERT INTO controlli_registrazioni (punto_id, eseguito_at, valore, note) VALUES
      (demo_id('haccp.frigo1'), demo_ora(-i, '09:00'), 2.5 + (i % 3) * 0.5, NULL),
      (demo_id('haccp.frigo2'), demo_ora(-i, '09:05'), 4 + (i % 2), NULL),
      (demo_id('haccp.abbattitore'), demo_ora(-i, '15:00'), -21 - (i % 3), NULL);
  END LOOP;
  -- Una lettura fuori soglia ieri sera, con l'azione correttiva.
  INSERT INTO controlli_registrazioni (punto_id, eseguito_at, valore, azione_correttiva, azione_registrata_at) VALUES
    (demo_id('haccp.frigo1'), demo_ora(-1, '21:00'), 6.5, 'Porta rimasta socchiusa: carni spostate nel frigo di riserva, temperatura rientrata in 40 minuti', demo_ora(-1, '21:40'));

  INSERT INTO eventi (id, modulo, titolo, tipo, stato, contatto_id, inizio, fine, luogo, partecipanti_previsti, referente_id, note) VALUES
    (demo_id('fb.evento.comunione'), 'ristorante', 'Pranzo di comunione Colombo', 'privato', 'confermato', demo_id('c.fb.colombo'),
     demo_ora(12, '12:30'), demo_ora(12, '16:30'), 'Sala interna', 34, U, 'Menu bambini per 8'),
    (demo_id('fb.evento.aziendale'), 'ristorante', 'Cena aziendale Tecnoservice', 'aziendale', 'preventivo', NULL,
     demo_ora(20, '20:00'), demo_ora(20, '23:30'), 'Sala interna (esclusiva)', 48, U, NULL);
END $fn$;
REVOKE ALL ON FUNCTION public.demo_semina_fb(uuid) FROM PUBLIC, anon, authenticated;

-- ═══ HOTEL ══════════════════════════════════════════════════════════
-- Un 3 stelle con 14 camere su tre piani. Ogni camera ha una sequenza di
-- soggiorni senza sovrapposizioni dal mese scorso alle prossime tre
-- settimane: partiti, in casa, arrivi e partenze di oggi, futuri.
CREATE OR REPLACE FUNCTION public.demo_semina_hotel(U uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $fn$
DECLARE
  H uuid := demo_id('hotel.struttura');
  oggi date := (NOW() AT TIME ZONE 'Europe/Rome')::date;
  cognomi text[] := ARRAY['Bianchi','Russo','Romano','Costa','Fontana','Moretti','Barbieri','Lombardi','Galli','Conti',
                          'Mancini','Rinaldi','Caruso','Ferrara','Marchetti','Weber','Müller','Dupont','Martin','Smith',
                          'Leone','Longo','Gentile','Martinelli','Vitale','Serra','Coppola','De Luca','Santoro','Mariani'];
  canali text[] := ARRAY['diretto','ota','telefono','sito','ota','email','ota','agenzia'];
  c int; n int := 0; d date; a date; durata int; st hotel_prenotazione_stato;
  tip uuid; cam uuid; p uuid; ospite uuid; can text;
BEGIN
  INSERT INTO hotel_strutture (id, nome, categoria, indirizzo, comune, provincia, cap, telefono, email, piani, check_in_dalle, check_out_entro, posti_auto, codice_cir)
  VALUES (H, 'Hotel Belvedere', '3 stelle', 'Lungolago Marconi 21', 'Salò', 'BS', '25087', '0365 210 450', 'info@hotelbelvedere.example', 3,
          '14:00', '10:30', 12, '017170-ALB-00012');
  INSERT INTO hotel_tipologie (id, struttura_id, codice, nome, categoria, occupazione_base, occupazione_max, prezzo_base, ordine) VALUES
    (demo_id('hotel.tip.sgl'), H, 'SGL', 'Singola', 'singola', 1, 1, 75, 0),
    (demo_id('hotel.tip.dbl'), H, 'DBL', 'Doppia vista giardino', 'matrimoniale', 2, 3, 110, 1),
    (demo_id('hotel.tip.dlx'), H, 'DLX', 'Doppia vista lago', 'deluxe', 2, 3, 145, 2),
    (demo_id('hotel.tip.js'),  H, 'JS',  'Junior suite', 'junior_suite', 2, 4, 210, 3);
  FOR c IN 1..14 LOOP
    INSERT INTO hotel_camere (id, struttura_id, tipologia_id, numero, piano, posti_letto, letti, metri_quadri, vista, ordine)
    VALUES (demo_id('hotel.camera.' || c), H,
            CASE WHEN c IN (1, 6) THEN demo_id('hotel.tip.sgl') WHEN c IN (13, 14) THEN demo_id('hotel.tip.js')
                 WHEN c % 2 = 0 THEN demo_id('hotel.tip.dlx') ELSE demo_id('hotel.tip.dbl') END,
            (((c - 1) / 5 + 1) * 100 + ((c - 1) % 5 + 1))::text, (c - 1) / 5 + 1,
            CASE WHEN c IN (1, 6) THEN 1 WHEN c IN (13, 14) THEN 4 ELSE 3 END,
            CASE WHEN c IN (1, 6) THEN 'singoli' WHEN c IN (13, 14) THEN 'matrimoniale_e_singolo' ELSE 'matrimoniale' END,
            CASE WHEN c IN (1, 6) THEN 14 WHEN c IN (13, 14) THEN 34 ELSE 20 END,
            CASE WHEN c % 2 = 0 OR c IN (13, 14) THEN 'lago' ELSE 'giardino' END, c);
  END LOOP;
  INSERT INTO hotel_trattamenti (id, struttura_id, codice, nome, colazione, supplemento_adulto, supplemento_bambino) VALUES
    (demo_id('hotel.tr.bb'), H, 'BB', 'Pernottamento e colazione', true, 0, 0);
  INSERT INTO hotel_trattamenti (id, struttura_id, codice, nome, colazione, cena, supplemento_adulto, supplemento_bambino) VALUES
    (demo_id('hotel.tr.hb'), H, 'HB', 'Mezza pensione', true, true, 28, 15);
  INSERT INTO hotel_piani_tariffari (id, struttura_id, codice, nome, tipo, cancellazione_giorni, penale_pct) VALUES
    (demo_id('hotel.piano.bar'), H, 'BAR', 'Miglior tariffa disponibile', 'bar', 3, 100);
  INSERT INTO hotel_piani_tariffari (id, struttura_id, codice, nome, tipo, base_piano_id, variazione_pct, rimborsabile) VALUES
    (demo_id('hotel.piano.nr'), H, 'NR', 'Non rimborsabile', 'non_rimborsabile', demo_id('hotel.piano.bar'), -12, false);
  -- Listino della miglior tariffa: fine settimana più caro.
  INSERT INTO hotel_tariffe (struttura_id, piano_id, tipologia_id, dal, al, giorni, prezzo, priorita)
  SELECT H, demo_id('hotel.piano.bar'), t.id, oggi - 60, oggi + 90, g, t.prezzo_base + extra, pr
    FROM hotel_tipologie t,
         (VALUES ('{1,2,3,4,5,6,7}'::smallint[], 0, 0), ('{5,6}'::smallint[], 25, 1)) v(g, extra, pr)
   WHERE t.struttura_id = H;
  INSERT INTO hotel_tassa_regole (struttura_id, comune, importo_notte, notti_max, eta_esenzione_sotto)
  VALUES (H, 'Salò', 2, 7, 14);

  INSERT INTO organizzazioni (id, ragione_sociale, citta, settore, created_by) VALUES
    (demo_id('org.hotel.ota'), 'Viaggi Online Spa', 'Milano', 'Turismo', U),
    (demo_id('org.hotel.agenzia'), 'Agenzia Lago Tours Srl', 'Brescia', 'Turismo', U);
  INSERT INTO hotel_intermediari (id, struttura_id, organizzazione_id, tipo, commissione_pct, codice_canale) VALUES
    (demo_id('hotel.int.ota'), H, demo_id('org.hotel.ota'), 'ota', 18, 'VOL'),
    (demo_id('hotel.int.agenzia'), H, demo_id('org.hotel.agenzia'), 'agenzia', 10, 'LTR');

  -- ── Soggiorni camera per camera ────────────────────────────────────
  FOR c IN 1..14 LOOP
    cam := demo_id('hotel.camera.' || c);
    SELECT tipologia_id INTO tip FROM hotel_camere WHERE id = cam;
    d := oggi - 30 + (c % 3);
    WHILE d < oggi + 21 LOOP
      n := n + 1;
      a := d + (n * 7 % 3);                  -- 0-2 notti di camera vuota fra un ospite e l'altro
      durata := 1 + (n * 3 % 5);             -- 1-5 notti
      -- Due camere libere stanotte, per lasciare spazio agli arrivi.
      IF c IN (3, 9) AND a <= oggi AND a + durata > oggi THEN
        d := oggi + 1;
        CONTINUE;
      END IF;
      -- chi parte oggi è ancora in casa: il check-out è da fare
      st := CASE WHEN a + durata < oggi THEN 'partita'
                 WHEN a < oggi THEN 'in_soggiorno'
                 ELSE 'confermata' END;
      can := canali[1 + n % array_length(canali, 1)];
      p := demo_id('hotel.pren.' || n);
      INSERT INTO hotel_prenotazioni (id, struttura_id, ospite_nome, adulti, bambini, arrivo, partenza, tipologia_id, camera_id,
                                      piano_id, trattamento_id, canale, intermediario_id, stato, check_in_at, check_out_at, arrivo_ora)
      VALUES (p, H, cognomi[1 + n % array_length(cognomi, 1)],
              CASE WHEN c IN (1, 6) THEN 1 ELSE 2 END, CASE WHEN c IN (13, 14) AND n % 2 = 0 THEN 1 ELSE 0 END,
              a, a + durata, tip, cam,
              CASE WHEN n % 4 = 0 THEN demo_id('hotel.piano.nr') ELSE demo_id('hotel.piano.bar') END,
              CASE WHEN n % 3 = 0 THEN demo_id('hotel.tr.hb') ELSE demo_id('hotel.tr.bb') END,
              can, CASE can WHEN 'ota' THEN demo_id('hotel.int.ota') WHEN 'agenzia' THEN demo_id('hotel.int.agenzia') END,
              st,
              CASE WHEN st IN ('in_soggiorno', 'partita') THEN (a + time '15:30') AT TIME ZONE 'Europe/Rome' END,
              CASE WHEN st = 'partita' THEN (a + durata + time '10:00') AT TIME ZONE 'Europe/Rome' END,
              CASE WHEN a = oggi THEN time '16:00' + (n % 4) * interval '1 hour' END);
      d := a + durata;
    END LOOP;
  END LOOP;

  -- Ospiti registrati (documenti) per chi è in casa: servono al file per la Questura.
  FOR p, n IN SELECT id, row_number() OVER (ORDER BY arrivo, id) FROM hotel_prenotazioni WHERE struttura_id = H AND stato = 'in_soggiorno' LOOP
    ospite := demo_id('hotel.ospite.' || n);
    INSERT INTO contatti (id, nome, cognome, email, created_by)
    SELECT demo_id('c.hotel.' || n), (ARRAY['Marco','Giulia','Luca','Anna','Thomas','Claire','Peter','Sara'])[1 + n % 8], ospite_nome,
           lower(replace(ospite_nome, ' ', '')) || n || '@example.com', U
      FROM hotel_prenotazioni WHERE id = p;
    INSERT INTO hotel_ospiti (id, contatto_id, sesso, data_nascita, cittadinanza, documento_tipo, documento_numero, documento_luogo)
    VALUES (ospite, demo_id('c.hotel.' || n), CASE WHEN n % 2 = 0 THEN 'F' ELSE 'M' END, oggi - (30 + n::int) * 365,
            CASE WHEN n % 5 = 0 THEN 'Germania' ELSE 'Italia' END, 'IDENT', 'CA' || lpad((1000000 + n * 7919)::text, 7, '0'), 'Comune di residenza');
    INSERT INTO hotel_soggiorno_ospiti (prenotazione_id, ospite_id, tipo_alloggiato) VALUES (p, ospite, '17');
    UPDATE hotel_prenotazioni SET contatto_id = demo_id('c.hotel.' || n) WHERE id = p;
    PERFORM hotel_conto_prenotazione(p);
  END LOOP;
  -- Le notti già passate dei soggiorni in corso vanno sul conto.
  PERFORM hotel_audit_notturno();
  -- Un'opzione in scadenza e una richiesta da confermare.
  INSERT INTO hotel_prenotazioni (struttura_id, ospite_nome, adulti, arrivo, partenza, tipologia_id, piano_id, stato, opzione_scadenza, canale, note)
  VALUES (H, 'Studio Ferri (convegno)', 2, oggi + 10, oggi + 12, demo_id('hotel.tip.dbl'), demo_id('hotel.piano.bar'), 'opzionata', oggi + 2, 'email', 'Tre camere in opzione'),
         (H, 'Keller', 2, oggi + 6, oggi + 9, demo_id('hotel.tip.dlx'), demo_id('hotel.piano.bar'), 'richiesta', NULL, 'email', 'Chiede una camera ai piani alti');

  -- Pulizie di oggi, un guasto da sistemare, un oggetto smarrito.
  PERFORM hotel_genera_pulizie(H, oggi);
  INSERT INTO hotel_manutenzioni (struttura_id, camera_id, categoria, descrizione, priorita, mette_fuori_servizio)
  VALUES (H, demo_id('hotel.camera.9'), 'bagno', 'Scarico della doccia lento', 'media', false);
  INSERT INTO hotel_oggetti_smarriti (struttura_id, descrizione, categoria, camera_id, trovato_il, ubicazione, custodia_fino)
  VALUES (H, 'Caricabatterie per portatile', 'elettronica', demo_id('hotel.camera.4'), oggi - 3, 'Reception, cassetto 2', oggi + 87);

  -- Le prenotazioni sono arrivate nelle settimane prima dell'arrivo, non tutte stanotte
  -- (ritmo delle prenotazioni e pickup). Le due di oggi restano le «nuove».
  SET LOCAL session_replication_role = replica;
  UPDATE hotel_prenotazioni
     SET created_at = LEAST((arrivo - 2 - (abs(hashtext(id::text)) % 40)) + time '11:00', NOW() - interval '1 day')
   WHERE struttura_id = H AND stato NOT IN ('richiesta', 'opzionata');
  SET LOCAL session_replication_role = origin;
END $fn$;
REVOKE ALL ON FUNCTION public.demo_semina_hotel(uuid) FROM PUBLIC, anon, authenticated;

-- ═══ PALESTRA ═══════════════════════════════════════════════════════
-- Una sede con tre sale, tre istruttori, sei corsi in calendario, una
-- trentina di soci con abbonamenti in corso, in scadenza e scaduti,
-- ingressi dell'ultima settimana e prenotazioni ai corsi dei prossimi giorni.
CREATE OR REPLACE FUNCTION public.demo_semina_palestra(U uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $fn$
DECLARE
  P uuid := demo_id('pal.sede');
  oggi date := (NOW() AT TIME ZONE 'Europe/Rome')::date;
  nomi text[] := ARRAY['Alessia','Matteo','Francesca','Simone','Elena','Giorgio','Martina','Stefano','Valentina','Federico',
                       'Chiara','Riccardo','Sofia','Lorenzo','Irene','Tommaso','Beatrice','Nicola','Camilla','Daniele',
                       'Laura','Emanuele','Giada','Pietro','Serena','Michele','Arianna','Filippo'];
  cognomi text[] := ARRAY['Rota','Pesenti','Locatelli','Carminati','Mazzoleni','Gamba','Bonacina','Cortinovis','Ghilardi','Previtali',
                          'Arnoldi','Belotti','Brembilla','Cattaneo','Facchinetti','Invernizzi','Lazzari','Magni','Milesi','Nava',
                          'Pellegrini','Quarti','Ravasio','Salvi','Tironi','Valsecchi','Zanchi','Agazzi'];
  i int; so uuid; fo uuid; dal date; l record;
BEGIN
  INSERT INTO pal_sedi (id, nome, indirizzo, comune, telefono, email, richiede_certificato, noshow_penale, noshow_soglia, noshow_blocco_giorni, cancellazione_ore)
  VALUES (P, 'Fit Lab Bergamo', 'Via Autostrada 12', 'Bergamo', '035 455 210', 'reception@fitlab.example', true, 5, 3, 7, 4);
  INSERT INTO pal_sale (id, sede_id, nome, tipo, capienza) VALUES
    (demo_id('pal.sala.pesi'),  P, 'Sala pesi', 'sala_pesi', 40),
    (demo_id('pal.sala.corsi'), P, 'Sala corsi', 'sala_corsi', 20),
    (demo_id('pal.sala.bike'),  P, 'Sala spinning', 'spinning', 14);
  INSERT INTO pal_trainer (id, nome, personal_trainer, competenze, tariffa_sessione, compenso_sessione, compenso_lezione, colore) VALUES
    (demo_id('pal.tr.sara'),  'Sara Gualandris', true,  '{pilates,yoga,posturale}', 45, 25, 20, '#7c3aed'),
    (demo_id('pal.tr.marco'), 'Marco Ruggeri',   true,  '{functional,cross_training,pesi}', 50, 28, 20, '#0891b2'),
    (demo_id('pal.tr.elisa'), 'Elisa Fumagalli', false, '{spinning,zumba}', 0, 0, 18, '#db2777');
  INSERT INTO pal_corsi (id, sede_id, nome, disciplina, livello, sala_id, istruttore_id, durata_min, capienza, giorni, ora) VALUES
    (demo_id('pal.corso.pilates'),  P, 'Pilates',            'pilates',        'tutti',      demo_id('pal.sala.corsi'), demo_id('pal.tr.sara'),  50, 14, '{1,3,5}', '18:30'),
    (demo_id('pal.corso.yoga'),     P, 'Yoga del mattino',   'yoga',           'base',       demo_id('pal.sala.corsi'), demo_id('pal.tr.sara'),  60, 16, '{2,4}',   '07:30'),
    (demo_id('pal.corso.spinning'), P, 'Spinning',           'spinning',       'intermedio', demo_id('pal.sala.bike'),  demo_id('pal.tr.elisa'), 45, 14, '{1,2,3,4,5}', '19:30'),
    (demo_id('pal.corso.functional'), P, 'Functional training', 'functional',  'intermedio', demo_id('pal.sala.corsi'), demo_id('pal.tr.marco'), 45, 12, '{2,4}',   '19:30'),
    (demo_id('pal.corso.cross'),    P, 'Cross training',     'cross_training', 'avanzato',   demo_id('pal.sala.corsi'), demo_id('pal.tr.marco'), 60, 12, '{6}',     '10:00'),
    (demo_id('pal.corso.zumba'),    P, 'Zumba',              'zumba',          'tutti',      demo_id('pal.sala.corsi'), demo_id('pal.tr.elisa'), 50, 20, '{1,3}',   '20:30');
  PERFORM pal_genera_lezioni(P, oggi - 7, oggi + 13);

  INSERT INTO pal_formule (id, nome, tipo, durata_mesi, prezzo, quota_iscrizione, rate, servizi, rinnovo_automatico, ordine) VALUES
    (demo_id('pal.f.mensile'),     'Open mensile',     'mensile',     1,  59,  25, 1, '{sala_pesi,corsi}', true, 0),
    (demo_id('pal.f.trimestrale'), 'Open trimestrale', 'trimestrale', 3,  159, 25, 1, '{sala_pesi,corsi}', false, 1),
    (demo_id('pal.f.annuale'),     'Open annuale',     'annuale',     12, 540, 0,  6, '{sala_pesi,corsi}', false, 2),
    (demo_id('pal.f.pesi'),        'Solo sala pesi',   'sala_pesi',   1,  45,  25, 1, '{sala_pesi}', true, 3);
  INSERT INTO organizzazioni (id, ragione_sociale, citta, settore, created_by) VALUES
    (demo_id('org.pal.convenzione'), 'Brembo Logistica Srl', 'Curno', 'Logistica', U);
  INSERT INTO pal_convenzioni (id, organizzazione_id, sconto_pct, quota_azienda_pct) VALUES
    (demo_id('pal.conv'), demo_id('org.pal.convenzione'), 15, 30);

  -- ── Soci e abbonamenti ─────────────────────────────────────────────
  FOR i IN 1..28 LOOP
    so := demo_id('pal.socio.' || i);
    INSERT INTO contatti (id, nome, cognome, email, telefono, created_by) VALUES
      (demo_id('c.pal.' || i), nomi[i], cognomi[i], lower(nomi[i] || '.' || cognomi[i]) || '@example.com',
       '34' || (i % 10) || ' ' || lpad((i * 7331 % 1000)::text, 3, '0') || ' ' || lpad((i * 97 % 10000)::text, 4, '0'), U);
    INSERT INTO pal_soci (id, contatto_id, sede_id, data_iscrizione, data_nascita, condizioni_accettate, certificato_scadenza,
                          trainer_id, consenso_salute, convenzione_id, created_by)
    VALUES (so, demo_id('c.pal.' || i), P, oggi - 20 - i * 23, oggi - (19 + i * 17 % 40) * 365, true,
            CASE WHEN i = 7 THEN oggi + 6 WHEN i = 12 THEN oggi - 10 ELSE oggi + 120 + i * 9 END,
            CASE WHEN i % 6 = 0 THEN demo_id('pal.tr.sara') WHEN i % 6 = 3 THEN demo_id('pal.tr.marco') END,
            i % 3 = 0, CASE WHEN i IN (4, 15, 22) THEN demo_id('pal.conv') END, U);
    fo := CASE WHEN i % 5 = 0 THEN demo_id('pal.f.annuale') WHEN i % 4 = 0 THEN demo_id('pal.f.trimestrale')
               WHEN i % 7 = 0 THEN demo_id('pal.f.pesi') ELSE demo_id('pal.f.mensile') END;
    -- Inizio scalato: alcuni scadono questa settimana, due sono già scaduti (da rinnovare).
    dal := CASE WHEN fo = demo_id('pal.f.annuale') THEN oggi - 40 - i * 5
                   WHEN fo = demo_id('pal.f.trimestrale') THEN oggi - 30 - i
                   WHEN i IN (9, 18) THEN oggi - 35
                   ELSE oggi - 25 + (i % 6) END;
    INSERT INTO pal_abbonamenti (id, socio_id, formula_id, inizio, created_by)
    VALUES (demo_id('pal.abb.' || i), so, fo, dal, U);
  END LOOP;
  -- Le rate passate risultano pagate, tranne due insoluti (soci 11 e 23).
  UPDATE pal_rate SET stato = 'pagata', pagata_il = scadenza, metodo = CASE WHEN numero % 2 = 0 THEN 'pos' ELSE 'addebito_ricorrente' END
   WHERE socio_id IN (SELECT id FROM pal_soci WHERE sede_id = P) AND scadenza <= oggi
     AND socio_id NOT IN (demo_id('pal.socio.11'), demo_id('pal.socio.23'));

  -- ── Ingressi dell'ultima settimana e di stamattina ─────────────────
  FOR i IN 1..28 LOOP
    FOR l IN SELECT g FROM generate_series(1, 7) g WHERE (g + i) % 3 <> 0 LOOP
      INSERT INTO pal_accessi (socio_id, sede_id, ingresso_at, uscita_at, tipo, servizio, consentito)
      VALUES (demo_id('pal.socio.' || i), P,
              demo_ora(-l.g, '07:00'::time + ((i * 37 + l.g * 53) % 780) * interval '1 minute'),
              demo_ora(-l.g, '07:00'::time + ((i * 37 + l.g * 53) % 780 + 70) * interval '1 minute'),
              CASE WHEN i % 2 = 0 THEN 'badge' ELSE 'qr' END, 'sala_pesi', true);
    END LOOP;
  END LOOP;
  INSERT INTO pal_accessi (socio_id, sede_id, ingresso_at, tipo, servizio, consentito, motivo) VALUES
    (demo_id('pal.socio.11'), P, demo_ora(-1, '18:40'), 'badge', 'sala_pesi', false, 'Rata insoluta');

  -- ── Lezioni: passate svolte, prossime con le prenotazioni ──────────
  UPDATE pal_lezioni SET stato = 'svolta' WHERE sede_id = P AND fine < NOW();
  FOR l IN SELECT id, capienza, row_number() OVER (ORDER BY inizio) AS n
             FROM pal_lezioni WHERE sede_id = P AND inizio > NOW() AND inizio < NOW() + interval '7 days' LOOP
    FOR i IN 1..LEAST(l.capienza + CASE WHEN l.n % 4 = 0 THEN 2 ELSE -(l.n % 5)::int - 3 END, 28) LOOP
      BEGIN
        INSERT INTO pal_prenotazioni (lezione_id, socio_id, canale, created_by)
        VALUES (l.id, demo_id('pal.socio.' || (1 + (i + l.n * 3) % 28)), 'app', U);
      EXCEPTION WHEN OTHERS THEN
        NULL;  -- socio senza corsi nella formula o già prenotato: si passa al prossimo
      END;
    END LOOP;
  END LOOP;

  -- ── Prove e visite dei potenziali iscritti ─────────────────────────
  INSERT INTO contatti (id, nome, cognome, telefono, created_by) VALUES
    (demo_id('c.pal.prova.1'), 'Greta', 'Sonzogni', '348 220 1904', U),
    (demo_id('c.pal.prova.2'), 'Luca', 'Bergamelli', '331 870 2245', U);
  INSERT INTO pal_prove (contatto_id, sede_id, tipo, quando, servizio, stato) VALUES
    (demo_id('c.pal.prova.1'), P, 'prova', demo_ora(1, '18:30'), 'corsi', 'prenotata'),
    (demo_id('c.pal.prova.2'), P, 'visita', demo_ora(0, '17:00'), 'sala_pesi', 'prenotata');
  -- Il giro notturno della palestra mette in ordine scadenze, insoluti e blocchi.
  PERFORM pal_rinnovi_notturni();
  PERFORM pal_rate_scadute();
END $fn$;
REVOKE ALL ON FUNCTION public.demo_semina_palestra(uuid) FROM PUBLIC, anon, authenticated;

-- ═══ FIORAIO ════════════════════════════════════════════════════════
-- Un negozio con il suo magazzino di fiori deperibili, cinque composizioni
-- a catalogo, ordini in tutti gli stati (da confermare, in laboratorio,
-- pronti, in consegna, consegnati), un abbonamento aziendale, ricorrenze
-- dei clienti e due cerimonie.
CREATE OR REPLACE FUNCTION public.demo_semina_fioraio(U uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $fn$
DECLARE
  oggi date := (NOW() AT TIME ZONE 'Europe/Rome')::date;
  o record;
  k uuid;
  c uuid;
BEGIN
  INSERT INTO fior_impostazioni (id, negozio, indirizzo, ricarico_pct, costo_orario, promemoria_ricorrenze_giorni, abbonamenti_anticipo_giorni)
  VALUES (1, 'Fiori di Città Alta', 'Via Colleoni 9, Bergamo', 150, 22, 7, 3);
  INSERT INTO fior_zone (id, nome, cap, importo, ordine) VALUES
    (demo_id('fior.zona.centro'), 'Bergamo centro', '{24121,24122}', 6, 0),
    (demo_id('fior.zona.alta'),   'Città Alta e colli', '{24129}', 8, 1),
    (demo_id('fior.zona.hinter'), 'Hinterland', '{24030,24035,24048,24050}', 12, 2);

  INSERT INTO mag_articoli (id, modulo, descrizione, unita_misura, costo_unitario, prezzo_vendita, aliquota_iva, vendibile, deperibile, durata_giorni, scorta_minima) VALUES
    (demo_id('fior.a.rosa'),     'fioraio', 'Rosa rossa Freedom',    'stelo', 1.10, 3.50, 10, true, true, 7, 40),
    (demo_id('fior.a.rosabianca'), 'fioraio', 'Rosa bianca Avalanche', 'stelo', 1.20, 3.50, 10, true, true, 7, 30),
    (demo_id('fior.a.tulipano'), 'fioraio', 'Tulipano',              'stelo', 0.70, 2.20, 10, true, true, 5, 30),
    (demo_id('fior.a.peonia'),   'fioraio', 'Peonia',                'stelo', 2.40, 6,    10, true, true, 4, 10),
    (demo_id('fior.a.lilium'),   'fioraio', 'Lilium bianco',         'stelo', 1.80, 4.50, 10, true, true, 8, 15),
    (demo_id('fior.a.eucalipto'), 'fioraio', 'Eucalipto',           'mazzo', 2,    5,    10, true, true, 10, 5),
    (demo_id('fior.a.orchidea'), 'fioraio', 'Orchidea Phalaenopsis', 'pz',    9,    24,   10, true, true, 30, 4),
    (demo_id('fior.a.nastro'),   'fioraio', 'Nastro in raso',        'm',     0.40, NULL, 22, false, false, NULL, 20),
    (demo_id('fior.a.carta'),    'fioraio', 'Carta kraft',           'foglio', 0.30, NULL, 22, false, false, NULL, 30),
    (demo_id('fior.a.vaso'),     'fioraio', 'Vaso in vetro cilindro', 'pz',   4.50, 14,   22, true, false, NULL, 5),
    (demo_id('fior.a.spugna'),   'fioraio', 'Spugna da fiori',       'pz',    0.90, NULL, 22, false, false, NULL, 10);
  INSERT INTO mag_lotti (id, articolo_id, codice_lotto, data_scadenza) VALUES
    (demo_id('fior.l.rosa'),     demo_id('fior.a.rosa'),     'ASTA-' || to_char(oggi - 2, 'DDMM'), oggi + 5),
    (demo_id('fior.l.rosabianca'), demo_id('fior.a.rosabianca'), 'ASTA-' || to_char(oggi - 1, 'DDMM'), oggi + 6),
    (demo_id('fior.l.tulipano'), demo_id('fior.a.tulipano'), 'OL-' || to_char(oggi - 3, 'DDMM'), oggi + 2),
    (demo_id('fior.l.peonia'),   demo_id('fior.a.peonia'),   'PE-' || to_char(oggi - 3, 'DDMM'), oggi + 1),
    (demo_id('fior.l.lilium'),   demo_id('fior.a.lilium'),   'LI-' || to_char(oggi - 1, 'DDMM'), oggi + 7),
    (demo_id('fior.l.eucalipto'), demo_id('fior.a.eucalipto'), 'EU-' || to_char(oggi - 2, 'DDMM'), oggi + 8),
    (demo_id('fior.l.orchidea'), demo_id('fior.a.orchidea'), 'OR-' || to_char(oggi - 10, 'DDMM'), oggi + 20);
  INSERT INTO mag_movimenti (articolo_id, lotto_id, tipo, quantita) VALUES
    (demo_id('fior.a.rosa'),     demo_id('fior.l.rosa'),     'carico', 150),
    (demo_id('fior.a.rosabianca'), demo_id('fior.l.rosabianca'), 'carico', 80),
    (demo_id('fior.a.tulipano'), demo_id('fior.l.tulipano'), 'carico', 60),
    (demo_id('fior.a.peonia'),   demo_id('fior.l.peonia'),   'carico', 25),
    (demo_id('fior.a.lilium'),   demo_id('fior.l.lilium'),   'carico', 40),
    (demo_id('fior.a.eucalipto'), demo_id('fior.l.eucalipto'), 'carico', 12),
    (demo_id('fior.a.orchidea'), demo_id('fior.l.orchidea'), 'carico', 8),
    (demo_id('fior.a.nastro'),   NULL, 'carico', 120),
    (demo_id('fior.a.carta'),    NULL, 'carico', 200),
    (demo_id('fior.a.vaso'),     NULL, 'carico', 14),
    (demo_id('fior.a.spugna'),   NULL, 'carico', 40);

  INSERT INTO distinte_base (id, modulo, nome, tipo, resa, unita_resa, tempo_preparazione_min, prezzo_vendita) VALUES
    (demo_id('fior.c.12rose'),   'fioraio', 'Bouquet 12 rose rosse',      'ricetta', 1, 'pz', 15, 55),
    (demo_id('fior.c.tulipani'), 'fioraio', 'Mazzo di tulipani',          'ricetta', 1, 'pz', 10, 32),
    (demo_id('fior.c.peonie'),   'fioraio', 'Bouquet di peonie ed eucalipto', 'ricetta', 1, 'pz', 20, 68),
    (demo_id('fior.c.cuscino'),  'fioraio', 'Cuscino di lilium e rose bianche', 'ricetta', 1, 'pz', 45, 140),
    (demo_id('fior.c.centrotavola'), 'fioraio', 'Centrotavola bianco', 'ricetta', 1, 'pz', 25, 45);
  INSERT INTO distinte_base_righe (distinta_id, articolo_id, quantita) VALUES
    (demo_id('fior.c.12rose'), demo_id('fior.a.rosa'), 12), (demo_id('fior.c.12rose'), demo_id('fior.a.eucalipto'), 0.5),
    (demo_id('fior.c.12rose'), demo_id('fior.a.nastro'), 1.5), (demo_id('fior.c.12rose'), demo_id('fior.a.carta'), 2),
    (demo_id('fior.c.tulipani'), demo_id('fior.a.tulipano'), 15), (demo_id('fior.c.tulipani'), demo_id('fior.a.carta'), 2),
    (demo_id('fior.c.peonie'), demo_id('fior.a.peonia'), 7), (demo_id('fior.c.peonie'), demo_id('fior.a.eucalipto'), 1),
    (demo_id('fior.c.peonie'), demo_id('fior.a.nastro'), 1.5),
    (demo_id('fior.c.cuscino'), demo_id('fior.a.lilium'), 12), (demo_id('fior.c.cuscino'), demo_id('fior.a.rosabianca'), 20),
    (demo_id('fior.c.cuscino'), demo_id('fior.a.spugna'), 3),
    (demo_id('fior.c.centrotavola'), demo_id('fior.a.rosabianca'), 8), (demo_id('fior.c.centrotavola'), demo_id('fior.a.eucalipto'), 0.5),
    (demo_id('fior.c.centrotavola'), demo_id('fior.a.spugna'), 1);

  INSERT INTO contatti (id, nome, cognome, telefono, email, created_by) VALUES
    (demo_id('c.fior.1'), 'Roberto', 'Agostinelli', '347 102 4455', 'roberto.agostinelli@example.com', U),
    (demo_id('c.fior.2'), 'Marta',   'Pedrini',     '333 610 2288', 'marta.pedrini@example.com', U),
    (demo_id('c.fior.3'), 'Enrico',  'Scotti',      '340 991 2210', NULL, U),
    (demo_id('c.fior.4'), 'Paola',   'Vavassori',   '328 445 1003', 'paola.vavassori@example.com', U),
    (demo_id('c.fior.5'), 'Gianni',  'Ferraroli',   '335 220 7764', NULL, U);

  -- ── Ordini: chi ordina, chi riceve, quando, a che punto è ──────────
  FOR o IN SELECT * FROM (VALUES
      ( 1, 'c.fior.1', 'Roberto Agostinelli', 'Elisa Agostinelli', 'Via Tasso 18', '24121', 'consegna', -1, '11:00', 'fior.c.12rose',   'Buon anniversario, amore mio', 'Roberto', 'anniversario', 'consegnato', -1),
      ( 2, 'c.fior.2', 'Marta Pedrini',       'Nonna Lina',        'Via Borgo Palazzo 70', '24125', 'consegna', 0, '15:00', 'fior.c.peonie',  'Tanti auguri nonna!', 'Marta e Luca', 'compleanno', 'in_consegna', 0),
      ( 3, 'c.fior.3', 'Enrico Scotti',       NULL,                NULL, NULL, 'ritiro', 0,  '18:00', 'fior.c.tulipani', NULL, NULL, NULL, 'pronto', 0),
      ( 4, 'c.fior.4', 'Paola Vavassori',     'Dott.ssa Carrara',  'Via Paleocapa 3', '24122', 'consegna', 1, '10:00', 'fior.c.12rose', 'Grazie di tutto', 'Paola', 'ringraziamento', 'in_preparazione', 0),
      ( 5, 'c.fior.5', 'Gianni Ferraroli',    'Famiglia Ruggeri',  'Via Corridoni 21', '24124', 'consegna', 1, '09:30', 'fior.c.cuscino', 'Con affetto, la famiglia Ferraroli', 'Fam. Ferraroli', 'condoglianze', 'confermato', 0),
      ( 6, NULL,       'Studio Ferri Commercialisti', 'Reception', 'Via XX Settembre 40', '24122', 'consegna', 2, '09:00', 'fior.c.centrotavola', NULL, NULL, NULL, 'confermato', 0),
      ( 7, 'c.fior.2', 'Marta Pedrini',       'Chiara Bonetti',    'Via Moroni 102', '24129', 'consegna', 3, '12:00', 'fior.c.tulipani', 'Benvenuta Sofia!', 'Marta', 'nascita', 'ricevuto', 0),
      ( 8, 'c.fior.1', 'Roberto Agostinelli', NULL,                NULL, NULL, 'banco', -1, NULL, 'fior.c.tulipani', NULL, NULL, NULL, 'consegnato', -1),
      ( 9, 'c.fior.4', 'Paola Vavassori',     'Maestra Silvia',    'Via Pignolo 5', '24121', 'consegna', -2, '11:00', 'fior.c.peonie', 'Grazie per quest''anno', 'I bambini della 3B', 'ringraziamento', 'consegnato', -2),
      (10, 'c.fior.3', 'Enrico Scotti',       NULL,                NULL, NULL, 'ritiro', -3, '17:30', 'fior.c.12rose', NULL, NULL, NULL, 'consegnato', -3),
      (11, NULL,       'Cliente al banco',    NULL,                NULL, NULL, 'banco', -4, NULL, 'fior.c.tulipani', NULL, NULL, NULL, 'consegnato', -4),
      (12, 'c.fior.5', 'Gianni Ferraroli',    'Teresa Ferraroli',  'Via Camozzi 44', '24121', 'consegna', -6, '10:00', 'fior.c.peonie', 'Buon onomastico', 'Gianni', 'onomastico', 'consegnato', -6)
    ) v(n, cont, comm, dest, ind, cap, modal, giorno, ora, comp, msg, firma, occ, stato, fatto)
  LOOP
    k := demo_id('fior.ordine.' || o.n);
    INSERT INTO fior_ordini (id, committente_id, committente_nome, committente_telefono, organizzazione_id, destinatario_nome, indirizzo, cap, citta,
                             modalita, canale, data_richiesta, ora_richiesta, messaggio, firma, occasione, created_by)
    VALUES (k, CASE WHEN o.cont IS NOT NULL THEN demo_id(o.cont) END, o.comm,
            (SELECT telefono FROM contatti WHERE id = demo_id(o.cont)),
            CASE WHEN o.n = 6 THEN (SELECT id FROM organizzazioni WHERE ragione_sociale = 'Studio Ferri Commercialisti' LIMIT 1) END,
            o.dest, o.ind, o.cap, CASE WHEN o.ind IS NOT NULL THEN 'Bergamo' END,
            o.modal, CASE WHEN o.modal = 'banco' THEN 'negozio' WHEN o.n % 3 = 0 THEN 'whatsapp' ELSE 'telefono' END,
            oggi + o.giorno, o.ora::time, o.msg, o.firma, o.occ, U);
    INSERT INTO fior_ordini_righe (ordine_id, tipo, distinta_id, created_by) VALUES (k, 'composizione', demo_id(o.comp), U);
    IF o.n IN (1, 4) THEN
      INSERT INTO fior_ordini_righe (ordine_id, tipo, articolo_id, created_by) VALUES (k, 'articolo', demo_id('fior.a.vaso'), U);
    END IF;
    CONTINUE WHEN o.stato = 'ricevuto';
    UPDATE fior_ordini SET stato = 'confermato' WHERE id = k;
    CONTINUE WHEN o.stato = 'confermato';
    UPDATE fior_produzione SET stato = 'in_corso' WHERE ordine_id = k;
    CONTINUE WHEN o.stato = 'in_preparazione';
    UPDATE fior_produzione SET stato = 'pronta' WHERE ordine_id = k;
    CONTINUE WHEN o.stato = 'pronto';
    IF o.modal = 'consegna' THEN
      UPDATE fior_consegne SET stato = 'in_consegna', autista_id = U, veicolo = 'Doblò FG 221 KP' WHERE ordine_id = k;
      CONTINUE WHEN o.stato = 'in_consegna';
      UPDATE fior_consegne SET stato = 'consegnata', ricevuta_da = o.dest WHERE ordine_id = k;
    ELSE
      UPDATE fior_ordini SET stato = 'consegnato' WHERE id = k;
    END IF;
    -- consegnato e pagato: il conto di cassa si apre, si salda e si chiude
    c := fior_conto_ordine(k);
    INSERT INTO conti_pagamenti (conto_id, modulo, metodo, importo)
    SELECT c, 'fioraio', CASE WHEN o.n % 2 = 0 THEN 'contanti' ELSE 'pos' END::pagamento_metodo, residuo FROM conti_saldi WHERE conto_id = c;
    PERFORM chiudi_conto(c);
  END LOOP;

  -- Gli ordini dei giorni scorsi si riportano alle loro date.
  SET LOCAL session_replication_role = replica;
  UPDATE fior_ordini fo SET data_ordine = v.d - 1, created_at = (v.d - 1 + time '16:00') AT TIME ZONE 'Europe/Rome',
         confermato_at = (v.d - 1 + time '16:10') AT TIME ZONE 'Europe/Rome',
         pronto_at = (v.d + time '09:30') AT TIME ZONE 'Europe/Rome',
         consegnato_at = (v.d + time '11:20') AT TIME ZONE 'Europe/Rome'
    FROM (SELECT demo_id('fior.ordine.' || n) AS id, oggi + g AS d FROM (VALUES (1, -1), (8, -1), (9, -2), (10, -3), (11, -4), (12, -6)) x(n, g)) v
   WHERE fo.id = v.id;
  UPDATE fior_consegne fc SET data = fo.data_richiesta, consegnata_at = fo.consegnato_at
    FROM fior_ordini fo WHERE fo.id = fc.ordine_id AND fo.stato IN ('consegnato', 'chiuso');
  UPDATE conti SET aperto_at = fo.consegnato_at, chiuso_at = fo.consegnato_at
    FROM fior_ordini fo WHERE fo.conto_id = conti.id AND fo.stato IN ('consegnato', 'chiuso');
  UPDATE conti_pagamenti cp SET pagato_at = fo.consegnato_at
    FROM fior_ordini fo WHERE fo.conto_id = cp.conto_id AND fo.stato IN ('consegnato', 'chiuso');
  SET LOCAL session_replication_role = origin;

  -- ── Abbonamento, ricorrenze, cerimonie ─────────────────────────────
  INSERT INTO organizzazioni (id, ragione_sociale, citta, settore, created_by) VALUES
    (demo_id('org.fior.hotel'), 'Albergo San Marco', 'Bergamo', 'Turismo', U);
  INSERT INTO fior_abbonamenti (id, organizzazione_id, piano, tipo, frequenza, prezzo, distinta_id, destinatario_nome, indirizzo, cap, citta, prossima_consegna, pagamento, created_by)
  VALUES (demo_id('fior.abb.hotel'), demo_id('org.fior.hotel'), 'Fiori della hall', 'fiori_hotel', 'settimanale', 60, demo_id('fior.c.centrotavola'),
          'Reception', 'Piazza della Repubblica 6', '24122', 'Bergamo', oggi + 4, 'mensile', U);
  INSERT INTO fior_ricorrenze (contatto_id, tipo, per_chi, giorno, mese) VALUES
    (demo_id('c.fior.1'), 'compleanno', 'la moglie Elisa', extract(day from oggi + 5)::int, extract(month from oggi + 5)::int),
    (demo_id('c.fior.2'), 'festa_mamma', 'la mamma', 10, 5),
    (demo_id('c.fior.4'), 'compleanno', 'la figlia Anna', extract(day from oggi + 12)::int, extract(month from oggi + 12)::int);

  INSERT INTO eventi (id, modulo, titolo, tipo, stato, contatto_id, inizio, fine, luogo, partecipanti_previsti, referente_id) VALUES
    (demo_id('fior.evento.nozze'), 'fioraio', 'Matrimonio Pedrini · Bonomi', 'matrimonio', 'confermato', demo_id('c.fior.2'),
     demo_ora(16, '11:00'), demo_ora(16, '23:00'), 'Basilica di Santa Maria Maggiore e Villa Moroni', 120, U),
    (demo_id('fior.evento.funerale'), 'fioraio', 'Esequie Ruggeri', 'funerale', 'confermato', demo_id('c.fior.5'),
     demo_ora(1, '10:30'), demo_ora(1, '12:00'), 'Chiesa di Sant''Alessandro in Colonna', 80, U);
  INSERT INTO fior_cerimonie (evento_id, tipo, tema, colori, fiori, allestimenti, luogo_cerimonia, consegna_at, montaggio_at) VALUES
    (demo_id('fior.evento.nozze'), 'matrimonio', 'Romantico di campagna', 'bianco, cipria, salvia', 'Peonie, rose da giardino, eucalipto',
     '[{"voce": "Bouquet della sposa", "quantita": 1, "note": "", "fatto": false}, {"voce": "Bottoniere", "quantita": 6, "note": "", "fatto": false}, {"voce": "Arco all''ingresso", "quantita": 1, "note": "", "fatto": false}, {"voce": "Centrotavola", "quantita": 12, "note": "Villa Moroni", "fatto": false}]', 'Santa Maria Maggiore', demo_ora(16, '08:30'), demo_ora(16, '07:30')),
    (demo_id('fior.evento.funerale'), 'funerale', NULL, 'bianco', 'Lilium e rose bianche',
     '[{"voce": "Cuscino", "quantita": 1, "note": "", "fatto": true}, {"voce": "Copribara", "quantita": 1, "note": "", "fatto": false}, {"voce": "Composizioni ai lati dell''altare", "quantita": 2, "note": "", "fatto": false}]', 'Sant''Alessandro in Colonna', demo_ora(1, '09:30'), NULL);
END $fn$;
REVOKE ALL ON FUNCTION public.demo_semina_fioraio(uuid) FROM PUBLIC, anon, authenticated;

-- ═══ GARAGE ═════════════════════════════════════════════════════════
-- Un'autorimessa su due piani interrati con 46 posti: abbonati con il
-- posto riservato, una convenzione aziendale, auto in sosta adesso, una
-- settimana di soste a rotazione incassate, prenotazioni, colonnine.
CREATE OR REPLACE FUNCTION public.demo_semina_garage(U uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $fn$
DECLARE
  G uuid := demo_id('gar.struttura');
  oggi date := (NOW() AT TIME ZONE 'Europe/Rome')::date;
  i int; v jsonb; s uuid; c uuid; giorni int; durata int;
  clienti text[][] := ARRAY[
    ['privato', 'Alberto Gritti',     'alberto.gritti@example.com',   'FG482LM', 'Volkswagen', 'Golf',    'benzina'],
    ['privato', 'Federica Sala',      'federica.sala@example.com',    'GA115TR', 'Fiat',       '500e',    'elettrica'],
    ['privato', 'Carlo Bonfanti',     'carlo.bonfanti@example.com',   'EZ903KD', 'Audi',       'A4 Avant','diesel'],
    ['privato', 'Ilaria Moioli',      'ilaria.moioli@example.com',    'GB220XS', 'Toyota',     'Yaris',   'ibrida'],
    ['privato', 'Sergio Pagnoncelli', 'sergio.pagnoncelli@example.com', 'FT671PP', 'BMW',      'X1',      'diesel'],
    ['privato', 'Monica Assolari',    'monica.assolari@example.com',  'GD047NB', 'Renault',    'Clio',    'benzina'],
    ['privato', 'Luigi Personeni',    'luigi.personeni@example.com',  'FN318CC', 'Volvo',      'XC40',    'ibrida'],
    ['privato', 'Anna Brignoli',      'anna.brignoli@example.com',    'GC774HA', 'Tesla',      'Model 3', 'elettrica'],
    ['azienda', 'Studio Notarile Morelli', 'segreteria@notaiomorelli.example', 'GE110AA', 'Mercedes', 'Classe C', 'diesel'],
    ['azienda', 'Assicurazioni Orobie Srl', 'amministrazione@orobie.example', 'GE882BB', 'Skoda', 'Octavia', 'metano']];
  rotazione text[] := ARRAY['FK201TT','GA992PL','EH445CM','FR830VN','GB118DK','DX772RS','FW404LA','GC309ZE','EY561BH','FM127QS',
                            'GD650AP','FS288MK','EP913GC','GA431NW','FZ076HD','DR540KJ','GB873TU','FH299XB'];
BEGIN
  INSERT INTO gar_strutture (id, nome, indirizzo, comune, tipologia, piani, altezza_max_m, responsabile_id, note, created_by)
  VALUES (G, 'Autorimessa Piazza Matteotti', 'Piazza Matteotti 5', 'Bergamo', 'autorimessa', 2, 2.10, U,
          'Aperta tutti i giorni 0-24, presidio dalle 7 alle 21', U);
  INSERT INTO gar_aree (struttura_id, piano, nome, tipo, ordine) VALUES
    (G, -1, 'Rampa di accesso', 'rampa', 0), (G, -1, 'Corsia A', 'corsia', 1), (G, -2, 'Corsia B', 'corsia', 2),
    (G, -2, 'Area abbonati', 'riservata', 3);
  -- Piano -1: 26 posti a rotazione (4 per moto, 2 per disabili); piano -2: 16 riservati e 4 con colonnina.
  FOR i IN 1..26 LOOP
    INSERT INTO gar_posti (id, struttura_id, codice, piano, zona, numero, tipo, coperto, riservato, fermo)
    VALUES (demo_id('gar.posto.' || i), G, 'A' || lpad(i::text, 2, '0'), -1, 'Corsia A', i,
            CASE WHEN i > 22 THEN 'moto' WHEN i IN (1, 2) THEN 'disabili' ELSE 'auto' END, true, false,
            CASE WHEN i = 17 THEN 'manutenzione' END);
  END LOOP;
  FOR i IN 27..46 LOOP
    INSERT INTO gar_posti (id, struttura_id, codice, piano, zona, numero, tipo, coperto, riservato, canone)
    VALUES (demo_id('gar.posto.' || i), G, 'B' || lpad((i - 26)::text, 2, '0'), -2, 'Corsia B', i,
            CASE WHEN i > 42 THEN 'elettrico' ELSE 'auto' END, true, i <= 42, CASE WHEN i <= 42 THEN 110 END);
  END LOOP;
  INSERT INTO gar_tariffari (id, struttura_id, nome, franchigia_min, frazione_min, prezzo_frazione, notte_dalle, notte_alle, prezzo_notte, festivo_pct, tetto_giornaliero) VALUES
    (demo_id('gar.tar.oraria'), G, 'Rotazione oraria', 10, 30, 1.20, '21:00', '07:00', 6, 0, 22);
  INSERT INTO gar_tariffari (id, struttura_id, nome, tipo_veicolo, franchigia_min, frazione_min, prezzo_frazione, tetto_giornaliero) VALUES
    (demo_id('gar.tar.moto'), G, 'Moto', 'moto', 10, 60, 1, 8);
  INSERT INTO gar_tariffari (id, struttura_id, nome, convenzionato, franchigia_min, frazione_min, prezzo_frazione, tetto_giornaliero) VALUES
    (demo_id('gar.tar.conv'), G, 'Convenzionata', true, 10, 60, 1.20, 12);

  -- ── Clienti, veicoli, contratti ────────────────────────────────────
  FOR i IN 1..array_length(clienti, 1) LOOP
    INSERT INTO gar_clienti (id, tipo, nome, email, telefono, created_by)
    VALUES (demo_id('gar.cliente.' || i), clienti[i][1], clienti[i][2], clienti[i][3],
            '035 ' || lpad((i * 3571 % 1000)::text, 3, '0') || ' ' || lpad((i * 911 % 1000)::text, 3, '0'), U);
    INSERT INTO gar_veicoli (id, cliente_id, targa, marca, modello, alimentazione, created_by)
    VALUES (demo_id('gar.veicolo.' || i), demo_id('gar.cliente.' || i), clienti[i][4], clienti[i][5], clienti[i][6], clienti[i][7], U);
    INSERT INTO gar_contratti (id, struttura_id, cliente_id, veicolo_id, posto_id, tipo, inizio, fine, periodicita, deposito_cauzionale, rinnovo_automatico, created_by)
    VALUES (demo_id('gar.contratto.' || i), G, demo_id('gar.cliente.' || i), demo_id('gar.veicolo.' || i),
            CASE WHEN clienti[i][7] = 'elettrica' THEN demo_id('gar.posto.' || (42 + i % 4 + 1)) ELSE demo_id('gar.posto.' || (26 + i)) END,
            CASE WHEN i % 3 = 0 THEN 'abbonamento_annuale' ELSE 'abbonamento_mensile' END,
            oggi - 30 * i, CASE WHEN i = 4 THEN oggi + 9 ELSE oggi - 30 * i + 365 END,
            CASE WHEN i % 3 = 0 THEN 'annuale' ELSE 'mensile' END, 50, i <> 4, U);
  END LOOP;
  -- Le rate passate sono incassate, tranne una (cliente 6).
  UPDATE gar_rate SET stato = 'pagata', pagata_il = scadenza
   WHERE contratto_id IN (SELECT id FROM gar_contratti WHERE struttura_id = G) AND scadenza < oggi
     AND contratto_id <> demo_id('gar.contratto.6');

  INSERT INTO gar_convenzioni (id, struttura_id, cliente_id, posti_acquistati, tariffario_id, canone_mensile, created_by)
  VALUES (demo_id('gar.conv.orobie'), G, demo_id('gar.cliente.10'), 4, demo_id('gar.tar.conv'), 380, U);
  INSERT INTO gar_autorizzazioni (cliente_id, convenzione_id, tipo, persona, targa, created_by) VALUES
    (demo_id('gar.cliente.10'), demo_id('gar.conv.orobie'), 'dipendente', 'Paolo Cornago', 'GF301RR', U),
    (demo_id('gar.cliente.10'), demo_id('gar.conv.orobie'), 'dipendente', 'Simona Zonca', 'GF778PE', U);

  -- ── Una settimana di soste a rotazione, incassate ──────────────────
  FOR i IN 1..42 LOOP
    giorni := 1 + i % 7;
    durata := 40 + (i * 53) % 420;                       -- da 40 minuti a 8 ore
    v := gar_ingresso(G, rotazione[1 + i % array_length(rotazione, 1)] , NULL, 'targa');
    s := (v->>'sosta_id')::uuid;
    UPDATE gar_soste SET ingresso_at = NOW() - make_interval(mins => durata) WHERE id = s;
    v := gar_uscita(s, 'targa');
    c := (v->>'conto_id')::uuid;
    IF c IS NOT NULL THEN
      INSERT INTO conti_pagamenti (conto_id, modulo, metodo, importo)
      SELECT c, 'garage', CASE WHEN i % 3 = 0 THEN 'contanti' ELSE 'carta' END::pagamento_metodo, residuo FROM conti_saldi WHERE conto_id = c AND residuo > 0;
      PERFORM chiudi_conto(c);
    END IF;
    -- e si riporta tutto al giorno giusto, a un'ora plausibile
    SET LOCAL session_replication_role = replica;
    UPDATE gar_soste SET ingresso_at = demo_ora(-giorni, '08:00'::time + (i * 37 % 600) * interval '1 minute'),
                         uscita_at = demo_ora(-giorni, '08:00'::time + (i * 37 % 600) * interval '1 minute') + make_interval(mins => durata)
     WHERE id = s;
    UPDATE conti SET aperto_at = x.uscita_at, chiuso_at = x.uscita_at FROM gar_soste x WHERE x.id = s AND conti.id = c;
    UPDATE conti_pagamenti SET pagato_at = x.uscita_at FROM gar_soste x WHERE x.id = s AND conti_pagamenti.conto_id = c;
    SET LOCAL session_replication_role = origin;
  END LOOP;

  -- ── Chi è dentro adesso: abbonati e auto a rotazione ───────────────
  FOR i IN 1..8 LOOP
    v := gar_ingresso(G, clienti[i][4], NULL, 'targa');
    UPDATE gar_soste SET ingresso_at = NOW() - make_interval(hours => 1 + i * 2) WHERE id = (v->>'sosta_id')::uuid;
  END LOOP;
  FOR i IN 1..11 LOOP
    v := gar_ingresso(G, rotazione[i], NULL, 'targa');
    UPDATE gar_soste SET ingresso_at = NOW() - make_interval(mins => 25 + i * 41) WHERE id = (v->>'sosta_id')::uuid;
  END LOOP;
  v := gar_ingresso(G, 'GF301RR', NULL, 'targa');   -- dipendente convenzionato

  -- ── Prenotazioni, colonnine, chiavi, un danno da gestire ───────────
  INSERT INTO gar_prenotazioni (struttura_id, cliente_nome, telefono, targa, posto_id, ingresso, uscita, canale, created_by) VALUES
    (G, 'Rinaldi', '347 220 1180', 'GC512DM', demo_id('gar.posto.20'), demo_ora(1, '08:30'), demo_ora(1, '18:30'), 'telefono', U),
    (G, 'Hotel San Marco · ospite', '035 366 111', 'DE77612', demo_id('gar.posto.21'), demo_ora(1, '15:00'), demo_ora(3, '11:00'), 'email', U),
    (G, 'Benedetti', '333 908 4421', 'GA880LK', demo_id('gar.posto.22'), demo_ora(2, '09:00'), demo_ora(2, '13:00'), 'online', U);
  INSERT INTO gar_colonnine (id, struttura_id, codice, posto_id, prese, potenza_kw, connettore, tariffa_kwh, created_by) VALUES
    (demo_id('gar.col.1'), G, 'EV1', demo_id('gar.posto.43'), 2, 22, 'Tipo 2', 0.55, U),
    (demo_id('gar.col.2'), G, 'EV2', demo_id('gar.posto.45'), 2, 22, 'Tipo 2', 0.55, U);
  INSERT INTO gar_chiavi (struttura_id, numero, veicolo_id, cliente_id, armadietto, posizione, created_by) VALUES
    (G, 'K01', demo_id('gar.veicolo.3'), demo_id('gar.cliente.3'), 'Armadio 1', 'Gancio 1', U),
    (G, 'K02', demo_id('gar.veicolo.9'), demo_id('gar.cliente.9'), 'Armadio 1', 'Gancio 2', U);
  INSERT INTO gar_danni (struttura_id, veicolo_id, targa, cliente_id, tipo, descrizione, responsabilita, importo_stimato, operatore_id, created_by)
  VALUES (G, demo_id('gar.veicolo.5'), 'FT671PP', demo_id('gar.cliente.5'), 'contestazione',
          'Il cliente segnala un graffio sulla portiera posteriore destra all''uscita; da verificare con le foto all''ingresso', 'da_accertare', 180, U, U);
END $fn$;
REVOKE ALL ON FUNCTION public.demo_semina_garage(uuid) FROM PUBLIC, anon, authenticated;

-- ═══ AGENZIA IMMOBILIARE ════════════════════════════════════════════
-- Un'agenzia con dieci immobili (vendita e affitto, uno in acquisizione,
-- uno sotto offerta), proprietari, incarichi, annunci, richieste dei
-- clienti con il matching, lead dai portali, visite della settimana e
-- una trattativa con proposta e controproposta.
CREATE OR REPLACE FUNCTION public.demo_semina_immobiliare(U uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $fn$
DECLARE
  A uuid := demo_id('imm.agente.titolare');
  oggi date := (NOW() AT TIME ZONE 'Europe/Rome')::date;
  r record;
  k uuid;
BEGIN
  INSERT INTO imm_impostazioni (agenzia, provvigione_venditore_pct, provvigione_acquirente_pct, created_by)
  VALUES ('Casa Orobica Immobiliare', 3, 3, U);
  INSERT INTO imm_agenti (id, user_id, quota_pct, zone, obiettivo_acquisizioni, obiettivo_chiusure, obiettivo_provvigioni, iscrizione_ruolo, created_by)
  VALUES (A, U, 50, '{Bergamo centro,Città Alta,Colli}', 4, 2, 30000, 'REA BG-210455', U);
  INSERT INTO imm_collaboratori (id, tipo, nome, telefono, email, provvigione_pct, created_by) VALUES
    (demo_id('imm.coll.notaio'), 'notaio', 'Studio Notarile Morelli', '035 240 118', 'segreteria@notaiomorelli.example', NULL, U),
    (demo_id('imm.coll.segnalatore'), 'segnalatore', 'Walter Previtali', '339 551 2087', NULL, 10, U),
    (demo_id('imm.coll.agenzia'), 'agenzia', 'Immobiliare Lago Iseo', '035 980 221', 'info@lagoiseo.example', 50, U);

  -- ── Proprietari e clienti ──────────────────────────────────────────
  INSERT INTO contatti (id, nome, cognome, telefono, email, created_by) VALUES
    (demo_id('c.imm.p1'), 'Giovanni', 'Locatelli', '335 102 7781', 'giovanni.locatelli@example.com', U),
    (demo_id('c.imm.p2'), 'Rosa',     'Locatelli', '335 102 7782', NULL, U),
    (demo_id('c.imm.p3'), 'Franco',   'Bettoni',   '347 330 9012', 'franco.bettoni@example.com', U),
    (demo_id('c.imm.p4'), 'Mirella',  'Capelli',   '340 287 6611', 'mirella.capelli@example.com', U),
    (demo_id('c.imm.p5'), 'Ivo',      'Rondi',     '333 671 2204', NULL, U),
    (demo_id('c.imm.p6'), 'Daniela',  'Zambelli',  '328 990 4410', 'daniela.zambelli@example.com', U),
    (demo_id('c.imm.c1'), 'Stefano',  'Carrara',   '348 115 2290', 'stefano.carrara@example.com', U),
    (demo_id('c.imm.c2'), 'Valeria',  'Mologni',   '331 440 8172', 'valeria.mologni@example.com', U),
    (demo_id('c.imm.c3'), 'Thomas',   'Brivio',    '345 778 0021', 'thomas.brivio@example.com', U),
    (demo_id('c.imm.c4'), 'Giulia',   'Epis',      '320 556 1980', 'giulia.epis@example.com', U),
    (demo_id('c.imm.c5'), 'Omar',     'Benali',    '351 220 6634', 'omar.benali@example.com', U);

  -- ── Immobili ───────────────────────────────────────────────────────
  FOR r IN SELECT * FROM (VALUES
      (1,  'appartamento', 'vendita', 'Trilocale con terrazzo in Città Alta', 'Via Gombito 12', 'Città Alta', 3, 95,  2, 1, 1, true,  'C', 'ristrutturato', 1920, 365000, NULL::numeric, 'p1', 'disponibile'),
      (2,  'appartamento', 'vendita', 'Bilocale luminoso vicino alla stazione', 'Via Bonomelli 20', 'Centro', 4, 62,  1, 1, 0, true,  'D', 'buono', 1972, 168000, NULL, 'p3', 'disponibile'),
      (3,  'villa',        'vendita', 'Villa singola con giardino ai Colli', 'Via Fontana 7', 'Colli', 0, 240, 4, 3, 2, false, 'B', 'ottimo', 1998, 790000, NULL, 'p4', 'disponibile'),
      (4,  'appartamento', 'vendita', 'Quadrilocale in Borgo Palazzo', 'Via Borgo Palazzo 96', 'Borgo Palazzo', 2, 120, 3, 2, 0, true, 'E', 'buono', 1965, 279000, NULL, 'p5', 'sotto_offerta'),
      (5,  'appartamento', 'vendita', 'Trilocale nuovo in classe A', 'Via Moroni 210', 'Longuelo', 1, 88, 2, 2, 1, true, 'A3', 'nuovo', 2025, 312000, NULL, 'p6', 'disponibile'),
      (6,  'ufficio',      'vendita', 'Ufficio di rappresentanza in centro', 'Viale Papa Giovanni XXIII 48', 'Centro', 5, 140, 0, 2, 0, true, 'D', 'ottimo', 1960, 420000, NULL, 'p3', 'disponibile'),
      (7,  'appartamento', 'affitto', 'Bilocale arredato per studenti', 'Via Pignolo 70', 'Pignolo', 2, 55, 1, 1, 0, false, 'E', 'buono', 1930, NULL, 780, 'p4', 'disponibile'),
      (8,  'appartamento', 'affitto', 'Trilocale con box a Redona', 'Via Leopardi 15', 'Redona', 3, 85, 2, 1, 1, true, 'C', 'ristrutturato', 1985, NULL, 950, 'p5', 'disponibile'),
      (9,  'villetta',     'vendita', 'Villetta a schiera con taverna', 'Via dei Caniana 3', 'Valtesse', 0, 160, 3, 2, 1, false, 'C', 'buono', 2004, 455000, NULL, 'p6', 'disponibile'),
      (10, 'appartamento', 'vendita', 'Quadrilocale da ristrutturare', 'Via San Bernardino 55', 'San Bernardino', 1, 110, 3, 1, 0, false, 'G', 'da_ristrutturare', 1958, 189000, NULL, 'p1', 'in_valutazione')
    ) v(n, tip, contr, titolo, ind, zona, piano, mq, camere, bagni, terrazzi, ascens, classe, cons, anno, prezzo, canone, prop, stato)
  LOOP
    k := demo_id('imm.immobile.' || r.n);
    INSERT INTO imm_immobili (id, tipologia, contratto, titolo, indirizzo, comune, provincia, zona, piano, superficie_commerciale, camere, locali, bagni,
                              terrazzi, ascensore, classe_energetica, stato_conservazione, anno_costruzione, prezzo, canone, spese_condominiali,
                              riscaldamento, posto_auto, cantina, agente_id, descrizione, created_by)
    VALUES (k, r.tip, r.contr, r.titolo, r.ind, 'Bergamo', 'BG', r.zona, r.piano, r.mq, r.camere, r.camere + 1, r.bagni, r.terrazzi, r.ascens,
            r.classe, r.cons, r.anno, r.prezzo, r.canone, CASE WHEN r.tip = 'appartamento' THEN 90 + r.n * 10 END,
            CASE WHEN r.n % 2 = 0 THEN 'centralizzato' ELSE 'autonomo' END, r.n IN (3, 5, 8, 9), r.n IN (1, 3, 4, 9), A,
            r.titolo || '. Immobile seguito personalmente dall''agenzia: documentazione completa e visite su appuntamento.', U);
    INSERT INTO imm_proprietari (immobile_id, contatto_id, quota_pct, referente, created_by)
    VALUES (k, demo_id('c.imm.' || r.prop), CASE WHEN r.n = 1 THEN 50 ELSE 100 END, true, U);
    IF r.n = 1 THEN
      INSERT INTO imm_proprietari (immobile_id, contatto_id, quota_pct, referente, created_by) VALUES (k, demo_id('c.imm.p2'), 50, false, U);
    END IF;
    CONTINUE WHEN r.stato = 'in_valutazione';
    INSERT INTO imm_incarichi (immobile_id, tipo, esclusiva, conferito_il, durata_mesi, prezzo_richiesto, prezzo_minimo, provvigione_pct, agente_id, firmato_il, created_by)
    VALUES (k, CASE WHEN r.contr = 'affitto' THEN 'locazione' ELSE 'vendita' END, r.n % 3 <> 0, oggi - 20 - r.n * 9,
            CASE WHEN r.n = 2 THEN 3 ELSE 6 END, COALESCE(r.prezzo, r.canone), CASE WHEN r.prezzo IS NOT NULL THEN round(r.prezzo * 0.94, -3) END,
            CASE WHEN r.contr = 'affitto' THEN NULL ELSE 3 END, A, oggi - 20 - r.n * 9, U);
    UPDATE imm_immobili SET stato = 'disponibile' WHERE id = k;
    INSERT INTO imm_annunci (immobile_id, titolo, descrizione, stato, portali, sito, created_by)
    VALUES (k, r.titolo, r.titolo || ', ' || r.mq || ' m², classe ' || r.classe || '. Contattaci per una visita.', 'pubblicato',
            '{immobiliare,idealista,casa}', true, U);
  END LOOP;
  -- Documenti: raccolti per gli immobili sul mercato; mancano l'APE della villetta,
  -- le certificazioni dell'ufficio e tutto quello dell'immobile in valutazione.
  UPDATE imm_documenti SET stato = 'presente'
   WHERE immobile_id IN (SELECT id FROM imm_immobili WHERE agente_id = A AND stato = 'disponibile')
     AND NOT (immobile_id = demo_id('imm.immobile.9') AND tipo = 'ape')
     AND NOT (immobile_id = demo_id('imm.immobile.6') AND tipo = 'certificazioni_impianti');
  UPDATE imm_documenti SET stato = 'richiesto'
   WHERE immobile_id = demo_id('imm.immobile.10') AND tipo IN ('visura_catastale', 'planimetria_catastale');
  -- Ribasso sul bilocale della stazione dopo due mesi senza proposte.
  UPDATE imm_immobili SET prezzo = 159000 WHERE id = demo_id('imm.immobile.2');

  -- ── Richieste dei clienti ──────────────────────────────────────────
  INSERT INTO imm_richieste (id, contatto_id, tipo, tipo_cliente, tipologie, comuni, zone, budget_max, superficie_min, camere_min, requisiti, finanziamento, tempistica, agente_id, created_by) VALUES
    (demo_id('imm.ric.1'), demo_id('c.imm.c1'), 'acquisto', 'famiglia',   '{appartamento}', '{bergamo}', '{Città Alta,Centro,Longuelo}', 380000, 85, 2, '{ascensore,terrazzo}', true, 'entro 6 mesi', A, U),
    (demo_id('imm.ric.2'), demo_id('c.imm.c2'), 'acquisto', 'privato',    '{appartamento}', '{bergamo}', '{Centro}', 175000, 50, 1, '{ascensore}', true, 'subito', A, U),
    (demo_id('imm.ric.3'), demo_id('c.imm.c3'), 'acquisto', 'famiglia',   '{villa,villetta}', '{bergamo}', '{Colli,Valtesse}', 500000, 140, 3, '{giardino}', false, 'entro un anno', A, U),
    (demo_id('imm.ric.4'), demo_id('c.imm.c4'), 'affitto',  'studente',   '{appartamento}', '{bergamo}', '{Pignolo,Città Alta,Centro}', 800, 40, 1, '{}', false, 'da novembre', A, U),
    (demo_id('imm.ric.5'), demo_id('c.imm.c5'), 'acquisto', 'investitore', '{appartamento}', '{bergamo}', '{}', 200000, 60, 1, '{}', false, 'subito', A, U);

  -- ── Lead dai portali e dal sito ─────────────────────────────────────
  INSERT INTO imm_lead (tipo, nome, telefono, email, origine, fonte, immobile_id, messaggio, agente_id, stato, priorita, ricevuto_at, motivo_perdita, created_by) VALUES
    ('acquirente', 'Paolo Gherardi', '347 220 9981', 'paolo.gherardi@example.com', 'portale', 'Portale immobiliare', demo_id('imm.immobile.1'),
     'Buongiorno, il trilocale in Città Alta è ancora disponibile? Vorrei vederlo sabato.', A, 'nuovo', 'alta', NOW() - interval '3 hours',NULL, U),
    ('acquirente', 'Laura Pesenti', NULL, 'laura.pesenti@example.com', 'sito', 'Sito dell''agenzia', demo_id('imm.immobile.5'),
     'Mi interessa la classe A: si può avere la planimetria?', A, 'contattato', 'media', NOW() - interval '1 day',NULL, U),
    ('proprietario', 'Ernesto Sala', '035 611 220', NULL, 'insegna', NULL, NULL,
     'Ho un appartamento in via Tasso da vendere, vorrei una valutazione.', A, 'appuntamento', 'alta', NOW() - interval '2 days',NULL, U),
    ('conduttore', 'Marco Tiraboschi', '333 780 4415', NULL, 'portale', 'Portale immobiliare', demo_id('imm.immobile.8'),
     'Disponibile da subito? Lavoro a tempo indeterminato.', A, 'qualificato', 'media', NOW() - interval '4 days',NULL, U),
    ('acquirente', 'Sara Pellicioli', '348 902 1176', NULL, 'social', 'Pagina dell''agenzia', NULL,
     'Cerco un bilocale in centro sotto i 170 mila.', A, 'perso', 'bassa', NOW() - interval '12 days', 'Ha comprato con un privato', U);

  -- ── Visite: settimana scorsa svolte, prossime confermate ───────────
  INSERT INTO imm_visite (immobile_id, contatto_id, richiesta_id, agente_id, inizio, durata_min, stato, esito, gradimento, feedback, created_by) VALUES
    (demo_id('imm.immobile.4'), demo_id('c.imm.c1'), demo_id('imm.ric.1'), A, demo_ora(-9, '17:30'), 45, 'svolta', 'interessato', 4, 'Piace la zona, il terzo bagno sarebbe un plus', U),
    (demo_id('imm.immobile.4'), demo_id('c.imm.c1'), demo_id('imm.ric.1'), A, demo_ora(-5, '18:00'), 45, 'svolta', 'vuole_offrire', 5, 'Seconda visita con i genitori: vogliono fare una proposta', U),
    (demo_id('imm.immobile.3'), demo_id('c.imm.c3'), demo_id('imm.ric.3'), A, demo_ora(-3, '10:00'), 60, 'svolta', 'molto_interessato', 5, 'Chiedono il computo dei lavori per la piscina', U),
    (demo_id('imm.immobile.2'), demo_id('c.imm.c2'), demo_id('imm.ric.2'), A, demo_ora(-2, '12:30'), 30, 'svolta', 'non_interessato', 2, 'Troppo rumoroso sul lato strada', U),
    (demo_id('imm.immobile.1'), demo_id('c.imm.c1'), demo_id('imm.ric.1'), A, demo_ora(0, '18:00'), 45, 'confermata', NULL, NULL, NULL, U),
    (demo_id('imm.immobile.5'), demo_id('c.imm.c5'), demo_id('imm.ric.5'), A, demo_ora(1, '11:00'), 45, 'confermata', NULL, NULL, NULL, U),
    (demo_id('imm.immobile.7'), demo_id('c.imm.c4'), demo_id('imm.ric.4'), A, demo_ora(1, '17:30'), 30, 'confermata', NULL, NULL, NULL, U),
    (demo_id('imm.immobile.9'), demo_id('c.imm.c3'), demo_id('imm.ric.3'), A, demo_ora(2, '10:30'), 60, 'proposta', NULL, NULL, NULL, U);

  -- ── Trattativa sul quadrilocale: proposta, controproposta in attesa ──
  INSERT INTO imm_proposte (id, immobile_id, contatto_id, prezzo_richiesto, prezzo_offerto, caparra, mutuo, importo_mutuo, scadenza, agente_id, condizioni_sospensive, created_by)
  VALUES (demo_id('imm.proposta.1'), demo_id('imm.immobile.4'), demo_id('c.imm.c1'), 279000, 262000, 15000, true, 180000, oggi + 4, A,
          'Subordinata alla concessione del mutuo', U);
  INSERT INTO imm_proposte (id, immobile_id, contatto_id, padre_id, prezzo_offerto, scadenza, agente_id, created_by)
  VALUES (demo_id('imm.proposta.2'), demo_id('imm.immobile.4'), demo_id('c.imm.c1'), demo_id('imm.proposta.1'), 272000, oggi + 3, A, U);

  -- Le visite e le proposte di ieri e prima non sono nate stanotte.
  SET LOCAL session_replication_role = replica;
  UPDATE imm_immobili SET created_at = (oggi - 25 - (abs(hashtext(id::text)) % 60))::timestamp AT TIME ZONE 'Europe/Rome' WHERE agente_id = A;
  UPDATE imm_prezzi SET created_at = (oggi - 70)::timestamp AT TIME ZONE 'Europe/Rome'
   WHERE immobile_id = demo_id('imm.immobile.2') AND prezzo = 168000;
  SET LOCAL session_replication_role = origin;
END $fn$;
REVOKE ALL ON FUNCTION public.demo_semina_immobiliare(uuid) FROM PUBLIC, anon, authenticated;

-- ═══ REGIA: pulizia e semina dei moduli accesi ══════════════════════
-- Semina solo i moduli con la licenza attiva: un modulo spento resta vuoto
-- (le sue funzioni rifiutano di lavorare senza licenza). Accendere un modulo
-- in demo = licenza + VITE_MODULES + questa funzione (o la notte successiva).
CREATE OR REPLACE FUNCTION public.demo_semina_moduli_nuovi(p_utente uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $fn$
DECLARE
  U uuid := COALESCE(p_utente,
                     (SELECT id FROM auth.users WHERE email = 'visita@pmiflow.eu'),
                     (SELECT id FROM user_profiles WHERE ruolo = 'admin' AND attivo ORDER BY created_at LIMIT 1));
  fatti text[] := '{}';
BEGIN
  IF U IS NULL THEN RAISE EXCEPTION 'nessun utente a cui intestare i dati dimostrativi'; END IF;
  PERFORM demo_pulisci_moduli_nuovi();
  IF modulo_attivo('ristorante') OR modulo_attivo('bar') THEN PERFORM demo_semina_fb(U);          fatti := fatti || 'ristorante e bar'::text; END IF;
  IF modulo_attivo('hotel')       THEN PERFORM demo_semina_hotel(U);       fatti := fatti || 'hotel'::text;       END IF;
  IF modulo_attivo('palestra')    THEN PERFORM demo_semina_palestra(U);    fatti := fatti || 'palestra'::text;    END IF;
  IF modulo_attivo('fioraio')     THEN PERFORM demo_semina_fioraio(U);     fatti := fatti || 'fioraio'::text;     END IF;
  IF modulo_attivo('garage')      THEN PERFORM demo_semina_garage(U);      fatti := fatti || 'garage'::text;      END IF;
  IF modulo_attivo('immobiliare') THEN PERFORM demo_semina_immobiliare(U); fatti := fatti || 'immobiliare'::text; END IF;
  RETURN CASE WHEN cardinality(fatti) = 0 THEN 'nessun modulo nuovo acceso' ELSE 'seminati: ' || array_to_string(fatti, ', ') END;
END $fn$;
REVOKE ALL ON FUNCTION public.demo_semina_moduli_nuovi(uuid) FROM PUBLIC, anon, authenticated;
