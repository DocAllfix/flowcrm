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
          categoria: string | null
          created_at: string
          dimensione_bytes: number | null
          entita: string
          entita_id: string
          id: string
          mime_type: string | null
          nome_file: string
          nome_originale: string
          sottocategoria: string | null
          storage_path: string
        }
        Insert: {
          caricato_da?: string | null
          categoria?: string | null
          created_at?: string
          dimensione_bytes?: number | null
          entita: string
          entita_id: string
          id?: string
          mime_type?: string | null
          nome_file: string
          nome_originale: string
          sottocategoria?: string | null
          storage_path: string
        }
        Update: {
          caricato_da?: string | null
          categoria?: string | null
          created_at?: string
          dimensione_bytes?: number | null
          entita?: string
          entita_id?: string
          id?: string
          mime_type?: string | null
          nome_file?: string
          nome_originale?: string
          sottocategoria?: string | null
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
      approvazioni: {
        Row: {
          approvatore_id: string | null
          azione_url: string | null
          created_at: string
          dati: Json
          decisa_at: string | null
          descrizione: string
          entita: string
          entita_id: string
          id: string
          modulo: string
          motivazione: string | null
          richiedente_id: string
          stato: Database["public"]["Enums"]["approvazione_stato"]
          tipo_richiesta: string
          updated_at: string
        }
        Insert: {
          approvatore_id?: string | null
          azione_url?: string | null
          created_at?: string
          dati?: Json
          decisa_at?: string | null
          descrizione: string
          entita: string
          entita_id: string
          id?: string
          modulo: string
          motivazione?: string | null
          richiedente_id: string
          stato?: Database["public"]["Enums"]["approvazione_stato"]
          tipo_richiesta: string
          updated_at?: string
        }
        Update: {
          approvatore_id?: string | null
          azione_url?: string | null
          created_at?: string
          dati?: Json
          decisa_at?: string | null
          descrizione?: string
          entita?: string
          entita_id?: string
          id?: string
          modulo?: string
          motivazione?: string | null
          richiedente_id?: string
          stato?: Database["public"]["Enums"]["approvazione_stato"]
          tipo_richiesta?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvazioni_approvatore_id_fkey"
            columns: ["approvatore_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvazioni_richiedente_id_fkey"
            columns: ["richiedente_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assenze: {
        Row: {
          created_at: string
          created_by: string | null
          data_fine: string
          data_inizio: string
          dipendente_id: string
          id: string
          note: string | null
          stato: Database["public"]["Enums"]["assenza_stato"]
          tipo: Database["public"]["Enums"]["assenza_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_fine: string
          data_inizio: string
          dipendente_id: string
          id?: string
          note?: string | null
          stato?: Database["public"]["Enums"]["assenza_stato"]
          tipo?: Database["public"]["Enums"]["assenza_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_fine?: string
          data_inizio?: string
          dipendente_id?: string
          id?: string
          note?: string | null
          stato?: Database["public"]["Enums"]["assenza_stato"]
          tipo?: Database["public"]["Enums"]["assenza_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assenze_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assenze_dipendente_id_fkey"
            columns: ["dipendente_id"]
            isOneToOne: false
            referencedRelation: "dipendenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assenze_updated_by_fkey"
            columns: ["updated_by"]
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
          automezzo_id: string | null
          cantiere_id: string | null
          commessa_id: string | null
          completata_at: string | null
          contatto_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          descrizione: string | null
          durata_minuti: number | null
          gara_id: string | null
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
          automezzo_id?: string | null
          cantiere_id?: string | null
          commessa_id?: string | null
          completata_at?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          descrizione?: string | null
          durata_minuti?: number | null
          gara_id?: string | null
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
          automezzo_id?: string | null
          cantiere_id?: string | null
          commessa_id?: string | null
          completata_at?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          descrizione?: string | null
          durata_minuti?: number | null
          gara_id?: string | null
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
            foreignKeyName: "attivita_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "automezzi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_consumi"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "attivita_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_costo_km"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "attivita_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "attivita_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
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
            foreignKeyName: "attivita_gara_id_fkey"
            columns: ["gara_id"]
            isOneToOne: false
            referencedRelation: "gare"
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
      automezzi: {
        Row: {
          acquisizione: Database["public"]["Enums"]["automezzo_acquisizione"]
          alimentazione:
            | Database["public"]["Enums"]["automezzo_alimentazione"]
            | null
          anno_immatricolazione: number | null
          attivo: boolean
          cantiere_id: string | null
          categoria: Database["public"]["Enums"]["automezzo_categoria"]
          centro_costo: string | null
          classe_euro: string | null
          codice: string | null
          created_at: string
          created_by: string | null
          data_acquisto: string | null
          dismesso_il: string | null
          dismissione_note: string | null
          dismissione_tipo:
            | Database["public"]["Enums"]["automezzo_dismissione"]
            | null
          dismissione_valore: number | null
          id: string
          km_attuali: number
          marca: string
          modello: string
          note: string | null
          proprietario: string | null
          ricerca: unknown
          sede: string | null
          stato: Database["public"]["Enums"]["automezzo_stato"]
          targa: string | null
          telaio: string | null
          updated_at: string
          updated_by: string | null
          versione: string | null
        }
        Insert: {
          acquisizione?: Database["public"]["Enums"]["automezzo_acquisizione"]
          alimentazione?:
            | Database["public"]["Enums"]["automezzo_alimentazione"]
            | null
          anno_immatricolazione?: number | null
          attivo?: boolean
          cantiere_id?: string | null
          categoria?: Database["public"]["Enums"]["automezzo_categoria"]
          centro_costo?: string | null
          classe_euro?: string | null
          codice?: string | null
          created_at?: string
          created_by?: string | null
          data_acquisto?: string | null
          dismesso_il?: string | null
          dismissione_note?: string | null
          dismissione_tipo?:
            | Database["public"]["Enums"]["automezzo_dismissione"]
            | null
          dismissione_valore?: number | null
          id?: string
          km_attuali?: number
          marca: string
          modello: string
          note?: string | null
          proprietario?: string | null
          ricerca?: unknown
          sede?: string | null
          stato?: Database["public"]["Enums"]["automezzo_stato"]
          targa?: string | null
          telaio?: string | null
          updated_at?: string
          updated_by?: string | null
          versione?: string | null
        }
        Update: {
          acquisizione?: Database["public"]["Enums"]["automezzo_acquisizione"]
          alimentazione?:
            | Database["public"]["Enums"]["automezzo_alimentazione"]
            | null
          anno_immatricolazione?: number | null
          attivo?: boolean
          cantiere_id?: string | null
          categoria?: Database["public"]["Enums"]["automezzo_categoria"]
          centro_costo?: string | null
          classe_euro?: string | null
          codice?: string | null
          created_at?: string
          created_by?: string | null
          data_acquisto?: string | null
          dismesso_il?: string | null
          dismissione_note?: string | null
          dismissione_tipo?:
            | Database["public"]["Enums"]["automezzo_dismissione"]
            | null
          dismissione_valore?: number | null
          id?: string
          km_attuali?: number
          marca?: string
          modello?: string
          note?: string | null
          proprietario?: string | null
          ricerca?: unknown
          sede?: string | null
          stato?: Database["public"]["Enums"]["automezzo_stato"]
          targa?: string | null
          telaio?: string | null
          updated_at?: string
          updated_by?: string | null
          versione?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automezzi_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "automezzi_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "automezzi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automezzi_assegnazioni: {
        Row: {
          assegnatario: string | null
          automezzo_id: string
          cantiere_id: string | null
          created_at: string
          created_by: string | null
          data_fine: string | null
          data_inizio: string
          dipendente_id: string | null
          id: string
          km_finali: number | null
          km_iniziali: number | null
          motivo: string | null
          note: string | null
          reparto: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assegnatario?: string | null
          automezzo_id: string
          cantiere_id?: string | null
          created_at?: string
          created_by?: string | null
          data_fine?: string | null
          data_inizio?: string
          dipendente_id?: string | null
          id?: string
          km_finali?: number | null
          km_iniziali?: number | null
          motivo?: string | null
          note?: string | null
          reparto?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assegnatario?: string | null
          automezzo_id?: string
          cantiere_id?: string | null
          created_at?: string
          created_by?: string | null
          data_fine?: string | null
          data_inizio?: string
          dipendente_id?: string | null
          id?: string
          km_finali?: number | null
          km_iniziali?: number | null
          motivo?: string | null
          note?: string | null
          reparto?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automezzi_assegnazioni_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "automezzi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_assegnazioni_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_consumi"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_assegnazioni_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_costo_km"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_assegnazioni_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_assegnazioni_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "automezzi_assegnazioni_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "automezzi_assegnazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_assegnazioni_dipendente_id_fkey"
            columns: ["dipendente_id"]
            isOneToOne: false
            referencedRelation: "dipendenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_assegnazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automezzi_attrezzature: {
        Row: {
          automezzo_id: string
          created_at: string
          created_by: string | null
          descrizione: string
          id: string
          matricola: string | null
          note: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          automezzo_id: string
          created_at?: string
          created_by?: string | null
          descrizione: string
          id?: string
          matricola?: string | null
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          automezzo_id?: string
          created_at?: string
          created_by?: string | null
          descrizione?: string
          id?: string
          matricola?: string | null
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automezzi_attrezzature_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "automezzi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_attrezzature_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_consumi"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_attrezzature_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_costo_km"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_attrezzature_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_attrezzature_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automezzi_costi: {
        Row: {
          automezzo_id: string
          created_at: string
          created_by: string | null
          data: string
          descrizione: string
          id: string
          importo: number
          note: string | null
          updated_at: string
          updated_by: string | null
          voce: Database["public"]["Enums"]["automezzo_costo_voce"]
        }
        Insert: {
          automezzo_id: string
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione: string
          id?: string
          importo?: number
          note?: string | null
          updated_at?: string
          updated_by?: string | null
          voce?: Database["public"]["Enums"]["automezzo_costo_voce"]
        }
        Update: {
          automezzo_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione?: string
          id?: string
          importo?: number
          note?: string | null
          updated_at?: string
          updated_by?: string | null
          voce?: Database["public"]["Enums"]["automezzo_costo_voce"]
        }
        Relationships: [
          {
            foreignKeyName: "automezzi_costi_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "automezzi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_costi_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_consumi"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_costi_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_costo_km"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_costi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_costi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automezzi_manutenzioni: {
        Row: {
          automezzo_id: string
          categoria: string | null
          costo_manodopera: number | null
          costo_materiali: number | null
          created_at: string
          created_by: string | null
          data: string
          descrizione: string
          id: string
          km: number | null
          note: string | null
          officina: string | null
          ore_fermo: number | null
          tipo: Database["public"]["Enums"]["manutenzione_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          automezzo_id: string
          categoria?: string | null
          costo_manodopera?: number | null
          costo_materiali?: number | null
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione: string
          id?: string
          km?: number | null
          note?: string | null
          officina?: string | null
          ore_fermo?: number | null
          tipo?: Database["public"]["Enums"]["manutenzione_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          automezzo_id?: string
          categoria?: string | null
          costo_manodopera?: number | null
          costo_materiali?: number | null
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione?: string
          id?: string
          km?: number | null
          note?: string | null
          officina?: string | null
          ore_fermo?: number | null
          tipo?: Database["public"]["Enums"]["manutenzione_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automezzi_manutenzioni_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "automezzi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_manutenzioni_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_consumi"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_manutenzioni_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_costo_km"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_manutenzioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_manutenzioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automezzi_multe: {
        Row: {
          automezzo_id: string
          conducente: string | null
          created_at: string
          created_by: string | null
          data: string
          ente: string | null
          id: string
          importo: number
          note: string | null
          pagata: boolean
          punti_decurtati: number | null
          ricorso: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          automezzo_id: string
          conducente?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          ente?: string | null
          id?: string
          importo?: number
          note?: string | null
          pagata?: boolean
          punti_decurtati?: number | null
          ricorso?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          automezzo_id?: string
          conducente?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          ente?: string | null
          id?: string
          importo?: number
          note?: string | null
          pagata?: boolean
          punti_decurtati?: number | null
          ricorso?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automezzi_multe_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "automezzi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_multe_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_consumi"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_multe_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_costo_km"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_multe_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_multe_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automezzi_pneumatici: {
        Row: {
          automezzo_id: string
          created_at: string
          created_by: string | null
          data_installazione: string
          id: string
          km_installazione: number | null
          marca: string | null
          misura: string | null
          montati: boolean
          note: string | null
          tipologia: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          automezzo_id: string
          created_at?: string
          created_by?: string | null
          data_installazione?: string
          id?: string
          km_installazione?: number | null
          marca?: string | null
          misura?: string | null
          montati?: boolean
          note?: string | null
          tipologia: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          automezzo_id?: string
          created_at?: string
          created_by?: string | null
          data_installazione?: string
          id?: string
          km_installazione?: number | null
          marca?: string | null
          misura?: string | null
          montati?: boolean
          note?: string | null
          tipologia?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automezzi_pneumatici_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "automezzi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_pneumatici_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_consumi"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_pneumatici_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_costo_km"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_pneumatici_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_pneumatici_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automezzi_ricambi: {
        Row: {
          automezzo_id: string | null
          codice: string | null
          created_at: string
          created_by: string | null
          descrizione: string
          fornitore_id: string | null
          id: string
          note: string | null
          quantita: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          automezzo_id?: string | null
          codice?: string | null
          created_at?: string
          created_by?: string | null
          descrizione: string
          fornitore_id?: string | null
          id?: string
          note?: string | null
          quantita?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          automezzo_id?: string | null
          codice?: string | null
          created_at?: string
          created_by?: string | null
          descrizione?: string
          fornitore_id?: string | null
          id?: string
          note?: string | null
          quantita?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automezzi_ricambi_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "automezzi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_ricambi_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_consumi"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_ricambi_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_costo_km"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_ricambi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_ricambi_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_ricambi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automezzi_rifornimenti: {
        Row: {
          automezzo_id: string
          carta: string | null
          conducente: string | null
          costo: number
          created_at: string
          created_by: string | null
          data: string
          fornitore: string | null
          id: string
          km: number | null
          litri: number
          note: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          automezzo_id: string
          carta?: string | null
          conducente?: string | null
          costo: number
          created_at?: string
          created_by?: string | null
          data?: string
          fornitore?: string | null
          id?: string
          km?: number | null
          litri: number
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          automezzo_id?: string
          carta?: string | null
          conducente?: string | null
          costo?: number
          created_at?: string
          created_by?: string | null
          data?: string
          fornitore?: string | null
          id?: string
          km?: number | null
          litri?: number
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automezzi_rifornimenti_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "automezzi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_rifornimenti_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_consumi"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_rifornimenti_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_costo_km"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_rifornimenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_rifornimenti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automezzi_sinistri: {
        Row: {
          assicurazione: string | null
          automezzo_id: string
          conducente: string | null
          controparte: string | null
          created_at: string
          created_by: string | null
          data: string
          descrizione: string
          id: string
          importo_liquidato: number | null
          luogo: string | null
          note: string | null
          pratica: string | null
          stato: Database["public"]["Enums"]["sinistro_stato"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assicurazione?: string | null
          automezzo_id: string
          conducente?: string | null
          controparte?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione: string
          id?: string
          importo_liquidato?: number | null
          luogo?: string | null
          note?: string | null
          pratica?: string | null
          stato?: Database["public"]["Enums"]["sinistro_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assicurazione?: string | null
          automezzo_id?: string
          conducente?: string | null
          controparte?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione?: string
          id?: string
          importo_liquidato?: number | null
          luogo?: string | null
          note?: string | null
          pratica?: string | null
          stato?: Database["public"]["Enums"]["sinistro_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automezzi_sinistri_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "automezzi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_sinistri_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_consumi"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_sinistri_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_costo_km"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_sinistri_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_sinistri_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automezzi_utilizzi: {
        Row: {
          anomalie: string | null
          automezzo_id: string
          cantiere_id: string | null
          conducente: string | null
          created_at: string
          created_by: string | null
          data: string
          destinazione: string | null
          id: string
          km_finali: number | null
          km_iniziali: number | null
          motivo: string | null
          ore_motore: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          anomalie?: string | null
          automezzo_id: string
          cantiere_id?: string | null
          conducente?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          destinazione?: string | null
          id?: string
          km_finali?: number | null
          km_iniziali?: number | null
          motivo?: string | null
          ore_motore?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          anomalie?: string | null
          automezzo_id?: string
          cantiere_id?: string | null
          conducente?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          destinazione?: string | null
          id?: string
          km_finali?: number | null
          km_iniziali?: number | null
          motivo?: string | null
          ore_motore?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automezzi_utilizzi_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "automezzi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_utilizzi_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_consumi"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_utilizzi_automezzo_id_fkey"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_costo_km"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "automezzi_utilizzi_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_utilizzi_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "automezzi_utilizzi_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "automezzi_utilizzi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automezzi_utilizzi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cantiere_controlli_qualita: {
        Row: {
          approvato_dl: boolean
          azione_correttiva: string | null
          cantiere_id: string
          created_at: string
          created_by: string | null
          data: string
          descrizione: string
          esito: Database["public"]["Enums"]["cantiere_qualita_esito"]
          id: string
          tipo: Database["public"]["Enums"]["cantiere_qualita_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approvato_dl?: boolean
          azione_correttiva?: string | null
          cantiere_id: string
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione: string
          esito?: Database["public"]["Enums"]["cantiere_qualita_esito"]
          id?: string
          tipo: Database["public"]["Enums"]["cantiere_qualita_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approvato_dl?: boolean
          azione_correttiva?: string | null
          cantiere_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione?: string
          esito?: Database["public"]["Enums"]["cantiere_qualita_esito"]
          id?: string
          tipo?: Database["public"]["Enums"]["cantiere_qualita_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cantiere_controlli_qualita_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_controlli_qualita_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_controlli_qualita_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_controlli_qualita_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_controlli_qualita_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cantiere_costi: {
        Row: {
          cantiere_id: string
          created_at: string
          created_by: string | null
          data: string
          descrizione: string
          id: string
          importo: number
          note: string | null
          tipo: Database["public"]["Enums"]["cantiere_costo_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cantiere_id: string
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione: string
          id?: string
          importo?: number
          note?: string | null
          tipo?: Database["public"]["Enums"]["cantiere_costo_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cantiere_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione?: string
          id?: string
          importo?: number
          note?: string | null
          tipo?: Database["public"]["Enums"]["cantiere_costo_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cantiere_costi_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_costi_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_costi_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_costi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_costi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cantiere_eventi_sicurezza: {
        Row: {
          azioni: string | null
          cantiere_id: string
          chiuso: boolean
          chiuso_at: string | null
          created_at: string
          created_by: string | null
          data: string
          descrizione: string
          gravita: Database["public"]["Enums"]["priorita_type"]
          id: string
          tipo: Database["public"]["Enums"]["cantiere_sicurezza_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          azioni?: string | null
          cantiere_id: string
          chiuso?: boolean
          chiuso_at?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione: string
          gravita?: Database["public"]["Enums"]["priorita_type"]
          id?: string
          tipo: Database["public"]["Enums"]["cantiere_sicurezza_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          azioni?: string | null
          cantiere_id?: string
          chiuso?: boolean
          chiuso_at?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione?: string
          gravita?: Database["public"]["Enums"]["priorita_type"]
          id?: string
          tipo?: Database["public"]["Enums"]["cantiere_sicurezza_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cantiere_eventi_sicurezza_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_eventi_sicurezza_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_eventi_sicurezza_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_eventi_sicurezza_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_eventi_sicurezza_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cantiere_fasi: {
        Row: {
          avanzamento: number
          cantiere_id: string
          created_at: string
          created_by: string | null
          data_fine: string | null
          data_inizio: string | null
          dipende_da: string | null
          id: string
          nome: string
          note: string | null
          ordine: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avanzamento?: number
          cantiere_id: string
          created_at?: string
          created_by?: string | null
          data_fine?: string | null
          data_inizio?: string | null
          dipende_da?: string | null
          id?: string
          nome: string
          note?: string | null
          ordine?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avanzamento?: number
          cantiere_id?: string
          created_at?: string
          created_by?: string | null
          data_fine?: string | null
          data_inizio?: string | null
          dipende_da?: string | null
          id?: string
          nome?: string
          note?: string | null
          ordine?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cantiere_fasi_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_fasi_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_fasi_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_fasi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_fasi_dipende_da_fkey"
            columns: ["dipende_da"]
            isOneToOne: false
            referencedRelation: "cantiere_fasi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_fasi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cantiere_imprese: {
        Row: {
          attivo: boolean
          cantiere_id: string
          created_at: string
          created_by: string | null
          id: string
          importo_affidato: number | null
          lavorazioni: string | null
          note: string | null
          organizzazione_id: string
          referente: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          cantiere_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          importo_affidato?: number | null
          lavorazioni?: string | null
          note?: string | null
          organizzazione_id: string
          referente?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          cantiere_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          importo_affidato?: number | null
          lavorazioni?: string | null
          note?: string | null
          organizzazione_id?: string
          referente?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cantiere_imprese_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_imprese_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_imprese_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_imprese_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_imprese_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_imprese_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cantiere_materiali: {
        Row: {
          cantiere_id: string
          created_at: string
          created_by: string | null
          data: string
          descrizione: string
          fornitore_id: string | null
          id: string
          movimento: Database["public"]["Enums"]["cantiere_movimento_tipo"]
          note: string | null
          quantita: number
          unita: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cantiere_id: string
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione: string
          fornitore_id?: string | null
          id?: string
          movimento?: Database["public"]["Enums"]["cantiere_movimento_tipo"]
          note?: string | null
          quantita?: number
          unita?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cantiere_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione?: string
          fornitore_id?: string | null
          id?: string
          movimento?: Database["public"]["Enums"]["cantiere_movimento_tipo"]
          note?: string | null
          quantita?: number
          unita?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cantiere_materiali_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_materiali_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_materiali_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_materiali_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_materiali_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_materiali_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cantiere_mezzi: {
        Row: {
          al: string | null
          automezzo_id: string | null
          cantiere_id: string
          created_at: string
          created_by: string | null
          dal: string
          descrizione: string
          id: string
          note: string | null
          tipo: Database["public"]["Enums"]["cantiere_mezzo_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          al?: string | null
          automezzo_id?: string | null
          cantiere_id: string
          created_at?: string
          created_by?: string | null
          dal?: string
          descrizione: string
          id?: string
          note?: string | null
          tipo?: Database["public"]["Enums"]["cantiere_mezzo_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          al?: string | null
          automezzo_id?: string | null
          cantiere_id?: string
          created_at?: string
          created_by?: string | null
          dal?: string
          descrizione?: string
          id?: string
          note?: string | null
          tipo?: Database["public"]["Enums"]["cantiere_mezzo_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cantiere_mezzi_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_mezzi_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_mezzi_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_mezzi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_mezzi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cantiere_mezzi_automezzo"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "automezzi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cantiere_mezzi_automezzo"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_consumi"
            referencedColumns: ["automezzo_id"]
          },
          {
            foreignKeyName: "fk_cantiere_mezzi_automezzo"
            columns: ["automezzo_id"]
            isOneToOne: false
            referencedRelation: "vw_automezzo_costo_km"
            referencedColumns: ["automezzo_id"]
          },
        ]
      }
      cantiere_misure: {
        Row: {
          cantiere_id: string
          created_at: string
          created_by: string | null
          data: string
          descrizione: string
          id: string
          prezzo_unitario: number
          quantita: number
          sal_id: string | null
          unita: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cantiere_id: string
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione: string
          id?: string
          prezzo_unitario?: number
          quantita?: number
          sal_id?: string | null
          unita?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cantiere_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione?: string
          id?: string
          prezzo_unitario?: number
          quantita?: number
          sal_id?: string | null
          unita?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cantiere_misure_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_misure_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_misure_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_misure_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_misure_sal_id_fkey"
            columns: ["sal_id"]
            isOneToOne: false
            referencedRelation: "cantiere_sal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_misure_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cantiere_personale: {
        Row: {
          attivo: boolean
          cantiere_id: string
          created_at: string
          created_by: string | null
          dipendente_id: string | null
          dpi_assegnati: string | null
          id: string
          impresa_id: string | null
          nominativo: string | null
          note: string | null
          ruolo: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          cantiere_id: string
          created_at?: string
          created_by?: string | null
          dipendente_id?: string | null
          dpi_assegnati?: string | null
          id?: string
          impresa_id?: string | null
          nominativo?: string | null
          note?: string | null
          ruolo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          cantiere_id?: string
          created_at?: string
          created_by?: string | null
          dipendente_id?: string | null
          dpi_assegnati?: string | null
          id?: string
          impresa_id?: string | null
          nominativo?: string | null
          note?: string | null
          ruolo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cantiere_personale_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_personale_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_personale_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_personale_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_personale_dipendente_id_fkey"
            columns: ["dipendente_id"]
            isOneToOne: false
            referencedRelation: "dipendenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_personale_impresa_id_fkey"
            columns: ["impresa_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_personale_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cantiere_presenze: {
        Row: {
          cantiere_id: string
          created_at: string
          created_by: string | null
          data: string
          id: string
          note: string | null
          ore: number
          personale_id: string
        }
        Insert: {
          cantiere_id: string
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          note?: string | null
          ore?: number
          personale_id: string
        }
        Update: {
          cantiere_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          note?: string | null
          ore?: number
          personale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cantiere_presenze_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_presenze_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_presenze_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_presenze_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_presenze_personale_id_fkey"
            columns: ["personale_id"]
            isOneToOne: false
            referencedRelation: "cantiere_personale"
            referencedColumns: ["id"]
          },
        ]
      }
      cantiere_rapportini: {
        Row: {
          cantiere_id: string
          capocantiere_id: string | null
          created_at: string
          created_by: string | null
          data: string
          id: string
          lavorazioni: string
          materiali: string | null
          meteo: Database["public"]["Enums"]["cantiere_meteo"] | null
          mezzi: string | null
          note: string | null
          personale: string | null
          problemi: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cantiere_id: string
          capocantiere_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          lavorazioni: string
          materiali?: string | null
          meteo?: Database["public"]["Enums"]["cantiere_meteo"] | null
          mezzi?: string | null
          note?: string | null
          personale?: string | null
          problemi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cantiere_id?: string
          capocantiere_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          lavorazioni?: string
          materiali?: string | null
          meteo?: Database["public"]["Enums"]["cantiere_meteo"] | null
          mezzi?: string | null
          note?: string | null
          personale?: string | null
          problemi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cantiere_rapportini_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_rapportini_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_rapportini_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_rapportini_capocantiere_id_fkey"
            columns: ["capocantiere_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_rapportini_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_rapportini_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cantiere_registri_ambiente: {
        Row: {
          autorizzazione: string | null
          cantiere_id: string
          created_at: string
          created_by: string | null
          data: string
          descrizione: string
          formulario: string | null
          id: string
          note: string | null
          quantita: number | null
          tipo: Database["public"]["Enums"]["cantiere_ambiente_tipo"]
          unita: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          autorizzazione?: string | null
          cantiere_id: string
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione: string
          formulario?: string | null
          id?: string
          note?: string | null
          quantita?: number | null
          tipo: Database["public"]["Enums"]["cantiere_ambiente_tipo"]
          unita?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          autorizzazione?: string | null
          cantiere_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione?: string
          formulario?: string | null
          id?: string
          note?: string | null
          quantita?: number | null
          tipo?: Database["public"]["Enums"]["cantiere_ambiente_tipo"]
          unita?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cantiere_registri_ambiente_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_registri_ambiente_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_registri_ambiente_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_registri_ambiente_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_registri_ambiente_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cantiere_sal: {
        Row: {
          cantiere_id: string
          created_at: string
          created_by: string | null
          data: string
          descrizione: string | null
          fattura_id: string | null
          id: string
          importo: number
          note: string | null
          numero: number
          stato: Database["public"]["Enums"]["cantiere_sal_stato"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cantiere_id: string
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione?: string | null
          fattura_id?: string | null
          id?: string
          importo?: number
          note?: string | null
          numero: number
          stato?: Database["public"]["Enums"]["cantiere_sal_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cantiere_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione?: string | null
          fattura_id?: string | null
          id?: string
          importo?: number
          note?: string | null
          numero?: number
          stato?: Database["public"]["Enums"]["cantiere_sal_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cantiere_sal_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "cantieri"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_sal_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_economia"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_sal_cantiere_id_fkey"
            columns: ["cantiere_id"]
            isOneToOne: false
            referencedRelation: "vw_cantiere_kpi"
            referencedColumns: ["cantiere_id"]
          },
          {
            foreignKeyName: "cantiere_sal_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_sal_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantiere_sal_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cantieri: {
        Row: {
          attivo: boolean
          capocantiere_id: string | null
          categoria_lavori: string | null
          cig: string | null
          citta: string | null
          cliente_id: string | null
          codice: string | null
          commessa_id: string | null
          committente_id: string | null
          created_at: string
          created_by: string | null
          cup: string | null
          data_apertura: string | null
          data_chiusura: string | null
          data_fine_prevista: string | null
          denominazione: string
          direttore_lavori: string | null
          direttore_tecnico: string | null
          gara_id: string | null
          id: string
          importo_contrattuale: number
          importo_lavori: number | null
          indirizzo: string | null
          lat: number | null
          lng: number | null
          note: string | null
          responsabile_interno_id: string | null
          responsabile_sicurezza: string | null
          ricerca: unknown
          rup: string | null
          stato: Database["public"]["Enums"]["cantiere_stato"]
          stazione_appaltante_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          capocantiere_id?: string | null
          categoria_lavori?: string | null
          cig?: string | null
          citta?: string | null
          cliente_id?: string | null
          codice?: string | null
          commessa_id?: string | null
          committente_id?: string | null
          created_at?: string
          created_by?: string | null
          cup?: string | null
          data_apertura?: string | null
          data_chiusura?: string | null
          data_fine_prevista?: string | null
          denominazione: string
          direttore_lavori?: string | null
          direttore_tecnico?: string | null
          gara_id?: string | null
          id?: string
          importo_contrattuale?: number
          importo_lavori?: number | null
          indirizzo?: string | null
          lat?: number | null
          lng?: number | null
          note?: string | null
          responsabile_interno_id?: string | null
          responsabile_sicurezza?: string | null
          ricerca?: unknown
          rup?: string | null
          stato?: Database["public"]["Enums"]["cantiere_stato"]
          stazione_appaltante_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          capocantiere_id?: string | null
          categoria_lavori?: string | null
          cig?: string | null
          citta?: string | null
          cliente_id?: string | null
          codice?: string | null
          commessa_id?: string | null
          committente_id?: string | null
          created_at?: string
          created_by?: string | null
          cup?: string | null
          data_apertura?: string | null
          data_chiusura?: string | null
          data_fine_prevista?: string | null
          denominazione?: string
          direttore_lavori?: string | null
          direttore_tecnico?: string | null
          gara_id?: string | null
          id?: string
          importo_contrattuale?: number
          importo_lavori?: number | null
          indirizzo?: string | null
          lat?: number | null
          lng?: number | null
          note?: string | null
          responsabile_interno_id?: string | null
          responsabile_sicurezza?: string | null
          ricerca?: unknown
          rup?: string | null
          stato?: Database["public"]["Enums"]["cantiere_stato"]
          stazione_appaltante_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cantieri_capocantiere_id_fkey"
            columns: ["capocantiere_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantieri_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantieri_commessa_id_fkey"
            columns: ["commessa_id"]
            isOneToOne: false
            referencedRelation: "commesse"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantieri_committente_id_fkey"
            columns: ["committente_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantieri_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantieri_gara_id_fkey"
            columns: ["gara_id"]
            isOneToOne: false
            referencedRelation: "gare"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantieri_responsabile_interno_id_fkey"
            columns: ["responsabile_interno_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantieri_stazione_appaltante_id_fkey"
            columns: ["stazione_appaltante_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cantieri_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      codici_progressivi: {
        Row: {
          anno: number
          prefisso: string
          ultimo: number
        }
        Insert: {
          anno: number
          prefisso: string
          ultimo?: number
        }
        Update: {
          anno?: number
          prefisso?: string
          ultimo?: number
        }
        Relationships: []
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
      dipendenti: {
        Row: {
          attivo: boolean
          cognome: string | null
          created_at: string
          created_by: string | null
          data_assunzione: string | null
          data_fine: string | null
          email: string | null
          id: string
          nome: string
          note: string | null
          qualifica: string | null
          telefono: string | null
          tipo_contratto: Database["public"]["Enums"]["tipo_contratto"] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          cognome?: string | null
          created_at?: string
          created_by?: string | null
          data_assunzione?: string | null
          data_fine?: string | null
          email?: string | null
          id?: string
          nome: string
          note?: string | null
          qualifica?: string | null
          telefono?: string | null
          tipo_contratto?: Database["public"]["Enums"]["tipo_contratto"] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          cognome?: string | null
          created_at?: string
          created_by?: string | null
          data_assunzione?: string | null
          data_fine?: string | null
          email?: string | null
          id?: string
          nome?: string
          note?: string | null
          qualifica?: string | null
          telefono?: string | null
          tipo_contratto?: Database["public"]["Enums"]["tipo_contratto"] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dipendenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dipendenti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dipendenti_patenti: {
        Row: {
          created_at: string
          created_by: string | null
          dipendente_id: string
          id: string
          note: string | null
          numero: string | null
          punti: number | null
          scadenza: string | null
          tipo: Database["public"]["Enums"]["patente_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dipendente_id: string
          id?: string
          note?: string | null
          numero?: string | null
          punti?: number | null
          scadenza?: string | null
          tipo?: Database["public"]["Enums"]["patente_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dipendente_id?: string
          id?: string
          note?: string | null
          numero?: string | null
          punti?: number | null
          scadenza?: string | null
          tipo?: Database["public"]["Enums"]["patente_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dipendenti_patenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dipendenti_patenti_dipendente_id_fkey"
            columns: ["dipendente_id"]
            isOneToOne: false
            referencedRelation: "dipendenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dipendenti_patenti_updated_by_fkey"
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
      formazione: {
        Row: {
          completato: boolean
          corso: string
          created_at: string
          created_by: string | null
          data: string | null
          dipendente_id: string
          id: string
          note: string | null
          ore: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          completato?: boolean
          corso: string
          created_at?: string
          created_by?: string | null
          data?: string | null
          dipendente_id: string
          id?: string
          note?: string | null
          ore?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          completato?: boolean
          corso?: string
          created_at?: string
          created_by?: string | null
          data?: string | null
          dipendente_id?: string
          id?: string
          note?: string | null
          ore?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formazione_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formazione_dipendente_id_fkey"
            columns: ["dipendente_id"]
            isOneToOne: false
            referencedRelation: "dipendenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formazione_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gare: {
        Row: {
          aggiudicatario: string | null
          attivo: boolean
          categoria_soa: string | null
          cig: string | null
          codice: string | null
          commessa_id: string | null
          cpv: string | null
          created_at: string
          created_by: string | null
          cup: string | null
          data_apertura_offerte: string | null
          data_pubblicazione: string | null
          durata_mesi: number | null
          ente_appaltante: string | null
          ente_appaltante_id: string | null
          esito_at: string | null
          fonte: string | null
          id: string
          importo_base: number
          luogo_esecuzione: string | null
          note: string | null
          note_esito: string | null
          offerta_tecnica_note: string | null
          oneri_sicurezza: number | null
          piattaforma: string | null
          piattaforma_url: string | null
          posizione_graduatoria: number | null
          presentata_at: string | null
          priorita: Database["public"]["Enums"]["priorita_type"]
          procedura: Database["public"]["Enums"]["gara_procedura"]
          protocollo_invio: string | null
          responsabile_id: string | null
          ricerca: unknown
          ricorso: boolean
          rup: string | null
          settore: string | null
          stato: Database["public"]["Enums"]["gara_stato"]
          termine_chiarimenti: string | null
          termine_presentazione: string | null
          territorio: string | null
          tipologia: Database["public"]["Enums"]["gara_tipologia"]
          titolo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aggiudicatario?: string | null
          attivo?: boolean
          categoria_soa?: string | null
          cig?: string | null
          codice?: string | null
          commessa_id?: string | null
          cpv?: string | null
          created_at?: string
          created_by?: string | null
          cup?: string | null
          data_apertura_offerte?: string | null
          data_pubblicazione?: string | null
          durata_mesi?: number | null
          ente_appaltante?: string | null
          ente_appaltante_id?: string | null
          esito_at?: string | null
          fonte?: string | null
          id?: string
          importo_base?: number
          luogo_esecuzione?: string | null
          note?: string | null
          note_esito?: string | null
          offerta_tecnica_note?: string | null
          oneri_sicurezza?: number | null
          piattaforma?: string | null
          piattaforma_url?: string | null
          posizione_graduatoria?: number | null
          presentata_at?: string | null
          priorita?: Database["public"]["Enums"]["priorita_type"]
          procedura?: Database["public"]["Enums"]["gara_procedura"]
          protocollo_invio?: string | null
          responsabile_id?: string | null
          ricerca?: unknown
          ricorso?: boolean
          rup?: string | null
          settore?: string | null
          stato?: Database["public"]["Enums"]["gara_stato"]
          termine_chiarimenti?: string | null
          termine_presentazione?: string | null
          territorio?: string | null
          tipologia?: Database["public"]["Enums"]["gara_tipologia"]
          titolo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aggiudicatario?: string | null
          attivo?: boolean
          categoria_soa?: string | null
          cig?: string | null
          codice?: string | null
          commessa_id?: string | null
          cpv?: string | null
          created_at?: string
          created_by?: string | null
          cup?: string | null
          data_apertura_offerte?: string | null
          data_pubblicazione?: string | null
          durata_mesi?: number | null
          ente_appaltante?: string | null
          ente_appaltante_id?: string | null
          esito_at?: string | null
          fonte?: string | null
          id?: string
          importo_base?: number
          luogo_esecuzione?: string | null
          note?: string | null
          note_esito?: string | null
          offerta_tecnica_note?: string | null
          oneri_sicurezza?: number | null
          piattaforma?: string | null
          piattaforma_url?: string | null
          posizione_graduatoria?: number | null
          presentata_at?: string | null
          priorita?: Database["public"]["Enums"]["priorita_type"]
          procedura?: Database["public"]["Enums"]["gara_procedura"]
          protocollo_invio?: string | null
          responsabile_id?: string | null
          ricerca?: unknown
          ricorso?: boolean
          rup?: string | null
          settore?: string | null
          stato?: Database["public"]["Enums"]["gara_stato"]
          termine_chiarimenti?: string | null
          termine_presentazione?: string | null
          territorio?: string | null
          tipologia?: Database["public"]["Enums"]["gara_tipologia"]
          titolo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gare_commessa_id_fkey"
            columns: ["commessa_id"]
            isOneToOne: false
            referencedRelation: "commesse"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_ente_appaltante_id_fkey"
            columns: ["ente_appaltante_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_responsabile_id_fkey"
            columns: ["responsabile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gare_cauzioni: {
        Row: {
          created_at: string
          created_by: string | null
          data_emissione: string | null
          data_scadenza: string | null
          gara_id: string
          garante: string | null
          id: string
          importo: number
          note: string | null
          restituita: boolean
          tipo: Database["public"]["Enums"]["gara_cauzione_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_emissione?: string | null
          data_scadenza?: string | null
          gara_id: string
          garante?: string | null
          id?: string
          importo?: number
          note?: string | null
          restituita?: boolean
          tipo?: Database["public"]["Enums"]["gara_cauzione_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_emissione?: string | null
          data_scadenza?: string | null
          gara_id?: string
          garante?: string | null
          id?: string
          importo?: number
          note?: string | null
          restituita?: boolean
          tipo?: Database["public"]["Enums"]["gara_cauzione_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gare_cauzioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_cauzioni_gara_id_fkey"
            columns: ["gara_id"]
            isOneToOne: false
            referencedRelation: "gare"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_cauzioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gare_chiarimenti: {
        Row: {
          created_at: string
          created_by: string | null
          data_invio: string
          data_risposta: string | null
          domanda: string
          gara_id: string
          id: string
          impatto_offerta: string | null
          responsabile_id: string | null
          risposta: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_invio?: string
          data_risposta?: string | null
          domanda: string
          gara_id: string
          id?: string
          impatto_offerta?: string | null
          responsabile_id?: string | null
          risposta?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_invio?: string
          data_risposta?: string | null
          domanda?: string
          gara_id?: string
          id?: string
          impatto_offerta?: string | null
          responsabile_id?: string | null
          risposta?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gare_chiarimenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_chiarimenti_gara_id_fkey"
            columns: ["gara_id"]
            isOneToOne: false
            referencedRelation: "gare"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_chiarimenti_responsabile_id_fkey"
            columns: ["responsabile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_chiarimenti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gare_offerte_economiche: {
        Row: {
          computo_importo: number | null
          costi_manodopera: number | null
          created_at: string
          created_by: string | null
          gara_id: string
          id: string
          importo_offerto: number | null
          marginalita_percentuale: number | null
          note: string | null
          oneri_sicurezza: number | null
          ribasso_percentuale: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          computo_importo?: number | null
          costi_manodopera?: number | null
          created_at?: string
          created_by?: string | null
          gara_id: string
          id?: string
          importo_offerto?: number | null
          marginalita_percentuale?: number | null
          note?: string | null
          oneri_sicurezza?: number | null
          ribasso_percentuale?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          computo_importo?: number | null
          costi_manodopera?: number | null
          created_at?: string
          created_by?: string | null
          gara_id?: string
          id?: string
          importo_offerto?: number | null
          marginalita_percentuale?: number | null
          note?: string | null
          oneri_sicurezza?: number | null
          ribasso_percentuale?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gare_offerte_economiche_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_offerte_economiche_gara_id_fkey"
            columns: ["gara_id"]
            isOneToOne: true
            referencedRelation: "gare"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_offerte_economiche_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gare_partecipanti: {
        Row: {
          created_at: string
          created_by: string | null
          gara_id: string
          id: string
          note: string | null
          organizzazione_id: string
          quota_percentuale: number | null
          ruolo: Database["public"]["Enums"]["gara_ati_ruolo"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          gara_id: string
          id?: string
          note?: string | null
          organizzazione_id: string
          quota_percentuale?: number | null
          ruolo?: Database["public"]["Enums"]["gara_ati_ruolo"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          gara_id?: string
          id?: string
          note?: string | null
          organizzazione_id?: string
          quota_percentuale?: number | null
          ruolo?: Database["public"]["Enums"]["gara_ati_ruolo"]
        }
        Relationships: [
          {
            foreignKeyName: "gare_partecipanti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_partecipanti_gara_id_fkey"
            columns: ["gara_id"]
            isOneToOne: false
            referencedRelation: "gare"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_partecipanti_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
        ]
      }
      gare_requisiti: {
        Row: {
          allegato_id: string | null
          created_at: string
          created_by: string | null
          descrizione: string
          gara_id: string
          id: string
          note: string | null
          soddisfatto: boolean
          tipo: Database["public"]["Enums"]["gara_requisito_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allegato_id?: string | null
          created_at?: string
          created_by?: string | null
          descrizione: string
          gara_id: string
          id?: string
          note?: string | null
          soddisfatto?: boolean
          tipo?: Database["public"]["Enums"]["gara_requisito_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allegato_id?: string | null
          created_at?: string
          created_by?: string | null
          descrizione?: string
          gara_id?: string
          id?: string
          note?: string | null
          soddisfatto?: boolean
          tipo?: Database["public"]["Enums"]["gara_requisito_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gare_requisiti_allegato_id_fkey"
            columns: ["allegato_id"]
            isOneToOne: false
            referencedRelation: "allegati"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_requisiti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_requisiti_gara_id_fkey"
            columns: ["gara_id"]
            isOneToOne: false
            referencedRelation: "gare"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_requisiti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gare_team: {
        Row: {
          created_at: string
          created_by: string | null
          gara_id: string
          id: string
          ruolo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          gara_id: string
          id?: string
          ruolo: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          gara_id?: string
          id?: string
          ruolo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gare_team_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_team_gara_id_fkey"
            columns: ["gara_id"]
            isOneToOne: false
            referencedRelation: "gare"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_team_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gare_valutazioni: {
        Row: {
          created_at: string
          created_by: string | null
          criterio: string
          gara_id: string
          id: string
          note: string | null
          punteggio: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          criterio: string
          gara_id: string
          id?: string
          note?: string | null
          punteggio: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          criterio?: string
          gara_id?: string
          id?: string
          note?: string | null
          punteggio?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gare_valutazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_valutazioni_gara_id_fkey"
            columns: ["gara_id"]
            isOneToOne: false
            referencedRelation: "gare"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_valutazioni_updated_by_fkey"
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
      moduli_licenze: {
        Row: {
          attivato_at: string
          attivo: boolean
          slug: string
        }
        Insert: {
          attivato_at?: string
          attivo?: boolean
          slug: string
        }
        Update: {
          attivato_at?: string
          attivo?: boolean
          slug?: string
        }
        Relationships: []
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
      scadenze_moduli: {
        Row: {
          azione_url: string | null
          completata_at: string | null
          created_at: string
          created_by: string | null
          data_scadenza: string
          descrizione: string
          entita: string
          entita_id: string
          id: string
          modulo: string
          solo_manager: boolean
          stato: Database["public"]["Enums"]["scadenza_modulo_stato"]
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          azione_url?: string | null
          completata_at?: string | null
          created_at?: string
          created_by?: string | null
          data_scadenza: string
          descrizione: string
          entita: string
          entita_id: string
          id?: string
          modulo: string
          solo_manager?: boolean
          stato?: Database["public"]["Enums"]["scadenza_modulo_stato"]
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          azione_url?: string | null
          completata_at?: string | null
          created_at?: string
          created_by?: string | null
          data_scadenza?: string
          descrizione?: string
          entita?: string
          entita_id?: string
          id?: string
          modulo?: string
          solo_manager?: boolean
          stato?: Database["public"]["Enums"]["scadenza_modulo_stato"]
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scadenze_moduli_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scadenze_moduli_updated_by_fkey"
            columns: ["updated_by"]
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
      vw_automezzo_consumi: {
        Row: {
          automezzo_id: string | null
          consumo_medio_100km: number | null
          costo_carburante: number | null
          costo_manutenzione: number | null
          km_attuali: number | null
          km_max: number | null
          km_min: number | null
          litri_totali: number | null
          n_guasti: number | null
          ore_fermo: number | null
        }
        Relationships: []
      }
      vw_automezzo_costo_km: {
        Row: {
          automezzo_id: string | null
          carburante: number | null
          costi_fissi: number | null
          costo_km: number | null
          costo_totale: number | null
          manutenzione: number | null
          multe: number | null
        }
        Relationships: []
      }
      vw_cantiere_economia: {
        Row: {
          cantiere_id: string | null
          costi_altro: number | null
          costi_materiali: number | null
          costi_mezzi: number | null
          costi_personale: number | null
          costi_subappalti: number | null
          costi_totali: number | null
          importo_contrattuale: number | null
          sal_emessi: number | null
          sal_pagati: number | null
          utile_maturato: number | null
          utile_previsto: number | null
        }
        Relationships: []
      }
      vw_cantiere_kpi: {
        Row: {
          avanzamento_medio: number | null
          cantiere_id: string | null
          ore_totali: number | null
          qualita_non_conformi: number | null
          rapportini: number | null
          sicurezza_aperti: number | null
        }
        Relationships: []
      }
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
      vw_gare_kpi: {
        Row: {
          aggiudicate: number | null
          giorni_medi_preparazione: number | null
          in_analisi: number | null
          in_preparazione: number | null
          non_aggiudicate: number | null
          presentate: number | null
          tasso_aggiudicazione: number | null
          totali: number | null
          valore_in_corso: number | null
          valore_perse: number | null
          valore_vinte: number | null
        }
        Relationships: []
      }
      vw_gare_per_stato: {
        Row: {
          numero: number | null
          stato: string | null
          valore: number | null
        }
        Relationships: []
      }
      vw_gare_successo_categoria: {
        Row: {
          aggiudicate: number | null
          categoria: string | null
          presentate: number | null
          valore_vinto: number | null
        }
        Relationships: []
      }
      vw_gare_successo_ente: {
        Row: {
          aggiudicate: number | null
          ente: string | null
          presentate: number | null
          valore_vinto: number | null
        }
        Relationships: []
      }
      vw_gare_successo_territorio: {
        Row: {
          aggiudicate: number | null
          presentate: number | null
          territorio: string | null
          valore_vinto: number | null
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
      genera_codice: { Args: { p_prefisso: string }; Returns: string }
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
      modulo_licenziato: { Args: { p_slug: string }; Returns: boolean }
      notifica_deal_a_rischio: { Args: { giorni?: number }; Returns: number }
      processa_scadenze: { Args: never; Returns: number }
      processa_scadenze_moduli: { Args: never; Returns: number }
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
      approvazione_stato: "richiesta" | "approvata" | "rifiutata" | "annullata"
      assenza_stato: "richiesta" | "approvata" | "rifiutata"
      assenza_tipo: "ferie" | "permesso" | "malattia"
      attivita_stato: "da_fare" | "in_corso" | "completata" | "annullata"
      attivita_tipo: "task" | "chiamata" | "email" | "riunione" | "nota"
      automezzo_acquisizione: "acquisto" | "leasing" | "noleggio"
      automezzo_alimentazione:
        | "benzina"
        | "diesel"
        | "gpl"
        | "metano"
        | "ibrida"
        | "elettrica"
      automezzo_categoria:
        | "autovettura"
        | "furgone"
        | "camion"
        | "escavatore"
        | "pala"
        | "piattaforma"
        | "rimorchio"
        | "altro"
      automezzo_costo_voce:
        | "assicurazione"
        | "bollo"
        | "leasing"
        | "noleggio"
        | "pedaggi"
        | "parcheggi"
        | "lavaggi"
        | "accessori"
        | "altro"
      automezzo_dismissione: "vendita" | "rottamazione" | "trasferimento"
      automezzo_stato:
        | "disponibile"
        | "assegnato"
        | "in_manutenzione"
        | "fuori_servizio"
        | "dismesso"
      cantiere_ambiente_tipo:
        | "rifiuti"
        | "emissioni"
        | "scarichi"
        | "terre_rocce"
        | "rumore"
      cantiere_costo_tipo:
        | "personale"
        | "materiali"
        | "mezzi"
        | "subappalti"
        | "altro"
      cantiere_meteo: "sereno" | "nuvoloso" | "pioggia" | "neve" | "vento_forte"
      cantiere_mezzo_tipo:
        | "macchina_operatrice"
        | "automezzo"
        | "ponteggio"
        | "gru"
        | "ple"
        | "utensile"
        | "altro"
      cantiere_movimento_tipo: "ordine" | "consegna" | "consumo" | "reso"
      cantiere_qualita_esito: "in_attesa" | "conforme" | "non_conforme"
      cantiere_qualita_tipo:
        | "accettazione"
        | "corso_opera"
        | "collaudo"
        | "prova"
      cantiere_sal_stato: "bozza" | "emesso" | "fatturato" | "pagato"
      cantiere_sicurezza_tipo:
        | "sopralluogo"
        | "checklist"
        | "non_conformita"
        | "near_miss"
        | "incidente"
        | "infortunio"
        | "prescrizione"
        | "verbale"
        | "consegna_dpi"
        | "riunione_coordinamento"
        | "controllo_giornaliero"
      cantiere_stato:
        | "pianificato"
        | "in_apertura"
        | "attivo"
        | "sospeso"
        | "chiuso"
      commessa_stato: "attiva" | "in_pausa" | "completata" | "annullata"
      fattura_direzione: "attiva" | "passiva"
      fattura_stato: "da_pagare" | "pagata" | "scaduta" | "parziale"
      gara_ati_ruolo: "mandataria" | "mandante" | "consorziata"
      gara_cauzione_tipo:
        | "provvisoria"
        | "definitiva"
        | "fideiussione"
        | "polizza_assicurativa"
      gara_procedura:
        | "aperta"
        | "ristretta"
        | "negoziata"
        | "affidamento_diretto"
        | "accordo_quadro"
        | "manifestazione_interesse"
        | "altro"
      gara_requisito_tipo:
        | "generale"
        | "economico_finanziario"
        | "tecnico_professionale"
        | "certificazione"
        | "soa"
        | "referenze"
        | "personale"
        | "attrezzature"
        | "altro"
      gara_stato:
        | "in_analisi"
        | "in_preparazione"
        | "presentata"
        | "aggiudicata"
        | "non_aggiudicata"
        | "annullata"
      gara_tipologia: "lavori" | "servizi" | "forniture"
      lead_fonte: "fiera" | "referral" | "linkedin" | "web" | "evento" | "altro"
      manutenzione_tipo: "ordinaria" | "straordinaria"
      notifica_tipo: "info" | "warning" | "critical" | "success" | "sistema"
      org_ruolo:
        | "cliente"
        | "fornitore"
        | "partner"
        | "potenziale_partner"
        | "prospect"
      pagamento_stato: "da_incassare" | "incassato" | "in_ritardo" | "parziale"
      partner_tipo: "rivenditore" | "tecnologico" | "strategico" | "commerciale"
      patente_tipo:
        | "patente_b"
        | "patente_c"
        | "patente_ce"
        | "patente_d"
        | "cqc"
        | "adr"
        | "carta_conducente"
        | "abilitazione"
        | "altro"
      priorita_type: "bassa" | "media" | "alta" | "critica"
      progetto_stato:
        | "pianificazione"
        | "in_corso"
        | "in_revisione"
        | "completato"
        | "sospeso"
      progetto_tipo: "cliente" | "interno"
      scadenza_modulo_stato: "aperta" | "completata" | "annullata"
      sdi_stato:
        | "non_applicabile"
        | "da_inviare"
        | "inviata"
        | "consegnata"
        | "scartata"
        | "mancata_consegna"
      sinistro_stato: "aperto" | "in_lavorazione" | "liquidato" | "chiuso"
      tassa_stato: "da_pagare" | "pagata" | "scaduta"
      tipo_contratto:
        | "indeterminato"
        | "determinato"
        | "apprendistato"
        | "collaborazione"
        | "stage"
        | "partita_iva"
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
      approvazione_stato: ["richiesta", "approvata", "rifiutata", "annullata"],
      assenza_stato: ["richiesta", "approvata", "rifiutata"],
      assenza_tipo: ["ferie", "permesso", "malattia"],
      attivita_stato: ["da_fare", "in_corso", "completata", "annullata"],
      attivita_tipo: ["task", "chiamata", "email", "riunione", "nota"],
      automezzo_acquisizione: ["acquisto", "leasing", "noleggio"],
      automezzo_alimentazione: [
        "benzina",
        "diesel",
        "gpl",
        "metano",
        "ibrida",
        "elettrica",
      ],
      automezzo_categoria: [
        "autovettura",
        "furgone",
        "camion",
        "escavatore",
        "pala",
        "piattaforma",
        "rimorchio",
        "altro",
      ],
      automezzo_costo_voce: [
        "assicurazione",
        "bollo",
        "leasing",
        "noleggio",
        "pedaggi",
        "parcheggi",
        "lavaggi",
        "accessori",
        "altro",
      ],
      automezzo_dismissione: ["vendita", "rottamazione", "trasferimento"],
      automezzo_stato: [
        "disponibile",
        "assegnato",
        "in_manutenzione",
        "fuori_servizio",
        "dismesso",
      ],
      cantiere_ambiente_tipo: [
        "rifiuti",
        "emissioni",
        "scarichi",
        "terre_rocce",
        "rumore",
      ],
      cantiere_costo_tipo: [
        "personale",
        "materiali",
        "mezzi",
        "subappalti",
        "altro",
      ],
      cantiere_meteo: ["sereno", "nuvoloso", "pioggia", "neve", "vento_forte"],
      cantiere_mezzo_tipo: [
        "macchina_operatrice",
        "automezzo",
        "ponteggio",
        "gru",
        "ple",
        "utensile",
        "altro",
      ],
      cantiere_movimento_tipo: ["ordine", "consegna", "consumo", "reso"],
      cantiere_qualita_esito: ["in_attesa", "conforme", "non_conforme"],
      cantiere_qualita_tipo: [
        "accettazione",
        "corso_opera",
        "collaudo",
        "prova",
      ],
      cantiere_sal_stato: ["bozza", "emesso", "fatturato", "pagato"],
      cantiere_sicurezza_tipo: [
        "sopralluogo",
        "checklist",
        "non_conformita",
        "near_miss",
        "incidente",
        "infortunio",
        "prescrizione",
        "verbale",
        "consegna_dpi",
        "riunione_coordinamento",
        "controllo_giornaliero",
      ],
      cantiere_stato: [
        "pianificato",
        "in_apertura",
        "attivo",
        "sospeso",
        "chiuso",
      ],
      commessa_stato: ["attiva", "in_pausa", "completata", "annullata"],
      fattura_direzione: ["attiva", "passiva"],
      fattura_stato: ["da_pagare", "pagata", "scaduta", "parziale"],
      gara_ati_ruolo: ["mandataria", "mandante", "consorziata"],
      gara_cauzione_tipo: [
        "provvisoria",
        "definitiva",
        "fideiussione",
        "polizza_assicurativa",
      ],
      gara_procedura: [
        "aperta",
        "ristretta",
        "negoziata",
        "affidamento_diretto",
        "accordo_quadro",
        "manifestazione_interesse",
        "altro",
      ],
      gara_requisito_tipo: [
        "generale",
        "economico_finanziario",
        "tecnico_professionale",
        "certificazione",
        "soa",
        "referenze",
        "personale",
        "attrezzature",
        "altro",
      ],
      gara_stato: [
        "in_analisi",
        "in_preparazione",
        "presentata",
        "aggiudicata",
        "non_aggiudicata",
        "annullata",
      ],
      gara_tipologia: ["lavori", "servizi", "forniture"],
      lead_fonte: ["fiera", "referral", "linkedin", "web", "evento", "altro"],
      manutenzione_tipo: ["ordinaria", "straordinaria"],
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
      patente_tipo: [
        "patente_b",
        "patente_c",
        "patente_ce",
        "patente_d",
        "cqc",
        "adr",
        "carta_conducente",
        "abilitazione",
        "altro",
      ],
      priorita_type: ["bassa", "media", "alta", "critica"],
      progetto_stato: [
        "pianificazione",
        "in_corso",
        "in_revisione",
        "completato",
        "sospeso",
      ],
      progetto_tipo: ["cliente", "interno"],
      scadenza_modulo_stato: ["aperta", "completata", "annullata"],
      sdi_stato: [
        "non_applicabile",
        "da_inviare",
        "inviata",
        "consegnata",
        "scartata",
        "mancata_consegna",
      ],
      sinistro_stato: ["aperto", "in_lavorazione", "liquidato", "chiuso"],
      tassa_stato: ["da_pagare", "pagata", "scaduta"],
      tipo_contratto: [
        "indeterminato",
        "determinato",
        "apprendistato",
        "collaborazione",
        "stage",
        "partita_iva",
      ],
      user_role: ["admin", "manager", "operatore"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
