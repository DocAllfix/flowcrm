export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      allegati: {
        Row: {
          caricato_da: string | null
          created_at: string
          dimensione_bytes: number | null
          entita: string
          entita_id: string
          id: string
          mime_type: string | null
          nome_file: string
          nome_originale: string
          storage_path: string
        }
        Insert: {
          caricato_da?: string | null
          created_at?: string
          dimensione_bytes?: number | null
          entita: string
          entita_id: string
          id?: string
          mime_type?: string | null
          nome_file: string
          nome_originale: string
          storage_path: string
        }
        Update: {
          caricato_da?: string | null
          created_at?: string
          dimensione_bytes?: number | null
          entita?: string
          entita_id?: string
          id?: string
          mime_type?: string | null
          nome_file?: string
          nome_originale?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "allegati_caricato_da_fkey"
            columns: ["caricato_da"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attivita: {
        Row: {
          assegnato_a: string | null
          attivo: boolean
          commessa_id: string | null
          completata_at: string | null
          contatto_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          descrizione: string | null
          durata_minuti: number | null
          id: string
          inizio: string | null
          luogo: string | null
          organizzazione_id: string | null
          priorita: Database["public"]["Enums"]["priorita_type"]
          progetto_id: string | null
          scadenza: string | null
          stato: Database["public"]["Enums"]["attivita_stato"]
          tipo: Database["public"]["Enums"]["attivita_tipo"]
          titolo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assegnato_a?: string | null
          attivo?: boolean
          commessa_id?: string | null
          completata_at?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          descrizione?: string | null
          durata_minuti?: number | null
          id?: string
          inizio?: string | null
          luogo?: string | null
          organizzazione_id?: string | null
          priorita?: Database["public"]["Enums"]["priorita_type"]
          progetto_id?: string | null
          scadenza?: string | null
          stato?: Database["public"]["Enums"]["attivita_stato"]
          tipo: Database["public"]["Enums"]["attivita_tipo"]
          titolo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assegnato_a?: string | null
          attivo?: boolean
          commessa_id?: string | null
          completata_at?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          descrizione?: string | null
          durata_minuti?: number | null
          id?: string
          inizio?: string | null
          luogo?: string | null
          organizzazione_id?: string | null
          priorita?: Database["public"]["Enums"]["priorita_type"]
          progetto_id?: string | null
          scadenza?: string | null
          stato?: Database["public"]["Enums"]["attivita_stato"]
          tipo?: Database["public"]["Enums"]["attivita_tipo"]
          titolo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attivita_assegnato_a_fkey"
            columns: ["assegnato_a"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attivita_commessa"
            columns: ["commessa_id"]
            isOneToOne: false
            referencedRelation: "commesse"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attivita_progetto"
            columns: ["progetto_id"]
            isOneToOne: false
            referencedRelation: "progetti"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          azione: string
          created_at: string
          diff: Json
          entita: string
          entita_id: string
          eseguito_da: string | null
          id: string
        }
        Insert: {
          azione: string
          created_at?: string
          diff?: Json
          entita: string
          entita_id: string
          eseguito_da?: string | null
          id?: string
        }
        Update: {
          azione?: string
          created_at?: string
          diff?: Json
          entita?: string
          entita_id?: string
          eseguito_da?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_eseguito_da_fkey"
            columns: ["eseguito_da"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commesse: {
        Row: {
          attivo: boolean
          codice: string | null
          created_at: string
          created_by: string | null
          data_fine_prevista: string | null
          data_inizio: string
          deal_id: string | null
          descrizione: string
          id: string
          importo: number
          organizzazione_id: string
          progetto_id: string | null
          stato: Database["public"]["Enums"]["commessa_stato"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          codice?: string | null
          created_at?: string
          created_by?: string | null
          data_fine_prevista?: string | null
          data_inizio?: string
          deal_id?: string | null
          descrizione: string
          id?: string
          importo?: number
          organizzazione_id: string
          progetto_id?: string | null
          stato?: Database["public"]["Enums"]["commessa_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          codice?: string | null
          created_at?: string
          created_by?: string | null
          data_fine_prevista?: string | null
          data_inizio?: string
          deal_id?: string | null
          descrizione?: string
          id?: string
          importo?: number
          organizzazione_id?: string
          progetto_id?: string | null
          stato?: Database["public"]["Enums"]["commessa_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commesse_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commesse_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commesse_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commesse_progetto_id_fkey"
            columns: ["progetto_id"]
            isOneToOne: false
            referencedRelation: "progetti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commesse_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contatti: {
        Row: {
          attivo: boolean
          cognome: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          nome: string
          note: string | null
          organizzazione_id: string | null
          ricerca: unknown
          ruolo_aziendale: string | null
          telefono: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          cognome?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nome: string
          note?: string | null
          organizzazione_id?: string | null
          ricerca?: unknown
          ruolo_aziendale?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          cognome?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nome?: string
          note?: string | null
          organizzazione_id?: string | null
          ricerca?: unknown
          ruolo_aziendale?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatti_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_usage: {
        Row: {
          creato_at: string
          id: number
          user_id: string
        }
        Insert: {
          creato_at?: string
          id?: never
          user_id: string
        }
        Update: {
          creato_at?: string
          id?: never
          user_id?: string
        }
        Relationships: []
      }
      deal_stage_history: {
        Row: {
          cambiato_da: string | null
          created_at: string
          deal_id: string
          id: string
          stage_nuovo: string
          stage_precedente: string | null
        }
        Insert: {
          cambiato_da?: string | null
          created_at?: string
          deal_id: string
          id?: string
          stage_nuovo: string
          stage_precedente?: string | null
        }
        Update: {
          cambiato_da?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          stage_nuovo?: string
          stage_precedente?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_cambiato_da_fkey"
            columns: ["cambiato_da"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_stage_nuovo_fkey"
            columns: ["stage_nuovo"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_stage_nuovo_fkey"
            columns: ["stage_nuovo"]
            isOneToOne: false
            referencedRelation: "vw_pipeline_valore_pesato"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "deal_stage_history_stage_precedente_fkey"
            columns: ["stage_precedente"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_stage_precedente_fkey"
            columns: ["stage_precedente"]
            isOneToOne: false
            referencedRelation: "vw_pipeline_valore_pesato"
            referencedColumns: ["stage_id"]
          },
        ]
      }
      deals: {
        Row: {
          attivo: boolean
          chiuso_at: string | null
          contatto_id: string | null
          created_at: string
          created_by: string | null
          data_chiusura_prevista: string | null
          id: string
          importo: number
          motivo_perdita: string | null
          nome: string
          note: string | null
          organizzazione_id: string | null
          pipeline_id: string
          responsabile_id: string | null
          ricerca: unknown
          stage_id: string
          updated_at: string
          updated_by: string | null
          valuta: string
        }
        Insert: {
          attivo?: boolean
          chiuso_at?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          data_chiusura_prevista?: string | null
          id?: string
          importo?: number
          motivo_perdita?: string | null
          nome: string
          note?: string | null
          organizzazione_id?: string | null
          pipeline_id: string
          responsabile_id?: string | null
          ricerca?: unknown
          stage_id: string
          updated_at?: string
          updated_by?: string | null
          valuta?: string
        }
        Update: {
          attivo?: boolean
          chiuso_at?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          data_chiusura_prevista?: string | null
          id?: string
          importo?: number
          motivo_perdita?: string | null
          nome?: string
          note?: string | null
          organizzazione_id?: string | null
          pipeline_id?: string
          responsabile_id?: string | null
          ricerca?: unknown
          stage_id?: string
          updated_at?: string
          updated_by?: string | null
          valuta?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_responsabile_id_fkey"
            columns: ["responsabile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "vw_pipeline_valore_pesato"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "deals_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fatture: {
        Row: {
          aliquota_iva: number
          commessa_id: string | null
          created_at: string
          created_by: string | null
          data: string
          direzione: Database["public"]["Enums"]["fattura_direzione"]
          id: string
          imponibile: number
          note: string | null
          numero: string
          organizzazione_id: string
          pagata_at: string | null
          scadenza: string
          sdi_stato: Database["public"]["Enums"]["sdi_stato"]
          stato: Database["public"]["Enums"]["fattura_stato"]
          totale: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aliquota_iva?: number
          commessa_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          direzione?: Database["public"]["Enums"]["fattura_direzione"]
          id?: string
          imponibile?: number
          note?: string | null
          numero: string
          organizzazione_id: string
          pagata_at?: string | null
          scadenza: string
          sdi_stato?: Database["public"]["Enums"]["sdi_stato"]
          stato?: Database["public"]["Enums"]["fattura_stato"]
          totale?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aliquota_iva?: number
          commessa_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          direzione?: Database["public"]["Enums"]["fattura_direzione"]
          id?: string
          imponibile?: number
          note?: string | null
          numero?: string
          organizzazione_id?: string
          pagata_at?: string | null
          scadenza?: string
          sdi_stato?: Database["public"]["Enums"]["sdi_stato"]
          stato?: Database["public"]["Enums"]["fattura_stato"]
          totale?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fatture_commessa_id_fkey"
            columns: ["commessa_id"]
            isOneToOne: false
            referencedRelation: "commesse"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fatture_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fatture_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fatture_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_guida: {
        Row: {
          contenuto: string
          created_at: string
          embedding: string | null
          id: string
          titolo: string
        }
        Insert: {
          contenuto: string
          created_at?: string
          embedding?: string | null
          id?: string
          titolo: string
        }
        Update: {
          contenuto?: string
          created_at?: string
          embedding?: string | null
          id?: string
          titolo?: string
        }
        Relationships: []
      }
      messaggi: {
        Row: {
          allegato_id: string | null
          autore_id: string
          created_at: string
          entita: string
          entita_id: string | null
          id: string
          menzioni: string[]
          testo: string
        }
        Insert: {
          allegato_id?: string | null
          autore_id: string
          created_at?: string
          entita: string
          entita_id?: string | null
          id?: string
          menzioni?: string[]
          testo: string
        }
        Update: {
          allegato_id?: string | null
          autore_id?: string
          created_at?: string
          entita?: string
          entita_id?: string | null
          id?: string
          menzioni?: string[]
          testo?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaggi_allegato_id_fkey"
            columns: ["allegato_id"]
            isOneToOne: false
            referencedRelation: "allegati"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaggi_autore_id_fkey"
            columns: ["autore_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone: {
        Row: {
          completata: boolean
          created_at: string
          created_by: string | null
          data: string | null
          id: string
          ordine: number
          progetto_id: string
          titolo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          completata?: boolean
          created_at?: string
          created_by?: string | null
          data?: string | null
          id?: string
          ordine?: number
          progetto_id: string
          titolo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          completata?: boolean
          created_at?: string
          created_by?: string | null
          data?: string | null
          id?: string
          ordine?: number
          progetto_id?: string
          titolo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestone_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_progetto_id_fkey"
            columns: ["progetto_id"]
            isOneToOne: false
            referencedRelation: "progetti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifiche: {
        Row: {
          azione_url: string | null
          created_at: string
          destinatario_id: string
          id: string
          letta: boolean
          letta_at: string | null
          messaggio: string
          mittente_id: string | null
          tipo: Database["public"]["Enums"]["notifica_tipo"]
          titolo: string
        }
        Insert: {
          azione_url?: string | null
          created_at?: string
          destinatario_id: string
          id?: string
          letta?: boolean
          letta_at?: string | null
          messaggio: string
          mittente_id?: string | null
          tipo?: Database["public"]["Enums"]["notifica_tipo"]
          titolo: string
        }
        Update: {
          azione_url?: string | null
          created_at?: string
          destinatario_id?: string
          id?: string
          letta?: boolean
          letta_at?: string | null
          messaggio?: string
          mittente_id?: string | null
          tipo?: Database["public"]["Enums"]["notifica_tipo"]
          titolo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifiche_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifiche_mittente_id_fkey"
            columns: ["mittente_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifiche_scadenza_inviate: {
        Row: {
          entita: string
          entita_id: string
          giorni_soglia: number
          inviata_at: string
        }
        Insert: {
          entita: string
          entita_id: string
          giorni_soglia: number
          inviata_at?: string
        }
        Update: {
          entita?: string
          entita_id?: string
          giorni_soglia?: number
          inviata_at?: string
        }
        Relationships: []
      }
      organizzazioni: {
        Row: {
          attivo: boolean
          cap: string | null
          categoria_fornitore: string | null
          citta: string | null
          codice_fiscale: string | null
          created_at: string
          created_by: string | null
          dipendenti: number | null
          dominio: string | null
          email: string | null
          fatturato_annuo: number | null
          id: string
          indirizzo: string | null
          lead_fonte: Database["public"]["Enums"]["lead_fonte"] | null
          note: string | null
          partner_data_inizio: string | null
          partner_tipo: Database["public"]["Enums"]["partner_tipo"] | null
          pec: string | null
          piva: string | null
          provincia: string | null
          ragione_sociale: string
          referente_principale_id: string | null
          ricerca: unknown
          sdi_codice: string | null
          settore: string | null
          telefono: string | null
          updated_at: string
          updated_by: string | null
          valutazione_fornitore: number | null
        }
        Insert: {
          attivo?: boolean
          cap?: string | null
          categoria_fornitore?: string | null
          citta?: string | null
          codice_fiscale?: string | null
          created_at?: string
          created_by?: string | null
          dipendenti?: number | null
          dominio?: string | null
          email?: string | null
          fatturato_annuo?: number | null
          id?: string
          indirizzo?: string | null
          lead_fonte?: Database["public"]["Enums"]["lead_fonte"] | null
          note?: string | null
          partner_data_inizio?: string | null
          partner_tipo?: Database["public"]["Enums"]["partner_tipo"] | null
          pec?: string | null
          piva?: string | null
          provincia?: string | null
          ragione_sociale: string
          referente_principale_id?: string | null
          ricerca?: unknown
          sdi_codice?: string | null
          settore?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
          valutazione_fornitore?: number | null
        }
        Update: {
          attivo?: boolean
          cap?: string | null
          categoria_fornitore?: string | null
          citta?: string | null
          codice_fiscale?: string | null
          created_at?: string
          created_by?: string | null
          dipendenti?: number | null
          dominio?: string | null
          email?: string | null
          fatturato_annuo?: number | null
          id?: string
          indirizzo?: string | null
          lead_fonte?: Database["public"]["Enums"]["lead_fonte"] | null
          note?: string | null
          partner_data_inizio?: string | null
          partner_tipo?: Database["public"]["Enums"]["partner_tipo"] | null
          pec?: string | null
          piva?: string | null
          provincia?: string | null
          ragione_sociale?: string
          referente_principale_id?: string | null
          ricerca?: unknown
          sdi_codice?: string | null
          settore?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
          valutazione_fornitore?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_referente_principale"
            columns: ["referente_principale_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizzazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizzazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizzazioni_ruoli: {
        Row: {
          dal: string
          organizzazione_id: string
          ruolo: Database["public"]["Enums"]["org_ruolo"]
        }
        Insert: {
          dal?: string
          organizzazione_id: string
          ruolo: Database["public"]["Enums"]["org_ruolo"]
        }
        Update: {
          dal?: string
          organizzazione_id?: string
          ruolo?: Database["public"]["Enums"]["org_ruolo"]
        }
        Relationships: [
          {
            foreignKeyName: "organizzazioni_ruoli_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          attivo: boolean
          colore: string | null
          id: string
          is_lost: boolean
          is_won: boolean
          nome: string
          ordine: number
          pipeline_id: string
          probabilita: number
        }
        Insert: {
          attivo?: boolean
          colore?: string | null
          id?: string
          is_lost?: boolean
          is_won?: boolean
          nome: string
          ordine: number
          pipeline_id: string
          probabilita?: number
        }
        Update: {
          attivo?: boolean
          colore?: string | null
          id?: string
          is_lost?: boolean
          is_won?: boolean
          nome?: string
          ordine?: number
          pipeline_id?: string
          probabilita?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          nome?: string
        }
        Relationships: []
      }
      progetti: {
        Row: {
          attivo: boolean
          budget: number | null
          created_at: string
          created_by: string | null
          descrizione: string | null
          id: string
          nome: string
          organizzazione_id: string | null
          priorita: Database["public"]["Enums"]["priorita_type"]
          responsabile_id: string | null
          scadenza: string | null
          stato: Database["public"]["Enums"]["progetto_stato"]
          tipo: Database["public"]["Enums"]["progetto_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          budget?: number | null
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          id?: string
          nome: string
          organizzazione_id?: string | null
          priorita?: Database["public"]["Enums"]["priorita_type"]
          responsabile_id?: string | null
          scadenza?: string | null
          stato?: Database["public"]["Enums"]["progetto_stato"]
          tipo: Database["public"]["Enums"]["progetto_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          budget?: number | null
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          id?: string
          nome?: string
          organizzazione_id?: string | null
          priorita?: Database["public"]["Enums"]["priorita_type"]
          responsabile_id?: string | null
          scadenza?: string | null
          stato?: Database["public"]["Enums"]["progetto_stato"]
          tipo?: Database["public"]["Enums"]["progetto_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progetti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progetti_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progetti_responsabile_id_fkey"
            columns: ["responsabile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progetti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      riunioni_partecipanti: {
        Row: {
          attivita_id: string
          contatto_id: string | null
          user_id: string | null
        }
        Insert: {
          attivita_id: string
          contatto_id?: string | null
          user_id?: string | null
        }
        Update: {
          attivita_id?: string
          contatto_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "riunioni_partecipanti_attivita_id_fkey"
            columns: ["attivita_id"]
            isOneToOne: false
            referencedRelation: "attivita"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riunioni_partecipanti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riunioni_partecipanti_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scadenze_pagamento: {
        Row: {
          commessa_id: string | null
          created_at: string
          created_by: string | null
          data_prevista: string
          descrizione: string
          fattura_id: string | null
          id: string
          importo: number
          incassato_at: string | null
          note: string | null
          organizzazione_id: string
          stato: Database["public"]["Enums"]["pagamento_stato"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          commessa_id?: string | null
          created_at?: string
          created_by?: string | null
          data_prevista: string
          descrizione: string
          fattura_id?: string | null
          id?: string
          importo: number
          incassato_at?: string | null
          note?: string | null
          organizzazione_id: string
          stato?: Database["public"]["Enums"]["pagamento_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          commessa_id?: string | null
          created_at?: string
          created_by?: string | null
          data_prevista?: string
          descrizione?: string
          fattura_id?: string | null
          id?: string
          importo?: number
          incassato_at?: string | null
          note?: string | null
          organizzazione_id?: string
          stato?: Database["public"]["Enums"]["pagamento_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scadenze_pagamento_commessa_id_fkey"
            columns: ["commessa_id"]
            isOneToOne: false
            referencedRelation: "commesse"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scadenze_pagamento_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scadenze_pagamento_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scadenze_pagamento_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scadenze_pagamento_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scadenze_tasse: {
        Row: {
          created_at: string
          created_by: string | null
          data_pagamento: string | null
          id: string
          importo: number
          note: string | null
          scadenza: string
          stato: Database["public"]["Enums"]["tassa_stato"]
          tipo_tassa: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          id?: string
          importo: number
          note?: string | null
          scadenza: string
          stato?: Database["public"]["Enums"]["tassa_stato"]
          tipo_tassa: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          id?: string
          importo?: number
          note?: string | null
          scadenza?: string
          stato?: Database["public"]["Enums"]["tassa_stato"]
          tipo_tassa?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scadenze_tasse_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scadenze_tasse_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          attivo: boolean
          avatar_url: string | null
          cognome: string | null
          created_at: string
          id: string
          nome: string
          ruolo: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          attivo?: boolean
          avatar_url?: string | null
          cognome?: string | null
          created_at?: string
          id: string
          nome: string
          ruolo?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          attivo?: boolean
          avatar_url?: string | null
          cognome?: string | null
          created_at?: string
          id?: string
          nome?: string
          ruolo?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
    }
    Views: {
      vw_cash_flow_previsto: {
        Row: {
          entrate: number | null
          mese: string | null
          netto: number | null
          uscite: number | null
        }
        Relationships: []
      }
      vw_fatturato_mensile: {
        Row: {
          mese: string | null
          totale: number | null
        }
        Relationships: []
      }
      vw_fatturato_organizzazione: {
        Row: {
          anno: number | null
          organizzazione_id: string | null
          totale: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fatture_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_fatture_per_stato: {
        Row: {
          numero: number | null
          stato: string | null
          totale: number | null
        }
        Relationships: []
      }
      vw_kpi_economici: {
        Row: {
          da_incassare: number | null
          fatturato_ytd: number | null
          incassato_mese: number | null
          scaduto: number | null
          tasse_30gg: number | null
        }
        Relationships: []
      }
      vw_ordinato_mensile: {
        Row: {
          mese: string | null
          totale: number | null
        }
        Relationships: []
      }
      vw_pipeline_valore_pesato: {
        Row: {
          colore: string | null
          n_deal: number | null
          nome: string | null
          ordine: number | null
          stage_id: string | null
          valore: number | null
          valore_pesato: number | null
        }
        Relationships: []
      }
      vw_top_clienti: {
        Row: {
          organizzazione_id: string | null
          ragione_sociale: string | null
          totale: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fatture_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      allegato_riservato: { Args: { p_path: string }; Returns: boolean }
      copilot_rate_check: {
        Args: { per_giorno?: number; per_minuto?: number }
        Returns: Json
      }
      crea_notifica: {
        Args: {
          p_azione_url?: string
          p_destinatario_id: string
          p_messaggio: string
          p_mittente_id?: string
          p_tipo: Database["public"]["Enums"]["notifica_tipo"]
          p_titolo: string
        }
        Returns: string
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      match_kb_guida: {
        Args: { match_count?: number; query_embedding: string; soglia?: number }
        Returns: {
          contenuto: string
          similarita: number
          titolo: string
        }[]
      }
      notifica_deal_a_rischio: { Args: { giorni?: number }; Returns: number }
      processa_scadenze: { Args: never; Returns: number }
      puo_amministrazione: { Args: never; Returns: boolean }
      ricerca_globale: {
        Args: { q: string }
        Returns: {
          id: string
          sottotitolo: string
          tipo: string
          titolo: string
        }[]
      }
    }
    Enums: {
      attivita_stato: "da_fare" | "in_corso" | "completata" | "annullata"
      attivita_tipo: "task" | "chiamata" | "email" | "riunione" | "nota"
      commessa_stato: "attiva" | "in_pausa" | "completata" | "annullata"
      fattura_direzione: "attiva" | "passiva"
      fattura_stato: "da_pagare" | "pagata" | "scaduta" | "parziale"
      lead_fonte: "fiera" | "referral" | "linkedin" | "web" | "evento" | "altro"
      notifica_tipo: "info" | "warning" | "critical" | "success" | "sistema"
      org_ruolo:
        | "cliente"
        | "fornitore"
        | "partner"
        | "potenziale_partner"
        | "prospect"
      pagamento_stato: "da_incassare" | "incassato" | "in_ritardo" | "parziale"
      partner_tipo: "rivenditore" | "tecnologico" | "strategico" | "commerciale"
      priorita_type: "bassa" | "media" | "alta" | "critica"
      progetto_stato:
        | "pianificazione"
        | "in_corso"
        | "in_revisione"
        | "completato"
        | "sospeso"
      progetto_tipo: "cliente" | "interno"
      sdi_stato:
        | "non_applicabile"
        | "da_inviare"
        | "inviata"
        | "consegnata"
        | "scartata"
        | "mancata_consegna"
      tassa_stato: "da_pagare" | "pagata" | "scaduta"
      user_role: "admin" | "manager" | "operatore"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      attivita_stato: ["da_fare", "in_corso", "completata", "annullata"],
      attivita_tipo: ["task", "chiamata", "email", "riunione", "nota"],
      commessa_stato: ["attiva", "in_pausa", "completata", "annullata"],
      fattura_direzione: ["attiva", "passiva"],
      fattura_stato: ["da_pagare", "pagata", "scaduta", "parziale"],
      lead_fonte: ["fiera", "referral", "linkedin", "web", "evento", "altro"],
      notifica_tipo: ["info", "warning", "critical", "success", "sistema"],
      org_ruolo: [
        "cliente",
        "fornitore",
        "partner",
        "potenziale_partner",
        "prospect",
      ],
      pagamento_stato: ["da_incassare", "incassato", "in_ritardo", "parziale"],
      partner_tipo: ["rivenditore", "tecnologico", "strategico", "commerciale"],
      priorita_type: ["bassa", "media", "alta", "critica"],
      progetto_stato: [
        "pianificazione",
        "in_corso",
        "in_revisione",
        "completato",
        "sospeso",
      ],
      progetto_tipo: ["cliente", "interno"],
      sdi_stato: [
        "non_applicabile",
        "da_inviare",
        "inviata",
        "consegnata",
        "scartata",
        "mancata_consegna",
      ],
      tassa_stato: ["da_pagare", "pagata", "scaduta"],
      user_role: ["admin", "manager", "operatore"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
