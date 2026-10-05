-- ═══════════════════════════════════════════════════════════════════════
-- Modulo Palestra (Sprint 4) · 2/3: corsi, lezioni, prenotazioni con lista
-- d'attesa e no-show, personal trainer e sessioni, schede di allenamento,
-- progressi e valutazioni (dati sulla salute), servizi wellness.
--
-- Documento Palestra §9–20.
--
-- L'ultimo posto di una lezione non va a due persone: la prenotazione
-- blocca la riga della lezione prima di contare i posti. Chi disdice in
-- tempo riprende il credito e libera il posto al primo in attesa.
--
-- Misure, progressi e valutazioni sono dati sulla salute (art. 9 GDPR):
-- li vedono e li scrivono solo l'amministratore e il trainer assegnato al
-- socio, e solo se il socio ha dato il consenso.
-- ═══════════════════════════════════════════════════════════════════════

-- ═══ 1. PERSONAL TRAINER E ISTRUTTORI (§14) ═════════════════════════
CREATE TABLE pal_trainer (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo            TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  nome              TEXT NOT NULL,
  user_id           UUID UNIQUE REFERENCES user_profiles(id) ON DELETE SET NULL,  -- il suo accesso al gestionale
  dipendente_id     UUID REFERENCES dipendenti(id) ON DELETE SET NULL,
  personal_trainer  BOOLEAN NOT NULL DEFAULT true,       -- false = solo istruttore dei corsi
  competenze        TEXT[] NOT NULL DEFAULT '{}',
  specializzazioni  TEXT[] NOT NULL DEFAULT '{}',
  disponibilita     JSONB NOT NULL DEFAULT '[]',          -- [{giorni:[1..7], dalle, alle}]
  tariffa_sessione  NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (tariffa_sessione >= 0),
  compenso_sessione NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (compenso_sessione >= 0),
  compenso_lezione  NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (compenso_lezione >= 0),
  colore            TEXT,
  attivo            BOOLEAN NOT NULL DEFAULT true,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);
ALTER TABLE pal_soci ADD CONSTRAINT pal_soci_trainer_fk FOREIGN KEY (trainer_id) REFERENCES pal_trainer(id) ON DELETE SET NULL;

-- Il trainer collegato a chi è entrato nel gestionale.
CREATE OR REPLACE FUNCTION pal_trainer_corrente()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT id FROM pal_trainer WHERE user_id = auth.uid() AND attivo LIMIT 1
$$;

-- Dati sulla salute del socio: amministratore o trainer assegnato, con il consenso.
CREATE OR REPLACE FUNCTION pal_puo_salute(p_socio UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT modulo_attivo('palestra') AND EXISTS (
    SELECT 1 FROM pal_soci s
     WHERE s.id = p_socio AND s.consenso_salute
       AND (get_user_role() = 'admin' OR (s.trainer_id IS NOT NULL AND s.trainer_id = pal_trainer_corrente())))
$$;

-- ═══ 2. CORSI E LEZIONI (§9–10) ═════════════════════════════════════
CREATE TABLE pal_corsi (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo        TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  sede_id       UUID NOT NULL REFERENCES pal_sedi(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  disciplina    TEXT NOT NULL DEFAULT 'altro' CHECK (disciplina IN ('yoga', 'pilates', 'spinning', 'functional', 'cross_training',
                  'ginnastica', 'zumba', 'body_pump', 'arti_marziali', 'acqua', 'personalizzato', 'altro')),
  descrizione   TEXT,
  livello       TEXT NOT NULL DEFAULT 'tutti' CHECK (livello IN ('base', 'intermedio', 'avanzato', 'tutti')),
  sala_id       UUID REFERENCES pal_sale(id) ON DELETE SET NULL,
  istruttore_id UUID REFERENCES pal_trainer(id) ON DELETE SET NULL,
  durata_min    INT NOT NULL DEFAULT 50 CHECK (durata_min BETWEEN 10 AND 300),
  capienza      INT NOT NULL DEFAULT 20 CHECK (capienza > 0),
  giorni        SMALLINT[] NOT NULL DEFAULT '{}',           -- ISO: 1 lunedì … 7 domenica
  ora           TIME,
  dal           DATE,
  al            DATE,
  servizio      TEXT NOT NULL DEFAULT 'corsi' CHECK (servizio IN ('corsi', 'piscina', 'wellness')),
  colore        TEXT,
  attivo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id),
  CHECK (giorni <@ ARRAY[1,2,3,4,5,6,7]::smallint[])
);

CREATE TABLE pal_lezioni (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo        TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  corso_id      UUID NOT NULL REFERENCES pal_corsi(id) ON DELETE CASCADE,
  sede_id       UUID NOT NULL REFERENCES pal_sedi(id) ON DELETE CASCADE,
  sala_id       UUID REFERENCES pal_sale(id) ON DELETE SET NULL,
  istruttore_id UUID REFERENCES pal_trainer(id) ON DELETE SET NULL,
  inizio        TIMESTAMPTZ NOT NULL,
  fine          TIMESTAMPTZ NOT NULL,
  capienza      INT NOT NULL CHECK (capienza > 0),
  stato         TEXT NOT NULL DEFAULT 'programmata' CHECK (stato IN ('programmata', 'annullata', 'svolta')),
  note          TEXT,
  periodo       TSTZRANGE GENERATED ALWAYS AS (tstzrange(inizio, fine, '[)')) STORED,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id),
  UNIQUE (corso_id, inizio),
  CHECK (fine > inizio),
  -- Né la sala né l'istruttore in due lezioni insieme.
  CONSTRAINT pal_lezioni_sala_libera EXCLUDE USING gist (sala_id WITH =, periodo WITH &&) WHERE (stato <> 'annullata' AND sala_id IS NOT NULL),
  CONSTRAINT pal_lezioni_istruttore_libero EXCLUDE USING gist (istruttore_id WITH =, periodo WITH &&) WHERE (stato <> 'annullata' AND istruttore_id IS NOT NULL)
);
CREATE INDEX idx_pal_lezioni_inizio ON pal_lezioni (sede_id, inizio);

-- ═══ 3. PRENOTAZIONI DEI CORSI (§11–13) ═════════════════════════════
CREATE TABLE pal_prenotazioni (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo         TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  lezione_id     UUID NOT NULL REFERENCES pal_lezioni(id) ON DELETE CASCADE,
  socio_id       UUID NOT NULL REFERENCES pal_soci(id) ON DELETE CASCADE,
  stato          TEXT NOT NULL DEFAULT 'prenotata' CHECK (stato IN ('prenotata', 'attesa', 'presente', 'assente', 'annullata')),
  posizione      INT,                                     -- in lista d'attesa
  posto          TEXT,                                    -- bici, tappetino (facoltativo)
  abbonamento_id UUID REFERENCES pal_abbonamenti(id) ON DELETE SET NULL,
  carnet_id      UUID REFERENCES pal_carnet(id) ON DELETE SET NULL,
  canale         TEXT NOT NULL DEFAULT 'reception' CHECK (canale IN ('reception', 'app', 'sito', 'telefono')),
  check_in_at    TIMESTAMPTZ,
  annullata_at   TIMESTAMPTZ,
  tardiva        BOOLEAN NOT NULL DEFAULT false,          -- disdetta oltre il termine: credito non restituito
  penale_rata_id UUID REFERENCES pal_rate(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES user_profiles(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     UUID REFERENCES user_profiles(id),
  UNIQUE (lezione_id, socio_id)
);
CREATE INDEX idx_pal_prenotazioni_socio ON pal_prenotazioni (socio_id, stato);

-- ═══ 4. SESSIONI DI PERSONAL TRAINING (§15, §19) ════════════════════
CREATE TABLE pal_sessioni_pt (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo      TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  trainer_id  UUID NOT NULL REFERENCES pal_trainer(id) ON DELETE RESTRICT,
  socio_id    UUID NOT NULL REFERENCES pal_soci(id) ON DELETE CASCADE,
  sede_id     UUID NOT NULL REFERENCES pal_sedi(id) ON DELETE CASCADE,
  sala_id     UUID REFERENCES pal_sale(id) ON DELETE SET NULL,
  inizio      TIMESTAMPTZ NOT NULL,
  fine        TIMESTAMPTZ NOT NULL,
  tipo        TEXT NOT NULL DEFAULT 'allenamento' CHECK (tipo IN ('allenamento', 'coppia', 'valutazione', 'follow_up', 'online')),
  stato       TEXT NOT NULL DEFAULT 'prenotata' CHECK (stato IN ('prenotata', 'svolta', 'annullata', 'no_show')),
  carnet_id   UUID REFERENCES pal_carnet(id) ON DELETE SET NULL,
  rata_id     UUID REFERENCES pal_rate(id) ON DELETE SET NULL,
  prezzo      NUMERIC(8,2) NOT NULL DEFAULT 0,
  compenso    NUMERIC(8,2) NOT NULL DEFAULT 0,             -- al trainer, se svolta
  note        TEXT,
  periodo     TSTZRANGE GENERATED ALWAYS AS (tstzrange(inizio, fine, '[)')) STORED,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id),
  CHECK (fine > inizio),
  CONSTRAINT pal_sessioni_trainer_libero EXCLUDE USING gist (trainer_id WITH =, periodo WITH &&) WHERE (stato IN ('prenotata', 'svolta'))
);

-- ═══ 5. SCHEDE DI ALLENAMENTO (§16) ═════════════════════════════════
CREATE TABLE pal_schede (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo         TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  socio_id       UUID NOT NULL REFERENCES pal_soci(id) ON DELETE CASCADE,
  trainer_id     UUID REFERENCES pal_trainer(id) ON DELETE SET NULL,
  titolo         TEXT NOT NULL DEFAULT 'Scheda',
  obiettivi      TEXT,
  programma      TEXT,                                   -- «Ipertrofia, split A/B»
  frequenza      TEXT,                                   -- «3 volte a settimana»
  note_trainer   TEXT,
  versione       INT NOT NULL DEFAULT 1,
  attiva         BOOLEAN NOT NULL DEFAULT true,
  valida_dal     DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  valida_fino    DATE,
  precedente_id  UUID REFERENCES pal_schede(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES user_profiles(id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     UUID REFERENCES user_profiles(id)
);
CREATE UNIQUE INDEX idx_pal_schede_attiva ON pal_schede (socio_id) WHERE attiva;

CREATE TABLE pal_schede_esercizi (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo      TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  scheda_id   UUID NOT NULL REFERENCES pal_schede(id) ON DELETE CASCADE,
  giorno      TEXT NOT NULL DEFAULT 'A',                 -- seduta A, B, C…
  ordine      INT NOT NULL DEFAULT 0,
  esercizio   TEXT NOT NULL,
  serie       INT CHECK (serie > 0),
  ripetizioni TEXT,                                      -- «10», «8-12», «30 s»
  carico      TEXT,                                      -- «40 kg», «corpo libero»
  recupero    TEXT,                                      -- «90 s»
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id)
);

-- ═══ 6. PROGRESSI E VALUTAZIONI (§17–18): DATI SULLA SALUTE ═════════
CREATE TABLE pal_misurazioni (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo           TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  socio_id         UUID NOT NULL REFERENCES pal_soci(id) ON DELETE CASCADE,
  trainer_id       UUID REFERENCES pal_trainer(id) ON DELETE SET NULL,
  data             DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  peso             NUMERIC(5,1) CHECK (peso > 0),
  altezza          NUMERIC(5,1) CHECK (altezza > 0),
  massa_grassa_pct NUMERIC(4,1) CHECK (massa_grassa_pct BETWEEN 0 AND 80),
  misure           JSONB NOT NULL DEFAULT '{}',          -- {vita: 82, fianchi: 96, braccio: 33…} in cm
  performance      JSONB NOT NULL DEFAULT '{}',          -- {panca_1rm: 60, corsa_5km_min: 27…}
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_pal_misurazioni_socio ON pal_misurazioni (socio_id, data);

CREATE TABLE pal_valutazioni (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo             TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  socio_id           UUID NOT NULL REFERENCES pal_soci(id) ON DELETE CASCADE,
  trainer_id         UUID REFERENCES pal_trainer(id) ON DELETE SET NULL,
  data               DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Europe/Rome')::date,
  tipo               TEXT NOT NULL DEFAULT 'iniziale' CHECK (tipo IN ('iniziale', 'follow_up')),
  obiettivi          TEXT,
  livello            TEXT CHECK (livello IN ('principiante', 'intermedio', 'avanzato')),
  test               JSONB NOT NULL DEFAULT '[]',        -- [{nome:'squat test', esito:'…'}]
  parametri          JSONB NOT NULL DEFAULT '{}',        -- frequenza a riposo, flessibilità…
  valutazione        TEXT,
  programma_proposto TEXT,
  follow_up          DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id)
);

-- ═══ 7. WELLNESS (§20) ══════════════════════════════════════════════
CREATE TABLE pal_servizi (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo             TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  sede_id            UUID NOT NULL REFERENCES pal_sedi(id) ON DELETE CASCADE,
  nome               TEXT NOT NULL,
  tipo               TEXT NOT NULL DEFAULT 'massaggio' CHECK (tipo IN ('sauna', 'bagno_turco', 'massaggio', 'estetica', 'solarium',
                       'spa', 'fisioterapia', 'nutrizione', 'recovery', 'altro')),
  durata_min         INT NOT NULL DEFAULT 50 CHECK (durata_min > 0),
  prezzo             NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (prezzo >= 0),
  carnet             TEXT CHECK (carnet IN ('massaggi', 'wellness')),   -- si può scalare da un carnet
  richiede_operatore BOOLEAN NOT NULL DEFAULT true,
  risorse            TEXT[] NOT NULL DEFAULT '{}',        -- cabine
  attivo             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id)
);

CREATE TABLE pal_appuntamenti (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo       TEXT NOT NULL DEFAULT 'palestra' CHECK (modulo = 'palestra'),
  servizio_id  UUID NOT NULL REFERENCES pal_servizi(id) ON DELETE RESTRICT,
  sede_id      UUID NOT NULL REFERENCES pal_sedi(id) ON DELETE CASCADE,
  socio_id     UUID REFERENCES pal_soci(id) ON DELETE CASCADE,
  cliente_nome TEXT,                                      -- cliente esterno, non socio
  operatore_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  risorsa      TEXT,
  inizio       TIMESTAMPTZ NOT NULL,
  fine         TIMESTAMPTZ,
  stato        TEXT NOT NULL DEFAULT 'prenotato' CHECK (stato IN ('prenotato', 'svolto', 'annullato', 'no_show')),
  prezzo       NUMERIC(8,2),
  carnet_id    UUID REFERENCES pal_carnet(id) ON DELETE SET NULL,
  rata_id      UUID REFERENCES pal_rate(id) ON DELETE SET NULL,
  note         TEXT,
  periodo      TSTZRANGE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id),
  CHECK (socio_id IS NOT NULL OR cliente_nome IS NOT NULL),
  CONSTRAINT pal_appuntamenti_operatore_libero EXCLUDE USING gist (operatore_id WITH =, periodo WITH &&)
    WHERE (stato IN ('prenotato', 'svolto') AND operatore_id IS NOT NULL),
  CONSTRAINT pal_appuntamenti_cabina_libera EXCLUDE USING gist (sede_id WITH =, risorsa WITH =, periodo WITH &&)
    WHERE (stato IN ('prenotato', 'svolto') AND risorsa IS NOT NULL)
);

-- ═══ 8. LEZIONI DAL CALENDARIO DEI CORSI ════════════════════════════
CREATE OR REPLACE FUNCTION pal_genera_lezioni(p_sede UUID, p_dal DATE, p_al DATE)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  c pal_corsi%ROWTYPE;
  g DATE;
  v_inizio TIMESTAMPTZ;
  n INT := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (modulo_attivo('palestra') AND puo_amministrazione()) THEN
    RAISE EXCEPTION 'Il calendario lo prepara la direzione' USING ERRCODE = '42501';
  END IF;
  FOR c IN SELECT * FROM pal_corsi WHERE sede_id = p_sede AND attivo AND ora IS NOT NULL AND cardinality(giorni) > 0 LOOP
    FOR g IN SELECT d::date FROM generate_series(GREATEST(p_dal, COALESCE(c.dal, p_dal)), LEAST(p_al, COALESCE(c.al, p_al)), INTERVAL '1 day') d LOOP
      IF EXTRACT(ISODOW FROM g)::smallint = ANY (c.giorni) THEN
        v_inizio := (g + c.ora) AT TIME ZONE 'Europe/Rome';
        INSERT INTO pal_lezioni (corso_id, sede_id, sala_id, istruttore_id, inizio, fine, capienza, created_by)
        VALUES (c.id, c.sede_id, c.sala_id, c.istruttore_id, v_inizio, v_inizio + make_interval(mins => c.durata_min), c.capienza,
                COALESCE(auth.uid(), c.created_by))
        ON CONFLICT (corso_id, inizio) DO NOTHING;
        IF FOUND THEN n := n + 1; END IF;
      END IF;
    END LOOP;
  END LOOP;
  RETURN n;
END;
$$;

-- ═══ 9. PRENOTAZIONE: POSTO, ATTESA, CREDITO ════════════════════════
CREATE OR REPLACE FUNCTION pal_prenotazione_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  l pal_lezioni%ROWTYPE;
  c pal_corsi%ROWTYPE;
  so pal_soci%ROWTYPE;
  v JSONB;
  v_occupati INT;
BEGIN
  -- La riga della lezione si blocca: due prenotazioni sull'ultimo posto si mettono in fila.
  SELECT * INTO l FROM pal_lezioni WHERE id = NEW.lezione_id FOR UPDATE;
  SELECT * INTO c FROM pal_corsi WHERE id = l.corso_id;
  IF l.stato <> 'programmata' THEN RAISE EXCEPTION 'La lezione è %', l.stato USING ERRCODE = 'check_violation'; END IF;
  IF l.fine < NOW() THEN RAISE EXCEPTION 'La lezione è già finita' USING ERRCODE = 'check_violation'; END IF;
  SELECT * INTO so FROM pal_soci WHERE id = NEW.socio_id;
  IF so.prenotazioni_bloccate_fino IS NOT NULL AND so.prenotazioni_bloccate_fino >= pal_oggi() THEN
    RAISE EXCEPTION 'Prenotazioni sospese fino al % per le assenze non disdette', to_char(so.prenotazioni_bloccate_fino, 'DD/MM/YYYY')
      USING ERRCODE = 'check_violation';
  END IF;
  -- Serve un titolo valido per il servizio del corso nel giorno della lezione.
  v := pal_verifica_accesso(NEW.socio_id, l.inizio, c.servizio);
  IF NOT (v->>'consentito')::boolean THEN
    RAISE EXCEPTION 'Non prenotabile: %', v->>'motivo' USING ERRCODE = 'check_violation';
  END IF;
  SELECT count(*) INTO v_occupati FROM pal_prenotazioni WHERE lezione_id = l.id AND stato IN ('prenotata', 'presente');
  IF v_occupati < l.capienza THEN
    NEW.stato := 'prenotata';
    NEW.posizione := NULL;
    IF v ? 'abbonamento_id' THEN
      NEW.abbonamento_id := (v->>'abbonamento_id')::uuid;
    ELSE
      NEW.carnet_id := pal_scala_carnet(NEW.socio_id, CASE c.servizio WHEN 'corsi' THEN 'corsi' ELSE c.servizio END, (l.inizio AT TIME ZONE 'Europe/Rome')::date);
    END IF;
  ELSE
    NEW.stato := 'attesa';
    SELECT COALESCE(max(posizione), 0) + 1 INTO NEW.posizione FROM pal_prenotazioni WHERE lezione_id = l.id AND stato = 'attesa';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_prenotazioni_prepara BEFORE INSERT ON pal_prenotazioni FOR EACH ROW EXECUTE FUNCTION pal_prenotazione_prepara();

-- Il primo in attesa prende il posto (se ha ancora un titolo valido) ed è avvisato.
CREATE OR REPLACE FUNCTION pal_scorri_attesa(p_lezione UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  l pal_lezioni%ROWTYPE;
  c pal_corsi%ROWTYPE;
  p RECORD;
  v JSONB;
  v_occupati INT;
BEGIN
  SELECT * INTO l FROM pal_lezioni WHERE id = p_lezione FOR UPDATE;
  SELECT * INTO c FROM pal_corsi WHERE id = l.corso_id;
  IF l.stato <> 'programmata' OR l.inizio < NOW() THEN RETURN NULL; END IF;
  SELECT count(*) INTO v_occupati FROM pal_prenotazioni WHERE lezione_id = l.id AND stato IN ('prenotata', 'presente');
  IF v_occupati >= l.capienza THEN RETURN NULL; END IF;
  FOR p IN SELECT * FROM pal_prenotazioni WHERE lezione_id = l.id AND stato = 'attesa' ORDER BY posizione, created_at FOR UPDATE LOOP
    v := pal_verifica_accesso(p.socio_id, l.inizio, c.servizio);
    IF (v->>'consentito')::boolean THEN
      UPDATE pal_prenotazioni SET stato = 'prenotata', posizione = NULL,
             abbonamento_id = (v->>'abbonamento_id')::uuid,
             carnet_id = CASE WHEN v ? 'abbonamento_id' THEN NULL
                              ELSE pal_scala_carnet(p.socio_id, c.servizio, (l.inizio AT TIME ZONE 'Europe/Rome')::date) END
       WHERE id = p.id;
      PERFORM pal_avvisa(p.socio_id, 'Si è liberato un posto: ' || c.nome,
        'eri in lista d''attesa per ' || c.nome || ' del ' || to_char(l.inizio AT TIME ZONE 'Europe/Rome', 'DD/MM "alle" HH24:MI')
        || ': il posto è tuo. Se non puoi venire, disdici entro ' || (SELECT cancellazione_ore FROM pal_sedi WHERE id = l.sede_id) || ' ore prima.');
      -- Le posizioni che seguono salgono.
      UPDATE pal_prenotazioni SET posizione = posizione - 1 WHERE lezione_id = l.id AND stato = 'attesa' AND posizione > p.posizione;
      RETURN p.id;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

-- Disdetta e check-in.
CREATE OR REPLACE FUNCTION pal_prenotazione_stato()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  l pal_lezioni%ROWTYPE;
  v_ore INT;
BEGIN
  IF NEW.stato = OLD.stato OR current_setting('pal.interno', true) = '1' THEN RETURN NEW; END IF;
  IF OLD.stato IN ('annullata', 'assente') OR (OLD.stato = 'presente' AND NEW.stato <> 'assente') THEN
    RAISE EXCEPTION 'Prenotazione già %', OLD.stato USING ERRCODE = 'check_violation';
  END IF;
  SELECT * INTO l FROM pal_lezioni WHERE id = NEW.lezione_id;
  IF NEW.stato = 'presente' THEN
    IF OLD.stato <> 'prenotata' THEN RAISE EXCEPTION 'Check-in solo per chi ha il posto' USING ERRCODE = 'check_violation'; END IF;
    NEW.check_in_at := NOW();
  ELSIF NEW.stato = 'annullata' THEN
    NEW.annullata_at := NOW();
    SELECT cancellazione_ore INTO v_ore FROM pal_sedi WHERE id = l.sede_id;
    IF OLD.stato = 'prenotata' THEN
      IF NOW() <= l.inizio - make_interval(hours => v_ore) THEN
        IF NEW.carnet_id IS NOT NULL THEN PERFORM pal_rendi_carnet(NEW.carnet_id); END IF;
      ELSE
        NEW.tardiva := true;                              -- il credito non torna
      END IF;
    END IF;
  ELSIF NEW.stato = 'attesa' OR (NEW.stato = 'prenotata' AND OLD.stato <> 'attesa') THEN
    RAISE EXCEPTION 'Passaggio non ammesso' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_prenotazioni_stato BEFORE UPDATE OF stato ON pal_prenotazioni FOR EACH ROW EXECUTE FUNCTION pal_prenotazione_stato();

CREATE OR REPLACE FUNCTION pal_prenotazione_liberata()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF current_setting('pal.interno', true) = '1' THEN RETURN NEW; END IF;
  IF OLD.stato = 'prenotata' AND NEW.stato = 'annullata' THEN PERFORM pal_scorri_attesa(NEW.lezione_id); END IF;
  IF OLD.stato = 'attesa' AND NEW.stato = 'annullata' THEN
    UPDATE pal_prenotazioni SET posizione = posizione - 1 WHERE lezione_id = NEW.lezione_id AND stato = 'attesa' AND posizione > OLD.posizione;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_prenotazioni_liberata AFTER UPDATE OF stato ON pal_prenotazioni FOR EACH ROW EXECUTE FUNCTION pal_prenotazione_liberata();

-- Conferma per email alla prenotazione.
CREATE OR REPLACE FUNCTION pal_prenotazione_conferma()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_corso TEXT;
  v_quando TEXT;
BEGIN
  SELECT c.nome, to_char(l.inizio AT TIME ZONE 'Europe/Rome', 'DD/MM "alle" HH24:MI') INTO v_corso, v_quando
    FROM pal_lezioni l JOIN pal_corsi c ON c.id = l.corso_id WHERE l.id = NEW.lezione_id;
  PERFORM pal_avvisa(NEW.socio_id,
    CASE NEW.stato WHEN 'attesa' THEN 'In lista d''attesa: ' ELSE 'Prenotazione confermata: ' END || v_corso,
    CASE NEW.stato WHEN 'attesa' THEN 'sei in lista d''attesa (posizione ' || NEW.posizione || ') per ' || v_corso || ' del ' || v_quando
                                      || '. Ti avvisiamo noi se si libera un posto.'
         ELSE 'ti aspettiamo a ' || v_corso || ' il ' || v_quando || '.' END);
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_prenotazioni_conferma AFTER INSERT ON pal_prenotazioni FOR EACH ROW EXECUTE FUNCTION pal_prenotazione_conferma();

-- Fine lezione: assenti segnati, regole del no-show applicate, attese chiuse.
CREATE OR REPLACE FUNCTION pal_chiudi_lezione(p_lezione UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  l pal_lezioni%ROWTYPE;
  se pal_sedi%ROWTYPE;
  p RECORD;
  v_corso TEXT;
  v_assenze INT;
  v_rata UUID;
  n INT := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT modulo_attivo('palestra') THEN RAISE EXCEPTION 'Modulo Palestra non attivo' USING ERRCODE = '42501'; END IF;
  SELECT * INTO l FROM pal_lezioni WHERE id = p_lezione FOR UPDATE;
  IF l.stato <> 'programmata' THEN RETURN 0; END IF;
  SELECT * INTO se FROM pal_sedi WHERE id = l.sede_id;
  SELECT nome INTO v_corso FROM pal_corsi WHERE id = l.corso_id;
  FOR p IN SELECT * FROM pal_prenotazioni WHERE lezione_id = l.id AND stato = 'prenotata' LOOP
    UPDATE pal_prenotazioni SET stato = 'assente' WHERE id = p.id;
    n := n + 1;
    IF NOT se.noshow_consuma_credito AND p.carnet_id IS NOT NULL THEN PERFORM pal_rendi_carnet(p.carnet_id); END IF;
    IF se.noshow_penale > 0 THEN
      INSERT INTO pal_rate (socio_id, descrizione, scadenza, importo, created_by)
      VALUES (p.socio_id, 'Penale assenza · ' || v_corso || ' ' || to_char(l.inizio AT TIME ZONE 'Europe/Rome', 'DD/MM'), pal_oggi(),
              se.noshow_penale, l.created_by)
      RETURNING id INTO v_rata;
      UPDATE pal_prenotazioni SET penale_rata_id = v_rata WHERE id = p.id;
    END IF;
    SELECT count(*) INTO v_assenze FROM pal_prenotazioni pr JOIN pal_lezioni x ON x.id = pr.lezione_id
     WHERE pr.socio_id = p.socio_id AND pr.stato = 'assente' AND x.inizio > NOW() - make_interval(days => se.noshow_finestra_giorni);
    IF v_assenze >= se.noshow_soglia AND se.noshow_blocco_giorni > 0 THEN
      UPDATE pal_soci SET prenotazioni_bloccate_fino = pal_oggi() + se.noshow_blocco_giorni WHERE id = p.socio_id;
      PERFORM pal_avvisa(p.socio_id, 'Prenotazioni sospese',
        v_assenze || ' assenze senza disdetta negli ultimi ' || se.noshow_finestra_giorni || ' giorni: le prenotazioni dei corsi sono sospese fino al '
        || to_char(pal_oggi() + se.noshow_blocco_giorni, 'DD/MM/YYYY') || '.');
    ELSE
      PERFORM pal_avvisa(p.socio_id, 'Assenza al corso ' || v_corso,
        'non ti abbiamo visto a ' || v_corso || '. Quando non puoi venire disdici entro ' || se.cancellazione_ore
        || ' ore prima: il posto va a chi è in lista d''attesa' || CASE WHEN se.noshow_consuma_credito THEN ' e il credito non si perde.' ELSE '.' END);
    END IF;
  END LOOP;
  UPDATE pal_prenotazioni SET stato = 'annullata' WHERE lezione_id = l.id AND stato = 'attesa';
  UPDATE pal_lezioni SET stato = 'svolta' WHERE id = l.id;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION pal_chiudi_lezioni_finite()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  l RECORD;
  n INT := 0;
BEGIN
  FOR l IN SELECT id FROM pal_lezioni WHERE stato = 'programmata' AND fine < NOW() - INTERVAL '15 minutes' LOOP
    n := n + pal_chiudi_lezione(l.id);
  END LOOP;
  RETURN n;
END;
$$;

-- Annullare una lezione: tutti avvisati, crediti restituiti.
CREATE OR REPLACE FUNCTION pal_lezione_annullata()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  p RECORD;
  v_corso TEXT;
BEGIN
  IF NEW.stato = 'annullata' AND OLD.stato = 'programmata' THEN
    SELECT nome INTO v_corso FROM pal_corsi WHERE id = NEW.corso_id;
    FOR p IN SELECT * FROM pal_prenotazioni WHERE lezione_id = NEW.id AND stato IN ('prenotata', 'attesa') LOOP
      IF p.carnet_id IS NOT NULL AND p.stato = 'prenotata' THEN PERFORM pal_rendi_carnet(p.carnet_id); END IF;
      PERFORM pal_avvisa(p.socio_id, 'Lezione annullata: ' || v_corso,
        'la lezione di ' || v_corso || ' del ' || to_char(NEW.inizio AT TIME ZONE 'Europe/Rome', 'DD/MM "alle" HH24:MI')
        || ' è annullata' || COALESCE(' (' || NEW.note || ')', '') || '. Il credito ti è stato restituito.');
    END LOOP;
    -- Passaggio interno: niente controlli della disdetta (restituirebbero due volte) né scorrimento dell'attesa.
    PERFORM set_config('pal.interno', '1', true);
    UPDATE pal_prenotazioni SET stato = 'annullata', annullata_at = NOW() WHERE lezione_id = NEW.id AND stato IN ('prenotata', 'attesa');
    PERFORM set_config('pal.interno', '0', true);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_lezioni_annullata AFTER UPDATE OF stato ON pal_lezioni FOR EACH ROW EXECUTE FUNCTION pal_lezione_annullata();

-- Promemoria per email il giorno prima.
CREATE OR REPLACE FUNCTION pal_promemoria_corsi()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  p RECORD;
  n INT := 0;
BEGIN
  FOR p IN SELECT pr.socio_id, c.nome, l.inizio FROM pal_prenotazioni pr JOIN pal_lezioni l ON l.id = pr.lezione_id
             JOIN pal_corsi c ON c.id = l.corso_id
            WHERE pr.stato = 'prenotata' AND l.stato = 'programmata'
              AND (l.inizio AT TIME ZONE 'Europe/Rome')::date = pal_oggi() + 1 LOOP
    IF pal_avvisa(p.socio_id, 'Domani: ' || p.nome,
         'ti ricordiamo ' || p.nome || ' domani alle ' || to_char(p.inizio AT TIME ZONE 'Europe/Rome', 'HH24:MI') || '.') THEN
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END;
$$;

-- ═══ 10. SESSIONI PT: CREDITO O ADDEBITO, COMPENSO ══════════════════
CREATE OR REPLACE FUNCTION pal_sessione_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  t pal_trainer%ROWTYPE;
BEGIN
  SELECT * INTO t FROM pal_trainer WHERE id = NEW.trainer_id;
  IF TG_OP = 'INSERT' THEN
    IF NOT t.personal_trainer OR NOT t.attivo THEN RAISE EXCEPTION '% non fa personal training', t.nome USING ERRCODE = 'check_violation'; END IF;
    NEW.carnet_id := pal_scala_carnet(NEW.socio_id, 'lezioni_pt', (NEW.inizio AT TIME ZONE 'Europe/Rome')::date);
    IF NEW.carnet_id IS NULL AND NEW.tipo <> 'valutazione' THEN
      NEW.prezzo := CASE WHEN NEW.prezzo > 0 THEN NEW.prezzo ELSE t.tariffa_sessione END;
      IF NEW.prezzo > 0 THEN
        INSERT INTO pal_rate (socio_id, descrizione, scadenza, importo, created_by)
        VALUES (NEW.socio_id, 'Personal training con ' || t.nome || ' · ' || to_char(NEW.inizio AT TIME ZONE 'Europe/Rome', 'DD/MM HH24:MI'),
                (NEW.inizio AT TIME ZONE 'Europe/Rome')::date, NEW.prezzo, NEW.created_by)
        RETURNING id INTO NEW.rata_id;
      END IF;
    ELSE
      NEW.prezzo := 0;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.stato <> OLD.stato THEN
    IF OLD.stato <> 'prenotata' THEN RAISE EXCEPTION 'Sessione già %', OLD.stato USING ERRCODE = 'check_violation'; END IF;
    IF NEW.stato = 'svolta' THEN NEW.compenso := t.compenso_sessione; END IF;
    IF NEW.stato = 'annullata' THEN
      IF NEW.carnet_id IS NOT NULL THEN PERFORM pal_rendi_carnet(NEW.carnet_id); END IF;
      UPDATE pal_rate SET stato = 'annullata' WHERE id = NEW.rata_id AND stato = 'da_pagare';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_sessioni_prepara BEFORE INSERT OR UPDATE ON pal_sessioni_pt FOR EACH ROW EXECUTE FUNCTION pal_sessione_prepara();

-- ═══ 11. APPUNTAMENTI WELLNESS ══════════════════════════════════════
CREATE OR REPLACE FUNCTION pal_appuntamento_prepara()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  s pal_servizi%ROWTYPE;
BEGIN
  SELECT * INTO s FROM pal_servizi WHERE id = NEW.servizio_id;
  IF TG_OP = 'INSERT' THEN
    NEW.sede_id := s.sede_id;
    NEW.fine := COALESCE(NEW.fine, NEW.inizio + make_interval(mins => s.durata_min));
    IF s.richiede_operatore AND NEW.operatore_id IS NULL THEN
      RAISE EXCEPTION '% richiede un operatore', s.nome USING ERRCODE = 'check_violation';
    END IF;
    IF cardinality(s.risorse) > 0 AND (NEW.risorsa IS NULL OR NOT NEW.risorsa = ANY (s.risorse)) THEN
      RAISE EXCEPTION 'Scegli la cabina: %', array_to_string(s.risorse, ', ') USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.socio_id IS NOT NULL AND s.carnet IS NOT NULL THEN
      NEW.carnet_id := pal_scala_carnet(NEW.socio_id, s.carnet, (NEW.inizio AT TIME ZONE 'Europe/Rome')::date);
    END IF;
    IF NEW.carnet_id IS NOT NULL THEN
      NEW.prezzo := 0;
    ELSE
      NEW.prezzo := COALESCE(NEW.prezzo, s.prezzo);
      IF NEW.socio_id IS NOT NULL AND NEW.prezzo > 0 THEN
        INSERT INTO pal_rate (socio_id, descrizione, scadenza, importo, created_by)
        VALUES (NEW.socio_id, s.nome || ' · ' || to_char(NEW.inizio AT TIME ZONE 'Europe/Rome', 'DD/MM HH24:MI'),
                (NEW.inizio AT TIME ZONE 'Europe/Rome')::date, NEW.prezzo, NEW.created_by)
        RETURNING id INTO NEW.rata_id;
      END IF;
    END IF;
  ELSIF NEW.stato <> OLD.stato THEN
    IF OLD.stato <> 'prenotato' THEN RAISE EXCEPTION 'Appuntamento già %', OLD.stato USING ERRCODE = 'check_violation'; END IF;
    IF NEW.stato = 'annullato' THEN
      IF NEW.carnet_id IS NOT NULL THEN PERFORM pal_rendi_carnet(NEW.carnet_id); END IF;
      UPDATE pal_rate SET stato = 'annullata' WHERE id = NEW.rata_id AND stato = 'da_pagare';
    END IF;
  END IF;
  NEW.periodo := tstzrange(NEW.inizio, NEW.fine, '[)');
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_appuntamenti_prepara BEFORE INSERT OR UPDATE ON pal_appuntamenti FOR EACH ROW EXECUTE FUNCTION pal_appuntamento_prepara();

-- ═══ 12. SCHEDE: NUOVA VERSIONE CON LO STORICO ══════════════════════
CREATE OR REPLACE FUNCTION pal_nuova_versione_scheda(p_scheda UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  s pal_schede%ROWTYPE;
  v_id UUID;
BEGIN
  IF NOT modulo_attivo('palestra') OR NOT (puo_amministrazione() OR pal_trainer_corrente() IS NOT NULL) THEN
    RAISE EXCEPTION 'Le schede le aggiornano i trainer' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO s FROM pal_schede WHERE id = p_scheda AND attiva FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Si aggiorna solo la scheda in uso' USING ERRCODE = 'check_violation'; END IF;
  UPDATE pal_schede SET attiva = false, valida_fino = pal_oggi() WHERE id = s.id;
  INSERT INTO pal_schede (socio_id, trainer_id, titolo, obiettivi, programma, frequenza, note_trainer, versione, precedente_id, created_by)
  VALUES (s.socio_id, COALESCE(pal_trainer_corrente(), s.trainer_id), s.titolo, s.obiettivi, s.programma, s.frequenza, s.note_trainer,
          s.versione + 1, s.id, auth.uid())
  RETURNING id INTO v_id;
  INSERT INTO pal_schede_esercizi (scheda_id, giorno, ordine, esercizio, serie, ripetizioni, carico, recupero, note, created_by)
  SELECT v_id, giorno, ordine, esercizio, serie, ripetizioni, carico, recupero, note, auth.uid()
    FROM pal_schede_esercizi WHERE scheda_id = s.id;
  RETURN v_id;
END;
$$;

-- ═══ 13. TRIGGER COMUNI, RLS, PERMESSI ══════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['pal_trainer','pal_corsi','pal_lezioni','pal_prenotazioni','pal_sessioni_pt','pal_schede',
                           'pal_misurazioni','pal_valutazioni','pal_servizi','pal_appuntamenti'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
    -- Misure e valutazioni non si copiano nel registro delle modifiche: sono dati sulla salute.
    IF t NOT IN ('pal_misurazioni', 'pal_valutazioni') THEN
      EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
    END IF;
  END LOOP;

  FOREACH t IN ARRAY ARRAY['pal_trainer','pal_corsi','pal_lezioni','pal_prenotazioni','pal_sessioni_pt','pal_schede','pal_schede_esercizi',
                           'pal_misurazioni','pal_valutazioni','pal_servizi','pal_appuntamenti'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;

  -- Lettura per il personale; cancellazione per l'amministratore.
  FOREACH t IN ARRAY ARRAY['pal_trainer','pal_corsi','pal_lezioni','pal_prenotazioni','pal_sessioni_pt','pal_schede','pal_schede_esercizi',
                           'pal_servizi','pal_appuntamenti'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated USING (modulo_attivo(modulo))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_attivo(modulo) AND get_user_role() = 'admin')$f$, t);
  END LOOP;

  -- Configurazione: trainer, corsi, lezioni e servizi li gestisce la direzione.
  FOREACH t IN ARRAY ARRAY['pal_trainer','pal_corsi','pal_lezioni','pal_servizi'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione() AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo) AND puo_amministrazione()) WITH CHECK (modulo_attivo(modulo) AND puo_amministrazione())$f$, t);
  END LOOP;

  -- Prenotazioni, sessioni e appuntamenti: tutto il personale.
  FOREACH t IN ARRAY ARRAY['pal_prenotazioni','pal_sessioni_pt','pal_appuntamenti'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_attivo(modulo) AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_attivo(modulo)) WITH CHECK (modulo_attivo(modulo))$f$, t);
  END LOOP;
END $$;

-- L'istruttore segna le presenze delle sue lezioni (e chiude la lezione).
CREATE POLICY "pal_lezioni_update_istruttore" ON pal_lezioni FOR UPDATE TO authenticated
  USING (modulo_attivo(modulo) AND istruttore_id = pal_trainer_corrente())
  WITH CHECK (modulo_attivo(modulo) AND istruttore_id = pal_trainer_corrente());

-- Schede: le scrivono i trainer e la direzione.
CREATE POLICY "pal_schede_insert" ON pal_schede FOR INSERT TO authenticated
  WITH CHECK (modulo_attivo(modulo) AND (puo_amministrazione() OR pal_trainer_corrente() IS NOT NULL) AND created_by = auth.uid());
CREATE POLICY "pal_schede_update" ON pal_schede FOR UPDATE TO authenticated
  USING (modulo_attivo(modulo) AND (puo_amministrazione() OR pal_trainer_corrente() IS NOT NULL))
  WITH CHECK (modulo_attivo(modulo) AND (puo_amministrazione() OR pal_trainer_corrente() IS NOT NULL));
CREATE POLICY "pal_schede_esercizi_insert" ON pal_schede_esercizi FOR INSERT TO authenticated
  WITH CHECK (modulo_attivo(modulo) AND (puo_amministrazione() OR pal_trainer_corrente() IS NOT NULL) AND created_by = auth.uid());
CREATE POLICY "pal_schede_esercizi_update" ON pal_schede_esercizi FOR UPDATE TO authenticated
  USING (modulo_attivo(modulo) AND (puo_amministrazione() OR pal_trainer_corrente() IS NOT NULL))
  WITH CHECK (modulo_attivo(modulo) AND (puo_amministrazione() OR pal_trainer_corrente() IS NOT NULL));
CREATE POLICY "pal_schede_esercizi_delete_trainer" ON pal_schede_esercizi FOR DELETE TO authenticated
  USING (modulo_attivo(modulo) AND (puo_amministrazione() OR pal_trainer_corrente() IS NOT NULL));

-- Dati sulla salute: solo chi può (amministratore o trainer assegnato, con il consenso).
CREATE POLICY "pal_misurazioni_select" ON pal_misurazioni FOR SELECT TO authenticated USING (pal_puo_salute(socio_id));
CREATE POLICY "pal_misurazioni_insert" ON pal_misurazioni FOR INSERT TO authenticated
  WITH CHECK (pal_puo_salute(socio_id) AND created_by = auth.uid());
CREATE POLICY "pal_misurazioni_update" ON pal_misurazioni FOR UPDATE TO authenticated
  USING (pal_puo_salute(socio_id)) WITH CHECK (pal_puo_salute(socio_id));
CREATE POLICY "pal_misurazioni_delete" ON pal_misurazioni FOR DELETE TO authenticated USING (pal_puo_salute(socio_id));
CREATE POLICY "pal_valutazioni_select" ON pal_valutazioni FOR SELECT TO authenticated USING (pal_puo_salute(socio_id));
CREATE POLICY "pal_valutazioni_insert" ON pal_valutazioni FOR INSERT TO authenticated
  WITH CHECK (pal_puo_salute(socio_id) AND created_by = auth.uid());
CREATE POLICY "pal_valutazioni_update" ON pal_valutazioni FOR UPDATE TO authenticated
  USING (pal_puo_salute(socio_id)) WITH CHECK (pal_puo_salute(socio_id));
CREATE POLICY "pal_valutazioni_delete" ON pal_valutazioni FOR DELETE TO authenticated USING (pal_puo_salute(socio_id));

-- Revocato il consenso, i dati sulla salute si cancellano (non si conservano senza base giuridica).
CREATE OR REPLACE FUNCTION pal_consenso_revocato()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.consenso_salute AND NOT NEW.consenso_salute THEN
    DELETE FROM pal_misurazioni WHERE socio_id = NEW.id;
    DELETE FROM pal_valutazioni WHERE socio_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pal_soci_consenso_revocato AFTER UPDATE OF consenso_salute ON pal_soci FOR EACH ROW EXECUTE FUNCTION pal_consenso_revocato();

-- Posti della lezione, per il calendario (§10).
CREATE VIEW pal_lezioni_posti WITH (security_invoker = true) AS
SELECT l.id AS lezione_id, l.corso_id, c.nome AS corso, c.disciplina, c.livello, c.colore, l.sede_id, l.sala_id, l.istruttore_id,
       l.inizio, l.fine, l.stato, l.capienza,
       count(p.id) FILTER (WHERE p.stato IN ('prenotata', 'presente'))::int AS iscritti,
       count(p.id) FILTER (WHERE p.stato = 'presente')::int AS presenti,
       count(p.id) FILTER (WHERE p.stato = 'attesa')::int AS in_attesa,
       count(p.id) FILTER (WHERE p.stato = 'annullata')::int AS cancellazioni,
       GREATEST(l.capienza - count(p.id) FILTER (WHERE p.stato IN ('prenotata', 'presente')), 0)::int AS posti_liberi
  FROM pal_lezioni l JOIN pal_corsi c ON c.id = l.corso_id
  LEFT JOIN pal_prenotazioni p ON p.lezione_id = l.id
 GROUP BY l.id, c.id;

-- Trainer: clienti, sessioni fatte e residue, compensi del mese (§14).
-- I compensi sono dati economici: la vista li mostra solo alla direzione o al trainer stesso.
CREATE VIEW pal_trainer_riepilogo WITH (security_invoker = true) AS
SELECT t.id AS trainer_id, t.nome, t.personal_trainer,
       (SELECT count(*) FROM pal_soci s WHERE s.trainer_id = t.id AND s.ex_socio_at IS NULL)::int AS clienti,
       (SELECT count(*) FROM pal_sessioni_pt x WHERE x.trainer_id = t.id AND x.stato = 'svolta')::int AS sessioni_svolte,
       (SELECT count(*) FROM pal_sessioni_pt x WHERE x.trainer_id = t.id AND x.stato = 'prenotata' AND x.inizio > NOW())::int AS sessioni_prenotate,
       (SELECT COALESCE(sum(c.totale - c.usati), 0) FROM pal_carnet c JOIN pal_soci s ON s.id = c.socio_id
         WHERE s.trainer_id = t.id AND c.servizio = 'lezioni_pt' AND NOT c.annullato AND (c.scadenza IS NULL OR c.scadenza >= pal_oggi()))::int AS sessioni_residue_clienti,
       CASE WHEN puo_amministrazione() OR t.id = pal_trainer_corrente() THEN
         (SELECT COALESCE(sum(x.compenso), 0) FROM pal_sessioni_pt x WHERE x.trainer_id = t.id AND x.stato = 'svolta'
           AND date_trunc('month', x.inizio AT TIME ZONE 'Europe/Rome') = date_trunc('month', NOW() AT TIME ZONE 'Europe/Rome'))
         + (SELECT count(*) * t.compenso_lezione FROM pal_lezioni l WHERE l.istruttore_id = t.id AND l.stato = 'svolta'
           AND date_trunc('month', l.inizio AT TIME ZONE 'Europe/Rome') = date_trunc('month', NOW() AT TIME ZONE 'Europe/Rome'))
       END AS compensi_mese
  FROM pal_trainer t;

GRANT SELECT ON pal_lezioni_posti, pal_trainer_riepilogo TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'pal_prenotazione_prepara()', 'pal_scorri_attesa(uuid)', 'pal_prenotazione_stato()', 'pal_prenotazione_liberata()',
    'pal_prenotazione_conferma()', 'pal_chiudi_lezioni_finite()', 'pal_lezione_annullata()', 'pal_promemoria_corsi()',
    'pal_sessione_prepara()', 'pal_appuntamento_prepara()', 'pal_consenso_revocato()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY[
    'pal_trainer_corrente()', 'pal_puo_salute(uuid)', 'pal_genera_lezioni(uuid,date,date)', 'pal_chiudi_lezione(uuid)',
    'pal_nuova_versione_scheda(uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('palestra-lezioni-finite', 'palestra-promemoria');
SELECT cron.schedule('palestra-lezioni-finite', '*/15 * * * *', $$SELECT pal_chiudi_lezioni_finite()$$);
SELECT cron.schedule('palestra-promemoria', '0 18 * * *', $$SELECT pal_promemoria_corsi()$$);

SELECT applica_protezioni_tabelle();
