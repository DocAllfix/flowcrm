-- ═══════════════════════════════════════════════════════════════════
-- MODULI 2 · FONDAMENTA F0.7 + F0.8
--   F0.7 Registri di controllo: HACCP (temperature, ricevimento merci,
--        sanificazione, infestanti, olio di frittura), pulizie della
--        palestra, verifiche periodiche. Esito calcolato dalle soglie,
--        registrazioni che non si cancellano e non si ritoccano (si aggiunge
--        solo l'azione correttiva), non conformità in notifica.
--        Segnalazioni di sicurezza (incidenti, infortuni, emergenze) con
--        avviso immediato e promemoria per la denuncia INAIL.
--   F0.8 Eventi: banqueting, cerimonie, corsi, tornei, eventi aziendali.
--        La parte operativa la vede tutto il modulo; preventivo, costi e
--        margini solo admin e manager (come le offerte economiche delle Gare).
--        Il personale dell'evento entra nei turni: niente doppie presenze.
-- ═══════════════════════════════════════════════════════════════════

-- ═══ F0.7 REGISTRI DI CONTROLLO ═════════════════════════════════════
CREATE TYPE controllo_tipo AS ENUM (
  'temperatura', 'ricevimento', 'sanificazione', 'pulizia', 'infestanti', 'olio_frittura', 'verifica', 'altro'
);
CREATE TYPE controllo_esito AS ENUM ('conforme', 'non_conforme');

-- Il punto di controllo: cosa, dove, ogni quanto, con quali soglie.
CREATE TABLE controlli_punti (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo          TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  nome            TEXT NOT NULL,              -- «Cella carni», «Spogliatoio donne»
  tipo            controllo_tipo NOT NULL,
  ubicazione      TEXT,
  asset_id        UUID REFERENCES asset(id) ON DELETE SET NULL,
  ogni_ore        INT CHECK (ogni_ore > 0),   -- 24 = ogni giorno; NULL = al bisogno
  istruzioni      TEXT,
  unita           TEXT,                       -- °C, %, ppm…
  soglia_min      NUMERIC(10,2),
  soglia_max      NUMERIC(10,2),
  checklist       JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(checklist) = 'array'),  -- ["Pavimenti","Docce"]
  responsabile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  attivo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES user_profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES user_profiles(id),
  CHECK (soglia_min IS NULL OR soglia_max IS NULL OR soglia_max >= soglia_min)
);
CREATE INDEX idx_controlli_punti ON controlli_punti (modulo, attivo);

CREATE TABLE controlli_registrazioni (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  punto_id               UUID NOT NULL REFERENCES controlli_punti(id) ON DELETE RESTRICT,
  modulo                 TEXT NOT NULL,
  eseguito_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valore                 NUMERIC(10,2),
  checklist              JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {"Pavimenti": true, "Docce": false}
  esito                  controllo_esito,
  lotto_id               UUID REFERENCES mag_lotti(id) ON DELETE SET NULL,  -- ricevimento merci
  note                   TEXT,
  azione_correttiva      TEXT,
  azione_registrata_at   TIMESTAMPTZ,
  azione_verificata_at   TIMESTAMPTZ,
  azione_verificata_da   UUID REFERENCES user_profiles(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_controlli_registrazioni ON controlli_registrazioni (punto_id, eseguito_at DESC);
CREATE INDEX idx_controlli_non_conformi ON controlli_registrazioni (modulo, eseguito_at DESC)
  WHERE esito = 'non_conforme' AND azione_verificata_at IS NULL;

-- Esito dalle soglie e dalla checklist; il valore è obbligatorio dove ci
-- sono soglie, e ogni voce della checklist va spuntata o segnata.
CREATE OR REPLACE FUNCTION controllo_registrazione_esito()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  p controlli_punti%ROWTYPE;
  v_voce TEXT;
  v_ko BOOLEAN := false;
BEGIN
  SELECT * INTO p FROM controlli_punti WHERE id = NEW.punto_id;
  NEW.modulo := p.modulo;
  IF p.soglia_min IS NOT NULL OR p.soglia_max IS NOT NULL THEN
    IF NEW.valore IS NULL THEN
      RAISE EXCEPTION 'Per «%» serve il valore misurato', p.nome USING ERRCODE = 'check_violation';
    END IF;
    v_ko := (p.soglia_min IS NOT NULL AND NEW.valore < p.soglia_min)
         OR (p.soglia_max IS NOT NULL AND NEW.valore > p.soglia_max);
  END IF;
  FOR v_voce IN SELECT jsonb_array_elements_text(p.checklist) LOOP
    IF NOT (NEW.checklist ? v_voce) OR jsonb_typeof(NEW.checklist -> v_voce) <> 'boolean' THEN
      RAISE EXCEPTION 'Voce della checklist senza risposta: %', v_voce USING ERRCODE = 'check_violation';
    END IF;
    v_ko := v_ko OR NOT (NEW.checklist ->> v_voce)::boolean;
  END LOOP;
  -- Con soglie o checklist l'esito lo decide il sistema; senza, chi controlla.
  IF p.soglia_min IS NOT NULL OR p.soglia_max IS NOT NULL OR jsonb_array_length(p.checklist) > 0 THEN
    NEW.esito := CASE WHEN v_ko THEN 'non_conforme' ELSE 'conforme' END;
  ELSE
    NEW.esito := COALESCE(NEW.esito, 'conforme');
  END IF;
  IF NEW.azione_correttiva IS NOT NULL THEN NEW.azione_registrata_at := NOW(); END IF;
  NEW.azione_verificata_at := NULL;
  NEW.azione_verificata_da := NULL;
  RETURN NEW;
END;
$$;
CREATE TRIGGER controlli_registrazioni_esito BEFORE INSERT ON controlli_registrazioni
  FOR EACH ROW EXECUTE FUNCTION controllo_registrazione_esito();

-- La registrazione non si ritocca: dopo l'inserimento si aggiunge soltanto
-- l'azione correttiva (una volta) e la sua verifica (admin o manager).
CREATE OR REPLACE FUNCTION controllo_registrazione_immutabile()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['azione_correttiva','azione_registrata_at','azione_verificata_at','azione_verificata_da'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['azione_correttiva','azione_registrata_at','azione_verificata_at','azione_verificata_da']) THEN
    RAISE EXCEPTION 'Una registrazione di controllo non si modifica: aggiungi l''azione correttiva'
      USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.azione_correttiva IS NOT NULL AND NEW.azione_correttiva IS DISTINCT FROM OLD.azione_correttiva THEN
    RAISE EXCEPTION 'L''azione correttiva è già registrata' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.azione_correttiva IS DISTINCT FROM OLD.azione_correttiva THEN
    NEW.azione_registrata_at := NOW();
  ELSE
    NEW.azione_registrata_at := OLD.azione_registrata_at;
  END IF;
  IF NEW.azione_verificata_at IS DISTINCT FROM OLD.azione_verificata_at THEN
    IF OLD.azione_verificata_at IS NOT NULL THEN
      RAISE EXCEPTION 'Azione correttiva già verificata' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.azione_correttiva IS NULL THEN
      RAISE EXCEPTION 'Prima l''azione correttiva, poi la verifica' USING ERRCODE = 'check_violation';
    END IF;
    IF auth.uid() IS NOT NULL AND NOT puo_amministrazione() THEN
      RAISE EXCEPTION 'La verifica spetta ad admin o manager' USING ERRCODE = 'insufficient_privilege';
    END IF;
    NEW.azione_verificata_at := NOW();
    NEW.azione_verificata_da := auth.uid();
  ELSE
    NEW.azione_verificata_da := OLD.azione_verificata_da;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER controlli_registrazioni_immutabile BEFORE UPDATE ON controlli_registrazioni
  FOR EACH ROW EXECUTE FUNCTION controllo_registrazione_immutabile();

-- Non conformità: subito al responsabile del punto, o ad admin e manager.
CREATE OR REPLACE FUNCTION controllo_non_conforme_avvisa()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  p controlli_punti%ROWTYPE;
  dest UUID;
BEGIN
  IF NEW.esito <> 'non_conforme' THEN RETURN NEW; END IF;
  SELECT * INTO p FROM controlli_punti WHERE id = NEW.punto_id;
  FOR dest IN
    SELECT id FROM user_profiles
     WHERE attivo AND (id = p.responsabile_id OR (p.responsabile_id IS NULL AND ruolo IN ('admin', 'manager')))
  LOOP
    PERFORM crea_notifica(dest, 'critical', 'Controllo non conforme: ' || p.nome,
      COALESCE('Valore ' || NEW.valore || COALESCE(' ' || p.unita, '') || '. ', '') || COALESCE(NEW.note, 'Serve un''azione correttiva.'),
      '/' || NEW.modulo || '/registri');
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER controlli_registrazioni_avvisa AFTER INSERT ON controlli_registrazioni
  FOR EACH ROW EXECUTE FUNCTION controllo_non_conforme_avvisa();

-- Stato dei punti: ultimo controllo, prossimo atteso, ritardo.
CREATE VIEW controlli_stato WITH (security_invoker = true) AS
SELECT p.id AS punto_id, p.modulo, p.nome, p.tipo, p.ubicazione, p.ogni_ore, p.responsabile_id,
       r.eseguito_at AS ultimo_controllo, r.esito AS ultimo_esito,
       CASE WHEN p.ogni_ore IS NOT NULL
            THEN COALESCE(r.eseguito_at, p.created_at) + make_interval(hours => p.ogni_ore) END AS prossimo_atteso,
       (p.ogni_ore IS NOT NULL
        AND COALESCE(r.eseguito_at, p.created_at) + make_interval(hours => p.ogni_ore) < NOW()) AS in_ritardo,
       (SELECT count(*)::int FROM controlli_registrazioni x
         WHERE x.punto_id = p.id AND x.esito = 'non_conforme' AND x.azione_verificata_at IS NULL) AS non_conformita_aperte
  FROM controlli_punti p
  LEFT JOIN LATERAL (SELECT eseguito_at, esito FROM controlli_registrazioni
                      WHERE punto_id = p.id ORDER BY eseguito_at DESC LIMIT 1) r ON true
 WHERE p.attivo;

-- ── Segnalazioni di sicurezza ────────────────────────────────────────
CREATE TYPE segnalazione_tipo AS ENUM ('incidente', 'infortunio', 'quasi_incidente', 'emergenza', 'pericolo', 'danno');
CREATE TYPE segnalazione_gravita AS ENUM ('bassa', 'media', 'alta', 'critica');
CREATE TYPE segnalazione_stato AS ENUM ('aperta', 'in_gestione', 'chiusa');

CREATE TABLE segnalazioni_sicurezza (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo              TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  codice              TEXT UNIQUE,            -- SIC-AAAA-NNNN
  tipo                segnalazione_tipo NOT NULL,
  gravita             segnalazione_gravita NOT NULL DEFAULT 'media',
  avvenuta_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  luogo               TEXT,
  descrizione         TEXT NOT NULL,
  persone_coinvolte   TEXT,
  contatto_id         UUID REFERENCES contatti(id) ON DELETE SET NULL,     -- cliente o ospite coinvolto
  dipendente_id       UUID REFERENCES dipendenti(id) ON DELETE SET NULL,   -- dipendente infortunato
  asset_id            UUID REFERENCES asset(id) ON DELETE SET NULL,
  primo_soccorso      BOOLEAN NOT NULL DEFAULT false,
  soccorso_esterno    TEXT,                   -- 118, vigili del fuoco, forze dell'ordine
  azioni_immediate    TEXT,
  azioni_correttive   TEXT,
  stato               segnalazione_stato NOT NULL DEFAULT 'aperta',
  chiusa_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES user_profiles(id),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by          UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_segnalazioni ON segnalazioni_sicurezza (modulo, avvenuta_at DESC);

CREATE OR REPLACE FUNCTION segnalazione_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.codice IS NULL THEN NEW.codice := genera_codice('SIC'); END IF;
  IF NEW.stato = 'chiusa' AND (TG_OP = 'INSERT' OR OLD.stato <> 'chiusa') THEN
    NEW.chiusa_at := NOW();
  ELSIF NEW.stato <> 'chiusa' THEN
    NEW.chiusa_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER segnalazioni_prepara BEFORE INSERT OR UPDATE OF stato ON segnalazioni_sicurezza
  FOR EACH ROW EXECUTE FUNCTION segnalazione_prepara();

-- Infortuni, emergenze e gravità alta: avviso immediato. Infortunio:
-- promemoria riservato per l'eventuale denuncia INAIL.
CREATE OR REPLACE FUNCTION segnalazione_avvisa()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  dest UUID;
BEGIN
  IF NEW.tipo IN ('infortunio', 'emergenza') OR NEW.gravita IN ('alta', 'critica') THEN
    FOR dest IN SELECT id FROM user_profiles WHERE ruolo IN ('admin', 'manager') AND attivo LOOP
      PERFORM crea_notifica(dest, 'critical',
        initcap(replace(NEW.tipo::text, '_', ' ')) || ' (' || NEW.gravita || ')',
        left(NEW.descrizione, 200), '/' || NEW.modulo || '/sicurezza');
    END LOOP;
  END IF;
  IF NEW.tipo = 'infortunio' THEN
    INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, solo_manager, created_by)
    VALUES (NEW.modulo, 'segnalazioni_sicurezza', NEW.id, 'Denuncia INAIL',
            'Verifica l''obbligo di denuncia (prognosi oltre 3 giorni: entro 2 giorni dal certificato medico) · ' || NEW.codice,
            (NEW.avvenuta_at AT TIME ZONE 'Europe/Rome')::date + 2, '/' || NEW.modulo || '/sicurezza', true, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER segnalazioni_avvisa AFTER INSERT ON segnalazioni_sicurezza
  FOR EACH ROW EXECUTE FUNCTION segnalazione_avvisa();

-- ═══ F0.8 EVENTI ════════════════════════════════════════════════════
CREATE TYPE evento_stato AS ENUM ('richiesta', 'preventivo', 'confermato', 'in_corso', 'concluso', 'annullato');
CREATE TYPE evento_voce_categoria AS ENUM (
  'menu', 'bevande', 'allestimento', 'personale', 'fiori', 'musica', 'noleggio', 'location', 'trasporto', 'altro'
);

CREATE TABLE eventi (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo                  TEXT NOT NULL CHECK (modulo = ANY (moduli_fondamenta())),
  codice                  TEXT UNIQUE,          -- EVT-AAAA-NNNN
  titolo                  TEXT NOT NULL,
  tipo                    TEXT,                 -- matrimonio, aziendale, compleanno, corso, torneo, funerale…
  stato                   evento_stato NOT NULL DEFAULT 'richiesta',
  contatto_id             UUID REFERENCES contatti(id) ON DELETE SET NULL,
  organizzazione_id       UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  deal_id                 UUID REFERENCES deals(id) ON DELETE SET NULL,   -- trattativa nella pipeline del nucleo
  inizio                  TIMESTAMPTZ NOT NULL,
  fine                    TIMESTAMPTZ NOT NULL,
  luogo                   TEXT,
  sala_tipo               TEXT,                 -- risorsa del modulo: fb_sale, hotel_sale_meeting, pal_sale…
  sala_id                 UUID,
  partecipanti_previsti   INT CHECK (partecipanti_previsti >= 0),
  partecipanti_confermati INT CHECK (partecipanti_confermati >= 0),
  programma               TEXT,                 -- scaletta, menu, allestimento: ciò che serve a chi lavora
  referente_id            UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  conto_id                UUID REFERENCES conti(id) ON DELETE SET NULL,
  attributi               JSONB NOT NULL DEFAULT '{}'::jsonb,
  note                    TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by              UUID REFERENCES user_profiles(id),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by              UUID REFERENCES user_profiles(id),
  CHECK (fine > inizio)
);
CREATE INDEX idx_eventi_periodo ON eventi (modulo, inizio);
ALTER TABLE eventi ADD COLUMN ricerca tsvector GENERATED ALWAYS AS (
  to_tsvector('simple', coalesce(codice,'') || ' ' || coalesce(titolo,'') || ' ' || coalesce(tipo,'') || ' ' || coalesce(luogo,''))) STORED;
CREATE INDEX idx_eventi_ricerca ON eventi USING GIN (ricerca);

CREATE OR REPLACE FUNCTION evento_set_codice()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.codice := genera_codice('EVT');
  RETURN NEW;
END;
$$;
CREATE TRIGGER eventi_set_codice BEFORE INSERT ON eventi
  FOR EACH ROW WHEN (NEW.codice IS NULL) EXECUTE FUNCTION evento_set_codice();

-- Preventivo e condizioni economiche: solo admin e manager.
CREATE TABLE eventi_preventivi (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id          UUID NOT NULL UNIQUE REFERENCES eventi(id) ON DELETE CASCADE,
  modulo             TEXT NOT NULL,
  budget_cliente     NUMERIC(12,2) CHECK (budget_cliente >= 0),
  prezzo_persona     NUMERIC(12,2) CHECK (prezzo_persona >= 0),
  prezzo_forfait     NUMERIC(12,2) CHECK (prezzo_forfait >= 0),
  sconto             NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sconto >= 0),
  acconto            NUMERIC(12,2) CHECK (acconto >= 0),
  acconto_scadenza   DATE,
  acconto_pagato_at  DATE,
  condizioni         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id)
);

-- Voci di costo e ricavo: solo admin e manager.
CREATE TABLE eventi_voci (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id       UUID NOT NULL REFERENCES eventi(id) ON DELETE CASCADE,
  modulo          TEXT NOT NULL,
  categoria       evento_voce_categoria NOT NULL DEFAULT 'altro',
  descrizione     TEXT NOT NULL,
  fornitore_id    UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  distinta_id     UUID REFERENCES distinte_base(id) ON DELETE SET NULL,   -- piatto o composizione
  quantita        NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantita > 0),
  costo_unitario  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
  prezzo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (prezzo_unitario >= 0),
  costo           NUMERIC(12,2) GENERATED ALWAYS AS (ROUND(quantita * costo_unitario, 2)) STORED,
  ricavo          NUMERIC(12,2) GENERATED ALWAYS AS (ROUND(quantita * prezzo_unitario, 2)) STORED,
  confermata      BOOLEAN NOT NULL DEFAULT false,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES user_profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_eventi_voci ON eventi_voci (evento_id);

-- Personale dell'evento: ogni presenza è anche un turno (F0.5), così il
-- vincolo dei turni impedisce di mettere una persona in due posti.
CREATE TABLE eventi_personale (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id     UUID NOT NULL REFERENCES eventi(id) ON DELETE CASCADE,
  modulo        TEXT NOT NULL,
  dipendente_id UUID NOT NULL REFERENCES dipendenti(id) ON DELETE CASCADE,
  ruolo         TEXT,                      -- cameriere, chef, istruttore, fioraio…
  inizio        TIMESTAMPTZ NOT NULL,
  fine          TIMESTAMPTZ NOT NULL,
  turno_id      UUID REFERENCES turni(id) ON DELETE SET NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id),
  CHECK (fine > inizio),
  UNIQUE (evento_id, dipendente_id)
);

CREATE TABLE eventi_partecipanti (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id            UUID NOT NULL REFERENCES eventi(id) ON DELETE CASCADE,
  modulo               TEXT NOT NULL,
  nome                 TEXT NOT NULL,
  contatto_id          UUID REFERENCES contatti(id) ON DELETE SET NULL,
  gruppo               TEXT,               -- tavolo, squadra, classe
  allergeni            TEXT[] NOT NULL DEFAULT '{}' CHECK (allergeni <@ allergeni_ue()),
  esigenze_alimentari  TEXT,               -- vegetariano, vegano, senza glutine…
  confermato           BOOLEAN NOT NULL DEFAULT false,
  note                 TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID REFERENCES user_profiles(id),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by           UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_eventi_partecipanti ON eventi_partecipanti (evento_id);

CREATE OR REPLACE FUNCTION evento_figlio_modulo()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  SELECT modulo INTO NEW.modulo FROM eventi WHERE id = NEW.evento_id;
  IF NEW.modulo IS NULL THEN RAISE EXCEPTION 'Evento inesistente'; END IF;
  RETURN NEW;
END;
$$;
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['eventi_preventivi','eventi_voci','eventi_personale','eventi_partecipanti'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_modulo BEFORE INSERT OR UPDATE OF evento_id ON %1$s
                    FOR EACH ROW EXECUTE FUNCTION evento_figlio_modulo()', t);
  END LOOP;
END $$;

-- Acconto in scadenza: nello scadenzario, riservato.
CREATE OR REPLACE FUNCTION evento_preventivo_sync_scadenza()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  e eventi%ROWTYPE;
BEGIN
  DELETE FROM scadenze_moduli WHERE entita = 'eventi_preventivi' AND entita_id = NEW.evento_id AND stato = 'aperta';
  SELECT * INTO e FROM eventi WHERE id = NEW.evento_id;
  IF NEW.acconto_scadenza IS NOT NULL AND NEW.acconto_pagato_at IS NULL AND e.stato NOT IN ('annullato', 'concluso') THEN
    INSERT INTO scadenze_moduli (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, solo_manager, created_by)
    VALUES (NEW.modulo, 'eventi_preventivi', NEW.evento_id, 'Acconto evento',
            e.titolo || ' · ' || e.codice || COALESCE(' · € ' || NEW.acconto, ''), NEW.acconto_scadenza,
            '/' || NEW.modulo || '/eventi/' || NEW.evento_id, true, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER eventi_preventivi_sync_scadenza AFTER INSERT OR UPDATE OF acconto_scadenza, acconto_pagato_at ON eventi_preventivi
  FOR EACH ROW EXECUTE FUNCTION evento_preventivo_sync_scadenza();

-- Presenza → turno; presenza tolta o evento annullato → turno annullato.
CREATE OR REPLACE FUNCTION evento_personale_turno()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_titolo TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE turni SET stato = 'annullato' WHERE id = OLD.turno_id AND stato IN ('pianificato', 'confermato');
    RETURN OLD;
  END IF;
  SELECT titolo INTO v_titolo FROM eventi WHERE id = NEW.evento_id;
  IF NEW.turno_id IS NULL THEN
    INSERT INTO turni (modulo, dipendente_id, reparto, mansione, inizio, fine, note, created_by)
    VALUES (NEW.modulo, NEW.dipendente_id, 'eventi', NEW.ruolo, NEW.inizio, NEW.fine, 'Evento: ' || v_titolo, NEW.created_by)
    RETURNING id INTO NEW.turno_id;
  ELSIF TG_OP = 'UPDATE' AND (NEW.inizio, NEW.fine, NEW.dipendente_id) IS DISTINCT FROM (OLD.inizio, OLD.fine, OLD.dipendente_id) THEN
    UPDATE turni SET inizio = NEW.inizio, fine = NEW.fine, dipendente_id = NEW.dipendente_id WHERE id = NEW.turno_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER eventi_personale_turno BEFORE INSERT OR UPDATE OR DELETE ON eventi_personale
  FOR EACH ROW EXECUTE FUNCTION evento_personale_turno();

CREATE OR REPLACE FUNCTION evento_annullato()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.stato = 'annullato' AND OLD.stato <> 'annullato' THEN
    UPDATE turni SET stato = 'annullato'
     WHERE id IN (SELECT turno_id FROM eventi_personale WHERE evento_id = NEW.id)
       AND stato IN ('pianificato', 'confermato');
    DELETE FROM scadenze_moduli WHERE entita = 'eventi_preventivi' AND entita_id = NEW.id AND stato = 'aperta';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER eventi_annullato AFTER UPDATE OF stato ON eventi
  FOR EACH ROW EXECUTE FUNCTION evento_annullato();

-- Margine dell'evento (RLS dei preventivi e delle voci: solo admin e
-- manager vedono righe).
CREATE VIEW eventi_margini WITH (security_invoker = true) AS
SELECT p.evento_id, p.modulo,
       COALESCE(p.prezzo_forfait,
                p.prezzo_persona * COALESCE(e.partecipanti_confermati, e.partecipanti_previsti, 0),
                v.ricavi, 0) - p.sconto AS ricavi,
       COALESCE(v.costi, 0) AS costi,
       COALESCE(p.prezzo_forfait,
                p.prezzo_persona * COALESCE(e.partecipanti_confermati, e.partecipanti_previsti, 0),
                v.ricavi, 0) - p.sconto - COALESCE(v.costi, 0) AS margine
  FROM eventi_preventivi p
  JOIN eventi e ON e.id = p.evento_id
  LEFT JOIN (SELECT evento_id, SUM(ricavo) AS ricavi, SUM(costo) AS costi FROM eventi_voci GROUP BY evento_id) v
    ON v.evento_id = p.evento_id;

-- Per la cucina: quanti partecipanti per allergene.
CREATE VIEW eventi_allergeni WITH (security_invoker = true) AS
SELECT evento_id, modulo, a AS allergene, count(*)::int AS persone
  FROM eventi_partecipanti, unnest(allergeni) a
 GROUP BY evento_id, modulo, a;

-- ═══ TRIGGER COMUNI, RLS, PROTEZIONI ═════════════════════════════════
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['controlli_punti','segnalazioni_sicurezza','eventi','eventi_preventivi','eventi_voci',
                           'eventi_personale','eventi_partecipanti'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['controlli_punti','controlli_registrazioni','segnalazioni_sicurezza','eventi','eventi_preventivi',
                           'eventi_voci','eventi_personale','eventi_partecipanti'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;

  -- Tutto il modulo: punti (lettura), registrazioni, eventi, partecipanti.
  FOREACH t IN ARRAY ARRAY['controlli_punti','controlli_registrazioni','eventi','eventi_personale','eventi_partecipanti'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated USING (modulo_attivo(modulo))$f$, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['controlli_registrazioni','eventi','eventi_partecipanti'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$, t);
  END LOOP;

  -- Admin e manager: configurazione dei punti, economia e personale degli eventi.
  FOREACH t IN ARRAY ARRAY['controlli_punti','eventi_preventivi','eventi_voci','eventi_personale'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione())$f$, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['eventi_preventivi','eventi_voci'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated
      USING (modulo_attivo(modulo) AND puo_amministrazione())$f$, t);
  END LOOP;

  -- Cancellazioni. Le registrazioni di controllo non si cancellano mai.
  FOREACH t IN ARRAY ARRAY['controlli_punti','segnalazioni_sicurezza','eventi'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND get_user_role() = 'admin')$f$, t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['eventi_preventivi','eventi_voci','eventi_personale'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND puo_amministrazione())$f$, t);
  END LOOP;
  CREATE POLICY "eventi_partecipanti_delete" ON eventi_partecipanti FOR DELETE TO authenticated
    USING (modulo_attivo(modulo));
END $$;

-- Segnalazioni: le scrive chiunque nel modulo; possono contenere dati di
-- salute (infortuni), quindi le legge chi le ha scritte, admin e manager.
CREATE POLICY "segnalazioni_sicurezza_select" ON segnalazioni_sicurezza FOR SELECT TO authenticated
  USING (modulo_attivo(modulo) AND (puo_amministrazione() OR created_by = auth.uid()));
CREATE POLICY "segnalazioni_sicurezza_insert" ON segnalazioni_sicurezza FOR INSERT TO authenticated
  WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid());
CREATE POLICY "segnalazioni_sicurezza_update" ON segnalazioni_sicurezza FOR UPDATE TO authenticated
  USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione());

GRANT SELECT ON controlli_stato, eventi_margini, eventi_allergeni TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'controllo_registrazione_esito()','controllo_registrazione_immutabile()','controllo_non_conforme_avvisa()',
    'segnalazione_prepara()','segnalazione_avvisa()','evento_set_codice()','evento_figlio_modulo()',
    'evento_preventivo_sync_scadenza()','evento_personale_turno()','evento_annullato()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
END $$;

SELECT applica_protezioni_tabelle();
