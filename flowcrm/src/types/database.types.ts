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
      agenti: {
        Row: {
          area_geografica: string | null
          attivo: boolean
          cciaa: string | null
          codice: string | null
          codice_fiscale: string | null
          cognome: string | null
          created_at: string
          created_by: string | null
          data_cessazione: string | null
          data_inizio: string | null
          email: string | null
          enasarco: string | null
          iban: string | null
          id: string
          nome: string
          note: string | null
          piva: string | null
          ragione_sociale: string | null
          referente_id: string | null
          ricerca: unknown
          settori: string | null
          stato: Database["public"]["Enums"]["agente_stato"]
          telefono: string | null
          tipologia: Database["public"]["Enums"]["agente_tipologia"]
          updated_at: string
          updated_by: string | null
          user_id: string | null
          zone: string | null
        }
        Insert: {
          area_geografica?: string | null
          attivo?: boolean
          cciaa?: string | null
          codice?: string | null
          codice_fiscale?: string | null
          cognome?: string | null
          created_at?: string
          created_by?: string | null
          data_cessazione?: string | null
          data_inizio?: string | null
          email?: string | null
          enasarco?: string | null
          iban?: string | null
          id?: string
          nome: string
          note?: string | null
          piva?: string | null
          ragione_sociale?: string | null
          referente_id?: string | null
          ricerca?: never
          settori?: string | null
          stato?: Database["public"]["Enums"]["agente_stato"]
          telefono?: string | null
          tipologia?: Database["public"]["Enums"]["agente_tipologia"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          zone?: string | null
        }
        Update: {
          area_geografica?: string | null
          attivo?: boolean
          cciaa?: string | null
          codice?: string | null
          codice_fiscale?: string | null
          cognome?: string | null
          created_at?: string
          created_by?: string | null
          data_cessazione?: string | null
          data_inizio?: string | null
          email?: string | null
          enasarco?: string | null
          iban?: string | null
          id?: string
          nome?: string
          note?: string | null
          piva?: string | null
          ragione_sociale?: string | null
          referente_id?: string | null
          ricerca?: never
          settori?: string | null
          stato?: Database["public"]["Enums"]["agente_stato"]
          telefono?: string | null
          tipologia?: Database["public"]["Enums"]["agente_tipologia"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_referente_id_fkey"
            columns: ["referente_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agenti_clienti: {
        Row: {
          agente_id: string
          al: string | null
          classificazione: string | null
          created_at: string
          created_by: string | null
          dal: string
          id: string
          note: string | null
          organizzazione_id: string
          potenziale: string | null
          priorita: Database["public"]["Enums"]["priorita_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agente_id: string
          al?: string | null
          classificazione?: string | null
          created_at?: string
          created_by?: string | null
          dal?: string
          id?: string
          note?: string | null
          organizzazione_id: string
          potenziale?: string | null
          priorita?: Database["public"]["Enums"]["priorita_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agente_id?: string
          al?: string | null
          classificazione?: string | null
          created_at?: string
          created_by?: string | null
          dal?: string
          id?: string
          note?: string | null
          organizzazione_id?: string
          potenziale?: string | null
          priorita?: Database["public"]["Enums"]["priorita_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenti_clienti_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_clienti_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "vw_agenti_kpi"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "agenti_clienti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_clienti_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_clienti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agenti_mandati: {
        Row: {
          agente_id: string
          clausole: string | null
          created_at: string
          created_by: string | null
          data_fine: string | null
          data_inizio: string
          descrizione: string
          esclusiva: boolean
          id: string
          listino: string | null
          obiettivo_annuo: number | null
          prodotti: string | null
          updated_at: string
          updated_by: string | null
          zone: string | null
        }
        Insert: {
          agente_id: string
          clausole?: string | null
          created_at?: string
          created_by?: string | null
          data_fine?: string | null
          data_inizio?: string
          descrizione: string
          esclusiva?: boolean
          id?: string
          listino?: string | null
          obiettivo_annuo?: number | null
          prodotti?: string | null
          updated_at?: string
          updated_by?: string | null
          zone?: string | null
        }
        Update: {
          agente_id?: string
          clausole?: string | null
          created_at?: string
          created_by?: string | null
          data_fine?: string | null
          data_inizio?: string
          descrizione?: string
          esclusiva?: boolean
          id?: string
          listino?: string | null
          obiettivo_annuo?: number | null
          prodotti?: string | null
          updated_at?: string
          updated_by?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenti_mandati_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_mandati_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "vw_agenti_kpi"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "agenti_mandati_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_mandati_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agenti_note_spese: {
        Row: {
          agente_id: string
          created_at: string
          created_by: string | null
          data: string
          decisa_at: string | null
          descrizione: string
          id: string
          importo: number
          motivazione: string | null
          stato: Database["public"]["Enums"]["nota_spese_stato"]
          tipo: Database["public"]["Enums"]["nota_spese_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agente_id: string
          created_at?: string
          created_by?: string | null
          data?: string
          decisa_at?: string | null
          descrizione: string
          id?: string
          importo: number
          motivazione?: string | null
          stato?: Database["public"]["Enums"]["nota_spese_stato"]
          tipo?: Database["public"]["Enums"]["nota_spese_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agente_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          decisa_at?: string | null
          descrizione?: string
          id?: string
          importo?: number
          motivazione?: string | null
          stato?: Database["public"]["Enums"]["nota_spese_stato"]
          tipo?: Database["public"]["Enums"]["nota_spese_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenti_note_spese_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_note_spese_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "vw_agenti_kpi"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "agenti_note_spese_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_note_spese_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agenti_obiettivi: {
        Row: {
          agente_id: string
          ambito: string | null
          anno: number
          created_at: string
          created_by: string | null
          id: string
          importo_obiettivo: number
          mese: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agente_id: string
          ambito?: string | null
          anno: number
          created_at?: string
          created_by?: string | null
          id?: string
          importo_obiettivo: number
          mese?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agente_id?: string
          ambito?: string | null
          anno?: number
          created_at?: string
          created_by?: string | null
          id?: string
          importo_obiettivo?: number
          mese?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenti_obiettivi_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_obiettivi_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "vw_agenti_kpi"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "agenti_obiettivi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_obiettivi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agenti_offerte: {
        Row: {
          agente_id: string
          created_at: string
          created_by: string | null
          descrizione: string
          id: string
          importo: number
          note: string | null
          ordine_id: string | null
          organizzazione_id: string
          revisione: number
          sconto_percentuale: number | null
          stato: Database["public"]["Enums"]["offerta_stato"]
          updated_at: string
          updated_by: string | null
          validita: string | null
        }
        Insert: {
          agente_id: string
          created_at?: string
          created_by?: string | null
          descrizione: string
          id?: string
          importo?: number
          note?: string | null
          ordine_id?: string | null
          organizzazione_id: string
          revisione?: number
          sconto_percentuale?: number | null
          stato?: Database["public"]["Enums"]["offerta_stato"]
          updated_at?: string
          updated_by?: string | null
          validita?: string | null
        }
        Update: {
          agente_id?: string
          created_at?: string
          created_by?: string | null
          descrizione?: string
          id?: string
          importo?: number
          note?: string | null
          ordine_id?: string | null
          organizzazione_id?: string
          revisione?: number
          sconto_percentuale?: number | null
          stato?: Database["public"]["Enums"]["offerta_stato"]
          updated_at?: string
          updated_by?: string | null
          validita?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenti_offerte_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_offerte_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "vw_agenti_kpi"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "agenti_offerte_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_offerte_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "agenti_ordini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_offerte_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_offerte_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agenti_ordini: {
        Row: {
          agente_id: string
          consegna_prevista: string | null
          created_at: string
          created_by: string | null
          data: string
          fattura_id: string | null
          id: string
          note: string | null
          organizzazione_id: string
          stato: Database["public"]["Enums"]["ordine_stato"]
          updated_at: string
          updated_by: string | null
          valore: number
        }
        Insert: {
          agente_id: string
          consegna_prevista?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          fattura_id?: string | null
          id?: string
          note?: string | null
          organizzazione_id: string
          stato?: Database["public"]["Enums"]["ordine_stato"]
          updated_at?: string
          updated_by?: string | null
          valore?: number
        }
        Update: {
          agente_id?: string
          consegna_prevista?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          fattura_id?: string | null
          id?: string
          note?: string | null
          organizzazione_id?: string
          stato?: Database["public"]["Enums"]["ordine_stato"]
          updated_at?: string
          updated_by?: string | null
          valore?: number
        }
        Relationships: [
          {
            foreignKeyName: "agenti_ordini_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_ordini_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "vw_agenti_kpi"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "agenti_ordini_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_ordini_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_ordini_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_ordini_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agenti_ordini_righe: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ordine_id: string
          prezzo_unitario: number
          prodotto: string
          quantita: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ordine_id: string
          prezzo_unitario?: number
          prodotto: string
          quantita?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ordine_id?: string
          prezzo_unitario?: number
          prodotto?: string
          quantita?: number
        }
        Relationships: [
          {
            foreignKeyName: "agenti_ordini_righe_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_ordini_righe_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "agenti_ordini"
            referencedColumns: ["id"]
          },
        ]
      }
      agenti_piani_provvigionali: {
        Row: {
          agente_id: string
          created_at: string
          created_by: string | null
          id: string
          percentuale_base: number
          premi_note: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agente_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          percentuale_base?: number
          premi_note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agente_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          percentuale_base?: number
          premi_note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenti_piani_provvigionali_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: true
            referencedRelation: "agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_piani_provvigionali_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: true
            referencedRelation: "vw_agenti_kpi"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "agenti_piani_provvigionali_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_piani_provvigionali_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agenti_provvigioni: {
        Row: {
          agente_id: string
          anticipi: number
          conguagli: number
          created_at: string
          created_by: string | null
          id: string
          importo_liquidato: number
          importo_maturato: number
          liquidata_at: string | null
          note: string | null
          periodo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agente_id: string
          anticipi?: number
          conguagli?: number
          created_at?: string
          created_by?: string | null
          id?: string
          importo_liquidato?: number
          importo_maturato?: number
          liquidata_at?: string | null
          note?: string | null
          periodo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agente_id?: string
          anticipi?: number
          conguagli?: number
          created_at?: string
          created_by?: string | null
          id?: string
          importo_liquidato?: number
          importo_maturato?: number
          liquidata_at?: string | null
          note?: string | null
          periodo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenti_provvigioni_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_provvigioni_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "vw_agenti_kpi"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "agenti_provvigioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_provvigioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agenti_provvigioni_regole: {
        Row: {
          agente_id: string
          ambito: Database["public"]["Enums"]["provvigione_ambito"]
          created_at: string
          created_by: string | null
          id: string
          percentuale: number
          riferimento: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agente_id: string
          ambito: Database["public"]["Enums"]["provvigione_ambito"]
          created_at?: string
          created_by?: string | null
          id?: string
          percentuale: number
          riferimento: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agente_id?: string
          ambito?: Database["public"]["Enums"]["provvigione_ambito"]
          created_at?: string
          created_by?: string | null
          id?: string
          percentuale?: number
          riferimento?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenti_provvigioni_regole_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_provvigioni_regole_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "vw_agenti_kpi"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "agenti_provvigioni_regole_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_provvigioni_regole_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agenti_visite: {
        Row: {
          agente_id: string
          argomenti: string | null
          azioni: string | null
          created_at: string
          created_by: string | null
          criticita: string | null
          data: string
          durata_minuti: number | null
          esito: Database["public"]["Enums"]["visita_esito"]
          id: string
          lat: number | null
          lng: number | null
          opportunita: string | null
          organizzazione_id: string | null
          referenti: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agente_id: string
          argomenti?: string | null
          azioni?: string | null
          created_at?: string
          created_by?: string | null
          criticita?: string | null
          data?: string
          durata_minuti?: number | null
          esito?: Database["public"]["Enums"]["visita_esito"]
          id?: string
          lat?: number | null
          lng?: number | null
          opportunita?: string | null
          organizzazione_id?: string | null
          referenti?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agente_id?: string
          argomenti?: string | null
          azioni?: string | null
          created_at?: string
          created_by?: string | null
          criticita?: string | null
          data?: string
          durata_minuti?: number | null
          esito?: Database["public"]["Enums"]["visita_esito"]
          id?: string
          lat?: number | null
          lng?: number | null
          opportunita?: string | null
          organizzazione_id?: string | null
          referenti?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenti_visite_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_visite_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "vw_agenti_kpi"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "agenti_visite_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_visite_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenti_visite_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ambulatori: {
        Row: {
          attivo: boolean
          created_at: string
          created_by: string | null
          descrizione: string | null
          id: string
          nome: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          id?: string
          nome: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          id?: string
          nome?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambulatori_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulatori_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      apparecchiature: {
        Row: {
          attivo: boolean
          created_at: string
          created_by: string | null
          id: string
          matricola: string | null
          nome: string
          note: string | null
          stato_operativo: Database["public"]["Enums"]["apparecchiatura_stato"]
          ubicazione: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          matricola?: string | null
          nome: string
          note?: string | null
          stato_operativo?: Database["public"]["Enums"]["apparecchiatura_stato"]
          ubicazione?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          matricola?: string | null
          nome?: string
          note?: string | null
          stato_operativo?: Database["public"]["Enums"]["apparecchiatura_stato"]
          ubicazione?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apparecchiature_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apparecchiature_updated_by_fkey"
            columns: ["updated_by"]
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
          dati: NonNullable<Json>
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
          dati?: NonNullable<Json>
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
          dati?: NonNullable<Json>
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
      appuntamenti: {
        Row: {
          ambulatorio_id: string | null
          apparecchiatura_id: string | null
          created_at: string
          created_by: string | null
          durata_minuti: number
          id: string
          inizio: string
          lista_attesa: boolean
          note: string | null
          paziente_id: string
          prestazione_id: string | null
          professionista_id: string
          stato: Database["public"]["Enums"]["appuntamento_stato"]
          updated_at: string
          updated_by: string | null
          urgente: boolean
        }
        Insert: {
          ambulatorio_id?: string | null
          apparecchiatura_id?: string | null
          created_at?: string
          created_by?: string | null
          durata_minuti?: number
          id?: string
          inizio: string
          lista_attesa?: boolean
          note?: string | null
          paziente_id: string
          prestazione_id?: string | null
          professionista_id: string
          stato?: Database["public"]["Enums"]["appuntamento_stato"]
          updated_at?: string
          updated_by?: string | null
          urgente?: boolean
        }
        Update: {
          ambulatorio_id?: string | null
          apparecchiatura_id?: string | null
          created_at?: string
          created_by?: string | null
          durata_minuti?: number
          id?: string
          inizio?: string
          lista_attesa?: boolean
          note?: string | null
          paziente_id?: string
          prestazione_id?: string | null
          professionista_id?: string
          stato?: Database["public"]["Enums"]["appuntamento_stato"]
          updated_at?: string
          updated_by?: string | null
          urgente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "appuntamenti_ambulatorio_id_fkey"
            columns: ["ambulatorio_id"]
            isOneToOne: false
            referencedRelation: "ambulatori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appuntamenti_apparecchiatura_id_fkey"
            columns: ["apparecchiatura_id"]
            isOneToOne: false
            referencedRelation: "apparecchiature"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appuntamenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appuntamenti_paziente_id_fkey"
            columns: ["paziente_id"]
            isOneToOne: false
            referencedRelation: "pazienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appuntamenti_prestazione_id_fkey"
            columns: ["prestazione_id"]
            isOneToOne: false
            referencedRelation: "prestazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appuntamenti_professionista_id_fkey"
            columns: ["professionista_id"]
            isOneToOne: false
            referencedRelation: "professionisti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appuntamenti_updated_by_fkey"
            columns: ["updated_by"]
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
      asset: {
        Row: {
          ambito_id: string | null
          ambito_tipo: string | null
          assistenza_fornitore_id: string | null
          assistenza_scadenza: string | null
          attributi: NonNullable<Json>
          categoria: string | null
          codice: string | null
          costo_acquisto: number | null
          created_at: string
          created_by: string | null
          data_acquisto: string | null
          descrizione: string
          dismesso_il: string | null
          fornitore_id: string | null
          garanzia_scadenza: string | null
          id: string
          marca: string | null
          matricola: string | null
          modello: string | null
          modulo: string
          note: string | null
          ricerca: unknown
          stato: Database["public"]["Enums"]["asset_stato"]
          ubicazione: string | null
          updated_at: string
          updated_by: string | null
          vita_utile_anni: number | null
        }
        Insert: {
          ambito_id?: string | null
          ambito_tipo?: string | null
          assistenza_fornitore_id?: string | null
          assistenza_scadenza?: string | null
          attributi?: NonNullable<Json>
          categoria?: string | null
          codice?: string | null
          costo_acquisto?: number | null
          created_at?: string
          created_by?: string | null
          data_acquisto?: string | null
          descrizione: string
          dismesso_il?: string | null
          fornitore_id?: string | null
          garanzia_scadenza?: string | null
          id?: string
          marca?: string | null
          matricola?: string | null
          modello?: string | null
          modulo: string
          note?: string | null
          ricerca?: never
          stato?: Database["public"]["Enums"]["asset_stato"]
          ubicazione?: string | null
          updated_at?: string
          updated_by?: string | null
          vita_utile_anni?: number | null
        }
        Update: {
          ambito_id?: string | null
          ambito_tipo?: string | null
          assistenza_fornitore_id?: string | null
          assistenza_scadenza?: string | null
          attributi?: NonNullable<Json>
          categoria?: string | null
          codice?: string | null
          costo_acquisto?: number | null
          created_at?: string
          created_by?: string | null
          data_acquisto?: string | null
          descrizione?: string
          dismesso_il?: string | null
          fornitore_id?: string | null
          garanzia_scadenza?: string | null
          id?: string
          marca?: string | null
          matricola?: string | null
          modello?: string | null
          modulo?: string
          note?: string | null
          ricerca?: never
          stato?: Database["public"]["Enums"]["asset_stato"]
          ubicazione?: string | null
          updated_at?: string
          updated_by?: string | null
          vita_utile_anni?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_assistenza_fornitore_id_fkey"
            columns: ["assistenza_fornitore_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_interventi: {
        Row: {
          asset_id: string
          costo_manodopera: number | null
          costo_ricambi: number | null
          created_at: string
          created_by: string | null
          data_intervento: string | null
          data_pianificata: string | null
          descrizione: string
          esito: string | null
          fornitore_id: string | null
          id: string
          modulo: string
          ore_fermo: number | null
          piano_id: string | null
          priorita: Database["public"]["Enums"]["asset_priorita"]
          ricambi: string | null
          segnalato_at: string
          segnalato_da: string | null
          stato: Database["public"]["Enums"]["asset_intervento_stato"]
          tecnico: string | null
          tipo: Database["public"]["Enums"]["asset_intervento_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          asset_id: string
          costo_manodopera?: number | null
          costo_ricambi?: number | null
          created_at?: string
          created_by?: string | null
          data_intervento?: string | null
          data_pianificata?: string | null
          descrizione: string
          esito?: string | null
          fornitore_id?: string | null
          id?: string
          modulo: string
          ore_fermo?: number | null
          piano_id?: string | null
          priorita?: Database["public"]["Enums"]["asset_priorita"]
          ricambi?: string | null
          segnalato_at?: string
          segnalato_da?: string | null
          stato?: Database["public"]["Enums"]["asset_intervento_stato"]
          tecnico?: string | null
          tipo?: Database["public"]["Enums"]["asset_intervento_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          asset_id?: string
          costo_manodopera?: number | null
          costo_ricambi?: number | null
          created_at?: string
          created_by?: string | null
          data_intervento?: string | null
          data_pianificata?: string | null
          descrizione?: string
          esito?: string | null
          fornitore_id?: string | null
          id?: string
          modulo?: string
          ore_fermo?: number | null
          piano_id?: string | null
          priorita?: Database["public"]["Enums"]["asset_priorita"]
          ricambi?: string | null
          segnalato_at?: string
          segnalato_da?: string | null
          stato?: Database["public"]["Enums"]["asset_intervento_stato"]
          tecnico?: string | null
          tipo?: Database["public"]["Enums"]["asset_intervento_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_interventi_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_interventi_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_indicatori"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_interventi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_interventi_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_interventi_piano_id_fkey"
            columns: ["piano_id"]
            isOneToOne: false
            referencedRelation: "asset_piani"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_interventi_segnalato_da_fkey"
            columns: ["segnalato_da"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_interventi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_piani: {
        Row: {
          asset_id: string
          attivo: boolean
          created_at: string
          created_by: string | null
          descrizione: string
          id: string
          modulo: string
          note: string | null
          ogni_giorni: number
          prossima_data: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          asset_id: string
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          descrizione: string
          id?: string
          modulo: string
          note?: string | null
          ogni_giorni: number
          prossima_data: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          asset_id?: string
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          descrizione?: string
          id?: string
          modulo?: string
          note?: string | null
          ogni_giorni?: number
          prossima_data?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_piani_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_piani_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_indicatori"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_piani_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_piani_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attivita: {
        Row: {
          agente_id: string | null
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
          immobile_id: string | null
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
          agente_id?: string | null
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
          immobile_id?: string | null
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
          agente_id?: string | null
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
          immobile_id?: string | null
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
            foreignKeyName: "attivita_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attivita_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "vw_agenti_kpi"
            referencedColumns: ["agente_id"]
          },
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
            foreignKeyName: "attivita_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
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
            foreignKeyName: "attivita_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
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
          diff: NonNullable<Json>
          entita: string
          entita_id: string
          eseguito_da: string | null
          id: string
        }
        Insert: {
          azione: string
          created_at?: string
          diff?: NonNullable<Json>
          entita: string
          entita_id: string
          eseguito_da?: string | null
          id?: string
        }
        Update: {
          azione?: string
          created_at?: string
          diff?: NonNullable<Json>
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
            Database["public"]["Enums"]["automezzo_alimentazione"] | null
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
            Database["public"]["Enums"]["automezzo_dismissione"] | null
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
            Database["public"]["Enums"]["automezzo_alimentazione"] | null
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
            Database["public"]["Enums"]["automezzo_dismissione"] | null
          dismissione_valore?: number | null
          id?: string
          km_attuali?: number
          marca: string
          modello: string
          note?: string | null
          proprietario?: string | null
          ricerca?: never
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
            Database["public"]["Enums"]["automezzo_alimentazione"] | null
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
            Database["public"]["Enums"]["automezzo_dismissione"] | null
          dismissione_valore?: number | null
          id?: string
          km_attuali?: number
          marca?: string
          modello?: string
          note?: string | null
          proprietario?: string | null
          ricerca?: never
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
      bar_convenzioni: {
        Row: {
          attiva: boolean
          codice: string | null
          created_at: string
          created_by: string | null
          fatturazione: string
          giorni_pagamento: number
          id: string
          limite_giornaliero_dipendente: number | null
          limite_mensile_azienda: number | null
          limite_mensile_dipendente: number | null
          locale_id: string
          menu_id: string | null
          modulo: string
          note: string | null
          organizzazione_id: string
          referente_id: string | null
          updated_at: string
          updated_by: string | null
          valida_al: string | null
          valida_dal: string
        }
        Insert: {
          attiva?: boolean
          codice?: string | null
          created_at?: string
          created_by?: string | null
          fatturazione?: string
          giorni_pagamento?: number
          id?: string
          limite_giornaliero_dipendente?: number | null
          limite_mensile_azienda?: number | null
          limite_mensile_dipendente?: number | null
          locale_id: string
          menu_id?: string | null
          modulo?: string
          note?: string | null
          organizzazione_id: string
          referente_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valida_al?: string | null
          valida_dal?: string
        }
        Update: {
          attiva?: boolean
          codice?: string | null
          created_at?: string
          created_by?: string | null
          fatturazione?: string
          giorni_pagamento?: number
          id?: string
          limite_giornaliero_dipendente?: number | null
          limite_mensile_azienda?: number | null
          limite_mensile_dipendente?: number | null
          locale_id?: string
          menu_id?: string | null
          modulo?: string
          note?: string | null
          organizzazione_id?: string
          referente_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valida_al?: string | null
          valida_dal?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_convenzioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_convenzioni_locale_id_fkey"
            columns: ["locale_id"]
            isOneToOne: false
            referencedRelation: "fb_locali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_convenzioni_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "fb_menu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_convenzioni_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_convenzioni_referente_id_fkey"
            columns: ["referente_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_convenzioni_referente_id_fkey"
            columns: ["referente_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "bar_convenzioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_convenzioni_addebiti: {
        Row: {
          addebitato_at: string
          conto_id: string
          convenzione_id: string
          created_at: string
          created_by: string | null
          dipendente_id: string
          fattura_id: string | null
          id: string
          importo: number
          modulo: string
          pagamento_id: string
          per_aliquota: NonNullable<Json>
        }
        Insert: {
          addebitato_at?: string
          conto_id: string
          convenzione_id: string
          created_at?: string
          created_by?: string | null
          dipendente_id: string
          fattura_id?: string | null
          id?: string
          importo: number
          modulo?: string
          pagamento_id: string
          per_aliquota?: NonNullable<Json>
        }
        Update: {
          addebitato_at?: string
          conto_id?: string
          convenzione_id?: string
          created_at?: string
          created_by?: string | null
          dipendente_id?: string
          fattura_id?: string | null
          id?: string
          importo?: number
          modulo?: string
          pagamento_id?: string
          per_aliquota?: NonNullable<Json>
        }
        Relationships: [
          {
            foreignKeyName: "bar_convenzioni_addebiti_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_convenzioni_addebiti_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "bar_convenzioni_addebiti_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "bar_convenzioni_addebiti_convenzione_id_fkey"
            columns: ["convenzione_id"]
            isOneToOne: false
            referencedRelation: "bar_convenzioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_convenzioni_addebiti_convenzione_id_fkey"
            columns: ["convenzione_id"]
            isOneToOne: false
            referencedRelation: "bar_convenzioni_riepilogo"
            referencedColumns: ["convenzione_id"]
          },
          {
            foreignKeyName: "bar_convenzioni_addebiti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_convenzioni_addebiti_dipendente_id_fkey"
            columns: ["dipendente_id"]
            isOneToOne: false
            referencedRelation: "bar_convenzioni_dipendenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_convenzioni_addebiti_dipendente_id_fkey"
            columns: ["dipendente_id"]
            isOneToOne: false
            referencedRelation: "bar_convenzioni_dipendenti_saldi"
            referencedColumns: ["dipendente_id"]
          },
          {
            foreignKeyName: "bar_convenzioni_addebiti_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_convenzioni_addebiti_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: true
            referencedRelation: "conti_pagamenti"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_convenzioni_dipendenti: {
        Row: {
          attivo: boolean
          codice_tessera: string | null
          contatto_id: string | null
          convenzione_id: string
          created_at: string
          created_by: string | null
          id: string
          limite_mensile: number | null
          modulo: string
          nome: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          codice_tessera?: string | null
          contatto_id?: string | null
          convenzione_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          limite_mensile?: number | null
          modulo?: string
          nome: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          codice_tessera?: string | null
          contatto_id?: string | null
          convenzione_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          limite_mensile?: number | null
          modulo?: string
          nome?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bar_convenzioni_dipendenti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_convenzioni_dipendenti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "bar_convenzioni_dipendenti_convenzione_id_fkey"
            columns: ["convenzione_id"]
            isOneToOne: false
            referencedRelation: "bar_convenzioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_convenzioni_dipendenti_convenzione_id_fkey"
            columns: ["convenzione_id"]
            isOneToOne: false
            referencedRelation: "bar_convenzioni_riepilogo"
            referencedColumns: ["convenzione_id"]
          },
          {
            foreignKeyName: "bar_convenzioni_dipendenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_convenzioni_dipendenti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_mescite: {
        Row: {
          anomalia: boolean
          aperta_at: string
          aperta_da: string | null
          articolo_id: string
          chiusa_at: string | null
          chiusa_da: string | null
          contenitore: string
          created_at: string
          created_by: string | null
          erogato_teorico: number | null
          id: string
          locale_id: string
          lotto_id: string | null
          modulo: string
          note: string | null
          periodo: unknown
          quantita_iniziale: number
          quantita_residua: number | null
          sfrido: number | null
          sfrido_pct: number | null
          sfrido_registrato: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          anomalia?: boolean
          aperta_at?: string
          aperta_da?: string | null
          articolo_id: string
          chiusa_at?: string | null
          chiusa_da?: string | null
          contenitore?: string
          created_at?: string
          created_by?: string | null
          erogato_teorico?: number | null
          id?: string
          locale_id: string
          lotto_id?: string | null
          modulo?: string
          note?: string | null
          periodo?: never
          quantita_iniziale: number
          quantita_residua?: number | null
          sfrido?: number | null
          sfrido_pct?: number | null
          sfrido_registrato?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          anomalia?: boolean
          aperta_at?: string
          aperta_da?: string | null
          articolo_id?: string
          chiusa_at?: string | null
          chiusa_da?: string | null
          contenitore?: string
          created_at?: string
          created_by?: string | null
          erogato_teorico?: number | null
          id?: string
          locale_id?: string
          lotto_id?: string | null
          modulo?: string
          note?: string | null
          periodo?: never
          quantita_iniziale?: number
          quantita_residua?: number | null
          sfrido?: number | null
          sfrido_pct?: number | null
          sfrido_registrato?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bar_mescite_aperta_da_fkey"
            columns: ["aperta_da"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_mescite_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_mescite_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "bar_mescite_chiusa_da_fkey"
            columns: ["chiusa_da"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_mescite_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_mescite_locale_id_fkey"
            columns: ["locale_id"]
            isOneToOne: false
            referencedRelation: "fb_locali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_mescite_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "mag_lotti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_mescite_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "mag_lotti_stato"
            referencedColumns: ["lotto_id"]
          },
          {
            foreignKeyName: "bar_mescite_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campagne: {
        Row: {
          canale: Database["public"]["Enums"]["campagna_canale"]
          codice: string | null
          corpo: string
          created_at: string
          created_by: string | null
          id: string
          inviata_at: string | null
          modulo: string
          nome: string
          oggetto: string | null
          parametri: NonNullable<Json>
          programmata_at: string | null
          segmento: string
          stato: Database["public"]["Enums"]["campagna_stato"]
          updated_at: string
          updated_by: string | null
          url_base: string | null
        }
        Insert: {
          canale?: Database["public"]["Enums"]["campagna_canale"]
          codice?: string | null
          corpo: string
          created_at?: string
          created_by?: string | null
          id?: string
          inviata_at?: string | null
          modulo: string
          nome: string
          oggetto?: string | null
          parametri?: NonNullable<Json>
          programmata_at?: string | null
          segmento: string
          stato?: Database["public"]["Enums"]["campagna_stato"]
          updated_at?: string
          updated_by?: string | null
          url_base?: string | null
        }
        Update: {
          canale?: Database["public"]["Enums"]["campagna_canale"]
          codice?: string | null
          corpo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inviata_at?: string | null
          modulo?: string
          nome?: string
          oggetto?: string | null
          parametri?: NonNullable<Json>
          programmata_at?: string | null
          segmento?: string
          stato?: Database["public"]["Enums"]["campagna_stato"]
          updated_at?: string
          updated_by?: string | null
          url_base?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campagne_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campagne_segmento_fkey"
            columns: ["segmento"]
            isOneToOne: false
            referencedRelation: "campagne_segmenti"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "campagne_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campagne_destinatari: {
        Row: {
          campagna_id: string
          contatto_id: string
          created_at: string
          id: string
          indirizzo: string | null
          inviato_at: string | null
          mail_id: string | null
          modulo: string
          motivo_esclusione: string | null
          stato: Database["public"]["Enums"]["campagna_destinatario_stato"]
          token: string
        }
        Insert: {
          campagna_id: string
          contatto_id: string
          created_at?: string
          id?: string
          indirizzo?: string | null
          inviato_at?: string | null
          mail_id?: string | null
          modulo: string
          motivo_esclusione?: string | null
          stato?: Database["public"]["Enums"]["campagna_destinatario_stato"]
          token?: string
        }
        Update: {
          campagna_id?: string
          contatto_id?: string
          created_at?: string
          id?: string
          indirizzo?: string | null
          inviato_at?: string | null
          mail_id?: string | null
          modulo?: string
          motivo_esclusione?: string | null
          stato?: Database["public"]["Enums"]["campagna_destinatario_stato"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "campagne_destinatari_campagna_id_fkey"
            columns: ["campagna_id"]
            isOneToOne: false
            referencedRelation: "campagne"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campagne_destinatari_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campagne_destinatari_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "campagne_destinatari_mail_id_fkey"
            columns: ["mail_id"]
            isOneToOne: false
            referencedRelation: "mail_outbox"
            referencedColumns: ["id"]
          },
        ]
      }
      campagne_segmenti: {
        Row: {
          descrizione: string | null
          etichetta: string
          funzione: string
          modulo: string | null
          parametri: NonNullable<Json>
          slug: string
        }
        Insert: {
          descrizione?: string | null
          etichetta: string
          funzione: string
          modulo?: string | null
          parametri?: NonNullable<Json>
          slug: string
        }
        Update: {
          descrizione?: string | null
          etichetta?: string
          funzione?: string
          modulo?: string | null
          parametri?: NonNullable<Json>
          slug?: string
        }
        Relationships: []
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
          ricerca?: never
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
          ricerca?: never
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
      cassa_sessioni: {
        Row: {
          aperta_at: string
          chiusa_at: string | null
          chiusa_da: string | null
          contanti_attesi: number | null
          contanti_contati: number | null
          created_at: string
          created_by: string | null
          differenza: number | null
          fondo_iniziale: number
          id: string
          modulo: string
          note: string | null
          postazione: string
          stato: Database["public"]["Enums"]["cassa_sessione_stato"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aperta_at?: string
          chiusa_at?: string | null
          chiusa_da?: string | null
          contanti_attesi?: number | null
          contanti_contati?: number | null
          created_at?: string
          created_by?: string | null
          differenza?: number | null
          fondo_iniziale?: number
          id?: string
          modulo: string
          note?: string | null
          postazione?: string
          stato?: Database["public"]["Enums"]["cassa_sessione_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aperta_at?: string
          chiusa_at?: string | null
          chiusa_da?: string | null
          contanti_attesi?: number | null
          contanti_contati?: number | null
          created_at?: string
          created_by?: string | null
          differenza?: number | null
          fondo_iniziale?: number
          id?: string
          modulo?: string
          note?: string | null
          postazione?: string
          stato?: Database["public"]["Enums"]["cassa_sessione_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cassa_sessioni_chiusa_da_fkey"
            columns: ["chiusa_da"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cassa_sessioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cassa_sessioni_updated_by_fkey"
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
          consenso_marketing: boolean
          consenso_marketing_at: string | null
          consenso_marketing_fonte: string | null
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
          consenso_marketing?: boolean
          consenso_marketing_at?: string | null
          consenso_marketing_fonte?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nome: string
          note?: string | null
          organizzazione_id?: string | null
          ricerca?: never
          ruolo_aziendale?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          cognome?: string | null
          consenso_marketing?: boolean
          consenso_marketing_at?: string | null
          consenso_marketing_fonte?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nome?: string
          note?: string | null
          organizzazione_id?: string | null
          ricerca?: never
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
      conti: {
        Row: {
          accetta_acconti: boolean
          aperto_at: string
          chiuso_at: string | null
          codice: string | null
          contatto_id: string | null
          conto_padre_id: string | null
          coperti: number | null
          created_at: string
          created_by: string | null
          descrizione: string | null
          fattura_id: string | null
          id: string
          modulo: string
          note: string | null
          organizzazione_id: string | null
          riferimento_id: string | null
          riferimento_tipo: string | null
          rt_riferimento: string | null
          sconto_importo: number
          sessione_id: string | null
          stato: Database["public"]["Enums"]["conto_stato"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accetta_acconti?: boolean
          aperto_at?: string
          chiuso_at?: string | null
          codice?: string | null
          contatto_id?: string | null
          conto_padre_id?: string | null
          coperti?: number | null
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          fattura_id?: string | null
          id?: string
          modulo: string
          note?: string | null
          organizzazione_id?: string | null
          riferimento_id?: string | null
          riferimento_tipo?: string | null
          rt_riferimento?: string | null
          sconto_importo?: number
          sessione_id?: string | null
          stato?: Database["public"]["Enums"]["conto_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accetta_acconti?: boolean
          aperto_at?: string
          chiuso_at?: string | null
          codice?: string | null
          contatto_id?: string | null
          conto_padre_id?: string | null
          coperti?: number | null
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          fattura_id?: string | null
          id?: string
          modulo?: string
          note?: string | null
          organizzazione_id?: string | null
          riferimento_id?: string | null
          riferimento_tipo?: string | null
          rt_riferimento?: string | null
          sconto_importo?: number
          sessione_id?: string | null
          stato?: Database["public"]["Enums"]["conto_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "conti_conto_padre_id_fkey"
            columns: ["conto_padre_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conti_conto_padre_id_fkey"
            columns: ["conto_padre_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "conti_conto_padre_id_fkey"
            columns: ["conto_padre_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "conti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conti_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conti_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conti_sessione_id_fkey"
            columns: ["sessione_id"]
            isOneToOne: false
            referencedRelation: "cassa_sessioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conti_pagamenti: {
        Row: {
          conto_destinazione_id: string | null
          conto_id: string
          created_at: string
          created_by: string | null
          id: string
          importo: number
          metodo: Database["public"]["Enums"]["pagamento_metodo"]
          modulo: string
          organizzazione_id: string | null
          pagato_at: string
          riferimento: string | null
          sessione_id: string | null
        }
        Insert: {
          conto_destinazione_id?: string | null
          conto_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          importo: number
          metodo: Database["public"]["Enums"]["pagamento_metodo"]
          modulo: string
          organizzazione_id?: string | null
          pagato_at?: string
          riferimento?: string | null
          sessione_id?: string | null
        }
        Update: {
          conto_destinazione_id?: string | null
          conto_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          importo?: number
          metodo?: Database["public"]["Enums"]["pagamento_metodo"]
          modulo?: string
          organizzazione_id?: string | null
          pagato_at?: string
          riferimento?: string | null
          sessione_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conti_pagamenti_conto_destinazione_id_fkey"
            columns: ["conto_destinazione_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conti_pagamenti_conto_destinazione_id_fkey"
            columns: ["conto_destinazione_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "conti_pagamenti_conto_destinazione_id_fkey"
            columns: ["conto_destinazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "conti_pagamenti_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conti_pagamenti_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "conti_pagamenti_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "conti_pagamenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conti_pagamenti_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conti_pagamenti_sessione_id_fkey"
            columns: ["sessione_id"]
            isOneToOne: false
            referencedRelation: "cassa_sessioni"
            referencedColumns: ["id"]
          },
        ]
      }
      conti_righe: {
        Row: {
          aliquota_iva: number
          articolo_id: string | null
          conto_id: string
          created_at: string
          created_by: string | null
          descrizione: string
          distinta_id: string | null
          id: string
          importo: number | null
          modulo: string
          persona: number | null
          prezzo_unitario: number
          quantita: number
          riferimento_id: string | null
          riferimento_tipo: string | null
          sconto_percentuale: number
          stornata: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aliquota_iva?: number
          articolo_id?: string | null
          conto_id: string
          created_at?: string
          created_by?: string | null
          descrizione: string
          distinta_id?: string | null
          id?: string
          importo?: never
          modulo: string
          persona?: number | null
          prezzo_unitario: number
          quantita?: number
          riferimento_id?: string | null
          riferimento_tipo?: string | null
          sconto_percentuale?: number
          stornata?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aliquota_iva?: number
          articolo_id?: string | null
          conto_id?: string
          created_at?: string
          created_by?: string | null
          descrizione?: string
          distinta_id?: string | null
          id?: string
          importo?: never
          modulo?: string
          persona?: number | null
          prezzo_unitario?: number
          quantita?: number
          riferimento_id?: string | null
          riferimento_tipo?: string | null
          sconto_percentuale?: number
          stornata?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conti_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conti_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "conti_righe_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conti_righe_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "conti_righe_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "conti_righe_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conti_righe_distinta_id_fkey"
            columns: ["distinta_id"]
            isOneToOne: false
            referencedRelation: "distinte_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conti_righe_distinta_id_fkey"
            columns: ["distinta_id"]
            isOneToOne: false
            referencedRelation: "distinte_base_riepilogo"
            referencedColumns: ["distinta_id"]
          },
          {
            foreignKeyName: "conti_righe_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conti_rimborsi: {
        Row: {
          conto_id: string
          created_at: string
          created_by: string | null
          eseguito_at: string
          id: string
          importo: number
          metodo: Database["public"]["Enums"]["pagamento_metodo"]
          modulo: string
          motivo: string
          riferimento: string | null
        }
        Insert: {
          conto_id: string
          created_at?: string
          created_by?: string | null
          eseguito_at?: string
          id?: string
          importo: number
          metodo: Database["public"]["Enums"]["pagamento_metodo"]
          modulo: string
          motivo: string
          riferimento?: string | null
        }
        Update: {
          conto_id?: string
          created_at?: string
          created_by?: string | null
          eseguito_at?: string
          id?: string
          importo?: number
          metodo?: Database["public"]["Enums"]["pagamento_metodo"]
          modulo?: string
          motivo?: string
          riferimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conti_rimborsi_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conti_rimborsi_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "conti_rimborsi_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "conti_rimborsi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      controlli_punti: {
        Row: {
          asset_id: string | null
          attivo: boolean
          checklist: NonNullable<Json>
          created_at: string
          created_by: string | null
          id: string
          istruzioni: string | null
          modulo: string
          nome: string
          ogni_ore: number | null
          responsabile_id: string | null
          soglia_max: number | null
          soglia_min: number | null
          tipo: Database["public"]["Enums"]["controllo_tipo"]
          ubicazione: string | null
          unita: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          asset_id?: string | null
          attivo?: boolean
          checklist?: NonNullable<Json>
          created_at?: string
          created_by?: string | null
          id?: string
          istruzioni?: string | null
          modulo: string
          nome: string
          ogni_ore?: number | null
          responsabile_id?: string | null
          soglia_max?: number | null
          soglia_min?: number | null
          tipo: Database["public"]["Enums"]["controllo_tipo"]
          ubicazione?: string | null
          unita?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          asset_id?: string | null
          attivo?: boolean
          checklist?: NonNullable<Json>
          created_at?: string
          created_by?: string | null
          id?: string
          istruzioni?: string | null
          modulo?: string
          nome?: string
          ogni_ore?: number | null
          responsabile_id?: string | null
          soglia_max?: number | null
          soglia_min?: number | null
          tipo?: Database["public"]["Enums"]["controllo_tipo"]
          ubicazione?: string | null
          unita?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "controlli_punti_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controlli_punti_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_indicatori"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "controlli_punti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controlli_punti_responsabile_id_fkey"
            columns: ["responsabile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controlli_punti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      controlli_registrazioni: {
        Row: {
          azione_correttiva: string | null
          azione_registrata_at: string | null
          azione_verificata_at: string | null
          azione_verificata_da: string | null
          checklist: NonNullable<Json>
          created_at: string
          created_by: string | null
          eseguito_at: string
          esito: Database["public"]["Enums"]["controllo_esito"] | null
          id: string
          lotto_id: string | null
          modulo: string
          note: string | null
          punto_id: string
          valore: number | null
        }
        Insert: {
          azione_correttiva?: string | null
          azione_registrata_at?: string | null
          azione_verificata_at?: string | null
          azione_verificata_da?: string | null
          checklist?: NonNullable<Json>
          created_at?: string
          created_by?: string | null
          eseguito_at?: string
          esito?: Database["public"]["Enums"]["controllo_esito"] | null
          id?: string
          lotto_id?: string | null
          modulo: string
          note?: string | null
          punto_id: string
          valore?: number | null
        }
        Update: {
          azione_correttiva?: string | null
          azione_registrata_at?: string | null
          azione_verificata_at?: string | null
          azione_verificata_da?: string | null
          checklist?: NonNullable<Json>
          created_at?: string
          created_by?: string | null
          eseguito_at?: string
          esito?: Database["public"]["Enums"]["controllo_esito"] | null
          id?: string
          lotto_id?: string | null
          modulo?: string
          note?: string | null
          punto_id?: string
          valore?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "controlli_registrazioni_azione_verificata_da_fkey"
            columns: ["azione_verificata_da"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controlli_registrazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controlli_registrazioni_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "mag_lotti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controlli_registrazioni_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "mag_lotti_stato"
            referencedColumns: ["lotto_id"]
          },
          {
            foreignKeyName: "controlli_registrazioni_punto_id_fkey"
            columns: ["punto_id"]
            isOneToOne: false
            referencedRelation: "controlli_punti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controlli_registrazioni_punto_id_fkey"
            columns: ["punto_id"]
            isOneToOne: false
            referencedRelation: "controlli_stato"
            referencedColumns: ["punto_id"]
          },
        ]
      }
      convenzioni: {
        Row: {
          attivo: boolean
          contatto: string | null
          created_at: string
          created_by: string | null
          ente_tipo: string | null
          id: string
          nome: string
          note: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          contatto?: string | null
          created_at?: string
          created_by?: string | null
          ente_tipo?: string | null
          id?: string
          nome: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          contatto?: string | null
          created_at?: string
          created_by?: string | null
          ente_tipo?: string | null
          id?: string
          nome?: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convenzioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convenzioni_updated_by_fkey"
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
      coupon: {
        Row: {
          attivo: boolean
          codice: string
          created_at: string
          created_by: string | null
          descrizione: string | null
          id: string
          modulo: string
          spesa_minima: number
          tipo: Database["public"]["Enums"]["coupon_tipo"]
          updated_at: string
          updated_by: string | null
          usi_massimi: number | null
          usi_per_cliente: number | null
          valido_al: string | null
          valido_dal: string | null
          valore: number
        }
        Insert: {
          attivo?: boolean
          codice: string
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          id?: string
          modulo: string
          spesa_minima?: number
          tipo: Database["public"]["Enums"]["coupon_tipo"]
          updated_at?: string
          updated_by?: string | null
          usi_massimi?: number | null
          usi_per_cliente?: number | null
          valido_al?: string | null
          valido_dal?: string | null
          valore: number
        }
        Update: {
          attivo?: boolean
          codice?: string
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          id?: string
          modulo?: string
          spesa_minima?: number
          tipo?: Database["public"]["Enums"]["coupon_tipo"]
          updated_at?: string
          updated_by?: string | null
          usi_massimi?: number | null
          usi_per_cliente?: number | null
          valido_al?: string | null
          valido_dal?: string | null
          valore?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupon_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_utilizzi: {
        Row: {
          contatto_id: string | null
          conto_id: string
          coupon_id: string
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          sconto: number
        }
        Insert: {
          contatto_id?: string | null
          conto_id: string
          coupon_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          modulo: string
          sconto: number
        }
        Update: {
          contatto_id?: string | null
          conto_id?: string
          coupon_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          sconto?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupon_utilizzi_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_utilizzi_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "coupon_utilizzi_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_utilizzi_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "coupon_utilizzi_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "coupon_utilizzi_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_utilizzi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          agente_id: string | null
          attivo: boolean
          chiuso_at: string | null
          contatto_id: string | null
          created_at: string
          created_by: string | null
          data_chiusura_prevista: string | null
          id: string
          immobile_id: string | null
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
          agente_id?: string | null
          attivo?: boolean
          chiuso_at?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          data_chiusura_prevista?: string | null
          id?: string
          immobile_id?: string | null
          importo?: number
          motivo_perdita?: string | null
          nome: string
          note?: string | null
          organizzazione_id?: string | null
          pipeline_id: string
          responsabile_id?: string | null
          ricerca?: never
          stage_id: string
          updated_at?: string
          updated_by?: string | null
          valuta?: string
        }
        Update: {
          agente_id?: string | null
          attivo?: boolean
          chiuso_at?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          data_chiusura_prevista?: string | null
          id?: string
          immobile_id?: string | null
          importo?: number
          motivo_perdita?: string | null
          nome?: string
          note?: string | null
          organizzazione_id?: string | null
          pipeline_id?: string
          responsabile_id?: string | null
          ricerca?: never
          stage_id?: string
          updated_at?: string
          updated_by?: string | null
          valuta?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "vw_agenti_kpi"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "deals_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "deals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
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
      demo_tabelle_ospite: {
        Row: {
          cancella: boolean
          inserisce: boolean
          messaggio_rifiuto: string | null
          modifica: boolean
          nota: string | null
          tabella: string
        }
        Insert: {
          cancella?: boolean
          inserisce?: boolean
          messaggio_rifiuto?: string | null
          modifica?: boolean
          nota?: string | null
          tabella: string
        }
        Update: {
          cancella?: boolean
          inserisce?: boolean
          messaggio_rifiuto?: string | null
          modifica?: boolean
          nota?: string | null
          tabella?: string
        }
        Relationships: []
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
      distinte_base: {
        Row: {
          articolo_prodotto_id: string | null
          attivo: boolean
          attributi: NonNullable<Json>
          categoria: string | null
          codice: string | null
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          nome: string
          note: string | null
          prezzo_vendita: number | null
          procedimento: string | null
          resa: number
          tempo_preparazione_min: number | null
          tipo: string
          unita_resa: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          articolo_prodotto_id?: string | null
          attivo?: boolean
          attributi?: NonNullable<Json>
          categoria?: string | null
          codice?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          modulo: string
          nome: string
          note?: string | null
          prezzo_vendita?: number | null
          procedimento?: string | null
          resa?: number
          tempo_preparazione_min?: number | null
          tipo?: string
          unita_resa?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          articolo_prodotto_id?: string | null
          attivo?: boolean
          attributi?: NonNullable<Json>
          categoria?: string | null
          codice?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome?: string
          note?: string | null
          prezzo_vendita?: number | null
          procedimento?: string | null
          resa?: number
          tempo_preparazione_min?: number | null
          tipo?: string
          unita_resa?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distinte_base_articolo_prodotto_id_fkey"
            columns: ["articolo_prodotto_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distinte_base_articolo_prodotto_id_fkey"
            columns: ["articolo_prodotto_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "distinte_base_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distinte_base_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      distinte_base_righe: {
        Row: {
          articolo_id: string | null
          created_at: string
          created_by: string | null
          distinta_id: string
          id: string
          modulo: string
          note: string | null
          ordine: number
          quantita: number
          scarto_percentuale: number
          sostituibile: boolean
          sotto_distinta_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          articolo_id?: string | null
          created_at?: string
          created_by?: string | null
          distinta_id: string
          id?: string
          modulo: string
          note?: string | null
          ordine?: number
          quantita: number
          scarto_percentuale?: number
          sostituibile?: boolean
          sotto_distinta_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          articolo_id?: string | null
          created_at?: string
          created_by?: string | null
          distinta_id?: string
          id?: string
          modulo?: string
          note?: string | null
          ordine?: number
          quantita?: number
          scarto_percentuale?: number
          sostituibile?: boolean
          sotto_distinta_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distinte_base_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distinte_base_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "distinte_base_righe_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distinte_base_righe_distinta_id_fkey"
            columns: ["distinta_id"]
            isOneToOne: false
            referencedRelation: "distinte_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distinte_base_righe_distinta_id_fkey"
            columns: ["distinta_id"]
            isOneToOne: false
            referencedRelation: "distinte_base_riepilogo"
            referencedColumns: ["distinta_id"]
          },
          {
            foreignKeyName: "distinte_base_righe_sotto_distinta_id_fkey"
            columns: ["sotto_distinta_id"]
            isOneToOne: false
            referencedRelation: "distinte_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distinte_base_righe_sotto_distinta_id_fkey"
            columns: ["sotto_distinta_id"]
            isOneToOne: false
            referencedRelation: "distinte_base_riepilogo"
            referencedColumns: ["distinta_id"]
          },
          {
            foreignKeyName: "distinte_base_righe_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eventi: {
        Row: {
          attributi: NonNullable<Json>
          codice: string | null
          contatto_id: string | null
          conto_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          fine: string
          id: string
          inizio: string
          luogo: string | null
          modulo: string
          note: string | null
          organizzazione_id: string | null
          partecipanti_confermati: number | null
          partecipanti_previsti: number | null
          programma: string | null
          referente_id: string | null
          ricerca: unknown
          sala_id: string | null
          sala_tipo: string | null
          stato: Database["public"]["Enums"]["evento_stato"]
          tipo: string | null
          titolo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attributi?: NonNullable<Json>
          codice?: string | null
          contatto_id?: string | null
          conto_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          fine: string
          id?: string
          inizio: string
          luogo?: string | null
          modulo: string
          note?: string | null
          organizzazione_id?: string | null
          partecipanti_confermati?: number | null
          partecipanti_previsti?: number | null
          programma?: string | null
          referente_id?: string | null
          ricerca?: never
          sala_id?: string | null
          sala_tipo?: string | null
          stato?: Database["public"]["Enums"]["evento_stato"]
          tipo?: string | null
          titolo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attributi?: NonNullable<Json>
          codice?: string | null
          contatto_id?: string | null
          conto_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          fine?: string
          id?: string
          inizio?: string
          luogo?: string | null
          modulo?: string
          note?: string | null
          organizzazione_id?: string | null
          partecipanti_confermati?: number | null
          partecipanti_previsti?: number | null
          programma?: string | null
          referente_id?: string | null
          ricerca?: never
          sala_id?: string | null
          sala_tipo?: string | null
          stato?: Database["public"]["Enums"]["evento_stato"]
          tipo?: string | null
          titolo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventi_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "eventi_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "eventi_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "eventi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_referente_id_fkey"
            columns: ["referente_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eventi_partecipanti: {
        Row: {
          allergeni: string[]
          confermato: boolean
          contatto_id: string | null
          created_at: string
          created_by: string | null
          esigenze_alimentari: string | null
          evento_id: string
          gruppo: string | null
          id: string
          modulo: string
          nome: string
          note: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allergeni?: string[]
          confermato?: boolean
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          esigenze_alimentari?: string | null
          evento_id: string
          gruppo?: string | null
          id?: string
          modulo: string
          nome: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allergeni?: string[]
          confermato?: boolean
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          esigenze_alimentari?: string | null
          evento_id?: string
          gruppo?: string | null
          id?: string
          modulo?: string
          nome?: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventi_partecipanti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_partecipanti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "eventi_partecipanti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_partecipanti_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_partecipanti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eventi_personale: {
        Row: {
          created_at: string
          created_by: string | null
          dipendente_id: string
          evento_id: string
          fine: string
          id: string
          inizio: string
          modulo: string
          note: string | null
          ruolo: string | null
          turno_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dipendente_id: string
          evento_id: string
          fine: string
          id?: string
          inizio: string
          modulo: string
          note?: string | null
          ruolo?: string | null
          turno_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dipendente_id?: string
          evento_id?: string
          fine?: string
          id?: string
          inizio?: string
          modulo?: string
          note?: string | null
          ruolo?: string | null
          turno_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventi_personale_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_personale_dipendente_id_fkey"
            columns: ["dipendente_id"]
            isOneToOne: false
            referencedRelation: "dipendenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_personale_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_personale_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_personale_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eventi_preventivi: {
        Row: {
          acconto: number | null
          acconto_pagato_at: string | null
          acconto_scadenza: string | null
          budget_cliente: number | null
          condizioni: string | null
          created_at: string
          created_by: string | null
          evento_id: string
          id: string
          modulo: string
          prezzo_forfait: number | null
          prezzo_persona: number | null
          sconto: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acconto?: number | null
          acconto_pagato_at?: string | null
          acconto_scadenza?: string | null
          budget_cliente?: number | null
          condizioni?: string | null
          created_at?: string
          created_by?: string | null
          evento_id: string
          id?: string
          modulo: string
          prezzo_forfait?: number | null
          prezzo_persona?: number | null
          sconto?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acconto?: number | null
          acconto_pagato_at?: string | null
          acconto_scadenza?: string | null
          budget_cliente?: number | null
          condizioni?: string | null
          created_at?: string
          created_by?: string | null
          evento_id?: string
          id?: string
          modulo?: string
          prezzo_forfait?: number | null
          prezzo_persona?: number | null
          sconto?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventi_preventivi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_preventivi_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: true
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_preventivi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eventi_qualita: {
        Row: {
          azioni: string | null
          chiuso: boolean
          chiuso_at: string | null
          created_at: string
          created_by: string | null
          data: string
          descrizione: string
          gravita: Database["public"]["Enums"]["priorita_type"]
          id: string
          tipo: Database["public"]["Enums"]["evento_qualita_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          azioni?: string | null
          chiuso?: boolean
          chiuso_at?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione: string
          gravita?: Database["public"]["Enums"]["priorita_type"]
          id?: string
          tipo: Database["public"]["Enums"]["evento_qualita_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          azioni?: string | null
          chiuso?: boolean
          chiuso_at?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione?: string
          gravita?: Database["public"]["Enums"]["priorita_type"]
          id?: string
          tipo?: Database["public"]["Enums"]["evento_qualita_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventi_qualita_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_qualita_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eventi_voci: {
        Row: {
          categoria: Database["public"]["Enums"]["evento_voce_categoria"]
          confermata: boolean
          costo: number | null
          costo_unitario: number
          created_at: string
          created_by: string | null
          descrizione: string
          distinta_id: string | null
          evento_id: string
          fornitore_id: string | null
          id: string
          modulo: string
          note: string | null
          prezzo_unitario: number
          quantita: number
          ricavo: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["evento_voce_categoria"]
          confermata?: boolean
          costo?: never
          costo_unitario?: number
          created_at?: string
          created_by?: string | null
          descrizione: string
          distinta_id?: string | null
          evento_id: string
          fornitore_id?: string | null
          id?: string
          modulo: string
          note?: string | null
          prezzo_unitario?: number
          quantita?: number
          ricavo?: never
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["evento_voce_categoria"]
          confermata?: boolean
          costo?: never
          costo_unitario?: number
          created_at?: string
          created_by?: string | null
          descrizione?: string
          distinta_id?: string | null
          evento_id?: string
          fornitore_id?: string | null
          id?: string
          modulo?: string
          note?: string | null
          prezzo_unitario?: number
          quantita?: number
          ricavo?: never
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventi_voci_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_voci_distinta_id_fkey"
            columns: ["distinta_id"]
            isOneToOne: false
            referencedRelation: "distinte_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_voci_distinta_id_fkey"
            columns: ["distinta_id"]
            isOneToOne: false
            referencedRelation: "distinte_base_riepilogo"
            referencedColumns: ["distinta_id"]
          },
          {
            foreignKeyName: "eventi_voci_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_voci_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventi_voci_updated_by_fkey"
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
      fb_attesa: {
        Row: {
          attesa_stimata_min: number | null
          avvisato_at: string | null
          contatto_id: string | null
          created_at: string
          created_by: string | null
          id: string
          locale_id: string
          modulo: string
          nome: string
          note: string | null
          ora_richiesta: string
          persone: number
          priorita: number
          sala_id: string | null
          seduto_at: string | null
          stato: string
          tavolo_id: string | null
          telefono: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attesa_stimata_min?: number | null
          avvisato_at?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          locale_id: string
          modulo: string
          nome: string
          note?: string | null
          ora_richiesta?: string
          persone: number
          priorita?: number
          sala_id?: string | null
          seduto_at?: string | null
          stato?: string
          tavolo_id?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attesa_stimata_min?: number | null
          avvisato_at?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          locale_id?: string
          modulo?: string
          nome?: string
          note?: string | null
          ora_richiesta?: string
          persone?: number
          priorita?: number
          sala_id?: string | null
          seduto_at?: string | null
          stato?: string
          tavolo_id?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_attesa_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_attesa_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "fb_attesa_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_attesa_locale_id_fkey"
            columns: ["locale_id"]
            isOneToOne: false
            referencedRelation: "fb_locali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_attesa_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "fb_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_attesa_tavolo_id_fkey"
            columns: ["tavolo_id"]
            isOneToOne: false
            referencedRelation: "fb_tavoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_attesa_tavolo_id_fkey"
            columns: ["tavolo_id"]
            isOneToOne: false
            referencedRelation: "fb_tavoli_stato"
            referencedColumns: ["tavolo_id"]
          },
          {
            foreignKeyName: "fb_attesa_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_categorie: {
        Row: {
          area: string
          attiva: boolean
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          nome: string
          ordine: number
          updated_at: string
          updated_by: string | null
          uscita: number
        }
        Insert: {
          area?: string
          attiva?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome: string
          ordine?: number
          updated_at?: string
          updated_by?: string | null
          uscita?: number
        }
        Update: {
          area?: string
          attiva?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome?: string
          ordine?: number
          updated_at?: string
          updated_by?: string | null
          uscita?: number
        }
        Relationships: [
          {
            foreignKeyName: "fb_categorie_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_categorie_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_clienti: {
        Row: {
          allergie: string[]
          anniversario: string | null
          compleanno: string | null
          contatto_id: string
          created_at: string
          created_by: string | null
          id: string
          intolleranze: string | null
          modulo: string
          note: string | null
          preferenze: string | null
          preferenze_alimentari: string | null
          ricorrenze: NonNullable<Json>
          tavolo_preferito_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allergie?: string[]
          anniversario?: string | null
          compleanno?: string | null
          contatto_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          intolleranze?: string | null
          modulo?: string
          note?: string | null
          preferenze?: string | null
          preferenze_alimentari?: string | null
          ricorrenze?: NonNullable<Json>
          tavolo_preferito_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allergie?: string[]
          anniversario?: string | null
          compleanno?: string | null
          contatto_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          intolleranze?: string | null
          modulo?: string
          note?: string | null
          preferenze?: string | null
          preferenze_alimentari?: string | null
          ricorrenze?: NonNullable<Json>
          tavolo_preferito_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_clienti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: true
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_clienti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: true
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "fb_clienti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_clienti_tavolo_preferito_id_fkey"
            columns: ["tavolo_preferito_id"]
            isOneToOne: false
            referencedRelation: "fb_tavoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_clienti_tavolo_preferito_id_fkey"
            columns: ["tavolo_preferito_id"]
            isOneToOne: false
            referencedRelation: "fb_tavoli_stato"
            referencedColumns: ["tavolo_id"]
          },
          {
            foreignKeyName: "fb_clienti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_comande: {
        Row: {
          aperta_at: string
          cameriere_id: string | null
          canale: string
          chiusa_at: string | null
          cliente_nome: string | null
          cliente_telefono: string | null
          contatto_id: string | null
          conto_id: string | null
          conto_richiesto_at: string | null
          convenzione_dipendente_id: string | null
          coperti: number | null
          created_at: string
          created_by: string | null
          id: string
          locale_id: string
          modulo: string
          note: string | null
          numero: number | null
          piattaforma: string | null
          piattaforma_ordine_id: string | null
          prenotazione_id: string | null
          priorita: string
          ritiro_at: string | null
          stato: Database["public"]["Enums"]["fb_comanda_stato"]
          tavolo_id: string | null
          tipologia_cliente: string | null
          updated_at: string
          updated_by: string | null
          uscite_automatiche: boolean
        }
        Insert: {
          aperta_at?: string
          cameriere_id?: string | null
          canale?: string
          chiusa_at?: string | null
          cliente_nome?: string | null
          cliente_telefono?: string | null
          contatto_id?: string | null
          conto_id?: string | null
          conto_richiesto_at?: string | null
          convenzione_dipendente_id?: string | null
          coperti?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          locale_id: string
          modulo: string
          note?: string | null
          numero?: number | null
          piattaforma?: string | null
          piattaforma_ordine_id?: string | null
          prenotazione_id?: string | null
          priorita?: string
          ritiro_at?: string | null
          stato?: Database["public"]["Enums"]["fb_comanda_stato"]
          tavolo_id?: string | null
          tipologia_cliente?: string | null
          updated_at?: string
          updated_by?: string | null
          uscite_automatiche?: boolean
        }
        Update: {
          aperta_at?: string
          cameriere_id?: string | null
          canale?: string
          chiusa_at?: string | null
          cliente_nome?: string | null
          cliente_telefono?: string | null
          contatto_id?: string | null
          conto_id?: string | null
          conto_richiesto_at?: string | null
          convenzione_dipendente_id?: string | null
          coperti?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          locale_id?: string
          modulo?: string
          note?: string | null
          numero?: number | null
          piattaforma?: string | null
          piattaforma_ordine_id?: string | null
          prenotazione_id?: string | null
          priorita?: string
          ritiro_at?: string | null
          stato?: Database["public"]["Enums"]["fb_comanda_stato"]
          tavolo_id?: string | null
          tipologia_cliente?: string | null
          updated_at?: string
          updated_by?: string | null
          uscite_automatiche?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fb_comande_cameriere_id_fkey"
            columns: ["cameriere_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "fb_comande_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "fb_comande_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "fb_comande_convenzione_dipendente_id_fkey"
            columns: ["convenzione_dipendente_id"]
            isOneToOne: false
            referencedRelation: "bar_convenzioni_dipendenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_convenzione_dipendente_id_fkey"
            columns: ["convenzione_dipendente_id"]
            isOneToOne: false
            referencedRelation: "bar_convenzioni_dipendenti_saldi"
            referencedColumns: ["dipendente_id"]
          },
          {
            foreignKeyName: "fb_comande_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_locale_id_fkey"
            columns: ["locale_id"]
            isOneToOne: false
            referencedRelation: "fb_locali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "fb_prenotazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "fb_tavoli_stato"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "fb_comande_tavolo_id_fkey"
            columns: ["tavolo_id"]
            isOneToOne: false
            referencedRelation: "fb_tavoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_tavolo_id_fkey"
            columns: ["tavolo_id"]
            isOneToOne: false
            referencedRelation: "fb_tavoli_stato"
            referencedColumns: ["tavolo_id"]
          },
          {
            foreignKeyName: "fb_comande_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_comande_righe: {
        Row: {
          aliquota_iva: number | null
          allergie: string[]
          annullata_at: string | null
          cameriere_id: string | null
          comanda_id: string
          conti_riga_id: string | null
          costo_unitario: number | null
          created_at: string
          created_by: string | null
          descrizione: string
          id: string
          inviata_at: string | null
          invio: string
          locale_id: string
          modulo: string
          motivo_rifacimento: string | null
          note: string | null
          omaggio: boolean
          ordinata_at: string
          padre_id: string | null
          personalizzazioni: string | null
          preparata_da: string | null
          preparazione_at: string | null
          presa_at: string | null
          prezzo_origine: string | null
          prezzo_unitario: number | null
          priorita: string
          prodotto_id: string
          promo_omaggi: number
          promozione_id: string | null
          pronta_at: string | null
          quantita: number
          rifacimento_di: string | null
          scaricata: boolean
          servita_at: string | null
          stato: Database["public"]["Enums"]["fb_riga_stato"]
          stazione_id: string | null
          updated_at: string
          updated_by: string | null
          uscita: number | null
          fb_riga_scarica: undefined | null
        }
        Insert: {
          aliquota_iva?: number | null
          allergie?: string[]
          annullata_at?: string | null
          cameriere_id?: string | null
          comanda_id: string
          conti_riga_id?: string | null
          costo_unitario?: number | null
          created_at?: string
          created_by?: string | null
          descrizione: string
          id?: string
          inviata_at?: string | null
          invio?: string
          locale_id: string
          modulo: string
          motivo_rifacimento?: string | null
          note?: string | null
          omaggio?: boolean
          ordinata_at?: string
          padre_id?: string | null
          personalizzazioni?: string | null
          preparata_da?: string | null
          preparazione_at?: string | null
          presa_at?: string | null
          prezzo_origine?: string | null
          prezzo_unitario?: number | null
          priorita?: string
          prodotto_id: string
          promo_omaggi?: number
          promozione_id?: string | null
          pronta_at?: string | null
          quantita?: number
          rifacimento_di?: string | null
          scaricata?: boolean
          servita_at?: string | null
          stato?: Database["public"]["Enums"]["fb_riga_stato"]
          stazione_id?: string | null
          updated_at?: string
          updated_by?: string | null
          uscita?: number | null
        }
        Update: {
          aliquota_iva?: number | null
          allergie?: string[]
          annullata_at?: string | null
          cameriere_id?: string | null
          comanda_id?: string
          conti_riga_id?: string | null
          costo_unitario?: number | null
          created_at?: string
          created_by?: string | null
          descrizione?: string
          id?: string
          inviata_at?: string | null
          invio?: string
          locale_id?: string
          modulo?: string
          motivo_rifacimento?: string | null
          note?: string | null
          omaggio?: boolean
          ordinata_at?: string
          padre_id?: string | null
          personalizzazioni?: string | null
          preparata_da?: string | null
          preparazione_at?: string | null
          presa_at?: string | null
          prezzo_origine?: string | null
          prezzo_unitario?: number | null
          priorita?: string
          prodotto_id?: string
          promo_omaggi?: number
          promozione_id?: string | null
          pronta_at?: string | null
          quantita?: number
          rifacimento_di?: string | null
          scaricata?: boolean
          servita_at?: string | null
          stato?: Database["public"]["Enums"]["fb_riga_stato"]
          stazione_id?: string | null
          updated_at?: string
          updated_by?: string | null
          uscita?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_comande_righe_cameriere_id_fkey"
            columns: ["cameriere_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "fb_comande"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "fb_tavoli_stato"
            referencedColumns: ["comanda_id"]
          },
          {
            foreignKeyName: "fb_comande_righe_conti_riga_id_fkey"
            columns: ["conti_riga_id"]
            isOneToOne: false
            referencedRelation: "conti_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "fb_comande_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "fb_kds"
            referencedColumns: ["riga_id"]
          },
          {
            foreignKeyName: "fb_comande_righe_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "fb_vendite"
            referencedColumns: ["riga_id"]
          },
          {
            foreignKeyName: "fb_comande_righe_preparata_da_fkey"
            columns: ["preparata_da"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_prodotto_id_fkey"
            columns: ["prodotto_id"]
            isOneToOne: false
            referencedRelation: "fb_prodotti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_prodotto_id_fkey"
            columns: ["prodotto_id"]
            isOneToOne: false
            referencedRelation: "fb_prodotti_economia"
            referencedColumns: ["prodotto_id"]
          },
          {
            foreignKeyName: "fb_comande_righe_promozione_id_fkey"
            columns: ["promozione_id"]
            isOneToOne: false
            referencedRelation: "fb_promozioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_rifacimento_di_fkey"
            columns: ["rifacimento_di"]
            isOneToOne: false
            referencedRelation: "fb_comande_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_rifacimento_di_fkey"
            columns: ["rifacimento_di"]
            isOneToOne: false
            referencedRelation: "fb_kds"
            referencedColumns: ["riga_id"]
          },
          {
            foreignKeyName: "fb_comande_righe_rifacimento_di_fkey"
            columns: ["rifacimento_di"]
            isOneToOne: false
            referencedRelation: "fb_vendite"
            referencedColumns: ["riga_id"]
          },
          {
            foreignKeyName: "fb_comande_righe_stazione_id_fkey"
            columns: ["stazione_id"]
            isOneToOne: false
            referencedRelation: "fb_stazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_consegne: {
        Row: {
          citta: string | null
          comanda_id: string
          consegnata_at: string | null
          conti_riga_id: string | null
          costo_consegna: number
          created_at: string
          created_by: string | null
          fascia_alle: string | null
          fascia_dalle: string | null
          id: string
          indirizzo: string
          locale_id: string
          modulo: string
          note: string | null
          partita_at: string | null
          piattaforma: string | null
          piattaforma_ordine_id: string | null
          rider_esterno: string | null
          rider_id: string | null
          stato: string
          updated_at: string
          updated_by: string | null
          zona: string | null
        }
        Insert: {
          citta?: string | null
          comanda_id: string
          consegnata_at?: string | null
          conti_riga_id?: string | null
          costo_consegna?: number
          created_at?: string
          created_by?: string | null
          fascia_alle?: string | null
          fascia_dalle?: string | null
          id?: string
          indirizzo: string
          locale_id: string
          modulo: string
          note?: string | null
          partita_at?: string | null
          piattaforma?: string | null
          piattaforma_ordine_id?: string | null
          rider_esterno?: string | null
          rider_id?: string | null
          stato?: string
          updated_at?: string
          updated_by?: string | null
          zona?: string | null
        }
        Update: {
          citta?: string | null
          comanda_id?: string
          consegnata_at?: string | null
          conti_riga_id?: string | null
          costo_consegna?: number
          created_at?: string
          created_by?: string | null
          fascia_alle?: string | null
          fascia_dalle?: string | null
          id?: string
          indirizzo?: string
          locale_id?: string
          modulo?: string
          note?: string | null
          partita_at?: string | null
          piattaforma?: string | null
          piattaforma_ordine_id?: string | null
          rider_esterno?: string | null
          rider_id?: string | null
          stato?: string
          updated_at?: string
          updated_by?: string | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_consegne_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: true
            referencedRelation: "fb_comande"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_consegne_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: true
            referencedRelation: "fb_tavoli_stato"
            referencedColumns: ["comanda_id"]
          },
          {
            foreignKeyName: "fb_consegne_conti_riga_id_fkey"
            columns: ["conti_riga_id"]
            isOneToOne: false
            referencedRelation: "conti_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_consegne_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_consegne_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "dipendenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_consegne_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_locali: {
        Row: {
          anticipo_prenotato_min: number
          attivo: boolean
          coperti_per_cameriere: number
          coperti_per_cuoco: number
          costo_orario_medio: number | null
          created_at: string
          created_by: string | null
          durata_tavolo_min: number
          id: string
          indirizzo: string | null
          modulo: string
          nome: string
          note: string | null
          pausa_uscite_min: number
          soglia_sfrido_pct: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          anticipo_prenotato_min?: number
          attivo?: boolean
          coperti_per_cameriere?: number
          coperti_per_cuoco?: number
          costo_orario_medio?: number | null
          created_at?: string
          created_by?: string | null
          durata_tavolo_min?: number
          id?: string
          indirizzo?: string | null
          modulo: string
          nome: string
          note?: string | null
          pausa_uscite_min?: number
          soglia_sfrido_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          anticipo_prenotato_min?: number
          attivo?: boolean
          coperti_per_cameriere?: number
          coperti_per_cuoco?: number
          costo_orario_medio?: number | null
          created_at?: string
          created_by?: string | null
          durata_tavolo_min?: number
          id?: string
          indirizzo?: string | null
          modulo?: string
          nome?: string
          note?: string | null
          pausa_uscite_min?: number
          soglia_sfrido_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_locali_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_locali_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_menu: {
        Row: {
          attivo: boolean
          canale: string
          created_at: string
          created_by: string | null
          descrizione: string | null
          giorni: number[]
          id: string
          locale_id: string
          modulo: string
          nome: string
          ora_fine: string | null
          ora_inizio: string | null
          prezzo_fisso: number | null
          priorita: number
          tipo: string
          tipologia_cliente: string | null
          updated_at: string
          updated_by: string | null
          valido_al: string | null
          valido_dal: string | null
        }
        Insert: {
          attivo?: boolean
          canale?: string
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          giorni?: number[]
          id?: string
          locale_id: string
          modulo: string
          nome: string
          ora_fine?: string | null
          ora_inizio?: string | null
          prezzo_fisso?: number | null
          priorita?: number
          tipo?: string
          tipologia_cliente?: string | null
          updated_at?: string
          updated_by?: string | null
          valido_al?: string | null
          valido_dal?: string | null
        }
        Update: {
          attivo?: boolean
          canale?: string
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          giorni?: number[]
          id?: string
          locale_id?: string
          modulo?: string
          nome?: string
          ora_fine?: string | null
          ora_inizio?: string | null
          prezzo_fisso?: number | null
          priorita?: number
          tipo?: string
          tipologia_cliente?: string | null
          updated_at?: string
          updated_by?: string | null
          valido_al?: string | null
          valido_dal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_menu_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_menu_locale_id_fkey"
            columns: ["locale_id"]
            isOneToOne: false
            referencedRelation: "fb_locali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_menu_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_menu_voci: {
        Row: {
          created_at: string
          created_by: string | null
          disponibile: boolean
          id: string
          menu_id: string
          modulo: string
          ordine: number
          prezzo: number | null
          prodotto_id: string
          sezione: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          disponibile?: boolean
          id?: string
          menu_id: string
          modulo: string
          ordine?: number
          prezzo?: number | null
          prodotto_id: string
          sezione?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          disponibile?: boolean
          id?: string
          menu_id?: string
          modulo?: string
          ordine?: number
          prezzo?: number | null
          prodotto_id?: string
          sezione?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_menu_voci_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_menu_voci_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "fb_menu"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_menu_voci_prodotto_id_fkey"
            columns: ["prodotto_id"]
            isOneToOne: false
            referencedRelation: "fb_prodotti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_menu_voci_prodotto_id_fkey"
            columns: ["prodotto_id"]
            isOneToOne: false
            referencedRelation: "fb_prodotti_economia"
            referencedColumns: ["prodotto_id"]
          },
          {
            foreignKeyName: "fb_menu_voci_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_prenotazioni: {
        Row: {
          allergie: string[]
          arrivata_at: string | null
          canale: string
          conclusa_at: string | null
          contatto_id: string | null
          created_at: string
          created_by: string | null
          durata_min: number | null
          email: string | null
          evento_id: string | null
          fine: string | null
          id: string
          inizio: string
          intolleranze: string | null
          locale_id: string
          modulo: string
          nome: string
          note: string | null
          occasione: string | null
          persone: number
          piattaforma_id: string | null
          ricerca: unknown
          richieste_speciali: string | null
          sala_id: string | null
          stato: Database["public"]["Enums"]["fb_prenotazione_stato"]
          tavoli: string[]
          telefono: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allergie?: string[]
          arrivata_at?: string | null
          canale?: string
          conclusa_at?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          durata_min?: number | null
          email?: string | null
          evento_id?: string | null
          fine?: string | null
          id?: string
          inizio: string
          intolleranze?: string | null
          locale_id: string
          modulo: string
          nome: string
          note?: string | null
          occasione?: string | null
          persone: number
          piattaforma_id?: string | null
          ricerca?: never
          richieste_speciali?: string | null
          sala_id?: string | null
          stato?: Database["public"]["Enums"]["fb_prenotazione_stato"]
          tavoli?: string[]
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allergie?: string[]
          arrivata_at?: string | null
          canale?: string
          conclusa_at?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          durata_min?: number | null
          email?: string | null
          evento_id?: string | null
          fine?: string | null
          id?: string
          inizio?: string
          intolleranze?: string | null
          locale_id?: string
          modulo?: string
          nome?: string
          note?: string | null
          occasione?: string | null
          persone?: number
          piattaforma_id?: string | null
          ricerca?: never
          richieste_speciali?: string | null
          sala_id?: string | null
          stato?: Database["public"]["Enums"]["fb_prenotazione_stato"]
          tavoli?: string[]
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_prenotazioni_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_prenotazioni_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "fb_prenotazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_prenotazioni_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_prenotazioni_locale_id_fkey"
            columns: ["locale_id"]
            isOneToOne: false
            referencedRelation: "fb_locali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_prenotazioni_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "fb_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_prenotazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_prenotazioni_tavoli: {
        Row: {
          attiva: boolean
          id: string
          modulo: string
          periodo: unknown
          prenotazione_id: string
          tavolo_id: string
        }
        Insert: {
          attiva?: boolean
          id?: string
          modulo: string
          periodo: unknown
          prenotazione_id: string
          tavolo_id: string
        }
        Update: {
          attiva?: boolean
          id?: string
          modulo?: string
          periodo?: unknown
          prenotazione_id?: string
          tavolo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fb_prenotazioni_tavoli_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "fb_prenotazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_prenotazioni_tavoli_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "fb_tavoli_stato"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "fb_prenotazioni_tavoli_tavolo_id_fkey"
            columns: ["tavolo_id"]
            isOneToOne: false
            referencedRelation: "fb_tavoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_prenotazioni_tavoli_tavolo_id_fkey"
            columns: ["tavolo_id"]
            isOneToOne: false
            referencedRelation: "fb_tavoli_stato"
            referencedColumns: ["tavolo_id"]
          },
        ]
      }
      fb_prodotti: {
        Row: {
          aliquota_iva: number
          allergeni_potenziali: string[]
          articolo_id: string | null
          articolo_quantita: number
          attributi: NonNullable<Json>
          beverage_tipo: string | null
          canali: string[]
          categoria_id: string
          codice: string | null
          componenti: string[]
          contaminazioni: string | null
          costo_manuale: number | null
          created_at: string
          created_by: string | null
          descrizione: string | null
          distinta_id: string | null
          fornitore_id: string | null
          foto_path: string | null
          id: string
          ingredienti_sostituibili: string | null
          mescita: boolean
          mesi_disponibili: number[]
          modulo: string
          nome: string
          note_operative: string | null
          prezzo: number
          ricerca: unknown
          stato: string
          tempo_preparazione_min: number | null
          unita_vendita: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aliquota_iva?: number
          allergeni_potenziali?: string[]
          articolo_id?: string | null
          articolo_quantita?: number
          attributi?: NonNullable<Json>
          beverage_tipo?: string | null
          canali?: string[]
          categoria_id: string
          codice?: string | null
          componenti?: string[]
          contaminazioni?: string | null
          costo_manuale?: number | null
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          distinta_id?: string | null
          fornitore_id?: string | null
          foto_path?: string | null
          id?: string
          ingredienti_sostituibili?: string | null
          mescita?: boolean
          mesi_disponibili?: number[]
          modulo?: string
          nome: string
          note_operative?: string | null
          prezzo?: number
          ricerca?: never
          stato?: string
          tempo_preparazione_min?: number | null
          unita_vendita?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aliquota_iva?: number
          allergeni_potenziali?: string[]
          articolo_id?: string | null
          articolo_quantita?: number
          attributi?: NonNullable<Json>
          beverage_tipo?: string | null
          canali?: string[]
          categoria_id?: string
          codice?: string | null
          componenti?: string[]
          contaminazioni?: string | null
          costo_manuale?: number | null
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          distinta_id?: string | null
          fornitore_id?: string | null
          foto_path?: string | null
          id?: string
          ingredienti_sostituibili?: string | null
          mescita?: boolean
          mesi_disponibili?: number[]
          modulo?: string
          nome?: string
          note_operative?: string | null
          prezzo?: number
          ricerca?: never
          stato?: string
          tempo_preparazione_min?: number | null
          unita_vendita?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_prodotti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_prodotti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "fb_prodotti_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "fb_categorie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_prodotti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_prodotti_distinta_id_fkey"
            columns: ["distinta_id"]
            isOneToOne: false
            referencedRelation: "distinte_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_prodotti_distinta_id_fkey"
            columns: ["distinta_id"]
            isOneToOne: false
            referencedRelation: "distinte_base_riepilogo"
            referencedColumns: ["distinta_id"]
          },
          {
            foreignKeyName: "fb_prodotti_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_prodotti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_promozioni: {
        Row: {
          attiva: boolean
          canali: string[]
          categorie: string[]
          created_at: string
          created_by: string | null
          giorni: number[]
          id: string
          locale_id: string | null
          modulo: string
          nome: string
          ora_fine: string | null
          ora_inizio: string | null
          prezzo: number | null
          prodotti: string[]
          quantita_x: number | null
          quantita_y: number | null
          sconto_percentuale: number | null
          tipo: string
          tipologia_cliente: string | null
          updated_at: string
          updated_by: string | null
          valido_al: string | null
          valido_dal: string | null
        }
        Insert: {
          attiva?: boolean
          canali?: string[]
          categorie?: string[]
          created_at?: string
          created_by?: string | null
          giorni?: number[]
          id?: string
          locale_id?: string | null
          modulo?: string
          nome: string
          ora_fine?: string | null
          ora_inizio?: string | null
          prezzo?: number | null
          prodotti?: string[]
          quantita_x?: number | null
          quantita_y?: number | null
          sconto_percentuale?: number | null
          tipo: string
          tipologia_cliente?: string | null
          updated_at?: string
          updated_by?: string | null
          valido_al?: string | null
          valido_dal?: string | null
        }
        Update: {
          attiva?: boolean
          canali?: string[]
          categorie?: string[]
          created_at?: string
          created_by?: string | null
          giorni?: number[]
          id?: string
          locale_id?: string | null
          modulo?: string
          nome?: string
          ora_fine?: string | null
          ora_inizio?: string | null
          prezzo?: number | null
          prodotti?: string[]
          quantita_x?: number | null
          quantita_y?: number | null
          sconto_percentuale?: number | null
          tipo?: string
          tipologia_cliente?: string | null
          updated_at?: string
          updated_by?: string | null
          valido_al?: string | null
          valido_dal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_promozioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_promozioni_locale_id_fkey"
            columns: ["locale_id"]
            isOneToOne: false
            referencedRelation: "fb_locali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_promozioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_sale: {
        Row: {
          altezza: number
          attiva: boolean
          created_at: string
          created_by: string | null
          id: string
          larghezza: number
          locale_id: string
          modulo: string
          nome: string
          ordine: number
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          altezza?: number
          attiva?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          larghezza?: number
          locale_id: string
          modulo: string
          nome: string
          ordine?: number
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          altezza?: number
          attiva?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          larghezza?: number
          locale_id?: string
          modulo?: string
          nome?: string
          ordine?: number
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_sale_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_sale_locale_id_fkey"
            columns: ["locale_id"]
            isOneToOne: false
            referencedRelation: "fb_locali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_sale_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_sprechi: {
        Row: {
          articolo_id: string | null
          causale: string
          costo: number | null
          created_at: string
          created_by: string | null
          id: string
          locale_id: string | null
          lotto_id: string | null
          modulo: string
          note: string | null
          prodotto_id: string | null
          quantita: number
          registrato_at: string
        }
        Insert: {
          articolo_id?: string | null
          causale: string
          costo?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          locale_id?: string | null
          lotto_id?: string | null
          modulo?: string
          note?: string | null
          prodotto_id?: string | null
          quantita: number
          registrato_at?: string
        }
        Update: {
          articolo_id?: string | null
          causale?: string
          costo?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          locale_id?: string | null
          lotto_id?: string | null
          modulo?: string
          note?: string | null
          prodotto_id?: string | null
          quantita?: number
          registrato_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fb_sprechi_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_sprechi_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "fb_sprechi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_sprechi_locale_id_fkey"
            columns: ["locale_id"]
            isOneToOne: false
            referencedRelation: "fb_locali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_sprechi_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "mag_lotti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_sprechi_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "mag_lotti_stato"
            referencedColumns: ["lotto_id"]
          },
          {
            foreignKeyName: "fb_sprechi_prodotto_id_fkey"
            columns: ["prodotto_id"]
            isOneToOne: false
            referencedRelation: "fb_prodotti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_sprechi_prodotto_id_fkey"
            columns: ["prodotto_id"]
            isOneToOne: false
            referencedRelation: "fb_prodotti_economia"
            referencedColumns: ["prodotto_id"]
          },
        ]
      }
      fb_stazioni: {
        Row: {
          attiva: boolean
          categorie: string[]
          created_at: string
          created_by: string | null
          id: string
          locale_id: string
          modulo: string
          nome: string
          ordine: number
          predefinita: boolean
          prodotti: string[]
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attiva?: boolean
          categorie?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          locale_id: string
          modulo: string
          nome: string
          ordine?: number
          predefinita?: boolean
          prodotti?: string[]
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attiva?: boolean
          categorie?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          locale_id?: string
          modulo?: string
          nome?: string
          ordine?: number
          predefinita?: boolean
          prodotti?: string[]
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_stazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_stazioni_locale_id_fkey"
            columns: ["locale_id"]
            isOneToOne: false
            referencedRelation: "fb_locali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_stazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_tavoli: {
        Row: {
          altezza: number
          attivo: boolean
          cameriere_id: string | null
          created_at: string
          created_by: string | null
          forma: string
          fuori_servizio: boolean
          id: string
          larghezza: number
          locale_id: string
          modulo: string
          numero: string
          posti: number
          posti_max: number | null
          rotazione: number
          sala_id: string
          updated_at: string
          updated_by: string | null
          x: number
          y: number
        }
        Insert: {
          altezza?: number
          attivo?: boolean
          cameriere_id?: string | null
          created_at?: string
          created_by?: string | null
          forma?: string
          fuori_servizio?: boolean
          id?: string
          larghezza?: number
          locale_id: string
          modulo: string
          numero: string
          posti: number
          posti_max?: number | null
          rotazione?: number
          sala_id: string
          updated_at?: string
          updated_by?: string | null
          x?: number
          y?: number
        }
        Update: {
          altezza?: number
          attivo?: boolean
          cameriere_id?: string | null
          created_at?: string
          created_by?: string | null
          forma?: string
          fuori_servizio?: boolean
          id?: string
          larghezza?: number
          locale_id?: string
          modulo?: string
          numero?: string
          posti?: number
          posti_max?: number | null
          rotazione?: number
          sala_id?: string
          updated_at?: string
          updated_by?: string | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "fb_tavoli_cameriere_id_fkey"
            columns: ["cameriere_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_tavoli_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_tavoli_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "fb_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_tavoli_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_vini: {
        Row: {
          abbinamenti: string | null
          annata: number | null
          articolo_id: string
          cantina: string | null
          created_at: string
          created_by: string | null
          denominazione: string | null
          descrizione: string | null
          formato: string
          id: string
          in_carta: boolean
          modulo: string
          ordine: number
          prodotto_bottiglia_id: string | null
          prodotto_calice_id: string | null
          produttore: string | null
          regione: string | null
          temperatura_servizio: string | null
          tipologia: string | null
          updated_at: string
          updated_by: string | null
          vitigno: string | null
        }
        Insert: {
          abbinamenti?: string | null
          annata?: number | null
          articolo_id: string
          cantina?: string | null
          created_at?: string
          created_by?: string | null
          denominazione?: string | null
          descrizione?: string | null
          formato?: string
          id?: string
          in_carta?: boolean
          modulo?: string
          ordine?: number
          prodotto_bottiglia_id?: string | null
          prodotto_calice_id?: string | null
          produttore?: string | null
          regione?: string | null
          temperatura_servizio?: string | null
          tipologia?: string | null
          updated_at?: string
          updated_by?: string | null
          vitigno?: string | null
        }
        Update: {
          abbinamenti?: string | null
          annata?: number | null
          articolo_id?: string
          cantina?: string | null
          created_at?: string
          created_by?: string | null
          denominazione?: string | null
          descrizione?: string | null
          formato?: string
          id?: string
          in_carta?: boolean
          modulo?: string
          ordine?: number
          prodotto_bottiglia_id?: string | null
          prodotto_calice_id?: string | null
          produttore?: string | null
          regione?: string | null
          temperatura_servizio?: string | null
          tipologia?: string | null
          updated_at?: string
          updated_by?: string | null
          vitigno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_vini_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: true
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_vini_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: true
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "fb_vini_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_vini_prodotto_bottiglia_id_fkey"
            columns: ["prodotto_bottiglia_id"]
            isOneToOne: false
            referencedRelation: "fb_prodotti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_vini_prodotto_bottiglia_id_fkey"
            columns: ["prodotto_bottiglia_id"]
            isOneToOne: false
            referencedRelation: "fb_prodotti_economia"
            referencedColumns: ["prodotto_id"]
          },
          {
            foreignKeyName: "fb_vini_prodotto_calice_id_fkey"
            columns: ["prodotto_calice_id"]
            isOneToOne: false
            referencedRelation: "fb_prodotti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_vini_prodotto_calice_id_fkey"
            columns: ["prodotto_calice_id"]
            isOneToOne: false
            referencedRelation: "fb_prodotti_economia"
            referencedColumns: ["prodotto_id"]
          },
          {
            foreignKeyName: "fb_vini_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          assegnato_a: string | null
          canale: string | null
          contatto_id: string | null
          created_at: string
          created_by: string | null
          entita_id: string | null
          entita_tipo: string | null
          id: string
          modulo: string
          nps: number | null
          ricevuto_at: string
          risolto_at: string | null
          risposta: string | null
          risposte: NonNullable<Json>
          stato: Database["public"]["Enums"]["feedback_stato"]
          testo: string | null
          tipo: Database["public"]["Enums"]["feedback_tipo"]
          updated_at: string
          updated_by: string | null
          valutazione: number | null
        }
        Insert: {
          assegnato_a?: string | null
          canale?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          entita_id?: string | null
          entita_tipo?: string | null
          id?: string
          modulo: string
          nps?: number | null
          ricevuto_at?: string
          risolto_at?: string | null
          risposta?: string | null
          risposte?: NonNullable<Json>
          stato?: Database["public"]["Enums"]["feedback_stato"]
          testo?: string | null
          tipo: Database["public"]["Enums"]["feedback_tipo"]
          updated_at?: string
          updated_by?: string | null
          valutazione?: number | null
        }
        Update: {
          assegnato_a?: string | null
          canale?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          entita_id?: string | null
          entita_tipo?: string | null
          id?: string
          modulo?: string
          nps?: number | null
          ricevuto_at?: string
          risolto_at?: string | null
          risposta?: string | null
          risposte?: NonNullable<Json>
          stato?: Database["public"]["Enums"]["feedback_stato"]
          testo?: string | null
          tipo?: Database["public"]["Enums"]["feedback_tipo"]
          updated_at?: string
          updated_by?: string | null
          valutazione?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_assegnato_a_fkey"
            columns: ["assegnato_a"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "feedback_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fid_movimenti: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          importo: number | null
          modulo: string
          note: string | null
          punti: number
          riferimento_id: string | null
          riferimento_tipo: string | null
          tessera_id: string
          timbri: number
          tipo: Database["public"]["Enums"]["fid_movimento_tipo"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          importo?: number | null
          modulo: string
          note?: string | null
          punti?: number
          riferimento_id?: string | null
          riferimento_tipo?: string | null
          tessera_id: string
          timbri?: number
          tipo: Database["public"]["Enums"]["fid_movimento_tipo"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          importo?: number | null
          modulo?: string
          note?: string | null
          punti?: number
          riferimento_id?: string | null
          riferimento_tipo?: string | null
          tessera_id?: string
          timbri?: number
          tipo?: Database["public"]["Enums"]["fid_movimento_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "fid_movimenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fid_movimenti_tessera_id_fkey"
            columns: ["tessera_id"]
            isOneToOne: false
            referencedRelation: "fid_saldi"
            referencedColumns: ["tessera_id"]
          },
          {
            foreignKeyName: "fid_movimenti_tessera_id_fkey"
            columns: ["tessera_id"]
            isOneToOne: false
            referencedRelation: "fid_tessere"
            referencedColumns: ["id"]
          },
        ]
      }
      fid_programmi: {
        Row: {
          attivo: boolean
          benvenuto_punti: number
          created_at: string
          created_by: string | null
          id: string
          livelli: NonNullable<Json>
          modulo: string
          nome: string
          premio_prodotto_id: string | null
          premio_timbri: string | null
          punti_per_euro: number
          punti_validita_mesi: number | null
          referral_punti: number
          regolamento: string | null
          timbri_prodotti: string[]
          timbri_soglia: number | null
          updated_at: string
          updated_by: string | null
          valore_punto: number | null
        }
        Insert: {
          attivo?: boolean
          benvenuto_punti?: number
          created_at?: string
          created_by?: string | null
          id?: string
          livelli?: NonNullable<Json>
          modulo: string
          nome: string
          premio_prodotto_id?: string | null
          premio_timbri?: string | null
          punti_per_euro?: number
          punti_validita_mesi?: number | null
          referral_punti?: number
          regolamento?: string | null
          timbri_prodotti?: string[]
          timbri_soglia?: number | null
          updated_at?: string
          updated_by?: string | null
          valore_punto?: number | null
        }
        Update: {
          attivo?: boolean
          benvenuto_punti?: number
          created_at?: string
          created_by?: string | null
          id?: string
          livelli?: NonNullable<Json>
          modulo?: string
          nome?: string
          premio_prodotto_id?: string | null
          premio_timbri?: string | null
          punti_per_euro?: number
          punti_validita_mesi?: number | null
          referral_punti?: number
          regolamento?: string | null
          timbri_prodotti?: string[]
          timbri_soglia?: number | null
          updated_at?: string
          updated_by?: string | null
          valore_punto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fid_programmi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fid_programmi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fid_tessere: {
        Row: {
          attiva: boolean
          codice: string | null
          contatto_id: string
          created_at: string
          created_by: string | null
          emessa_il: string
          id: string
          modulo: string
          note: string | null
          presentata_da: string | null
          programma_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attiva?: boolean
          codice?: string | null
          contatto_id: string
          created_at?: string
          created_by?: string | null
          emessa_il?: string
          id?: string
          modulo: string
          note?: string | null
          presentata_da?: string | null
          programma_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attiva?: boolean
          codice?: string | null
          contatto_id?: string
          created_at?: string
          created_by?: string | null
          emessa_il?: string
          id?: string
          modulo?: string
          note?: string | null
          presentata_da?: string | null
          programma_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fid_tessere_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fid_tessere_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "fid_tessere_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fid_tessere_presentata_da_fkey"
            columns: ["presentata_da"]
            isOneToOne: false
            referencedRelation: "fid_saldi"
            referencedColumns: ["tessera_id"]
          },
          {
            foreignKeyName: "fid_tessere_presentata_da_fkey"
            columns: ["presentata_da"]
            isOneToOne: false
            referencedRelation: "fid_tessere"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fid_tessere_programma_id_fkey"
            columns: ["programma_id"]
            isOneToOne: false
            referencedRelation: "fid_programmi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fid_tessere_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fior_abbonamenti: {
        Row: {
          cap: string | null
          citta: string | null
          codice: string | null
          contatto_id: string | null
          created_at: string
          created_by: string | null
          data_rinnovo: string | null
          destinatario_nome: string
          destinatario_telefono: string | null
          distinta_id: string | null
          fascia: string | null
          frequenza: string
          id: string
          indirizzo: string | null
          modulo: string
          note: string | null
          organizzazione_id: string | null
          pagamento: string
          piano: string
          prezzo: number
          prodotti: string | null
          prossima_consegna: string
          ritiro: boolean
          stato: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cap?: string | null
          citta?: string | null
          codice?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          data_rinnovo?: string | null
          destinatario_nome: string
          destinatario_telefono?: string | null
          distinta_id?: string | null
          fascia?: string | null
          frequenza?: string
          id?: string
          indirizzo?: string | null
          modulo?: string
          note?: string | null
          organizzazione_id?: string | null
          pagamento?: string
          piano: string
          prezzo: number
          prodotti?: string | null
          prossima_consegna: string
          ritiro?: boolean
          stato?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cap?: string | null
          citta?: string | null
          codice?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          data_rinnovo?: string | null
          destinatario_nome?: string
          destinatario_telefono?: string | null
          distinta_id?: string | null
          fascia?: string | null
          frequenza?: string
          id?: string
          indirizzo?: string | null
          modulo?: string
          note?: string | null
          organizzazione_id?: string | null
          pagamento?: string
          piano?: string
          prezzo?: number
          prodotti?: string | null
          prossima_consegna?: string
          ritiro?: boolean
          stato?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fior_abbonamenti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_abbonamenti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "fior_abbonamenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_abbonamenti_distinta_id_fkey"
            columns: ["distinta_id"]
            isOneToOne: false
            referencedRelation: "distinte_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_abbonamenti_distinta_id_fkey"
            columns: ["distinta_id"]
            isOneToOne: false
            referencedRelation: "distinte_base_riepilogo"
            referencedColumns: ["distinta_id"]
          },
          {
            foreignKeyName: "fior_abbonamenti_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_abbonamenti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fior_cerimonie: {
        Row: {
          agenzia_id: string | null
          allestimenti: NonNullable<Json>
          colori: string | null
          consegna_at: string | null
          created_at: string
          created_by: string | null
          defunto: string | null
          evento_id: string
          fiori: string | null
          id: string
          luogo_cerimonia: string | null
          modulo: string
          montaggio_at: string | null
          note: string | null
          ricorrente: boolean
          smontaggio_at: string | null
          tema: string | null
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agenzia_id?: string | null
          allestimenti?: NonNullable<Json>
          colori?: string | null
          consegna_at?: string | null
          created_at?: string
          created_by?: string | null
          defunto?: string | null
          evento_id: string
          fiori?: string | null
          id?: string
          luogo_cerimonia?: string | null
          modulo?: string
          montaggio_at?: string | null
          note?: string | null
          ricorrente?: boolean
          smontaggio_at?: string | null
          tema?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agenzia_id?: string | null
          allestimenti?: NonNullable<Json>
          colori?: string | null
          consegna_at?: string | null
          created_at?: string
          created_by?: string | null
          defunto?: string | null
          evento_id?: string
          fiori?: string | null
          id?: string
          luogo_cerimonia?: string | null
          modulo?: string
          montaggio_at?: string | null
          note?: string | null
          ricorrente?: boolean
          smontaggio_at?: string | null
          tema?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fior_cerimonie_agenzia_id_fkey"
            columns: ["agenzia_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_cerimonie_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_cerimonie_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: true
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_cerimonie_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fior_consegne: {
        Row: {
          autista_id: string | null
          consegnata_at: string | null
          created_at: string
          created_by: string | null
          data: string
          esito: string | null
          fascia: string | null
          id: string
          importo: number
          modulo: string
          note: string | null
          ordine_id: string
          partita_at: string | null
          ricevuta_da: string | null
          sequenza: number | null
          stato: string
          updated_at: string
          updated_by: string | null
          veicolo: string | null
          zona_id: string | null
        }
        Insert: {
          autista_id?: string | null
          consegnata_at?: string | null
          created_at?: string
          created_by?: string | null
          data: string
          esito?: string | null
          fascia?: string | null
          id?: string
          importo?: number
          modulo?: string
          note?: string | null
          ordine_id: string
          partita_at?: string | null
          ricevuta_da?: string | null
          sequenza?: number | null
          stato?: string
          updated_at?: string
          updated_by?: string | null
          veicolo?: string | null
          zona_id?: string | null
        }
        Update: {
          autista_id?: string | null
          consegnata_at?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          esito?: string | null
          fascia?: string | null
          id?: string
          importo?: number
          modulo?: string
          note?: string | null
          ordine_id?: string
          partita_at?: string | null
          ricevuta_da?: string | null
          sequenza?: number | null
          stato?: string
          updated_at?: string
          updated_by?: string | null
          veicolo?: string | null
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fior_consegne_autista_id_fkey"
            columns: ["autista_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_consegne_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_consegne_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: true
            referencedRelation: "fior_ordini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_consegne_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_consegne_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "fior_zone"
            referencedColumns: ["id"]
          },
        ]
      }
      fior_impostazioni: {
        Row: {
          abbonamenti_anticipo_giorni: number
          costo_orario: number
          created_at: string
          created_by: string | null
          fasce: string[]
          id: number
          indirizzo: string | null
          modulo: string
          negozio: string | null
          promemoria_ricorrenze_giorni: number
          ricarico_pct: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          abbonamenti_anticipo_giorni?: number
          costo_orario?: number
          created_at?: string
          created_by?: string | null
          fasce?: string[]
          id?: number
          indirizzo?: string | null
          modulo?: string
          negozio?: string | null
          promemoria_ricorrenze_giorni?: number
          ricarico_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          abbonamenti_anticipo_giorni?: number
          costo_orario?: number
          created_at?: string
          created_by?: string | null
          fasce?: string[]
          id?: number
          indirizzo?: string | null
          modulo?: string
          negozio?: string | null
          promemoria_ricorrenze_giorni?: number
          ricarico_pct?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fior_impostazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_impostazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fior_ordini: {
        Row: {
          abbonamento_id: string | null
          addetto_consegna: string | null
          addetto_preparazione: string | null
          annullato_motivo: string | null
          anonimo: boolean
          biglietto_stampato: boolean
          canale: string
          canale_riferimento: string | null
          cap: string | null
          citta: string | null
          codice: string | null
          committente_id: string | null
          committente_nome: string
          committente_telefono: string | null
          confermato_at: string | null
          consegnato_at: string | null
          conto_id: string | null
          costo_stimato: number
          created_at: string
          created_by: string | null
          data_ordine: string
          data_richiesta: string
          destinatario_nome: string | null
          destinatario_telefono: string | null
          evento_id: string | null
          fascia: string | null
          firma: string | null
          id: string
          importo_consegna: number
          indicazioni: string | null
          indirizzo: string | null
          materiali_scaricati: boolean
          messaggio: string | null
          modalita: string
          modulo: string
          note: string | null
          occasione: string | null
          ora_richiesta: string | null
          organizzazione_id: string | null
          pagatore_id: string | null
          pagatore_organizzazione_id: string | null
          pronto_at: string | null
          ricerca: unknown
          ricorda_ricorrenza: boolean
          sconto: number
          stato: Database["public"]["Enums"]["fior_ordine_stato"]
          totale: number
          updated_at: string
          updated_by: string | null
          zona_id: string | null
        }
        Insert: {
          abbonamento_id?: string | null
          addetto_consegna?: string | null
          addetto_preparazione?: string | null
          annullato_motivo?: string | null
          anonimo?: boolean
          biglietto_stampato?: boolean
          canale?: string
          canale_riferimento?: string | null
          cap?: string | null
          citta?: string | null
          codice?: string | null
          committente_id?: string | null
          committente_nome: string
          committente_telefono?: string | null
          confermato_at?: string | null
          consegnato_at?: string | null
          conto_id?: string | null
          costo_stimato?: number
          created_at?: string
          created_by?: string | null
          data_ordine?: string
          data_richiesta?: string
          destinatario_nome?: string | null
          destinatario_telefono?: string | null
          evento_id?: string | null
          fascia?: string | null
          firma?: string | null
          id?: string
          importo_consegna?: number
          indicazioni?: string | null
          indirizzo?: string | null
          materiali_scaricati?: boolean
          messaggio?: string | null
          modalita?: string
          modulo?: string
          note?: string | null
          occasione?: string | null
          ora_richiesta?: string | null
          organizzazione_id?: string | null
          pagatore_id?: string | null
          pagatore_organizzazione_id?: string | null
          pronto_at?: string | null
          ricerca?: never
          ricorda_ricorrenza?: boolean
          sconto?: number
          stato?: Database["public"]["Enums"]["fior_ordine_stato"]
          totale?: number
          updated_at?: string
          updated_by?: string | null
          zona_id?: string | null
        }
        Update: {
          abbonamento_id?: string | null
          addetto_consegna?: string | null
          addetto_preparazione?: string | null
          annullato_motivo?: string | null
          anonimo?: boolean
          biglietto_stampato?: boolean
          canale?: string
          canale_riferimento?: string | null
          cap?: string | null
          citta?: string | null
          codice?: string | null
          committente_id?: string | null
          committente_nome?: string
          committente_telefono?: string | null
          confermato_at?: string | null
          consegnato_at?: string | null
          conto_id?: string | null
          costo_stimato?: number
          created_at?: string
          created_by?: string | null
          data_ordine?: string
          data_richiesta?: string
          destinatario_nome?: string | null
          destinatario_telefono?: string | null
          evento_id?: string | null
          fascia?: string | null
          firma?: string | null
          id?: string
          importo_consegna?: number
          indicazioni?: string | null
          indirizzo?: string | null
          materiali_scaricati?: boolean
          messaggio?: string | null
          modalita?: string
          modulo?: string
          note?: string | null
          occasione?: string | null
          ora_richiesta?: string | null
          organizzazione_id?: string | null
          pagatore_id?: string | null
          pagatore_organizzazione_id?: string | null
          pronto_at?: string | null
          ricerca?: never
          ricorda_ricorrenza?: boolean
          sconto?: number
          stato?: Database["public"]["Enums"]["fior_ordine_stato"]
          totale?: number
          updated_at?: string
          updated_by?: string | null
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fior_ordini_abbonamento_id_fkey"
            columns: ["abbonamento_id"]
            isOneToOne: false
            referencedRelation: "fior_abbonamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ordini_addetto_consegna_fkey"
            columns: ["addetto_consegna"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ordini_addetto_preparazione_fkey"
            columns: ["addetto_preparazione"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ordini_committente_id_fkey"
            columns: ["committente_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ordini_committente_id_fkey"
            columns: ["committente_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "fior_ordini_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ordini_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "fior_ordini_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "fior_ordini_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ordini_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ordini_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ordini_pagatore_id_fkey"
            columns: ["pagatore_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ordini_pagatore_id_fkey"
            columns: ["pagatore_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "fior_ordini_pagatore_organizzazione_id_fkey"
            columns: ["pagatore_organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ordini_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ordini_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "fior_zone"
            referencedColumns: ["id"]
          },
        ]
      }
      fior_ordini_righe: {
        Row: {
          aliquota_iva: number
          articolo_id: string | null
          costo_unitario: number
          created_at: string
          created_by: string | null
          descrizione: string | null
          distinta_id: string | null
          id: string
          importo: number
          minuti: number | null
          modulo: string
          ordine_id: string
          prezzo_unitario: number | null
          quantita: number
          richiesta: NonNullable<Json>
          sconto_pct: number
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aliquota_iva?: number
          articolo_id?: string | null
          costo_unitario?: number
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          distinta_id?: string | null
          id?: string
          importo?: number
          minuti?: number | null
          modulo?: string
          ordine_id: string
          prezzo_unitario?: number | null
          quantita?: number
          richiesta?: NonNullable<Json>
          sconto_pct?: number
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aliquota_iva?: number
          articolo_id?: string | null
          costo_unitario?: number
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          distinta_id?: string | null
          id?: string
          importo?: number
          minuti?: number | null
          modulo?: string
          ordine_id?: string
          prezzo_unitario?: number | null
          quantita?: number
          richiesta?: NonNullable<Json>
          sconto_pct?: number
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fior_ordini_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ordini_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "fior_ordini_righe_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ordini_righe_distinta_id_fkey"
            columns: ["distinta_id"]
            isOneToOne: false
            referencedRelation: "distinte_base"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ordini_righe_distinta_id_fkey"
            columns: ["distinta_id"]
            isOneToOne: false
            referencedRelation: "distinte_base_riepilogo"
            referencedColumns: ["distinta_id"]
          },
          {
            foreignKeyName: "fior_ordini_righe_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "fior_ordini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ordini_righe_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fior_produzione: {
        Row: {
          codice: string | null
          created_at: string
          created_by: string | null
          descrizione: string
          fine_at: string | null
          id: string
          inizio_at: string | null
          minuti_effettivi: number | null
          minuti_previsti: number | null
          modulo: string
          note: string | null
          operatore_id: string | null
          ordine_id: string
          pronta_entro: string | null
          quantita: number
          riga_id: string
          stato: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          codice?: string | null
          created_at?: string
          created_by?: string | null
          descrizione: string
          fine_at?: string | null
          id?: string
          inizio_at?: string | null
          minuti_effettivi?: number | null
          minuti_previsti?: number | null
          modulo?: string
          note?: string | null
          operatore_id?: string | null
          ordine_id: string
          pronta_entro?: string | null
          quantita: number
          riga_id: string
          stato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          codice?: string | null
          created_at?: string
          created_by?: string | null
          descrizione?: string
          fine_at?: string | null
          id?: string
          inizio_at?: string | null
          minuti_effettivi?: number | null
          minuti_previsti?: number | null
          modulo?: string
          note?: string | null
          operatore_id?: string | null
          ordine_id?: string
          pronta_entro?: string | null
          quantita?: number
          riga_id?: string
          stato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fior_produzione_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_produzione_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_produzione_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "fior_ordini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_produzione_riga_id_fkey"
            columns: ["riga_id"]
            isOneToOne: true
            referencedRelation: "fior_ordini_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_produzione_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fior_resi: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          importo: number
          modulo: string
          motivo: string
          ordine_id: string
          quantita: number
          riga_id: string
          rivendibile: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          importo?: number
          modulo?: string
          motivo: string
          ordine_id: string
          quantita: number
          riga_id: string
          rivendibile?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          importo?: number
          modulo?: string
          motivo?: string
          ordine_id?: string
          quantita?: number
          riga_id?: string
          rivendibile?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fior_resi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_resi_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "fior_ordini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_resi_riga_id_fkey"
            columns: ["riga_id"]
            isOneToOne: false
            referencedRelation: "fior_ordini_righe"
            referencedColumns: ["id"]
          },
        ]
      }
      fior_ricorrenze: {
        Row: {
          anno: number | null
          attiva: boolean
          contatto_id: string
          created_at: string
          created_by: string | null
          giorno: number
          id: string
          mese: number
          modulo: string
          note: string | null
          ordine_id: string | null
          per_chi: string | null
          tipo: string
          ultimo_avviso: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          anno?: number | null
          attiva?: boolean
          contatto_id: string
          created_at?: string
          created_by?: string | null
          giorno: number
          id?: string
          mese: number
          modulo?: string
          note?: string | null
          ordine_id?: string | null
          per_chi?: string | null
          tipo?: string
          ultimo_avviso?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          anno?: number | null
          attiva?: boolean
          contatto_id?: string
          created_at?: string
          created_by?: string | null
          giorno?: number
          id?: string
          mese?: number
          modulo?: string
          note?: string | null
          ordine_id?: string | null
          per_chi?: string | null
          tipo?: string
          ultimo_avviso?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fior_ricorrenze_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ricorrenze_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "fior_ricorrenze_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ricorrenze_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "fior_ordini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_ricorrenze_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fior_righe_materiali: {
        Row: {
          articolo_id: string
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          quantita: number
          riga_id: string
        }
        Insert: {
          articolo_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          quantita: number
          riga_id: string
        }
        Update: {
          articolo_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          quantita?: number
          riga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fior_righe_materiali_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_righe_materiali_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "fior_righe_materiali_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_righe_materiali_riga_id_fkey"
            columns: ["riga_id"]
            isOneToOne: false
            referencedRelation: "fior_ordini_righe"
            referencedColumns: ["id"]
          },
        ]
      }
      fior_zone: {
        Row: {
          attiva: boolean
          cap: string[]
          created_at: string
          created_by: string | null
          id: string
          importo: number
          modulo: string
          nome: string
          ordine: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attiva?: boolean
          cap?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          importo?: number
          modulo?: string
          nome: string
          ordine?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attiva?: boolean
          cap?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          importo?: number
          modulo?: string
          nome?: string
          ordine?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fior_zone_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fior_zone_updated_by_fkey"
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
      fornitori_listini: {
        Row: {
          articolo_id: string
          codice_fornitore: string | null
          condizioni: string | null
          created_at: string
          created_by: string | null
          fornitore_id: string
          giorni_consegna: number | null
          id: string
          minimo_ordine: number | null
          modulo: string
          prezzo: number
          unita: string | null
          updated_at: string
          updated_by: string | null
          valido_al: string | null
          valido_dal: string
        }
        Insert: {
          articolo_id: string
          codice_fornitore?: string | null
          condizioni?: string | null
          created_at?: string
          created_by?: string | null
          fornitore_id: string
          giorni_consegna?: number | null
          id?: string
          minimo_ordine?: number | null
          modulo: string
          prezzo: number
          unita?: string | null
          updated_at?: string
          updated_by?: string | null
          valido_al?: string | null
          valido_dal?: string
        }
        Update: {
          articolo_id?: string
          codice_fornitore?: string | null
          condizioni?: string | null
          created_at?: string
          created_by?: string | null
          fornitore_id?: string
          giorni_consegna?: number | null
          id?: string
          minimo_ordine?: number | null
          modulo?: string
          prezzo?: number
          unita?: string | null
          updated_at?: string
          updated_by?: string | null
          valido_al?: string | null
          valido_dal?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornitori_listini_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornitori_listini_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "fornitori_listini_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornitori_listini_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornitori_listini_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fornitori_valutazioni: {
        Row: {
          completezza: number | null
          continuita: number | null
          created_at: string
          created_by: string | null
          data: string
          fornitore_id: string
          id: string
          modulo: string
          non_conformita: string | null
          note: string | null
          ordine_id: string | null
          prezzo: number | null
          puntualita: number | null
          qualita: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          completezza?: number | null
          continuita?: number | null
          created_at?: string
          created_by?: string | null
          data?: string
          fornitore_id: string
          id?: string
          modulo: string
          non_conformita?: string | null
          note?: string | null
          ordine_id?: string | null
          prezzo?: number | null
          puntualita?: number | null
          qualita?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          completezza?: number | null
          continuita?: number | null
          created_at?: string
          created_by?: string | null
          data?: string
          fornitore_id?: string
          id?: string
          modulo?: string
          non_conformita?: string | null
          note?: string | null
          ordine_id?: string | null
          prezzo?: number | null
          puntualita?: number | null
          qualita?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornitori_valutazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornitori_valutazioni_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornitori_valutazioni_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "mag_ordini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornitori_valutazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_aree: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          nome: string
          ordine: number
          piano: number
          struttura_id: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome: string
          ordine?: number
          piano?: number
          struttura_id: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome?: string
          ordine?: number
          piano?: number
          struttura_id?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_aree_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_aree_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_aree_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture_riepilogo"
            referencedColumns: ["struttura_id"]
          },
          {
            foreignKeyName: "gar_aree_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_attese: {
        Row: {
          avvisato_il: string | null
          cliente_id: string
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          note: string | null
          solo_coperto: boolean
          stato: string
          struttura_id: string
          tipo_posto: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avvisato_il?: string | null
          cliente_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          note?: string | null
          solo_coperto?: boolean
          stato?: string
          struttura_id: string
          tipo_posto?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avvisato_il?: string | null
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          note?: string | null
          solo_coperto?: boolean
          stato?: string
          struttura_id?: string
          tipo_posto?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_attese_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_attese_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti_riepilogo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "gar_attese_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_attese_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_attese_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture_riepilogo"
            referencedColumns: ["struttura_id"]
          },
          {
            foreignKeyName: "gar_attese_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_autorizzazioni: {
        Row: {
          al: string | null
          attiva: boolean
          cliente_id: string
          codice: string | null
          convenzione_id: string | null
          created_at: string
          created_by: string | null
          dal: string
          fasce: NonNullable<Json>
          id: string
          livello: string
          modulo: string
          note: string | null
          persona: string | null
          posti: string[]
          targa: string | null
          tipo: string
          updated_at: string
          updated_by: string | null
          veicolo_id: string | null
        }
        Insert: {
          al?: string | null
          attiva?: boolean
          cliente_id: string
          codice?: string | null
          convenzione_id?: string | null
          created_at?: string
          created_by?: string | null
          dal?: string
          fasce?: NonNullable<Json>
          id?: string
          livello?: string
          modulo?: string
          note?: string | null
          persona?: string | null
          posti?: string[]
          targa?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          veicolo_id?: string | null
        }
        Update: {
          al?: string | null
          attiva?: boolean
          cliente_id?: string
          codice?: string | null
          convenzione_id?: string | null
          created_at?: string
          created_by?: string | null
          dal?: string
          fasce?: NonNullable<Json>
          id?: string
          livello?: string
          modulo?: string
          note?: string | null
          persona?: string | null
          posti?: string[]
          targa?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          veicolo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_autorizzazioni_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_autorizzazioni_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti_riepilogo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "gar_autorizzazioni_convenzione_id_fkey"
            columns: ["convenzione_id"]
            isOneToOne: false
            referencedRelation: "gar_convenzioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_autorizzazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_autorizzazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_autorizzazioni_veicolo_id_fkey"
            columns: ["veicolo_id"]
            isOneToOne: false
            referencedRelation: "gar_veicoli"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_chiavi: {
        Row: {
          armadietto: string | null
          cliente_id: string | null
          created_at: string
          created_by: string | null
          id: string
          in_mano_a: string | null
          modulo: string
          note: string | null
          numero: string
          posizione: string | null
          stato: string
          struttura_id: string
          targa: string | null
          updated_at: string
          updated_by: string | null
          veicolo_id: string | null
        }
        Insert: {
          armadietto?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          in_mano_a?: string | null
          modulo?: string
          note?: string | null
          numero: string
          posizione?: string | null
          stato?: string
          struttura_id: string
          targa?: string | null
          updated_at?: string
          updated_by?: string | null
          veicolo_id?: string | null
        }
        Update: {
          armadietto?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          in_mano_a?: string | null
          modulo?: string
          note?: string | null
          numero?: string
          posizione?: string | null
          stato?: string
          struttura_id?: string
          targa?: string | null
          updated_at?: string
          updated_by?: string | null
          veicolo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_chiavi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_chiavi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti_riepilogo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "gar_chiavi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_chiavi_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_chiavi_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture_riepilogo"
            referencedColumns: ["struttura_id"]
          },
          {
            foreignKeyName: "gar_chiavi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_chiavi_veicolo_id_fkey"
            columns: ["veicolo_id"]
            isOneToOne: false
            referencedRelation: "gar_veicoli"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_chiavi_movimenti: {
        Row: {
          avvenuto_at: string
          chiave_id: string
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          motivo: string | null
          operatore_id: string | null
          persona: string | null
          tipo: string
        }
        Insert: {
          avvenuto_at?: string
          chiave_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          motivo?: string | null
          operatore_id?: string | null
          persona?: string | null
          tipo: string
        }
        Update: {
          avvenuto_at?: string
          chiave_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          motivo?: string | null
          operatore_id?: string | null
          persona?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "gar_chiavi_movimenti_chiave_id_fkey"
            columns: ["chiave_id"]
            isOneToOne: false
            referencedRelation: "gar_chiavi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_chiavi_movimenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_chiavi_movimenti_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_clienti: {
        Row: {
          attivo: boolean
          codice: string | null
          codice_fiscale: string | null
          contatto_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          indirizzo: string | null
          modulo: string
          nome: string
          note: string | null
          organizzazione_id: string | null
          partita_iva: string | null
          ricerca: unknown
          telefono: string | null
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          codice?: string | null
          codice_fiscale?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          indirizzo?: string | null
          modulo?: string
          nome: string
          note?: string | null
          organizzazione_id?: string | null
          partita_iva?: string | null
          ricerca?: never
          telefono?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          codice?: string | null
          codice_fiscale?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          indirizzo?: string | null
          modulo?: string
          nome?: string
          note?: string | null
          organizzazione_id?: string | null
          partita_iva?: string | null
          ricerca?: never
          telefono?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_clienti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: true
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_clienti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: true
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "gar_clienti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_clienti_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_clienti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_colonnine: {
        Row: {
          asset_id: string | null
          codice: string
          connettore: string | null
          created_at: string
          created_by: string | null
          fermo: string | null
          id: string
          modulo: string
          note: string | null
          posto_id: string | null
          potenza_kw: number | null
          prese: number
          struttura_id: string
          tariffa_kwh: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          asset_id?: string | null
          codice: string
          connettore?: string | null
          created_at?: string
          created_by?: string | null
          fermo?: string | null
          id?: string
          modulo?: string
          note?: string | null
          posto_id?: string | null
          potenza_kw?: number | null
          prese?: number
          struttura_id: string
          tariffa_kwh?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          asset_id?: string | null
          codice?: string
          connettore?: string | null
          created_at?: string
          created_by?: string | null
          fermo?: string | null
          id?: string
          modulo?: string
          note?: string | null
          posto_id?: string | null
          potenza_kw?: number | null
          prese?: number
          struttura_id?: string
          tariffa_kwh?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_colonnine_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_colonnine_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_indicatori"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "gar_colonnine_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_colonnine_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_colonnine_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti_assegnabili"
            referencedColumns: ["posto_id"]
          },
          {
            foreignKeyName: "gar_colonnine_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti_stato"
            referencedColumns: ["posto_id"]
          },
          {
            foreignKeyName: "gar_colonnine_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_colonnine_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture_riepilogo"
            referencedColumns: ["struttura_id"]
          },
          {
            foreignKeyName: "gar_colonnine_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_contratti: {
        Row: {
          canone: number
          cliente_id: string
          codice: string | null
          condizioni: string | null
          convenzione_id: string | null
          created_at: string
          created_by: string | null
          deposito_cauzionale: number
          deposito_versato: boolean
          fine: string | null
          id: string
          inizio: string
          modulo: string
          note: string | null
          pagamento_automatico: boolean
          periodicita: string
          periodo: unknown
          posto_id: string | null
          preavviso_giorni: number
          rate_fino: string | null
          recesso_il: string | null
          rinnovo_automatico: boolean
          sospeso_al: string | null
          sospeso_dal: string | null
          stato: string
          struttura_id: string
          tipo: string
          updated_at: string
          updated_by: string | null
          veicolo_id: string | null
        }
        Insert: {
          canone?: number
          cliente_id: string
          codice?: string | null
          condizioni?: string | null
          convenzione_id?: string | null
          created_at?: string
          created_by?: string | null
          deposito_cauzionale?: number
          deposito_versato?: boolean
          fine?: string | null
          id?: string
          inizio?: string
          modulo?: string
          note?: string | null
          pagamento_automatico?: boolean
          periodicita?: string
          periodo?: never
          posto_id?: string | null
          preavviso_giorni?: number
          rate_fino?: string | null
          recesso_il?: string | null
          rinnovo_automatico?: boolean
          sospeso_al?: string | null
          sospeso_dal?: string | null
          stato?: string
          struttura_id: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          veicolo_id?: string | null
        }
        Update: {
          canone?: number
          cliente_id?: string
          codice?: string | null
          condizioni?: string | null
          convenzione_id?: string | null
          created_at?: string
          created_by?: string | null
          deposito_cauzionale?: number
          deposito_versato?: boolean
          fine?: string | null
          id?: string
          inizio?: string
          modulo?: string
          note?: string | null
          pagamento_automatico?: boolean
          periodicita?: string
          periodo?: never
          posto_id?: string | null
          preavviso_giorni?: number
          rate_fino?: string | null
          recesso_il?: string | null
          rinnovo_automatico?: boolean
          sospeso_al?: string | null
          sospeso_dal?: string | null
          stato?: string
          struttura_id?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          veicolo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_contratti_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_contratti_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti_riepilogo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "gar_contratti_convenzione_id_fkey"
            columns: ["convenzione_id"]
            isOneToOne: false
            referencedRelation: "gar_convenzioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_contratti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_contratti_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_contratti_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti_assegnabili"
            referencedColumns: ["posto_id"]
          },
          {
            foreignKeyName: "gar_contratti_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti_stato"
            referencedColumns: ["posto_id"]
          },
          {
            foreignKeyName: "gar_contratti_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_contratti_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture_riepilogo"
            referencedColumns: ["struttura_id"]
          },
          {
            foreignKeyName: "gar_contratti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_contratti_veicolo_id_fkey"
            columns: ["veicolo_id"]
            isOneToOne: false
            referencedRelation: "gar_veicoli"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_convenzioni: {
        Row: {
          al: string | null
          attiva: boolean
          canone_mensile: number
          cliente_id: string
          codice: string | null
          created_at: string
          created_by: string | null
          dal: string
          fatturato_fino: string | null
          fatturazione: string
          id: string
          modulo: string
          note: string | null
          posti_acquistati: number
          struttura_id: string
          tariffario_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          al?: string | null
          attiva?: boolean
          canone_mensile?: number
          cliente_id: string
          codice?: string | null
          created_at?: string
          created_by?: string | null
          dal?: string
          fatturato_fino?: string | null
          fatturazione?: string
          id?: string
          modulo?: string
          note?: string | null
          posti_acquistati?: number
          struttura_id: string
          tariffario_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          al?: string | null
          attiva?: boolean
          canone_mensile?: number
          cliente_id?: string
          codice?: string | null
          created_at?: string
          created_by?: string | null
          dal?: string
          fatturato_fino?: string | null
          fatturazione?: string
          id?: string
          modulo?: string
          note?: string | null
          posti_acquistati?: number
          struttura_id?: string
          tariffario_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_convenzioni_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_convenzioni_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti_riepilogo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "gar_convenzioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_convenzioni_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_convenzioni_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture_riepilogo"
            referencedColumns: ["struttura_id"]
          },
          {
            foreignKeyName: "gar_convenzioni_tariffario_id_fkey"
            columns: ["tariffario_id"]
            isOneToOne: false
            referencedRelation: "gar_tariffari"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_convenzioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_danni: {
        Row: {
          assicurazione: string | null
          chiuso_at: string | null
          cliente_id: string | null
          codice: string | null
          created_at: string
          created_by: string | null
          descrizione: string
          esito: string | null
          id: string
          importo_stimato: number | null
          modulo: string
          operatore_id: string | null
          relazione: string | null
          responsabilita: string
          riferimento_video: string | null
          rilevato_at: string
          segnalazione_id: string | null
          sosta_id: string | null
          stato: string
          struttura_id: string
          targa: string | null
          testimoni: string | null
          tipo: string
          updated_at: string
          updated_by: string | null
          veicolo_id: string | null
        }
        Insert: {
          assicurazione?: string | null
          chiuso_at?: string | null
          cliente_id?: string | null
          codice?: string | null
          created_at?: string
          created_by?: string | null
          descrizione: string
          esito?: string | null
          id?: string
          importo_stimato?: number | null
          modulo?: string
          operatore_id?: string | null
          relazione?: string | null
          responsabilita?: string
          riferimento_video?: string | null
          rilevato_at?: string
          segnalazione_id?: string | null
          sosta_id?: string | null
          stato?: string
          struttura_id: string
          targa?: string | null
          testimoni?: string | null
          tipo: string
          updated_at?: string
          updated_by?: string | null
          veicolo_id?: string | null
        }
        Update: {
          assicurazione?: string | null
          chiuso_at?: string | null
          cliente_id?: string | null
          codice?: string | null
          created_at?: string
          created_by?: string | null
          descrizione?: string
          esito?: string | null
          id?: string
          importo_stimato?: number | null
          modulo?: string
          operatore_id?: string | null
          relazione?: string | null
          responsabilita?: string
          riferimento_video?: string | null
          rilevato_at?: string
          segnalazione_id?: string | null
          sosta_id?: string | null
          stato?: string
          struttura_id?: string
          targa?: string | null
          testimoni?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          veicolo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_danni_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_danni_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti_riepilogo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "gar_danni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_danni_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_danni_segnalazione_id_fkey"
            columns: ["segnalazione_id"]
            isOneToOne: false
            referencedRelation: "segnalazioni_sicurezza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_danni_sosta_id_fkey"
            columns: ["sosta_id"]
            isOneToOne: false
            referencedRelation: "gar_posti_stato"
            referencedColumns: ["sosta_id"]
          },
          {
            foreignKeyName: "gar_danni_sosta_id_fkey"
            columns: ["sosta_id"]
            isOneToOne: false
            referencedRelation: "gar_soste"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_danni_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_danni_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture_riepilogo"
            referencedColumns: ["struttura_id"]
          },
          {
            foreignKeyName: "gar_danni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_danni_veicolo_id_fkey"
            columns: ["veicolo_id"]
            isOneToOne: false
            referencedRelation: "gar_veicoli"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_festivi: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          descrizione: string
          modulo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: string
          descrizione: string
          modulo?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione?: string
          modulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "gar_festivi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_pneumatici: {
        Row: {
          battistrada_mm: number | null
          cliente_id: string
          codice: string | null
          con_cerchi: boolean
          created_at: string
          created_by: string | null
          data_deposito: string
          descrizione: string | null
          id: string
          marca: string | null
          misura: string | null
          modulo: string
          note: string | null
          numeri_serie: string | null
          posizione: string | null
          quantita: number
          restituiti_il: string | null
          restituzione_prevista: string | null
          stagione: string
          stato: string
          struttura_id: string
          updated_at: string
          updated_by: string | null
          veicolo_id: string | null
        }
        Insert: {
          battistrada_mm?: number | null
          cliente_id: string
          codice?: string | null
          con_cerchi?: boolean
          created_at?: string
          created_by?: string | null
          data_deposito?: string
          descrizione?: string | null
          id?: string
          marca?: string | null
          misura?: string | null
          modulo?: string
          note?: string | null
          numeri_serie?: string | null
          posizione?: string | null
          quantita?: number
          restituiti_il?: string | null
          restituzione_prevista?: string | null
          stagione?: string
          stato?: string
          struttura_id: string
          updated_at?: string
          updated_by?: string | null
          veicolo_id?: string | null
        }
        Update: {
          battistrada_mm?: number | null
          cliente_id?: string
          codice?: string | null
          con_cerchi?: boolean
          created_at?: string
          created_by?: string | null
          data_deposito?: string
          descrizione?: string | null
          id?: string
          marca?: string | null
          misura?: string | null
          modulo?: string
          note?: string | null
          numeri_serie?: string | null
          posizione?: string | null
          quantita?: number
          restituiti_il?: string | null
          restituzione_prevista?: string | null
          stagione?: string
          stato?: string
          struttura_id?: string
          updated_at?: string
          updated_by?: string | null
          veicolo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_pneumatici_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_pneumatici_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti_riepilogo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "gar_pneumatici_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_pneumatici_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_pneumatici_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture_riepilogo"
            referencedColumns: ["struttura_id"]
          },
          {
            foreignKeyName: "gar_pneumatici_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_pneumatici_veicolo_id_fkey"
            columns: ["veicolo_id"]
            isOneToOne: false
            referencedRelation: "gar_veicoli"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_posti: {
        Row: {
          canone: number | null
          codice: string
          coperto: boolean
          created_at: string
          created_by: string | null
          fermo: string | null
          id: string
          larghezza_m: number | null
          lunghezza_m: number | null
          modulo: string
          note: string | null
          numero: number | null
          piano: number
          riservato: boolean
          struttura_id: string
          tipo: string
          updated_at: string
          updated_by: string | null
          zona: string | null
        }
        Insert: {
          canone?: number | null
          codice: string
          coperto?: boolean
          created_at?: string
          created_by?: string | null
          fermo?: string | null
          id?: string
          larghezza_m?: number | null
          lunghezza_m?: number | null
          modulo?: string
          note?: string | null
          numero?: number | null
          piano?: number
          riservato?: boolean
          struttura_id: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          zona?: string | null
        }
        Update: {
          canone?: number | null
          codice?: string
          coperto?: boolean
          created_at?: string
          created_by?: string | null
          fermo?: string | null
          id?: string
          larghezza_m?: number | null
          lunghezza_m?: number | null
          modulo?: string
          note?: string | null
          numero?: number | null
          piano?: number
          riservato?: boolean
          struttura_id?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_posti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_posti_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_posti_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture_riepilogo"
            referencedColumns: ["struttura_id"]
          },
          {
            foreignKeyName: "gar_posti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_prenotazioni: {
        Row: {
          anticipo: number
          canale: string
          cliente_id: string | null
          cliente_nome: string
          codice: string | null
          created_at: string
          created_by: string | null
          id: string
          importo_previsto: number | null
          ingresso: string
          modulo: string
          note: string | null
          periodo: unknown
          posto_id: string | null
          stato: string
          struttura_id: string
          targa: string | null
          tariffario_id: string | null
          telefono: string | null
          tipo_veicolo: string
          updated_at: string
          updated_by: string | null
          uscita: string
          veicolo_id: string | null
        }
        Insert: {
          anticipo?: number
          canale?: string
          cliente_id?: string | null
          cliente_nome: string
          codice?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          importo_previsto?: number | null
          ingresso: string
          modulo?: string
          note?: string | null
          periodo?: never
          posto_id?: string | null
          stato?: string
          struttura_id: string
          targa?: string | null
          tariffario_id?: string | null
          telefono?: string | null
          tipo_veicolo?: string
          updated_at?: string
          updated_by?: string | null
          uscita: string
          veicolo_id?: string | null
        }
        Update: {
          anticipo?: number
          canale?: string
          cliente_id?: string | null
          cliente_nome?: string
          codice?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          importo_previsto?: number | null
          ingresso?: string
          modulo?: string
          note?: string | null
          periodo?: never
          posto_id?: string | null
          stato?: string
          struttura_id?: string
          targa?: string | null
          tariffario_id?: string | null
          telefono?: string | null
          tipo_veicolo?: string
          updated_at?: string
          updated_by?: string | null
          uscita?: string
          veicolo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_prenotazioni_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_prenotazioni_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti_riepilogo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "gar_prenotazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_prenotazioni_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_prenotazioni_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti_assegnabili"
            referencedColumns: ["posto_id"]
          },
          {
            foreignKeyName: "gar_prenotazioni_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti_stato"
            referencedColumns: ["posto_id"]
          },
          {
            foreignKeyName: "gar_prenotazioni_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_prenotazioni_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture_riepilogo"
            referencedColumns: ["struttura_id"]
          },
          {
            foreignKeyName: "gar_prenotazioni_tariffario_id_fkey"
            columns: ["tariffario_id"]
            isOneToOne: false
            referencedRelation: "gar_tariffari"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_prenotazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_prenotazioni_veicolo_id_fkey"
            columns: ["veicolo_id"]
            isOneToOne: false
            referencedRelation: "gar_veicoli"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_rate: {
        Row: {
          avviso_il: string | null
          cliente_id: string
          conto_id: string | null
          contratto_id: string
          created_at: string
          created_by: string | null
          descrizione: string
          id: string
          importo: number
          modulo: string
          pagata_il: string | null
          periodo_al: string
          periodo_dal: string
          scadenza: string
          stato: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avviso_il?: string | null
          cliente_id: string
          conto_id?: string | null
          contratto_id: string
          created_at?: string
          created_by?: string | null
          descrizione: string
          id?: string
          importo: number
          modulo?: string
          pagata_il?: string | null
          periodo_al: string
          periodo_dal: string
          scadenza: string
          stato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avviso_il?: string | null
          cliente_id?: string
          conto_id?: string | null
          contratto_id?: string
          created_at?: string
          created_by?: string | null
          descrizione?: string
          id?: string
          importo?: number
          modulo?: string
          pagata_il?: string | null
          periodo_al?: string
          periodo_dal?: string
          scadenza?: string
          stato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_rate_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_rate_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti_riepilogo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "gar_rate_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_rate_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "gar_rate_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "gar_rate_contratto_id_fkey"
            columns: ["contratto_id"]
            isOneToOne: false
            referencedRelation: "gar_contratti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_rate_contratto_id_fkey"
            columns: ["contratto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti_stato"
            referencedColumns: ["contratto_id"]
          },
          {
            foreignKeyName: "gar_rate_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_rate_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_ricariche: {
        Row: {
          cliente_id: string | null
          colonnina_id: string
          conto_id: string | null
          convenzione_id: string | null
          costo: number | null
          created_at: string
          created_by: string | null
          fatturata: boolean
          fine_at: string | null
          id: string
          inizio_at: string
          kwh: number | null
          modulo: string
          operatore_id: string | null
          presa: number
          sosta_id: string | null
          stato: string
          targa: string
          tariffa_kwh: number
          updated_at: string
          updated_by: string | null
          veicolo_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          colonnina_id: string
          conto_id?: string | null
          convenzione_id?: string | null
          costo?: number | null
          created_at?: string
          created_by?: string | null
          fatturata?: boolean
          fine_at?: string | null
          id?: string
          inizio_at?: string
          kwh?: number | null
          modulo?: string
          operatore_id?: string | null
          presa?: number
          sosta_id?: string | null
          stato?: string
          targa: string
          tariffa_kwh: number
          updated_at?: string
          updated_by?: string | null
          veicolo_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          colonnina_id?: string
          conto_id?: string | null
          convenzione_id?: string | null
          costo?: number | null
          created_at?: string
          created_by?: string | null
          fatturata?: boolean
          fine_at?: string | null
          id?: string
          inizio_at?: string
          kwh?: number | null
          modulo?: string
          operatore_id?: string | null
          presa?: number
          sosta_id?: string | null
          stato?: string
          targa?: string
          tariffa_kwh?: number
          updated_at?: string
          updated_by?: string | null
          veicolo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_ricariche_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_ricariche_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti_riepilogo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "gar_ricariche_colonnina_id_fkey"
            columns: ["colonnina_id"]
            isOneToOne: false
            referencedRelation: "gar_colonnine"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_ricariche_colonnina_id_fkey"
            columns: ["colonnina_id"]
            isOneToOne: false
            referencedRelation: "gar_colonnine_stato"
            referencedColumns: ["colonnina_id"]
          },
          {
            foreignKeyName: "gar_ricariche_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_ricariche_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "gar_ricariche_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "gar_ricariche_convenzione_id_fkey"
            columns: ["convenzione_id"]
            isOneToOne: false
            referencedRelation: "gar_convenzioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_ricariche_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_ricariche_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_ricariche_sosta_id_fkey"
            columns: ["sosta_id"]
            isOneToOne: false
            referencedRelation: "gar_posti_stato"
            referencedColumns: ["sosta_id"]
          },
          {
            foreignKeyName: "gar_ricariche_sosta_id_fkey"
            columns: ["sosta_id"]
            isOneToOne: false
            referencedRelation: "gar_soste"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_ricariche_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_ricariche_veicolo_id_fkey"
            columns: ["veicolo_id"]
            isOneToOne: false
            referencedRelation: "gar_veicoli"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_servizi: {
        Row: {
          aliquota_iva: number
          categoria: string | null
          cliente_id: string | null
          codice: string | null
          consegnato_at: string | null
          conto_id: string | null
          created_at: string
          created_by: string | null
          descrizione: string | null
          id: string
          iniziato_at: string | null
          listino_id: string | null
          modulo: string
          note: string | null
          operatore_id: string | null
          pagato: boolean
          prezzo: number | null
          programmato_at: string | null
          pronto_at: string | null
          sosta_id: string | null
          stato: string
          struttura_id: string
          targa: string | null
          updated_at: string
          updated_by: string | null
          veicolo_id: string | null
        }
        Insert: {
          aliquota_iva?: number
          categoria?: string | null
          cliente_id?: string | null
          codice?: string | null
          consegnato_at?: string | null
          conto_id?: string | null
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          id?: string
          iniziato_at?: string | null
          listino_id?: string | null
          modulo?: string
          note?: string | null
          operatore_id?: string | null
          pagato?: boolean
          prezzo?: number | null
          programmato_at?: string | null
          pronto_at?: string | null
          sosta_id?: string | null
          stato?: string
          struttura_id: string
          targa?: string | null
          updated_at?: string
          updated_by?: string | null
          veicolo_id?: string | null
        }
        Update: {
          aliquota_iva?: number
          categoria?: string | null
          cliente_id?: string | null
          codice?: string | null
          consegnato_at?: string | null
          conto_id?: string | null
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          id?: string
          iniziato_at?: string | null
          listino_id?: string | null
          modulo?: string
          note?: string | null
          operatore_id?: string | null
          pagato?: boolean
          prezzo?: number | null
          programmato_at?: string | null
          pronto_at?: string | null
          sosta_id?: string | null
          stato?: string
          struttura_id?: string
          targa?: string | null
          updated_at?: string
          updated_by?: string | null
          veicolo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_servizi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_servizi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti_riepilogo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "gar_servizi_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_servizi_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "gar_servizi_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "gar_servizi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_servizi_listino_id_fkey"
            columns: ["listino_id"]
            isOneToOne: false
            referencedRelation: "gar_servizi_listino"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_servizi_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_servizi_sosta_id_fkey"
            columns: ["sosta_id"]
            isOneToOne: false
            referencedRelation: "gar_posti_stato"
            referencedColumns: ["sosta_id"]
          },
          {
            foreignKeyName: "gar_servizi_sosta_id_fkey"
            columns: ["sosta_id"]
            isOneToOne: false
            referencedRelation: "gar_soste"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_servizi_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_servizi_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture_riepilogo"
            referencedColumns: ["struttura_id"]
          },
          {
            foreignKeyName: "gar_servizi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_servizi_veicolo_id_fkey"
            columns: ["veicolo_id"]
            isOneToOne: false
            referencedRelation: "gar_veicoli"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_servizi_listino: {
        Row: {
          aliquota_iva: number
          attivo: boolean
          categoria: string
          created_at: string
          created_by: string | null
          durata_min: number | null
          id: string
          modulo: string
          nome: string
          prezzo: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aliquota_iva?: number
          attivo?: boolean
          categoria?: string
          created_at?: string
          created_by?: string | null
          durata_min?: number | null
          id?: string
          modulo?: string
          nome: string
          prezzo?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aliquota_iva?: number
          attivo?: boolean
          categoria?: string
          created_at?: string
          created_by?: string | null
          durata_min?: number | null
          id?: string
          modulo?: string
          nome?: string
          prezzo?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_servizi_listino_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_servizi_listino_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_soste: {
        Row: {
          cliente_id: string | null
          conto_id: string | null
          contratto_id: string | null
          convenzione_id: string | null
          created_at: string
          created_by: string | null
          dettaglio: Json | null
          fatturata: boolean
          id: string
          importo: number | null
          ingresso_at: string
          minuti: number | null
          modalita_ingresso: string
          modalita_uscita: string | null
          modulo: string
          note: string | null
          operatore_ingresso: string | null
          operatore_uscita: string | null
          posto_id: string | null
          prenotazione_id: string | null
          stato: string
          struttura_id: string
          targa: string
          tariffario_id: string | null
          ticket: string | null
          tipo_veicolo: string
          updated_at: string
          updated_by: string | null
          uscita_at: string | null
          veicolo_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          conto_id?: string | null
          contratto_id?: string | null
          convenzione_id?: string | null
          created_at?: string
          created_by?: string | null
          dettaglio?: Json | null
          fatturata?: boolean
          id?: string
          importo?: number | null
          ingresso_at?: string
          minuti?: number | null
          modalita_ingresso?: string
          modalita_uscita?: string | null
          modulo?: string
          note?: string | null
          operatore_ingresso?: string | null
          operatore_uscita?: string | null
          posto_id?: string | null
          prenotazione_id?: string | null
          stato?: string
          struttura_id: string
          targa: string
          tariffario_id?: string | null
          ticket?: string | null
          tipo_veicolo?: string
          updated_at?: string
          updated_by?: string | null
          uscita_at?: string | null
          veicolo_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          conto_id?: string | null
          contratto_id?: string | null
          convenzione_id?: string | null
          created_at?: string
          created_by?: string | null
          dettaglio?: Json | null
          fatturata?: boolean
          id?: string
          importo?: number | null
          ingresso_at?: string
          minuti?: number | null
          modalita_ingresso?: string
          modalita_uscita?: string | null
          modulo?: string
          note?: string | null
          operatore_ingresso?: string | null
          operatore_uscita?: string | null
          posto_id?: string | null
          prenotazione_id?: string | null
          stato?: string
          struttura_id?: string
          targa?: string
          tariffario_id?: string | null
          ticket?: string | null
          tipo_veicolo?: string
          updated_at?: string
          updated_by?: string | null
          uscita_at?: string | null
          veicolo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_soste_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_soste_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti_riepilogo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "gar_soste_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_soste_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "gar_soste_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "gar_soste_contratto_id_fkey"
            columns: ["contratto_id"]
            isOneToOne: false
            referencedRelation: "gar_contratti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_soste_contratto_id_fkey"
            columns: ["contratto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti_stato"
            referencedColumns: ["contratto_id"]
          },
          {
            foreignKeyName: "gar_soste_convenzione_id_fkey"
            columns: ["convenzione_id"]
            isOneToOne: false
            referencedRelation: "gar_convenzioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_soste_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_soste_operatore_ingresso_fkey"
            columns: ["operatore_ingresso"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_soste_operatore_uscita_fkey"
            columns: ["operatore_uscita"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_soste_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_soste_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti_assegnabili"
            referencedColumns: ["posto_id"]
          },
          {
            foreignKeyName: "gar_soste_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti_stato"
            referencedColumns: ["posto_id"]
          },
          {
            foreignKeyName: "gar_soste_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "gar_posti_stato"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "gar_soste_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "gar_prenotazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_soste_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_soste_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture_riepilogo"
            referencedColumns: ["struttura_id"]
          },
          {
            foreignKeyName: "gar_soste_tariffario_id_fkey"
            columns: ["tariffario_id"]
            isOneToOne: false
            referencedRelation: "gar_tariffari"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_soste_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_soste_veicolo_id_fkey"
            columns: ["veicolo_id"]
            isOneToOne: false
            referencedRelation: "gar_veicoli"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_strutture: {
        Row: {
          altezza_max_m: number | null
          attiva: boolean
          avvisa_ingresso: boolean
          comune: string | null
          created_at: string
          created_by: string | null
          id: string
          indirizzo: string | null
          modalita_accesso: string[]
          modulo: string
          nome: string
          note: string | null
          orari: NonNullable<Json>
          peso_max_kg: number | null
          piani: number
          responsabile_id: string | null
          superficie_mq: number | null
          tipologia: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          altezza_max_m?: number | null
          attiva?: boolean
          avvisa_ingresso?: boolean
          comune?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          indirizzo?: string | null
          modalita_accesso?: string[]
          modulo?: string
          nome: string
          note?: string | null
          orari?: NonNullable<Json>
          peso_max_kg?: number | null
          piani?: number
          responsabile_id?: string | null
          superficie_mq?: number | null
          tipologia?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          altezza_max_m?: number | null
          attiva?: boolean
          avvisa_ingresso?: boolean
          comune?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          indirizzo?: string | null
          modalita_accesso?: string[]
          modulo?: string
          nome?: string
          note?: string | null
          orari?: NonNullable<Json>
          peso_max_kg?: number | null
          piani?: number
          responsabile_id?: string | null
          superficie_mq?: number | null
          tipologia?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_strutture_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_strutture_responsabile_id_fkey"
            columns: ["responsabile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_strutture_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_tariffari: {
        Row: {
          annuale: number | null
          attivo: boolean
          condizioni: string | null
          convenzionato: boolean
          created_at: string
          created_by: string | null
          festivo_pct: number
          franchigia_min: number
          frazione_min: number
          id: string
          mensile: number | null
          modulo: string
          nome: string
          notte_alle: string | null
          notte_dalle: string | null
          prezzo_frazione: number
          prezzo_notte: number | null
          settimanale: number | null
          struttura_id: string
          tetto_giornaliero: number | null
          tipo_veicolo: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          annuale?: number | null
          attivo?: boolean
          condizioni?: string | null
          convenzionato?: boolean
          created_at?: string
          created_by?: string | null
          festivo_pct?: number
          franchigia_min?: number
          frazione_min?: number
          id?: string
          mensile?: number | null
          modulo?: string
          nome: string
          notte_alle?: string | null
          notte_dalle?: string | null
          prezzo_frazione: number
          prezzo_notte?: number | null
          settimanale?: number | null
          struttura_id: string
          tetto_giornaliero?: number | null
          tipo_veicolo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          annuale?: number | null
          attivo?: boolean
          condizioni?: string | null
          convenzionato?: boolean
          created_at?: string
          created_by?: string | null
          festivo_pct?: number
          franchigia_min?: number
          frazione_min?: number
          id?: string
          mensile?: number | null
          modulo?: string
          nome?: string
          notte_alle?: string | null
          notte_dalle?: string | null
          prezzo_frazione?: number
          prezzo_notte?: number | null
          settimanale?: number | null
          struttura_id?: string
          tetto_giornaliero?: number | null
          tipo_veicolo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_tariffari_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_tariffari_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_tariffari_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture_riepilogo"
            referencedColumns: ["struttura_id"]
          },
          {
            foreignKeyName: "gar_tariffari_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_veicoli: {
        Row: {
          alimentazione: string | null
          altezza_m: number | null
          assicurazione: string | null
          assicurazione_scadenza: string | null
          cilindrata: number | null
          cliente_id: string | null
          colore: string | null
          created_at: string
          created_by: string | null
          id: string
          larghezza_m: number | null
          lunghezza_m: number | null
          marca: string | null
          modello: string | null
          modulo: string
          note: string | null
          peso_kg: number | null
          proprietario: string | null
          ricerca: unknown
          targa: string
          tipo: string
          updated_at: string
          updated_by: string | null
          utilizzatore: string | null
        }
        Insert: {
          alimentazione?: string | null
          altezza_m?: number | null
          assicurazione?: string | null
          assicurazione_scadenza?: string | null
          cilindrata?: number | null
          cliente_id?: string | null
          colore?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          larghezza_m?: number | null
          lunghezza_m?: number | null
          marca?: string | null
          modello?: string | null
          modulo?: string
          note?: string | null
          peso_kg?: number | null
          proprietario?: string | null
          ricerca?: never
          targa: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          utilizzatore?: string | null
        }
        Update: {
          alimentazione?: string | null
          altezza_m?: number | null
          assicurazione?: string | null
          assicurazione_scadenza?: string | null
          cilindrata?: number | null
          cliente_id?: string | null
          colore?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          larghezza_m?: number | null
          lunghezza_m?: number | null
          marca?: string | null
          modello?: string | null
          modulo?: string
          note?: string | null
          peso_kg?: number | null
          proprietario?: string | null
          ricerca?: never
          targa?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          utilizzatore?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_veicoli_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_veicoli_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti_riepilogo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "gar_veicoli_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_veicoli_updated_by_fkey"
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
          ricerca?: never
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
          ricerca?: never
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
      gift_card: {
        Row: {
          acquirente_id: string | null
          beneficiario: string | null
          codice: string
          conto_vendita_id: string | null
          created_at: string
          created_by: string | null
          id: string
          importo_iniziale: number
          messaggio: string | null
          modulo: string
          note: string | null
          scadenza: string | null
          stato: Database["public"]["Enums"]["gift_card_stato"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acquirente_id?: string | null
          beneficiario?: string | null
          codice?: string
          conto_vendita_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          importo_iniziale: number
          messaggio?: string | null
          modulo: string
          note?: string | null
          scadenza?: string | null
          stato?: Database["public"]["Enums"]["gift_card_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acquirente_id?: string | null
          beneficiario?: string | null
          codice?: string
          conto_vendita_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          importo_iniziale?: number
          messaggio?: string | null
          modulo?: string
          note?: string | null
          scadenza?: string | null
          stato?: Database["public"]["Enums"]["gift_card_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_acquirente_id_fkey"
            columns: ["acquirente_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_acquirente_id_fkey"
            columns: ["acquirente_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "gift_card_conto_vendita_id_fkey"
            columns: ["conto_vendita_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_conto_vendita_id_fkey"
            columns: ["conto_vendita_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "gift_card_conto_vendita_id_fkey"
            columns: ["conto_vendita_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "gift_card_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_movimenti: {
        Row: {
          conti_pagamento_id: string | null
          created_at: string
          created_by: string | null
          gift_card_id: string
          id: string
          importo: number
          modulo: string
          note: string | null
        }
        Insert: {
          conti_pagamento_id?: string | null
          created_at?: string
          created_by?: string | null
          gift_card_id: string
          id?: string
          importo: number
          modulo: string
          note?: string | null
        }
        Update: {
          conti_pagamento_id?: string | null
          created_at?: string
          created_by?: string | null
          gift_card_id?: string
          id?: string
          importo?: number
          modulo?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_movimenti_conti_pagamento_id_fkey"
            columns: ["conti_pagamento_id"]
            isOneToOne: false
            referencedRelation: "conti_pagamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_movimenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_movimenti_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_movimenti_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_card_saldi"
            referencedColumns: ["gift_card_id"]
          },
        ]
      }
      hotel_aree: {
        Row: {
          created_at: string
          created_by: string | null
          edificio: string | null
          id: string
          modulo: string
          nome: string
          ordine: number
          piano: number | null
          struttura_id: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          edificio?: string | null
          id?: string
          modulo?: string
          nome: string
          ordine?: number
          piano?: number | null
          struttura_id: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          edificio?: string | null
          id?: string
          modulo?: string
          nome?: string
          ordine?: number
          piano?: number | null
          struttura_id?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_aree_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_aree_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_aree_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_biancheria: {
        Row: {
          cicli_vita: number | null
          costo_lavaggio: number | null
          costo_unitario: number | null
          created_at: string
          created_by: string | null
          descrizione: string
          dotazione: number
          id: string
          in_lavanderia: number
          lavaggi_totali: number
          modulo: string
          note: string | null
          scorta_minima: number
          struttura_id: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cicli_vita?: number | null
          costo_lavaggio?: number | null
          costo_unitario?: number | null
          created_at?: string
          created_by?: string | null
          descrizione: string
          dotazione?: number
          id?: string
          in_lavanderia?: number
          lavaggi_totali?: number
          modulo?: string
          note?: string | null
          scorta_minima?: number
          struttura_id: string
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cicli_vita?: number | null
          costo_lavaggio?: number | null
          costo_unitario?: number | null
          created_at?: string
          created_by?: string | null
          descrizione?: string
          dotazione?: number
          id?: string
          in_lavanderia?: number
          lavaggi_totali?: number
          modulo?: string
          note?: string | null
          scorta_minima?: number
          struttura_id?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_biancheria_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_biancheria_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_biancheria_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_biancheria_movimenti: {
        Row: {
          biancheria_id: string
          costo: number | null
          created_at: string
          created_by: string | null
          data: string
          id: string
          lavanderia_id: string | null
          modulo: string
          note: string | null
          quantita: number
          tipo: string
        }
        Insert: {
          biancheria_id: string
          costo?: number | null
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          lavanderia_id?: string | null
          modulo?: string
          note?: string | null
          quantita: number
          tipo: string
        }
        Update: {
          biancheria_id?: string
          costo?: number | null
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          lavanderia_id?: string | null
          modulo?: string
          note?: string | null
          quantita?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_biancheria_movimenti_biancheria_id_fkey"
            columns: ["biancheria_id"]
            isOneToOne: false
            referencedRelation: "hotel_biancheria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_biancheria_movimenti_biancheria_id_fkey"
            columns: ["biancheria_id"]
            isOneToOne: false
            referencedRelation: "hotel_biancheria_stato"
            referencedColumns: ["biancheria_id"]
          },
          {
            foreignKeyName: "hotel_biancheria_movimenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_biancheria_movimenti_lavanderia_id_fkey"
            columns: ["lavanderia_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_camere: {
        Row: {
          accessibile: boolean
          attiva: boolean
          balcone: boolean
          created_at: string
          created_by: string | null
          dotazioni: string[]
          edificio: string | null
          fuori_servizio: boolean
          fuori_servizio_fino: string | null
          fuori_servizio_motivo: string | null
          id: string
          letti: string | null
          metri_quadri: number | null
          modulo: string
          note: string | null
          numero: string
          ordine: number
          piano: number | null
          posti_letto: number | null
          servizi: string[]
          stato_pulizia: Database["public"]["Enums"]["hotel_pulizia_stato"]
          struttura_id: string
          tariffa_standard: number | null
          tipologia_id: string
          updated_at: string
          updated_by: string | null
          vista: string | null
        }
        Insert: {
          accessibile?: boolean
          attiva?: boolean
          balcone?: boolean
          created_at?: string
          created_by?: string | null
          dotazioni?: string[]
          edificio?: string | null
          fuori_servizio?: boolean
          fuori_servizio_fino?: string | null
          fuori_servizio_motivo?: string | null
          id?: string
          letti?: string | null
          metri_quadri?: number | null
          modulo?: string
          note?: string | null
          numero: string
          ordine?: number
          piano?: number | null
          posti_letto?: number | null
          servizi?: string[]
          stato_pulizia?: Database["public"]["Enums"]["hotel_pulizia_stato"]
          struttura_id: string
          tariffa_standard?: number | null
          tipologia_id: string
          updated_at?: string
          updated_by?: string | null
          vista?: string | null
        }
        Update: {
          accessibile?: boolean
          attiva?: boolean
          balcone?: boolean
          created_at?: string
          created_by?: string | null
          dotazioni?: string[]
          edificio?: string | null
          fuori_servizio?: boolean
          fuori_servizio_fino?: string | null
          fuori_servizio_motivo?: string | null
          id?: string
          letti?: string | null
          metri_quadri?: number | null
          modulo?: string
          note?: string | null
          numero?: string
          ordine?: number
          piano?: number | null
          posti_letto?: number | null
          servizi?: string[]
          stato_pulizia?: Database["public"]["Enums"]["hotel_pulizia_stato"]
          struttura_id?: string
          tariffa_standard?: number | null
          tipologia_id?: string
          updated_at?: string
          updated_by?: string | null
          vista?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_camere_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_camere_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_camere_tipologia_id_fkey"
            columns: ["tipologia_id"]
            isOneToOne: false
            referencedRelation: "hotel_tipologie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_camere_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_competitor_prezzi: {
        Row: {
          competitor: string
          created_at: string
          created_by: string | null
          data: string
          fonte: string | null
          id: string
          modulo: string
          prezzo: number
          struttura_id: string
          tipologia: string
        }
        Insert: {
          competitor: string
          created_at?: string
          created_by?: string | null
          data: string
          fonte?: string | null
          id?: string
          modulo?: string
          prezzo: number
          struttura_id: string
          tipologia?: string
        }
        Update: {
          competitor?: string
          created_at?: string
          created_by?: string | null
          data?: string
          fonte?: string | null
          id?: string
          modulo?: string
          prezzo?: number
          struttura_id?: string
          tipologia?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_competitor_prezzi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_competitor_prezzi_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_garanzie: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          importo: number | null
          modulo: string
          note: string | null
          prenotazione_id: string
          riferimento: string | null
          scadenza: string | null
          stato: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          importo?: number | null
          modulo?: string
          note?: string | null
          prenotazione_id: string
          riferimento?: string | null
          scadenza?: string | null
          stato?: string
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          importo?: number | null
          modulo?: string
          note?: string | null
          prenotazione_id?: string
          riferimento?: string | null
          scadenza?: string | null
          stato?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_garanzie_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_garanzie_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["arrivo_id"]
          },
          {
            foreignKeyName: "hotel_garanzie_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_garanzie_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_conti_in_casa"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_garanzie_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_garanzie_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_prenotazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_garanzie_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_gruppi: {
        Row: {
          arrivo: string
          codice: string | null
          created_at: string
          created_by: string | null
          fatturazione: string
          id: string
          intermediario_id: string | null
          modulo: string
          nome: string
          note: string | null
          organizzazione_id: string | null
          partenza: string
          piano_id: string | null
          referente_id: string | null
          rilascio: string | null
          servizi: string | null
          stato: string
          struttura_id: string
          trattamento_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          arrivo: string
          codice?: string | null
          created_at?: string
          created_by?: string | null
          fatturazione?: string
          id?: string
          intermediario_id?: string | null
          modulo?: string
          nome: string
          note?: string | null
          organizzazione_id?: string | null
          partenza: string
          piano_id?: string | null
          referente_id?: string | null
          rilascio?: string | null
          servizi?: string | null
          stato?: string
          struttura_id: string
          trattamento_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          arrivo?: string
          codice?: string | null
          created_at?: string
          created_by?: string | null
          fatturazione?: string
          id?: string
          intermediario_id?: string | null
          modulo?: string
          nome?: string
          note?: string | null
          organizzazione_id?: string | null
          partenza?: string
          piano_id?: string | null
          referente_id?: string | null
          rilascio?: string | null
          servizi?: string | null
          stato?: string
          struttura_id?: string
          trattamento_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_gruppi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_gruppi_intermediario_id_fkey"
            columns: ["intermediario_id"]
            isOneToOne: false
            referencedRelation: "hotel_intermediari"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_gruppi_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_gruppi_piano_id_fkey"
            columns: ["piano_id"]
            isOneToOne: false
            referencedRelation: "hotel_piani_tariffari"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_gruppi_referente_id_fkey"
            columns: ["referente_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_gruppi_referente_id_fkey"
            columns: ["referente_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "hotel_gruppi_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_gruppi_trattamento_id_fkey"
            columns: ["trattamento_id"]
            isOneToOne: false
            referencedRelation: "hotel_trattamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_gruppi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_gruppi_blocchi: {
        Row: {
          camere: number
          created_at: string
          created_by: string | null
          gruppo_id: string
          id: string
          modulo: string
          prezzo: number | null
          tipologia_id: string
        }
        Insert: {
          camere: number
          created_at?: string
          created_by?: string | null
          gruppo_id: string
          id?: string
          modulo?: string
          prezzo?: number | null
          tipologia_id: string
        }
        Update: {
          camere?: number
          created_at?: string
          created_by?: string | null
          gruppo_id?: string
          id?: string
          modulo?: string
          prezzo?: number | null
          tipologia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_gruppi_blocchi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_gruppi_blocchi_gruppo_id_fkey"
            columns: ["gruppo_id"]
            isOneToOne: false
            referencedRelation: "hotel_gruppi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_gruppi_blocchi_tipologia_id_fkey"
            columns: ["tipologia_id"]
            isOneToOne: false
            referencedRelation: "hotel_tipologie"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_intermediari: {
        Row: {
          attivo: boolean
          codice_canale: string | null
          commissione_pct: number
          condizioni_pagamento: string | null
          contratto_al: string | null
          contratto_dal: string | null
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          note: string | null
          organizzazione_id: string
          struttura_id: string | null
          tariffa_netta: boolean
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          codice_canale?: string | null
          commissione_pct?: number
          condizioni_pagamento?: string | null
          contratto_al?: string | null
          contratto_dal?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          note?: string | null
          organizzazione_id: string
          struttura_id?: string | null
          tariffa_netta?: boolean
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          codice_canale?: string | null
          commissione_pct?: number
          condizioni_pagamento?: string | null
          contratto_al?: string | null
          contratto_dal?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          note?: string | null
          organizzazione_id?: string
          struttura_id?: string | null
          tariffa_netta?: boolean
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_intermediari_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_intermediari_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_intermediari_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_intermediari_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_manutenzioni: {
        Row: {
          area_id: string | null
          asset_id: string | null
          camera_id: string | null
          categoria: string
          codice: string | null
          costo: number | null
          created_at: string
          created_by: string | null
          data_intervento: string | null
          descrizione: string
          id: string
          mette_fuori_servizio: boolean
          modulo: string
          note: string | null
          priorita: string
          pulizia_id: string | null
          risolta_at: string | null
          segnalata_da: string | null
          stato: string
          struttura_id: string
          tecnico_esterno: string | null
          tecnico_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area_id?: string | null
          asset_id?: string | null
          camera_id?: string | null
          categoria?: string
          codice?: string | null
          costo?: number | null
          created_at?: string
          created_by?: string | null
          data_intervento?: string | null
          descrizione: string
          id?: string
          mette_fuori_servizio?: boolean
          modulo?: string
          note?: string | null
          priorita?: string
          pulizia_id?: string | null
          risolta_at?: string | null
          segnalata_da?: string | null
          stato?: string
          struttura_id: string
          tecnico_esterno?: string | null
          tecnico_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area_id?: string | null
          asset_id?: string | null
          camera_id?: string | null
          categoria?: string
          codice?: string | null
          costo?: number | null
          created_at?: string
          created_by?: string | null
          data_intervento?: string | null
          descrizione?: string
          id?: string
          mette_fuori_servizio?: boolean
          modulo?: string
          note?: string | null
          priorita?: string
          pulizia_id?: string | null
          risolta_at?: string | null
          segnalata_da?: string | null
          stato?: string
          struttura_id?: string
          tecnico_esterno?: string | null
          tecnico_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_manutenzioni_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "hotel_aree"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_manutenzioni_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_manutenzioni_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_indicatori"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "hotel_manutenzioni_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_manutenzioni_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["camera_id"]
          },
          {
            foreignKeyName: "hotel_manutenzioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_manutenzioni_pulizia_id_fkey"
            columns: ["pulizia_id"]
            isOneToOne: false
            referencedRelation: "hotel_pulizie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_manutenzioni_segnalata_da_fkey"
            columns: ["segnalata_da"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_manutenzioni_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_manutenzioni_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_manutenzioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_minibar_consumi: {
        Row: {
          articolo_id: string
          camera_id: string
          conto_riga_id: string | null
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          note: string | null
          prenotazione_id: string | null
          prezzo_unitario: number | null
          quantita: number
          rifornito: boolean
          rilevato_at: string
          struttura_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          articolo_id: string
          camera_id: string
          conto_riga_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          note?: string | null
          prenotazione_id?: string | null
          prezzo_unitario?: number | null
          quantita: number
          rifornito?: boolean
          rilevato_at?: string
          struttura_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          articolo_id?: string
          camera_id?: string
          conto_riga_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          note?: string | null
          prenotazione_id?: string | null
          prezzo_unitario?: number | null
          quantita?: number
          rifornito?: boolean
          rilevato_at?: string
          struttura_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_minibar_consumi_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_minibar_consumi_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "hotel_minibar_consumi_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_minibar_consumi_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["camera_id"]
          },
          {
            foreignKeyName: "hotel_minibar_consumi_conto_riga_id_fkey"
            columns: ["conto_riga_id"]
            isOneToOne: false
            referencedRelation: "conti_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_minibar_consumi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_minibar_consumi_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["arrivo_id"]
          },
          {
            foreignKeyName: "hotel_minibar_consumi_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_minibar_consumi_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_conti_in_casa"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_minibar_consumi_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_minibar_consumi_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_prenotazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_minibar_consumi_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_minibar_consumi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_minibar_dotazioni: {
        Row: {
          articolo_id: string
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          ordine: number
          prezzo: number
          quantita: number
          struttura_id: string
          tipologia_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          articolo_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          ordine?: number
          prezzo: number
          quantita?: number
          struttura_id: string
          tipologia_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          articolo_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          ordine?: number
          prezzo?: number
          quantita?: number
          struttura_id?: string
          tipologia_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_minibar_dotazioni_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_minibar_dotazioni_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "hotel_minibar_dotazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_minibar_dotazioni_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_minibar_dotazioni_tipologia_id_fkey"
            columns: ["tipologia_id"]
            isOneToOne: false
            referencedRelation: "hotel_tipologie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_minibar_dotazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_notti: {
        Row: {
          conto_riga_id: string | null
          created_at: string
          data: string
          id: string
          modulo: string
          prenotazione_id: string
          prezzo_camera: number
          prezzo_trattamento: number
        }
        Insert: {
          conto_riga_id?: string | null
          created_at?: string
          data: string
          id?: string
          modulo?: string
          prenotazione_id: string
          prezzo_camera?: number
          prezzo_trattamento?: number
        }
        Update: {
          conto_riga_id?: string | null
          created_at?: string
          data?: string
          id?: string
          modulo?: string
          prenotazione_id?: string
          prezzo_camera?: number
          prezzo_trattamento?: number
        }
        Relationships: [
          {
            foreignKeyName: "hotel_notti_conto_riga_id_fkey"
            columns: ["conto_riga_id"]
            isOneToOne: false
            referencedRelation: "conti_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_notti_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["arrivo_id"]
          },
          {
            foreignKeyName: "hotel_notti_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_notti_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_conti_in_casa"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_notti_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_notti_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_prenotazioni"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_oggetti_smarriti: {
        Row: {
          area: string | null
          camera_id: string | null
          categoria: string | null
          codice: string | null
          contatto_id: string | null
          created_at: string
          created_by: string | null
          custodia_fino: string | null
          descrizione: string
          id: string
          modalita_restituzione: string | null
          modulo: string
          note: string | null
          prenotazione_id: string | null
          proprietario: string | null
          restituito_il: string | null
          spedizione: string | null
          stato: string
          struttura_id: string
          trovato_da: string | null
          trovato_il: string
          ubicazione: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area?: string | null
          camera_id?: string | null
          categoria?: string | null
          codice?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          custodia_fino?: string | null
          descrizione: string
          id?: string
          modalita_restituzione?: string | null
          modulo?: string
          note?: string | null
          prenotazione_id?: string | null
          proprietario?: string | null
          restituito_il?: string | null
          spedizione?: string | null
          stato?: string
          struttura_id: string
          trovato_da?: string | null
          trovato_il?: string
          ubicazione?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area?: string | null
          camera_id?: string | null
          categoria?: string | null
          codice?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          custodia_fino?: string | null
          descrizione?: string
          id?: string
          modalita_restituzione?: string | null
          modulo?: string
          note?: string | null
          prenotazione_id?: string | null
          proprietario?: string | null
          restituito_il?: string | null
          spedizione?: string | null
          stato?: string
          struttura_id?: string
          trovato_da?: string | null
          trovato_il?: string
          ubicazione?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_oggetti_smarriti_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_oggetti_smarriti_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["camera_id"]
          },
          {
            foreignKeyName: "hotel_oggetti_smarriti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_oggetti_smarriti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "hotel_oggetti_smarriti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_oggetti_smarriti_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["arrivo_id"]
          },
          {
            foreignKeyName: "hotel_oggetti_smarriti_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_oggetti_smarriti_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_conti_in_casa"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_oggetti_smarriti_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_oggetti_smarriti_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_prenotazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_oggetti_smarriti_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_oggetti_smarriti_trovato_da_fkey"
            columns: ["trovato_da"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_oggetti_smarriti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_ospiti: {
        Row: {
          allergie: string | null
          cittadinanza: string | null
          codice_cittadinanza: string | null
          codice_comune_nascita: string | null
          codice_luogo_documento: string | null
          codice_stato_nascita: string | null
          comune_nascita: string | null
          contatto_id: string
          created_at: string
          created_by: string | null
          data_nascita: string | null
          documento_luogo: string | null
          documento_numero: string | null
          documento_scadenza: string | null
          documento_tipo: string | null
          id: string
          modulo: string
          note: string | null
          preferenze: string | null
          provincia_nascita: string | null
          residenza_comune: string | null
          residenza_provincia: string | null
          residenza_stato: string | null
          sesso: string | null
          stato_nascita: string | null
          updated_at: string
          updated_by: string | null
          vip: boolean
        }
        Insert: {
          allergie?: string | null
          cittadinanza?: string | null
          codice_cittadinanza?: string | null
          codice_comune_nascita?: string | null
          codice_luogo_documento?: string | null
          codice_stato_nascita?: string | null
          comune_nascita?: string | null
          contatto_id: string
          created_at?: string
          created_by?: string | null
          data_nascita?: string | null
          documento_luogo?: string | null
          documento_numero?: string | null
          documento_scadenza?: string | null
          documento_tipo?: string | null
          id?: string
          modulo?: string
          note?: string | null
          preferenze?: string | null
          provincia_nascita?: string | null
          residenza_comune?: string | null
          residenza_provincia?: string | null
          residenza_stato?: string | null
          sesso?: string | null
          stato_nascita?: string | null
          updated_at?: string
          updated_by?: string | null
          vip?: boolean
        }
        Update: {
          allergie?: string | null
          cittadinanza?: string | null
          codice_cittadinanza?: string | null
          codice_comune_nascita?: string | null
          codice_luogo_documento?: string | null
          codice_stato_nascita?: string | null
          comune_nascita?: string | null
          contatto_id?: string
          created_at?: string
          created_by?: string | null
          data_nascita?: string | null
          documento_luogo?: string | null
          documento_numero?: string | null
          documento_scadenza?: string | null
          documento_tipo?: string | null
          id?: string
          modulo?: string
          note?: string | null
          preferenze?: string | null
          provincia_nascita?: string | null
          residenza_comune?: string | null
          residenza_provincia?: string | null
          residenza_stato?: string | null
          sesso?: string | null
          stato_nascita?: string | null
          updated_at?: string
          updated_by?: string | null
          vip?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "hotel_ospiti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: true
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_ospiti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: true
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "hotel_ospiti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_ospiti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_parcheggio: {
        Row: {
          conto_riga_id: string | null
          created_at: string
          created_by: string | null
          giorni: number | null
          id: string
          ingresso_at: string
          modulo: string
          note: string | null
          posto: string | null
          prenotazione_id: string | null
          struttura_id: string
          targa: string
          tariffa_giorno: number
          updated_at: string
          updated_by: string | null
          uscita_at: string | null
          veicolo: string | null
        }
        Insert: {
          conto_riga_id?: string | null
          created_at?: string
          created_by?: string | null
          giorni?: number | null
          id?: string
          ingresso_at?: string
          modulo?: string
          note?: string | null
          posto?: string | null
          prenotazione_id?: string | null
          struttura_id: string
          targa: string
          tariffa_giorno?: number
          updated_at?: string
          updated_by?: string | null
          uscita_at?: string | null
          veicolo?: string | null
        }
        Update: {
          conto_riga_id?: string | null
          created_at?: string
          created_by?: string | null
          giorni?: number | null
          id?: string
          ingresso_at?: string
          modulo?: string
          note?: string | null
          posto?: string | null
          prenotazione_id?: string | null
          struttura_id?: string
          targa?: string
          tariffa_giorno?: number
          updated_at?: string
          updated_by?: string | null
          uscita_at?: string | null
          veicolo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_parcheggio_conto_riga_id_fkey"
            columns: ["conto_riga_id"]
            isOneToOne: false
            referencedRelation: "conti_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_parcheggio_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_parcheggio_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["arrivo_id"]
          },
          {
            foreignKeyName: "hotel_parcheggio_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_parcheggio_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_conti_in_casa"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_parcheggio_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_parcheggio_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_prenotazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_parcheggio_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_parcheggio_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_piani_tariffari: {
        Row: {
          anticipo_max_giorni: number | null
          anticipo_min_giorni: number | null
          attivo: boolean
          base_piano_id: string | null
          canali: string[]
          cancellazione_giorni: number
          caparra_pct: number
          codice: string
          created_at: string
          created_by: string | null
          descrizione: string | null
          giorni_arrivo: number[]
          id: string
          modulo: string
          nome: string
          ordine: number
          organizzazione_id: string | null
          penale_pct: number
          rimborsabile: boolean
          servizi_inclusi: string[]
          soggiorno_max: number | null
          soggiorno_min: number | null
          struttura_id: string
          tipo: string
          trattamento_id: string | null
          updated_at: string
          updated_by: string | null
          valido_al: string | null
          valido_dal: string | null
          variazione_pct: number
        }
        Insert: {
          anticipo_max_giorni?: number | null
          anticipo_min_giorni?: number | null
          attivo?: boolean
          base_piano_id?: string | null
          canali?: string[]
          cancellazione_giorni?: number
          caparra_pct?: number
          codice: string
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          giorni_arrivo?: number[]
          id?: string
          modulo?: string
          nome: string
          ordine?: number
          organizzazione_id?: string | null
          penale_pct?: number
          rimborsabile?: boolean
          servizi_inclusi?: string[]
          soggiorno_max?: number | null
          soggiorno_min?: number | null
          struttura_id: string
          tipo?: string
          trattamento_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valido_al?: string | null
          valido_dal?: string | null
          variazione_pct?: number
        }
        Update: {
          anticipo_max_giorni?: number | null
          anticipo_min_giorni?: number | null
          attivo?: boolean
          base_piano_id?: string | null
          canali?: string[]
          cancellazione_giorni?: number
          caparra_pct?: number
          codice?: string
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          giorni_arrivo?: number[]
          id?: string
          modulo?: string
          nome?: string
          ordine?: number
          organizzazione_id?: string | null
          penale_pct?: number
          rimborsabile?: boolean
          servizi_inclusi?: string[]
          soggiorno_max?: number | null
          soggiorno_min?: number | null
          struttura_id?: string
          tipo?: string
          trattamento_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valido_al?: string | null
          valido_dal?: string | null
          variazione_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "hotel_piani_tariffari_base_piano_id_fkey"
            columns: ["base_piano_id"]
            isOneToOne: false
            referencedRelation: "hotel_piani_tariffari"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_piani_tariffari_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_piani_tariffari_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_piani_tariffari_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_piani_tariffari_trattamento_id_fkey"
            columns: ["trattamento_id"]
            isOneToOne: false
            referencedRelation: "hotel_trattamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_piani_tariffari_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_pickup: {
        Row: {
          camere_vendute: number
          data: string
          modulo: string
          ricavo: number
          rilevato_il: string
          struttura_id: string
        }
        Insert: {
          camere_vendute: number
          data: string
          modulo?: string
          ricavo: number
          rilevato_il: string
          struttura_id: string
        }
        Update: {
          camere_vendute?: number
          data?: string
          modulo?: string
          ricavo?: number
          rilevato_il?: string
          struttura_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_pickup_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_prenotazioni: {
        Row: {
          adulti: number
          annullata_at: string | null
          arrivo: string
          arrivo_ora: string | null
          bambini: number
          camera_id: string | null
          canale: string
          canale_riferimento: string | null
          caparra_richiesta: number
          caparra_scadenza: string | null
          check_in_at: string | null
          check_out_at: string | null
          codice: string | null
          contatto_id: string | null
          conto_id: string | null
          created_at: string
          created_by: string | null
          early_check_in: boolean
          gruppo_id: string | null
          id: string
          intermediario_id: string | null
          late_check_out: boolean
          metodo_pagamento: string | null
          modulo: string
          motivo_annullamento: string | null
          note: string | null
          notti: number | null
          opzione_scadenza: string | null
          organizzazione_id: string | null
          ospite_nome: string
          pagatore_contatto_id: string | null
          partenza: string
          penale: number | null
          periodo: unknown
          piano_id: string | null
          prezzo_manuale: boolean
          prezzo_totale: number
          ricerca: unknown
          richieste: string | null
          stato: Database["public"]["Enums"]["hotel_prenotazione_stato"]
          struttura_id: string
          tipologia_id: string
          trattamento_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          adulti?: number
          annullata_at?: string | null
          arrivo: string
          arrivo_ora?: string | null
          bambini?: number
          camera_id?: string | null
          canale?: string
          canale_riferimento?: string | null
          caparra_richiesta?: number
          caparra_scadenza?: string | null
          check_in_at?: string | null
          check_out_at?: string | null
          codice?: string | null
          contatto_id?: string | null
          conto_id?: string | null
          created_at?: string
          created_by?: string | null
          early_check_in?: boolean
          gruppo_id?: string | null
          id?: string
          intermediario_id?: string | null
          late_check_out?: boolean
          metodo_pagamento?: string | null
          modulo?: string
          motivo_annullamento?: string | null
          note?: string | null
          notti?: never
          opzione_scadenza?: string | null
          organizzazione_id?: string | null
          ospite_nome: string
          pagatore_contatto_id?: string | null
          partenza: string
          penale?: number | null
          periodo?: never
          piano_id?: string | null
          prezzo_manuale?: boolean
          prezzo_totale?: number
          ricerca?: never
          richieste?: string | null
          stato?: Database["public"]["Enums"]["hotel_prenotazione_stato"]
          struttura_id: string
          tipologia_id: string
          trattamento_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          adulti?: number
          annullata_at?: string | null
          arrivo?: string
          arrivo_ora?: string | null
          bambini?: number
          camera_id?: string | null
          canale?: string
          canale_riferimento?: string | null
          caparra_richiesta?: number
          caparra_scadenza?: string | null
          check_in_at?: string | null
          check_out_at?: string | null
          codice?: string | null
          contatto_id?: string | null
          conto_id?: string | null
          created_at?: string
          created_by?: string | null
          early_check_in?: boolean
          gruppo_id?: string | null
          id?: string
          intermediario_id?: string | null
          late_check_out?: boolean
          metodo_pagamento?: string | null
          modulo?: string
          motivo_annullamento?: string | null
          note?: string | null
          notti?: never
          opzione_scadenza?: string | null
          organizzazione_id?: string | null
          ospite_nome?: string
          pagatore_contatto_id?: string | null
          partenza?: string
          penale?: number | null
          periodo?: never
          piano_id?: string | null
          prezzo_manuale?: boolean
          prezzo_totale?: number
          ricerca?: never
          richieste?: string | null
          stato?: Database["public"]["Enums"]["hotel_prenotazione_stato"]
          struttura_id?: string
          tipologia_id?: string
          trattamento_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_prenotazioni_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["camera_id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_gruppo_id_fkey"
            columns: ["gruppo_id"]
            isOneToOne: false
            referencedRelation: "hotel_gruppi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_intermediario_id_fkey"
            columns: ["intermediario_id"]
            isOneToOne: false
            referencedRelation: "hotel_intermediari"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_pagatore_contatto_id_fkey"
            columns: ["pagatore_contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_pagatore_contatto_id_fkey"
            columns: ["pagatore_contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_piano_id_fkey"
            columns: ["piano_id"]
            isOneToOne: false
            referencedRelation: "hotel_piani_tariffari"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_tipologia_id_fkey"
            columns: ["tipologia_id"]
            isOneToOne: false
            referencedRelation: "hotel_tipologie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_trattamento_id_fkey"
            columns: ["trattamento_id"]
            isOneToOne: false
            referencedRelation: "hotel_trattamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_pulizie: {
        Row: {
          anomalie: string | null
          assegnata_a: string | null
          camera_id: string
          created_at: string
          created_by: string | null
          data: string
          esito_controllo: string | null
          fine_at: string | null
          id: string
          inizio_at: string | null
          minuti_effettivi: number | null
          minuti_previsti: number | null
          modulo: string
          note: string | null
          prenotazione_id: string | null
          priorita: string
          stato: string
          struttura_id: string
          tipo: Database["public"]["Enums"]["hotel_pulizia_tipo"]
          updated_at: string
          updated_by: string | null
          verificata_at: string | null
          verificata_da: string | null
        }
        Insert: {
          anomalie?: string | null
          assegnata_a?: string | null
          camera_id: string
          created_at?: string
          created_by?: string | null
          data?: string
          esito_controllo?: string | null
          fine_at?: string | null
          id?: string
          inizio_at?: string | null
          minuti_effettivi?: number | null
          minuti_previsti?: number | null
          modulo?: string
          note?: string | null
          prenotazione_id?: string | null
          priorita?: string
          stato?: string
          struttura_id: string
          tipo: Database["public"]["Enums"]["hotel_pulizia_tipo"]
          updated_at?: string
          updated_by?: string | null
          verificata_at?: string | null
          verificata_da?: string | null
        }
        Update: {
          anomalie?: string | null
          assegnata_a?: string | null
          camera_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          esito_controllo?: string | null
          fine_at?: string | null
          id?: string
          inizio_at?: string | null
          minuti_effettivi?: number | null
          minuti_previsti?: number | null
          modulo?: string
          note?: string | null
          prenotazione_id?: string | null
          priorita?: string
          stato?: string
          struttura_id?: string
          tipo?: Database["public"]["Enums"]["hotel_pulizia_tipo"]
          updated_at?: string
          updated_by?: string | null
          verificata_at?: string | null
          verificata_da?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_pulizie_assegnata_a_fkey"
            columns: ["assegnata_a"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_pulizie_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_pulizie_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["camera_id"]
          },
          {
            foreignKeyName: "hotel_pulizie_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_pulizie_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["arrivo_id"]
          },
          {
            foreignKeyName: "hotel_pulizie_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_pulizie_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_conti_in_casa"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_pulizie_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_pulizie_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_prenotazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_pulizie_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_pulizie_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_pulizie_verificata_da_fkey"
            columns: ["verificata_da"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_revenue_regole: {
        Row: {
          anticipo_max_giorni: number | null
          attiva: boolean
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          nome: string
          occupazione_a: number
          occupazione_da: number
          priorita: number
          struttura_id: string
          updated_at: string
          updated_by: string | null
          variazione_pct: number
        }
        Insert: {
          anticipo_max_giorni?: number | null
          attiva?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome: string
          occupazione_a?: number
          occupazione_da?: number
          priorita?: number
          struttura_id: string
          updated_at?: string
          updated_by?: string | null
          variazione_pct: number
        }
        Update: {
          anticipo_max_giorni?: number | null
          attiva?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome?: string
          occupazione_a?: number
          occupazione_da?: number
          priorita?: number
          struttura_id?: string
          updated_at?: string
          updated_by?: string | null
          variazione_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "hotel_revenue_regole_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_revenue_regole_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_revenue_regole_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_sale: {
        Row: {
          attiva: boolean
          attrezzature: string[]
          capienze: NonNullable<Json>
          created_at: string
          created_by: string | null
          id: string
          metri_quadri: number | null
          modulo: string
          nome: string
          note: string | null
          prezzo_giornata: number | null
          prezzo_mezza_giornata: number | null
          struttura_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attiva?: boolean
          attrezzature?: string[]
          capienze?: NonNullable<Json>
          created_at?: string
          created_by?: string | null
          id?: string
          metri_quadri?: number | null
          modulo?: string
          nome: string
          note?: string | null
          prezzo_giornata?: number | null
          prezzo_mezza_giornata?: number | null
          struttura_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attiva?: boolean
          attrezzature?: string[]
          capienze?: NonNullable<Json>
          created_at?: string
          created_by?: string | null
          id?: string
          metri_quadri?: number | null
          modulo?: string
          nome?: string
          note?: string | null
          prezzo_giornata?: number | null
          prezzo_mezza_giornata?: number | null
          struttura_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_sale_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_sale_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_sale_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_sale_prenotazioni: {
        Row: {
          allestimento: string | null
          attrezzature: string[]
          catering: string | null
          coffee_break: number
          created_at: string
          created_by: string | null
          evento_id: string | null
          fine: string
          gruppo_id: string | null
          id: string
          inizio: string
          modulo: string
          note: string | null
          organizzazione_id: string | null
          partecipanti: number | null
          periodo: unknown
          prezzo: number | null
          sala_id: string
          stato: string
          struttura_id: string
          titolo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allestimento?: string | null
          attrezzature?: string[]
          catering?: string | null
          coffee_break?: number
          created_at?: string
          created_by?: string | null
          evento_id?: string | null
          fine: string
          gruppo_id?: string | null
          id?: string
          inizio: string
          modulo?: string
          note?: string | null
          organizzazione_id?: string | null
          partecipanti?: number | null
          periodo?: never
          prezzo?: number | null
          sala_id: string
          stato?: string
          struttura_id: string
          titolo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allestimento?: string | null
          attrezzature?: string[]
          catering?: string | null
          coffee_break?: number
          created_at?: string
          created_by?: string | null
          evento_id?: string | null
          fine?: string
          gruppo_id?: string | null
          id?: string
          inizio?: string
          modulo?: string
          note?: string | null
          organizzazione_id?: string | null
          partecipanti?: number | null
          periodo?: never
          prezzo?: number | null
          sala_id?: string
          stato?: string
          struttura_id?: string
          titolo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_sale_prenotazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_sale_prenotazioni_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_sale_prenotazioni_gruppo_id_fkey"
            columns: ["gruppo_id"]
            isOneToOne: false
            referencedRelation: "hotel_gruppi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_sale_prenotazioni_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_sale_prenotazioni_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "hotel_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_sale_prenotazioni_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_sale_prenotazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_servizi: {
        Row: {
          aliquota_iva: number
          attivo: boolean
          created_at: string
          created_by: string | null
          descrizione: string | null
          durata_min: number | null
          id: string
          modulo: string
          nome: string
          prezzo: number
          richiede_operatore: boolean
          risorse: string[]
          struttura_id: string
          tipo: string
          unita: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aliquota_iva?: number
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          durata_min?: number | null
          id?: string
          modulo?: string
          nome: string
          prezzo?: number
          richiede_operatore?: boolean
          risorse?: string[]
          struttura_id: string
          tipo?: string
          unita?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aliquota_iva?: number
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          durata_min?: number | null
          id?: string
          modulo?: string
          nome?: string
          prezzo?: number
          richiede_operatore?: boolean
          risorse?: string[]
          struttura_id?: string
          tipo?: string
          unita?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_servizi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_servizi_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_servizi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_servizi_prenotazioni: {
        Row: {
          contatto_id: string | null
          conto_id: string | null
          conto_riga_id: string | null
          created_at: string
          created_by: string | null
          fine: string
          id: string
          inizio: string
          modulo: string
          note: string | null
          operatore_id: string | null
          ospite_nome: string
          periodo: unknown
          prenotazione_id: string | null
          prezzo_unitario: number | null
          quantita: number
          risorsa: string | null
          servizio_id: string
          stato: string
          struttura_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contatto_id?: string | null
          conto_id?: string | null
          conto_riga_id?: string | null
          created_at?: string
          created_by?: string | null
          fine: string
          id?: string
          inizio: string
          modulo?: string
          note?: string | null
          operatore_id?: string | null
          ospite_nome: string
          periodo?: never
          prenotazione_id?: string | null
          prezzo_unitario?: number | null
          quantita?: number
          risorsa?: string | null
          servizio_id: string
          stato?: string
          struttura_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contatto_id?: string | null
          conto_id?: string | null
          conto_riga_id?: string | null
          created_at?: string
          created_by?: string | null
          fine?: string
          id?: string
          inizio?: string
          modulo?: string
          note?: string | null
          operatore_id?: string | null
          ospite_nome?: string
          periodo?: never
          prenotazione_id?: string | null
          prezzo_unitario?: number | null
          quantita?: number
          risorsa?: string | null
          servizio_id?: string
          stato?: string
          struttura_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_servizi_prenotazioni_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_servizi_prenotazioni_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "hotel_servizi_prenotazioni_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_servizi_prenotazioni_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "hotel_servizi_prenotazioni_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "hotel_servizi_prenotazioni_conto_riga_id_fkey"
            columns: ["conto_riga_id"]
            isOneToOne: false
            referencedRelation: "conti_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_servizi_prenotazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_servizi_prenotazioni_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_servizi_prenotazioni_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["arrivo_id"]
          },
          {
            foreignKeyName: "hotel_servizi_prenotazioni_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_servizi_prenotazioni_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_conti_in_casa"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_servizi_prenotazioni_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_servizi_prenotazioni_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_prenotazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_servizi_prenotazioni_servizio_id_fkey"
            columns: ["servizio_id"]
            isOneToOne: false
            referencedRelation: "hotel_servizi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_servizi_prenotazioni_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_servizi_prenotazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_soggiorno_ospiti: {
        Row: {
          created_at: string
          created_by: string | null
          esenzione_tassa: string | null
          id: string
          inviato_alloggiati_at: string | null
          modulo: string
          ospite_id: string
          prenotazione_id: string
          tipo_alloggiato: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          esenzione_tassa?: string | null
          id?: string
          inviato_alloggiati_at?: string | null
          modulo?: string
          ospite_id: string
          prenotazione_id: string
          tipo_alloggiato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          esenzione_tassa?: string | null
          id?: string
          inviato_alloggiati_at?: string | null
          modulo?: string
          ospite_id?: string
          prenotazione_id?: string
          tipo_alloggiato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_soggiorno_ospiti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_soggiorno_ospiti_ospite_id_fkey"
            columns: ["ospite_id"]
            isOneToOne: false
            referencedRelation: "hotel_ospiti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_soggiorno_ospiti_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["arrivo_id"]
          },
          {
            foreignKeyName: "hotel_soggiorno_ospiti_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_soggiorno_ospiti_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_conti_in_casa"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_soggiorno_ospiti_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_soggiorno_ospiti_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_prenotazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_soggiorno_ospiti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_strutture: {
        Row: {
          attiva: boolean
          cambio_biancheria_giorni: number
          cap: string | null
          categoria: string | null
          check_in_dalle: string
          check_out_entro: string
          codice_alloggiati: string | null
          codice_cir: string | null
          codice_istat: string | null
          comune: string | null
          costo_orario_medio: number | null
          created_at: string
          created_by: string | null
          edifici: string[]
          email: string | null
          id: string
          indirizzo: string | null
          minuti_pulizia_partenza: number
          minuti_pulizia_soggiorno: number
          modulo: string
          nome: string
          note: string | null
          piani: number | null
          posti_auto: number | null
          provincia: string | null
          servizi: string[]
          sito: string | null
          telefono: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attiva?: boolean
          cambio_biancheria_giorni?: number
          cap?: string | null
          categoria?: string | null
          check_in_dalle?: string
          check_out_entro?: string
          codice_alloggiati?: string | null
          codice_cir?: string | null
          codice_istat?: string | null
          comune?: string | null
          costo_orario_medio?: number | null
          created_at?: string
          created_by?: string | null
          edifici?: string[]
          email?: string | null
          id?: string
          indirizzo?: string | null
          minuti_pulizia_partenza?: number
          minuti_pulizia_soggiorno?: number
          modulo?: string
          nome: string
          note?: string | null
          piani?: number | null
          posti_auto?: number | null
          provincia?: string | null
          servizi?: string[]
          sito?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attiva?: boolean
          cambio_biancheria_giorni?: number
          cap?: string | null
          categoria?: string | null
          check_in_dalle?: string
          check_out_entro?: string
          codice_alloggiati?: string | null
          codice_cir?: string | null
          codice_istat?: string | null
          comune?: string | null
          costo_orario_medio?: number | null
          created_at?: string
          created_by?: string | null
          edifici?: string[]
          email?: string | null
          id?: string
          indirizzo?: string | null
          minuti_pulizia_partenza?: number
          minuti_pulizia_soggiorno?: number
          modulo?: string
          nome?: string
          note?: string | null
          piani?: number | null
          posti_auto?: number | null
          provincia?: string | null
          servizi?: string[]
          sito?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_strutture_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_strutture_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_tariffe: {
        Row: {
          al: string
          chiuso_arrivo: boolean
          chiuso_partenza: boolean
          created_at: string
          created_by: string | null
          dal: string
          giorni: number[]
          id: string
          modulo: string
          piano_id: string
          prezzo: number
          priorita: number
          riduzione_singola: number
          soggiorno_min: number | null
          stop_vendita: boolean
          struttura_id: string
          supplemento_persona: number
          tipologia_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          al: string
          chiuso_arrivo?: boolean
          chiuso_partenza?: boolean
          created_at?: string
          created_by?: string | null
          dal: string
          giorni?: number[]
          id?: string
          modulo?: string
          piano_id: string
          prezzo: number
          priorita?: number
          riduzione_singola?: number
          soggiorno_min?: number | null
          stop_vendita?: boolean
          struttura_id: string
          supplemento_persona?: number
          tipologia_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          al?: string
          chiuso_arrivo?: boolean
          chiuso_partenza?: boolean
          created_at?: string
          created_by?: string | null
          dal?: string
          giorni?: number[]
          id?: string
          modulo?: string
          piano_id?: string
          prezzo?: number
          priorita?: number
          riduzione_singola?: number
          soggiorno_min?: number | null
          stop_vendita?: boolean
          struttura_id?: string
          supplemento_persona?: number
          tipologia_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_tariffe_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_tariffe_piano_id_fkey"
            columns: ["piano_id"]
            isOneToOne: false
            referencedRelation: "hotel_piani_tariffari"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_tariffe_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_tariffe_tipologia_id_fkey"
            columns: ["tipologia_id"]
            isOneToOne: false
            referencedRelation: "hotel_tipologie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_tariffe_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_tassa_regole: {
        Row: {
          al: string | null
          comune: string
          created_at: string
          created_by: string | null
          dal: string | null
          esenzioni: string[]
          eta_esenzione_sotto: number | null
          id: string
          importo_notte: number
          modulo: string
          note: string | null
          notti_max: number | null
          riduzioni: NonNullable<Json>
          struttura_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          al?: string | null
          comune: string
          created_at?: string
          created_by?: string | null
          dal?: string | null
          esenzioni?: string[]
          eta_esenzione_sotto?: number | null
          id?: string
          importo_notte: number
          modulo?: string
          note?: string | null
          notti_max?: number | null
          riduzioni?: NonNullable<Json>
          struttura_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          al?: string | null
          comune?: string
          created_at?: string
          created_by?: string | null
          dal?: string | null
          esenzioni?: string[]
          eta_esenzione_sotto?: number | null
          id?: string
          importo_notte?: number
          modulo?: string
          note?: string | null
          notti_max?: number | null
          riduzioni?: NonNullable<Json>
          struttura_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_tassa_regole_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_tassa_regole_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_tassa_regole_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_tipologie: {
        Row: {
          attiva: boolean
          categoria: string
          codice: string
          created_at: string
          created_by: string | null
          descrizione: string | null
          dotazioni: string[]
          id: string
          modulo: string
          nome: string
          occupazione_base: number
          occupazione_max: number
          occupazione_min: number
          ordine: number
          politiche: string | null
          prezzo_base: number
          struttura_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attiva?: boolean
          categoria?: string
          codice: string
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          dotazioni?: string[]
          id?: string
          modulo?: string
          nome: string
          occupazione_base?: number
          occupazione_max?: number
          occupazione_min?: number
          ordine?: number
          politiche?: string | null
          prezzo_base?: number
          struttura_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attiva?: boolean
          categoria?: string
          codice?: string
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          dotazioni?: string[]
          id?: string
          modulo?: string
          nome?: string
          occupazione_base?: number
          occupazione_max?: number
          occupazione_min?: number
          ordine?: number
          politiche?: string | null
          prezzo_base?: number
          struttura_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_tipologie_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_tipologie_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_tipologie_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_transfer: {
        Row: {
          autista: string | null
          autista_id: string | null
          conto_riga_id: string | null
          costo: number | null
          created_at: string
          created_by: string | null
          data_ora: string
          direzione: string
          id: string
          luogo: string
          modulo: string
          note: string | null
          ospite_nome: string
          passeggeri: number
          prenotazione_id: string | null
          prezzo: number | null
          riferimento: string | null
          stato: string
          struttura_id: string
          tipo: string
          updated_at: string
          updated_by: string | null
          veicolo: string | null
        }
        Insert: {
          autista?: string | null
          autista_id?: string | null
          conto_riga_id?: string | null
          costo?: number | null
          created_at?: string
          created_by?: string | null
          data_ora: string
          direzione?: string
          id?: string
          luogo: string
          modulo?: string
          note?: string | null
          ospite_nome: string
          passeggeri?: number
          prenotazione_id?: string | null
          prezzo?: number | null
          riferimento?: string | null
          stato?: string
          struttura_id: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          veicolo?: string | null
        }
        Update: {
          autista?: string | null
          autista_id?: string | null
          conto_riga_id?: string | null
          costo?: number | null
          created_at?: string
          created_by?: string | null
          data_ora?: string
          direzione?: string
          id?: string
          luogo?: string
          modulo?: string
          note?: string | null
          ospite_nome?: string
          passeggeri?: number
          prenotazione_id?: string | null
          prezzo?: number | null
          riferimento?: string | null
          stato?: string
          struttura_id?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          veicolo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_transfer_autista_id_fkey"
            columns: ["autista_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_transfer_conto_riga_id_fkey"
            columns: ["conto_riga_id"]
            isOneToOne: false
            referencedRelation: "conti_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_transfer_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_transfer_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["arrivo_id"]
          },
          {
            foreignKeyName: "hotel_transfer_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_camere_stato"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_transfer_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_conti_in_casa"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_transfer_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["prenotazione_id"]
          },
          {
            foreignKeyName: "hotel_transfer_prenotazione_id_fkey"
            columns: ["prenotazione_id"]
            isOneToOne: false
            referencedRelation: "hotel_prenotazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_transfer_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_transfer_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_trattamenti: {
        Row: {
          attivo: boolean
          bevande: boolean
          cena: boolean
          codice: string
          colazione: boolean
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          nome: string
          ordine: number
          pranzo: boolean
          servizi_inclusi: string[]
          struttura_id: string
          supplemento_adulto: number
          supplemento_bambino: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          bevande?: boolean
          cena?: boolean
          codice: string
          colazione?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome: string
          ordine?: number
          pranzo?: boolean
          servizi_inclusi?: string[]
          struttura_id: string
          supplemento_adulto?: number
          supplemento_bambino?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          bevande?: boolean
          cena?: boolean
          codice?: string
          colazione?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome?: string
          ordine?: number
          pranzo?: boolean
          servizi_inclusi?: string[]
          struttura_id?: string
          supplemento_adulto?: number
          supplemento_bambino?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_trattamenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_trattamenti_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_trattamenti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_agenti: {
        Row: {
          attivo: boolean
          created_at: string
          created_by: string | null
          id: string
          iscrizione_ruolo: string | null
          modulo: string
          note: string | null
          obiettivo_acquisizioni: number | null
          obiettivo_chiusure: number | null
          obiettivo_provvigioni: number | null
          quota_pct: number | null
          updated_at: string
          updated_by: string | null
          user_id: string
          zone: string[]
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          iscrizione_ruolo?: string | null
          modulo?: string
          note?: string | null
          obiettivo_acquisizioni?: number | null
          obiettivo_chiusure?: number | null
          obiettivo_provvigioni?: number | null
          quota_pct?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          zone?: string[]
        }
        Update: {
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          iscrizione_ruolo?: string | null
          modulo?: string
          note?: string | null
          obiettivo_acquisizioni?: number | null
          obiettivo_chiusure?: number | null
          obiettivo_provvigioni?: number | null
          quota_pct?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          zone?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "imm_agenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_agenti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_agenti_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_aml_verifiche: {
        Row: {
          adeguata_verifica: string
          conservare_fino: string | null
          contatto_id: string | null
          created_at: string
          created_by: string | null
          documento_numero: string
          documento_scadenza: string | null
          documento_tipo: string
          id: string
          identificato_il: string
          immobile_id: string | null
          modalita: string
          modulo: string
          note: string | null
          operatore_id: string | null
          organizzazione_id: string | null
          origine_fondi: string | null
          pep: boolean
          rischio: string
          ruolo: string
          scopo_natura: string | null
          titolare_effettivo: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          adeguata_verifica?: string
          conservare_fino?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          documento_numero: string
          documento_scadenza?: string | null
          documento_tipo?: string
          id?: string
          identificato_il?: string
          immobile_id?: string | null
          modalita?: string
          modulo?: string
          note?: string | null
          operatore_id?: string | null
          organizzazione_id?: string | null
          origine_fondi?: string | null
          pep?: boolean
          rischio?: string
          ruolo?: string
          scopo_natura?: string | null
          titolare_effettivo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          adeguata_verifica?: string
          conservare_fino?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          documento_numero?: string
          documento_scadenza?: string | null
          documento_tipo?: string
          id?: string
          identificato_il?: string
          immobile_id?: string | null
          modalita?: string
          modulo?: string
          note?: string | null
          operatore_id?: string | null
          organizzazione_id?: string | null
          origine_fondi?: string | null
          pep?: boolean
          rischio?: string
          ruolo?: string
          scopo_natura?: string | null
          titolare_effettivo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_aml_verifiche_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_aml_verifiche_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "imm_aml_verifiche_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_aml_verifiche_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_aml_verifiche_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_aml_verifiche_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_aml_verifiche_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_annunci: {
        Row: {
          created_at: string
          created_by: string | null
          descrizione: string
          id: string
          immobile_id: string
          modulo: string
          portali: string[]
          pubblicato_il: string | null
          sito: boolean
          social: boolean
          stato: string
          titolo: string
          tour_url: string | null
          updated_at: string
          updated_by: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descrizione: string
          id?: string
          immobile_id: string
          modulo?: string
          portali?: string[]
          pubblicato_il?: string | null
          sito?: boolean
          social?: boolean
          stato?: string
          titolo: string
          tour_url?: string | null
          updated_at?: string
          updated_by?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descrizione?: string
          id?: string
          immobile_id?: string
          modulo?: string
          portali?: string[]
          pubblicato_il?: string | null
          sito?: boolean
          social?: boolean
          stato?: string
          titolo?: string
          tour_url?: string | null
          updated_at?: string
          updated_by?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_annunci_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_annunci_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: true
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_annunci_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_canoni: {
        Row: {
          canone: number
          created_at: string
          created_by: string | null
          dal: string
          id: string
          locazione_id: string
          modulo: string
          motivo: string
          variazione_istat: number | null
        }
        Insert: {
          canone: number
          created_at?: string
          created_by?: string | null
          dal: string
          id?: string
          locazione_id: string
          modulo?: string
          motivo: string
          variazione_istat?: number | null
        }
        Update: {
          canone?: number
          created_at?: string
          created_by?: string | null
          dal?: string
          id?: string
          locazione_id?: string
          modulo?: string
          motivo?: string
          variazione_istat?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_canoni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_canoni_locazione_id_fkey"
            columns: ["locazione_id"]
            isOneToOne: false
            referencedRelation: "imm_locazioni"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_chiusure: {
        Row: {
          caparra_versata: number
          codice: string | null
          consegna_chiavi_il: string | null
          contatto_id: string
          created_at: string
          created_by: string | null
          documentazione_finale: boolean
          id: string
          immobile_id: string
          modulo: string
          notaio_id: string | null
          note: string | null
          preliminare_il: string | null
          prezzo: number
          proposta_id: string | null
          recensione_richiesta_il: string | null
          referral: string | null
          rogito_il: string | null
          rogito_previsto: string | null
          soddisfazione: number | null
          stato: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          caparra_versata?: number
          codice?: string | null
          consegna_chiavi_il?: string | null
          contatto_id: string
          created_at?: string
          created_by?: string | null
          documentazione_finale?: boolean
          id?: string
          immobile_id: string
          modulo?: string
          notaio_id?: string | null
          note?: string | null
          preliminare_il?: string | null
          prezzo: number
          proposta_id?: string | null
          recensione_richiesta_il?: string | null
          referral?: string | null
          rogito_il?: string | null
          rogito_previsto?: string | null
          soddisfazione?: number | null
          stato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          caparra_versata?: number
          codice?: string | null
          consegna_chiavi_il?: string | null
          contatto_id?: string
          created_at?: string
          created_by?: string | null
          documentazione_finale?: boolean
          id?: string
          immobile_id?: string
          modulo?: string
          notaio_id?: string | null
          note?: string | null
          preliminare_il?: string | null
          prezzo?: number
          proposta_id?: string | null
          recensione_richiesta_il?: string | null
          referral?: string | null
          rogito_il?: string | null
          rogito_previsto?: string | null
          soddisfazione?: number | null
          stato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_chiusure_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_chiusure_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "imm_chiusure_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_chiusure_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_chiusure_notaio_id_fkey"
            columns: ["notaio_id"]
            isOneToOne: false
            referencedRelation: "imm_collaboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_chiusure_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "imm_proposte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_chiusure_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_collaboratori: {
        Row: {
          attivo: boolean
          contatto_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          modulo: string
          nome: string
          note: string | null
          organizzazione_id: string | null
          provvigione_pct: number | null
          telefono: string | null
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          modulo?: string
          nome: string
          note?: string | null
          organizzazione_id?: string | null
          provvigione_pct?: number | null
          telefono?: string | null
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          modulo?: string
          nome?: string
          note?: string | null
          organizzazione_id?: string | null
          provvigione_pct?: number | null
          telefono?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_collaboratori_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_collaboratori_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "imm_collaboratori_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_collaboratori_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_collaboratori_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_contratti: {
        Row: {
          approvazione_id: string | null
          chiusura_id: string | null
          contatto_id: string | null
          created_at: string
          created_by: string | null
          firmato_il: string | null
          id: string
          immobile_id: string | null
          incarico_id: string | null
          locazione_id: string | null
          modello_id: string | null
          modulo: string
          proposta_id: string | null
          stato: string
          testo: string
          tipo: string
          titolo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approvazione_id?: string | null
          chiusura_id?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          firmato_il?: string | null
          id?: string
          immobile_id?: string | null
          incarico_id?: string | null
          locazione_id?: string | null
          modello_id?: string | null
          modulo?: string
          proposta_id?: string | null
          stato?: string
          testo: string
          tipo: string
          titolo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approvazione_id?: string | null
          chiusura_id?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          firmato_il?: string | null
          id?: string
          immobile_id?: string | null
          incarico_id?: string | null
          locazione_id?: string | null
          modello_id?: string | null
          modulo?: string
          proposta_id?: string | null
          stato?: string
          testo?: string
          tipo?: string
          titolo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_contratti_approvazione_id_fkey"
            columns: ["approvazione_id"]
            isOneToOne: false
            referencedRelation: "approvazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_contratti_chiusura_id_fkey"
            columns: ["chiusura_id"]
            isOneToOne: false
            referencedRelation: "imm_chiusure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_contratti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_contratti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "imm_contratti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_contratti_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_contratti_incarico_id_fkey"
            columns: ["incarico_id"]
            isOneToOne: false
            referencedRelation: "imm_incarichi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_contratti_locazione_id_fkey"
            columns: ["locazione_id"]
            isOneToOne: false
            referencedRelation: "imm_locazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_contratti_modello_id_fkey"
            columns: ["modello_id"]
            isOneToOne: false
            referencedRelation: "imm_modelli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_contratti_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "imm_proposte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_contratti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_documenti: {
        Row: {
          created_at: string
          created_by: string | null
          descrizione: string | null
          id: string
          immobile_id: string
          modulo: string
          note: string | null
          obbligatorio: boolean
          ricevuto_il: string | null
          scadenza: string | null
          stato: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          id?: string
          immobile_id: string
          modulo?: string
          note?: string | null
          obbligatorio?: boolean
          ricevuto_il?: string | null
          scadenza?: string | null
          stato?: string
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          id?: string
          immobile_id?: string
          modulo?: string
          note?: string | null
          obbligatorio?: boolean
          ricevuto_il?: string | null
          scadenza?: string | null
          stato?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_documenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_documenti_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_documenti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_immobili: {
        Row: {
          agente_id: string | null
          anno_costruzione: number | null
          arredato: string
          ascensore: boolean
          bagni: number | null
          balconi: number
          camere: number | null
          canone: number | null
          cantina: boolean
          cap: string | null
          classe_energetica: string | null
          codice: string | null
          comune: string
          concluso_il: string | null
          condizionamento: boolean
          contratto: string
          created_at: string
          created_by: string | null
          descrizione: string | null
          garage: boolean
          giardino: boolean
          id: string
          indirizzo: string
          ipe: number | null
          locali: number | null
          modulo: string
          note: string | null
          piano: string | null
          posto_auto: boolean
          prezzo: number | null
          prezzo_iniziale: number | null
          prezzo_mq: number | null
          prezzo_vendita: number | null
          provincia: string | null
          pubblicato_il: string | null
          ricerca: unknown
          riscaldamento: string | null
          spese_condominiali: number | null
          stato: string
          stato_conservazione: string | null
          superficie_calpestabile: number | null
          superficie_commerciale: number | null
          terrazzi: number
          tipologia: string
          titolo: string | null
          updated_at: string
          updated_by: string | null
          zona: string | null
        }
        Insert: {
          agente_id?: string | null
          anno_costruzione?: number | null
          arredato?: string
          ascensore?: boolean
          bagni?: number | null
          balconi?: number
          camere?: number | null
          canone?: number | null
          cantina?: boolean
          cap?: string | null
          classe_energetica?: string | null
          codice?: string | null
          comune: string
          concluso_il?: string | null
          condizionamento?: boolean
          contratto?: string
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          garage?: boolean
          giardino?: boolean
          id?: string
          indirizzo: string
          ipe?: number | null
          locali?: number | null
          modulo?: string
          note?: string | null
          piano?: string | null
          posto_auto?: boolean
          prezzo?: number | null
          prezzo_iniziale?: number | null
          prezzo_mq?: never
          prezzo_vendita?: number | null
          provincia?: string | null
          pubblicato_il?: string | null
          ricerca?: never
          riscaldamento?: string | null
          spese_condominiali?: number | null
          stato?: string
          stato_conservazione?: string | null
          superficie_calpestabile?: number | null
          superficie_commerciale?: number | null
          terrazzi?: number
          tipologia?: string
          titolo?: string | null
          updated_at?: string
          updated_by?: string | null
          zona?: string | null
        }
        Update: {
          agente_id?: string | null
          anno_costruzione?: number | null
          arredato?: string
          ascensore?: boolean
          bagni?: number | null
          balconi?: number
          camere?: number | null
          canone?: number | null
          cantina?: boolean
          cap?: string | null
          classe_energetica?: string | null
          codice?: string | null
          comune?: string
          concluso_il?: string | null
          condizionamento?: boolean
          contratto?: string
          created_at?: string
          created_by?: string | null
          descrizione?: string | null
          garage?: boolean
          giardino?: boolean
          id?: string
          indirizzo?: string
          ipe?: number | null
          locali?: number | null
          modulo?: string
          note?: string | null
          piano?: string | null
          posto_auto?: boolean
          prezzo?: number | null
          prezzo_iniziale?: number | null
          prezzo_mq?: never
          prezzo_vendita?: number | null
          provincia?: string | null
          pubblicato_il?: string | null
          ricerca?: never
          riscaldamento?: string | null
          spese_condominiali?: number | null
          stato?: string
          stato_conservazione?: string | null
          superficie_calpestabile?: number | null
          superficie_commerciale?: number | null
          terrazzi?: number
          tipologia?: string
          titolo?: string | null
          updated_at?: string
          updated_by?: string | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_immobili_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_immobili_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti_riepilogo"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "imm_immobili_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_immobili_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_impostazioni: {
        Row: {
          agenzia: string
          created_at: string
          created_by: string | null
          id: number
          istat_pct: number
          lead_risposta_ore: number
          locazione_mensilita: number
          modulo: string
          provvigione_acquirente_pct: number
          provvigione_minima: number
          provvigione_venditore_pct: number
          quota_agente_pct: number
          report_giorni: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agenzia: string
          created_at?: string
          created_by?: string | null
          id?: number
          istat_pct?: number
          lead_risposta_ore?: number
          locazione_mensilita?: number
          modulo?: string
          provvigione_acquirente_pct?: number
          provvigione_minima?: number
          provvigione_venditore_pct?: number
          quota_agente_pct?: number
          report_giorni?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agenzia?: string
          created_at?: string
          created_by?: string | null
          id?: number
          istat_pct?: number
          lead_risposta_ore?: number
          locazione_mensilita?: number
          modulo?: string
          provvigione_acquirente_pct?: number
          provvigione_minima?: number
          provvigione_venditore_pct?: number
          quota_agente_pct?: number
          report_giorni?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_impostazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_impostazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_incarichi: {
        Row: {
          agente_id: string | null
          codice: string | null
          condizioni: string | null
          conferito_il: string
          created_at: string
          created_by: string | null
          durata_mesi: number
          esclusiva: boolean
          firmato_il: string | null
          id: string
          immobile_id: string
          modulo: string
          note: string | null
          obiettivi: string | null
          prezzo_minimo: number | null
          prezzo_richiesto: number | null
          provvigione_fissa: number | null
          provvigione_pct: number | null
          rinnovo_tacito: boolean
          scadenza: string | null
          stato: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agente_id?: string | null
          codice?: string | null
          condizioni?: string | null
          conferito_il?: string
          created_at?: string
          created_by?: string | null
          durata_mesi?: number
          esclusiva?: boolean
          firmato_il?: string | null
          id?: string
          immobile_id: string
          modulo?: string
          note?: string | null
          obiettivi?: string | null
          prezzo_minimo?: number | null
          prezzo_richiesto?: number | null
          provvigione_fissa?: number | null
          provvigione_pct?: number | null
          rinnovo_tacito?: boolean
          scadenza?: string | null
          stato?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agente_id?: string | null
          codice?: string | null
          condizioni?: string | null
          conferito_il?: string
          created_at?: string
          created_by?: string | null
          durata_mesi?: number
          esclusiva?: boolean
          firmato_il?: string | null
          id?: string
          immobile_id?: string
          modulo?: string
          note?: string | null
          obiettivi?: string | null
          prezzo_minimo?: number | null
          prezzo_richiesto?: number | null
          provvigione_fissa?: number | null
          provvigione_pct?: number | null
          rinnovo_tacito?: boolean
          scadenza?: string | null
          stato?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_incarichi_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_incarichi_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti_riepilogo"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "imm_incarichi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_incarichi_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_incarichi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_lead: {
        Row: {
          agente_id: string | null
          codice: string | null
          collaboratore_id: string | null
          contatto_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          email: string | null
          fonte: string | null
          id: string
          immobile_id: string | null
          marketing_id: string | null
          messaggio: string | null
          modulo: string
          motivo_perdita: string | null
          nome: string
          origine: string
          priorita: string
          prossima_azione: string | null
          prossima_azione_il: string | null
          ricevuto_at: string
          richiesta_id: string | null
          sollecito_at: string | null
          stato: string
          telefono: string | null
          tipo: string
          ultima_interazione_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agente_id?: string | null
          codice?: string | null
          collaboratore_id?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          email?: string | null
          fonte?: string | null
          id?: string
          immobile_id?: string | null
          marketing_id?: string | null
          messaggio?: string | null
          modulo?: string
          motivo_perdita?: string | null
          nome: string
          origine?: string
          priorita?: string
          prossima_azione?: string | null
          prossima_azione_il?: string | null
          ricevuto_at?: string
          richiesta_id?: string | null
          sollecito_at?: string | null
          stato?: string
          telefono?: string | null
          tipo?: string
          ultima_interazione_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agente_id?: string | null
          codice?: string | null
          collaboratore_id?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          email?: string | null
          fonte?: string | null
          id?: string
          immobile_id?: string | null
          marketing_id?: string | null
          messaggio?: string | null
          modulo?: string
          motivo_perdita?: string | null
          nome?: string
          origine?: string
          priorita?: string
          prossima_azione?: string | null
          prossima_azione_il?: string | null
          ricevuto_at?: string
          richiesta_id?: string | null
          sollecito_at?: string | null
          stato?: string
          telefono?: string | null
          tipo?: string
          ultima_interazione_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_lead_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_lead_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti_riepilogo"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "imm_lead_collaboratore_id_fkey"
            columns: ["collaboratore_id"]
            isOneToOne: false
            referencedRelation: "imm_collaboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_lead_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_lead_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "imm_lead_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_lead_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_lead_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_lead_marketing_id_fkey"
            columns: ["marketing_id"]
            isOneToOne: false
            referencedRelation: "imm_marketing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_lead_richiesta_id_fkey"
            columns: ["richiesta_id"]
            isOneToOne: false
            referencedRelation: "imm_richieste"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_lead_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_locazioni: {
        Row: {
          canone: number | null
          canone_iniziale: number
          canone_richiesto: number | null
          codice: string | null
          conduttore_id: string
          created_at: string
          created_by: string | null
          deposito: number
          disdetta_il: string | null
          durata_mesi: number | null
          fine: string | null
          garanzie: string | null
          id: string
          immobile_id: string
          inizio: string
          istat: boolean
          modulo: string
          note: string | null
          proposta_id: string | null
          prossimo_adeguamento: string | null
          rinnovo_tacito: boolean
          stato: string
          tipo_contratto: string
          ultimo_adeguamento: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canone?: number | null
          canone_iniziale: number
          canone_richiesto?: number | null
          codice?: string | null
          conduttore_id: string
          created_at?: string
          created_by?: string | null
          deposito?: number
          disdetta_il?: string | null
          durata_mesi?: number | null
          fine?: string | null
          garanzie?: string | null
          id?: string
          immobile_id: string
          inizio: string
          istat?: boolean
          modulo?: string
          note?: string | null
          proposta_id?: string | null
          prossimo_adeguamento?: string | null
          rinnovo_tacito?: boolean
          stato?: string
          tipo_contratto?: string
          ultimo_adeguamento?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canone?: number | null
          canone_iniziale?: number
          canone_richiesto?: number | null
          codice?: string | null
          conduttore_id?: string
          created_at?: string
          created_by?: string | null
          deposito?: number
          disdetta_il?: string | null
          durata_mesi?: number | null
          fine?: string | null
          garanzie?: string | null
          id?: string
          immobile_id?: string
          inizio?: string
          istat?: boolean
          modulo?: string
          note?: string | null
          proposta_id?: string | null
          prossimo_adeguamento?: string | null
          rinnovo_tacito?: boolean
          stato?: string
          tipo_contratto?: string
          ultimo_adeguamento?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_locazioni_conduttore_id_fkey"
            columns: ["conduttore_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_locazioni_conduttore_id_fkey"
            columns: ["conduttore_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "imm_locazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_locazioni_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_locazioni_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "imm_proposte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_locazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_marketing: {
        Row: {
          al: string | null
          campagna_id: string | null
          canale: string
          codice: string | null
          costo: number
          created_at: string
          created_by: string | null
          dal: string
          id: string
          immobile_id: string | null
          modulo: string
          nome: string
          note: string | null
          obiettivo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          al?: string | null
          campagna_id?: string | null
          canale?: string
          codice?: string | null
          costo?: number
          created_at?: string
          created_by?: string | null
          dal?: string
          id?: string
          immobile_id?: string | null
          modulo?: string
          nome: string
          note?: string | null
          obiettivo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          al?: string | null
          campagna_id?: string | null
          canale?: string
          codice?: string | null
          costo?: number
          created_at?: string
          created_by?: string | null
          dal?: string
          id?: string
          immobile_id?: string | null
          modulo?: string
          nome?: string
          note?: string | null
          obiettivo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_marketing_campagna_id_fkey"
            columns: ["campagna_id"]
            isOneToOne: false
            referencedRelation: "campagne"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_marketing_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_marketing_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_marketing_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_modelli: {
        Row: {
          attivo: boolean
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          nome: string
          testo: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome: string
          testo: string
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome?: string
          testo?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_modelli_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_modelli_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_prezzi: {
        Row: {
          canone: number | null
          created_at: string
          created_by: string | null
          dal: string
          id: string
          immobile_id: string
          modulo: string
          prezzo: number | null
        }
        Insert: {
          canone?: number | null
          created_at?: string
          created_by?: string | null
          dal?: string
          id?: string
          immobile_id: string
          modulo?: string
          prezzo?: number | null
        }
        Update: {
          canone?: number | null
          created_at?: string
          created_by?: string | null
          dal?: string
          id?: string
          immobile_id?: string
          modulo?: string
          prezzo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_prezzi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_prezzi_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_privacy: {
        Row: {
          consenso_marketing: boolean
          consenso_terzi: boolean
          consenso_trattamento: boolean
          contatto_id: string
          created_at: string
          created_by: string | null
          id: string
          informativa_il: string
          modulo: string
          note: string | null
          revocato_il: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          consenso_marketing?: boolean
          consenso_terzi?: boolean
          consenso_trattamento?: boolean
          contatto_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          informativa_il?: string
          modulo?: string
          note?: string | null
          revocato_il?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          consenso_marketing?: boolean
          consenso_terzi?: boolean
          consenso_trattamento?: boolean
          contatto_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          informativa_il?: string
          modulo?: string
          note?: string | null
          revocato_il?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_privacy_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: true
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_privacy_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: true
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "imm_privacy_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_privacy_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_proposte: {
        Row: {
          agente_id: string | null
          caparra: number
          codice: string | null
          condizioni: string | null
          condizioni_sospensive: string | null
          contatto_id: string
          created_at: string
          created_by: string | null
          da: string
          decisa_il: string | null
          id: string
          immobile_id: string
          importo_mutuo: number | null
          modulo: string
          mutuo: boolean
          note: string | null
          padre_id: string | null
          prezzo_offerto: number
          prezzo_richiesto: number | null
          scadenza: string | null
          stato: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agente_id?: string | null
          caparra?: number
          codice?: string | null
          condizioni?: string | null
          condizioni_sospensive?: string | null
          contatto_id: string
          created_at?: string
          created_by?: string | null
          da?: string
          decisa_il?: string | null
          id?: string
          immobile_id: string
          importo_mutuo?: number | null
          modulo?: string
          mutuo?: boolean
          note?: string | null
          padre_id?: string | null
          prezzo_offerto: number
          prezzo_richiesto?: number | null
          scadenza?: string | null
          stato?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agente_id?: string | null
          caparra?: number
          codice?: string | null
          condizioni?: string | null
          condizioni_sospensive?: string | null
          contatto_id?: string
          created_at?: string
          created_by?: string | null
          da?: string
          decisa_il?: string | null
          id?: string
          immobile_id?: string
          importo_mutuo?: number | null
          modulo?: string
          mutuo?: boolean
          note?: string | null
          padre_id?: string | null
          prezzo_offerto?: number
          prezzo_richiesto?: number | null
          scadenza?: string | null
          stato?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_proposte_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_proposte_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti_riepilogo"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "imm_proposte_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_proposte_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "imm_proposte_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_proposte_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_proposte_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "imm_proposte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_proposte_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_proprietari: {
        Row: {
          contatto_id: string | null
          created_at: string
          created_by: string | null
          id: string
          immobile_id: string
          modulo: string
          note: string | null
          organizzazione_id: string | null
          quota_pct: number
          referente: boolean
          titolo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          immobile_id: string
          modulo?: string
          note?: string | null
          organizzazione_id?: string | null
          quota_pct?: number
          referente?: boolean
          titolo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          immobile_id?: string
          modulo?: string
          note?: string | null
          organizzazione_id?: string | null
          quota_pct?: number
          referente?: boolean
          titolo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_proprietari_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_proprietari_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "imm_proprietari_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_proprietari_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_proprietari_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_proprietari_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_provvigioni: {
        Row: {
          agente_id: string | null
          base: number
          chiusura_id: string | null
          codice: string | null
          contatto_id: string | null
          created_at: string
          created_by: string | null
          fattura_id: string | null
          fisso: number | null
          id: string
          immobile_id: string
          importo: number
          incassata_il: string | null
          lato: string
          locazione_id: string | null
          modulo: string
          note: string | null
          organizzazione_id: string | null
          pct: number | null
          stato: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agente_id?: string | null
          base?: number
          chiusura_id?: string | null
          codice?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          fattura_id?: string | null
          fisso?: number | null
          id?: string
          immobile_id: string
          importo: number
          incassata_il?: string | null
          lato: string
          locazione_id?: string | null
          modulo?: string
          note?: string | null
          organizzazione_id?: string | null
          pct?: number | null
          stato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agente_id?: string | null
          base?: number
          chiusura_id?: string | null
          codice?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          fattura_id?: string | null
          fisso?: number | null
          id?: string
          immobile_id?: string
          importo?: number
          incassata_il?: string | null
          lato?: string
          locazione_id?: string | null
          modulo?: string
          note?: string | null
          organizzazione_id?: string | null
          pct?: number | null
          stato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_provvigioni_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_provvigioni_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti_riepilogo"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "imm_provvigioni_chiusura_id_fkey"
            columns: ["chiusura_id"]
            isOneToOne: false
            referencedRelation: "imm_chiusure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_provvigioni_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_provvigioni_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "imm_provvigioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_provvigioni_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_provvigioni_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_provvigioni_locazione_id_fkey"
            columns: ["locazione_id"]
            isOneToOne: false
            referencedRelation: "imm_locazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_provvigioni_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_provvigioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_report_inviati: {
        Row: {
          created_at: string
          created_by: string | null
          dati: NonNullable<Json>
          destinatari: number
          id: string
          immobile_id: string
          inviato_il: string
          modulo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dati: NonNullable<Json>
          destinatari?: number
          id?: string
          immobile_id: string
          inviato_il?: string
          modulo?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dati?: NonNullable<Json>
          destinatari?: number
          id?: string
          immobile_id?: string
          inviato_il?: string
          modulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "imm_report_inviati_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_report_inviati_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_richieste: {
        Row: {
          agente_id: string | null
          bagni_min: number | null
          budget_max: number | null
          budget_min: number | null
          camere_min: number | null
          codice: string | null
          comuni: string[]
          contatto_id: string
          created_at: string
          created_by: string | null
          finanziamento: boolean
          garanzie: string | null
          id: string
          modulo: string
          note: string | null
          preferenze: string | null
          reddito_mensile: number | null
          referenze: string | null
          requisiti: string[]
          stato: string
          superficie_min: number | null
          tempistica: string | null
          tipo: string
          tipo_cliente: string
          tipologie: string[]
          updated_at: string
          updated_by: string | null
          zone: string[]
        }
        Insert: {
          agente_id?: string | null
          bagni_min?: number | null
          budget_max?: number | null
          budget_min?: number | null
          camere_min?: number | null
          codice?: string | null
          comuni?: string[]
          contatto_id: string
          created_at?: string
          created_by?: string | null
          finanziamento?: boolean
          garanzie?: string | null
          id?: string
          modulo?: string
          note?: string | null
          preferenze?: string | null
          reddito_mensile?: number | null
          referenze?: string | null
          requisiti?: string[]
          stato?: string
          superficie_min?: number | null
          tempistica?: string | null
          tipo?: string
          tipo_cliente?: string
          tipologie?: string[]
          updated_at?: string
          updated_by?: string | null
          zone?: string[]
        }
        Update: {
          agente_id?: string | null
          bagni_min?: number | null
          budget_max?: number | null
          budget_min?: number | null
          camere_min?: number | null
          codice?: string | null
          comuni?: string[]
          contatto_id?: string
          created_at?: string
          created_by?: string | null
          finanziamento?: boolean
          garanzie?: string | null
          id?: string
          modulo?: string
          note?: string | null
          preferenze?: string | null
          reddito_mensile?: number | null
          referenze?: string | null
          requisiti?: string[]
          stato?: string
          superficie_min?: number | null
          tempistica?: string | null
          tipo?: string
          tipo_cliente?: string
          tipologie?: string[]
          updated_at?: string
          updated_by?: string | null
          zone?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "imm_richieste_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_richieste_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti_riepilogo"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "imm_richieste_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_richieste_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "imm_richieste_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_richieste_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_ripartizioni: {
        Row: {
          agente_id: string | null
          beneficiario: string
          collaboratore_id: string | null
          created_at: string
          created_by: string | null
          id: string
          importo: number
          modulo: string
          pagata_il: string | null
          pct: number
          provvigione_id: string
        }
        Insert: {
          agente_id?: string | null
          beneficiario: string
          collaboratore_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          importo?: number
          modulo?: string
          pagata_il?: string | null
          pct: number
          provvigione_id: string
        }
        Update: {
          agente_id?: string | null
          beneficiario?: string
          collaboratore_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          importo?: number
          modulo?: string
          pagata_il?: string | null
          pct?: number
          provvigione_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imm_ripartizioni_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_ripartizioni_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti_riepilogo"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "imm_ripartizioni_collaboratore_id_fkey"
            columns: ["collaboratore_id"]
            isOneToOne: false
            referencedRelation: "imm_collaboratori"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_ripartizioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_ripartizioni_provvigione_id_fkey"
            columns: ["provvigione_id"]
            isOneToOne: false
            referencedRelation: "imm_provvigioni"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_selezioni: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          immobile_id: string
          inviato_il: string | null
          modulo: string
          note: string | null
          punteggio: number | null
          richiesta_id: string
          stato: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          immobile_id: string
          inviato_il?: string | null
          modulo?: string
          note?: string | null
          punteggio?: number | null
          richiesta_id: string
          stato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          immobile_id?: string
          inviato_il?: string | null
          modulo?: string
          note?: string | null
          punteggio?: number | null
          richiesta_id?: string
          stato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_selezioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_selezioni_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_selezioni_richiesta_id_fkey"
            columns: ["richiesta_id"]
            isOneToOne: false
            referencedRelation: "imm_richieste"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_selezioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_valutazioni: {
        Row: {
          agente_id: string | null
          codice: string | null
          comparabili: NonNullable<Json>
          correttivi: NonNullable<Json>
          created_at: string
          created_by: string | null
          data: string
          id: string
          immobile_id: string
          modulo: string
          note: string | null
          presentata_il: string | null
          superficie: number | null
          updated_at: string
          updated_by: string | null
          valore_agente: number | null
          valore_automatico: number | null
          valore_max: number | null
          valore_min: number | null
          valore_mq: number | null
        }
        Insert: {
          agente_id?: string | null
          codice?: string | null
          comparabili?: NonNullable<Json>
          correttivi?: NonNullable<Json>
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          immobile_id: string
          modulo?: string
          note?: string | null
          presentata_il?: string | null
          superficie?: number | null
          updated_at?: string
          updated_by?: string | null
          valore_agente?: number | null
          valore_automatico?: number | null
          valore_max?: number | null
          valore_min?: number | null
          valore_mq?: number | null
        }
        Update: {
          agente_id?: string | null
          codice?: string | null
          comparabili?: NonNullable<Json>
          correttivi?: NonNullable<Json>
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          immobile_id?: string
          modulo?: string
          note?: string | null
          presentata_il?: string | null
          superficie?: number | null
          updated_at?: string
          updated_by?: string | null
          valore_agente?: number | null
          valore_automatico?: number | null
          valore_max?: number | null
          valore_min?: number | null
          valore_mq?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_valutazioni_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_valutazioni_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti_riepilogo"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "imm_valutazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_valutazioni_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_valutazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imm_visite: {
        Row: {
          agente_id: string | null
          contatto_id: string
          created_at: string
          created_by: string | null
          durata_min: number
          esito: string | null
          feedback: string | null
          fine: string
          gradimento: number | null
          id: string
          immobile_id: string
          inizio: string
          modulo: string
          note: string | null
          numero: number
          periodo: unknown
          prossime_azioni: string | null
          richiesta_id: string | null
          stato: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agente_id?: string | null
          contatto_id: string
          created_at?: string
          created_by?: string | null
          durata_min?: number
          esito?: string | null
          feedback?: string | null
          fine: string
          gradimento?: number | null
          id?: string
          immobile_id: string
          inizio: string
          modulo?: string
          note?: string | null
          numero?: number
          periodo?: never
          prossime_azioni?: string | null
          richiesta_id?: string | null
          stato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agente_id?: string | null
          contatto_id?: string
          created_at?: string
          created_by?: string | null
          durata_min?: number
          esito?: string | null
          feedback?: string | null
          fine?: string
          gradimento?: number | null
          id?: string
          immobile_id?: string
          inizio?: string
          modulo?: string
          note?: string | null
          numero?: number
          periodo?: never
          prossime_azioni?: string | null
          richiesta_id?: string | null
          stato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_visite_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_visite_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "imm_agenti_riepilogo"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "imm_visite_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_visite_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "imm_visite_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_visite_immobile_id_fkey"
            columns: ["immobile_id"]
            isOneToOne: false
            referencedRelation: "imm_immobili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_visite_richiesta_id_fkey"
            columns: ["richiesta_id"]
            isOneToOne: false
            referencedRelation: "imm_richieste"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imm_visite_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      impostazioni_istanza: {
        Row: {
          id: boolean
          messaggio: string
          sola_lettura: boolean
          updated_at: string
        }
        Insert: {
          id?: boolean
          messaggio?: string
          sola_lettura?: boolean
          updated_at?: string
        }
        Update: {
          id?: boolean
          messaggio?: string
          sola_lettura?: boolean
          updated_at?: string
        }
        Relationships: []
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
      mag_articoli: {
        Row: {
          aliquota_iva: number
          allergeni: string[]
          attivo: boolean
          attributi: NonNullable<Json>
          categoria: string | null
          codice: string | null
          costo_unitario: number
          created_at: string
          created_by: string | null
          deperibile: boolean
          descrizione: string
          durata_giorni: number | null
          fornitore_id: string | null
          id: string
          modulo: string
          note: string | null
          prezzo_vendita: number | null
          ricerca: unknown
          scorta_minima: number
          sottocategoria: string | null
          stagionalita: string | null
          unita_misura: string
          updated_at: string
          updated_by: string | null
          vendibile: boolean
        }
        Insert: {
          aliquota_iva?: number
          allergeni?: string[]
          attivo?: boolean
          attributi?: NonNullable<Json>
          categoria?: string | null
          codice?: string | null
          costo_unitario?: number
          created_at?: string
          created_by?: string | null
          deperibile?: boolean
          descrizione: string
          durata_giorni?: number | null
          fornitore_id?: string | null
          id?: string
          modulo: string
          note?: string | null
          prezzo_vendita?: number | null
          ricerca?: never
          scorta_minima?: number
          sottocategoria?: string | null
          stagionalita?: string | null
          unita_misura?: string
          updated_at?: string
          updated_by?: string | null
          vendibile?: boolean
        }
        Update: {
          aliquota_iva?: number
          allergeni?: string[]
          attivo?: boolean
          attributi?: NonNullable<Json>
          categoria?: string | null
          codice?: string | null
          costo_unitario?: number
          created_at?: string
          created_by?: string | null
          deperibile?: boolean
          descrizione?: string
          durata_giorni?: number | null
          fornitore_id?: string | null
          id?: string
          modulo?: string
          note?: string | null
          prezzo_vendita?: number | null
          ricerca?: never
          scorta_minima?: number
          sottocategoria?: string | null
          stagionalita?: string | null
          unita_misura?: string
          updated_at?: string
          updated_by?: string | null
          vendibile?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "mag_articoli_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_articoli_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_articoli_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mag_inventari: {
        Row: {
          chiuso_at: string | null
          created_at: string
          created_by: string | null
          data: string
          descrizione: string | null
          id: string
          modulo: string
          note: string | null
          stato: Database["public"]["Enums"]["mag_inventario_stato"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          chiuso_at?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione?: string | null
          id?: string
          modulo: string
          note?: string | null
          stato?: Database["public"]["Enums"]["mag_inventario_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          chiuso_at?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descrizione?: string | null
          id?: string
          modulo?: string
          note?: string | null
          stato?: Database["public"]["Enums"]["mag_inventario_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mag_inventari_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_inventari_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mag_inventari_righe: {
        Row: {
          articolo_id: string
          created_at: string
          created_by: string | null
          differenza: number | null
          giacenza_teorica: number | null
          id: string
          inventario_id: string
          lotto_id: string | null
          modulo: string
          note: string | null
          quantita_contata: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          articolo_id: string
          created_at?: string
          created_by?: string | null
          differenza?: number | null
          giacenza_teorica?: number | null
          id?: string
          inventario_id: string
          lotto_id?: string | null
          modulo: string
          note?: string | null
          quantita_contata: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          articolo_id?: string
          created_at?: string
          created_by?: string | null
          differenza?: number | null
          giacenza_teorica?: number | null
          id?: string
          inventario_id?: string
          lotto_id?: string | null
          modulo?: string
          note?: string | null
          quantita_contata?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mag_inventari_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_inventari_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "mag_inventari_righe_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_inventari_righe_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "mag_inventari"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_inventari_righe_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "mag_lotti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_inventari_righe_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "mag_lotti_stato"
            referencedColumns: ["lotto_id"]
          },
          {
            foreignKeyName: "mag_inventari_righe_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mag_lotti: {
        Row: {
          articolo_id: string
          codice_lotto: string | null
          created_at: string
          created_by: string | null
          data_apertura: string | null
          data_inserimento: string | null
          data_ricevimento: string
          data_scadenza: string | null
          data_smaltimento: string | null
          fornitore_id: string | null
          id: string
          modulo: string
          note: string | null
          ordine_riga_id: string | null
          provenienza: string | null
          stato_conservazione: string | null
          temperatura_ricevimento: number | null
          ubicazione: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          articolo_id: string
          codice_lotto?: string | null
          created_at?: string
          created_by?: string | null
          data_apertura?: string | null
          data_inserimento?: string | null
          data_ricevimento?: string
          data_scadenza?: string | null
          data_smaltimento?: string | null
          fornitore_id?: string | null
          id?: string
          modulo: string
          note?: string | null
          ordine_riga_id?: string | null
          provenienza?: string | null
          stato_conservazione?: string | null
          temperatura_ricevimento?: number | null
          ubicazione?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          articolo_id?: string
          codice_lotto?: string | null
          created_at?: string
          created_by?: string | null
          data_apertura?: string | null
          data_inserimento?: string | null
          data_ricevimento?: string
          data_scadenza?: string | null
          data_smaltimento?: string | null
          fornitore_id?: string | null
          id?: string
          modulo?: string
          note?: string | null
          ordine_riga_id?: string | null
          provenienza?: string | null
          stato_conservazione?: string | null
          temperatura_ricevimento?: number | null
          ubicazione?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mag_lotti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_lotti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "mag_lotti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_lotti_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_lotti_ordine_riga_fk"
            columns: ["ordine_riga_id"]
            isOneToOne: false
            referencedRelation: "mag_ordini_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_lotti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mag_movimenti: {
        Row: {
          articolo_id: string
          costo_unitario: number | null
          created_at: string
          created_by: string | null
          eseguito_at: string
          id: string
          lotto_id: string | null
          modulo: string
          note: string | null
          quantita: number
          riferimento_id: string | null
          riferimento_tipo: string | null
          tipo: Database["public"]["Enums"]["mag_movimento_tipo"]
        }
        Insert: {
          articolo_id: string
          costo_unitario?: number | null
          created_at?: string
          created_by?: string | null
          eseguito_at?: string
          id?: string
          lotto_id?: string | null
          modulo: string
          note?: string | null
          quantita: number
          riferimento_id?: string | null
          riferimento_tipo?: string | null
          tipo: Database["public"]["Enums"]["mag_movimento_tipo"]
        }
        Update: {
          articolo_id?: string
          costo_unitario?: number | null
          created_at?: string
          created_by?: string | null
          eseguito_at?: string
          id?: string
          lotto_id?: string | null
          modulo?: string
          note?: string | null
          quantita?: number
          riferimento_id?: string | null
          riferimento_tipo?: string | null
          tipo?: Database["public"]["Enums"]["mag_movimento_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "mag_movimenti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_movimenti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "mag_movimenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_movimenti_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "mag_lotti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_movimenti_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "mag_lotti_stato"
            referencedColumns: ["lotto_id"]
          },
        ]
      }
      mag_ordini: {
        Row: {
          codice: string | null
          condizioni: string | null
          created_at: string
          created_by: string | null
          data_consegna_prevista: string | null
          data_ordine: string
          ddt_data: string | null
          ddt_numero: string | null
          fornitore_id: string
          id: string
          modulo: string
          note: string | null
          stato: Database["public"]["Enums"]["mag_ordine_stato"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          codice?: string | null
          condizioni?: string | null
          created_at?: string
          created_by?: string | null
          data_consegna_prevista?: string | null
          data_ordine?: string
          ddt_data?: string | null
          ddt_numero?: string | null
          fornitore_id: string
          id?: string
          modulo: string
          note?: string | null
          stato?: Database["public"]["Enums"]["mag_ordine_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          codice?: string | null
          condizioni?: string | null
          created_at?: string
          created_by?: string | null
          data_consegna_prevista?: string | null
          data_ordine?: string
          ddt_data?: string | null
          ddt_numero?: string | null
          fornitore_id?: string
          id?: string
          modulo?: string
          note?: string | null
          stato?: Database["public"]["Enums"]["mag_ordine_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mag_ordini_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_ordini_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_ordini_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mag_ordini_righe: {
        Row: {
          articolo_id: string
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          note: string | null
          ordine_id: string
          prezzo_unitario: number | null
          quantita_ordinata: number
          quantita_ricevuta: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          articolo_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          modulo: string
          note?: string | null
          ordine_id: string
          prezzo_unitario?: number | null
          quantita_ordinata: number
          quantita_ricevuta?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          articolo_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          note?: string | null
          ordine_id?: string
          prezzo_unitario?: number | null
          quantita_ordinata?: number
          quantita_ricevuta?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mag_ordini_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_ordini_righe_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "mag_ordini_righe_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_ordini_righe_ordine_id_fkey"
            columns: ["ordine_id"]
            isOneToOne: false
            referencedRelation: "mag_ordini"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_ordini_righe_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      magazzino_sanitario: {
        Row: {
          attivo: boolean
          created_at: string
          created_by: string | null
          descrizione: string
          id: string
          lotto: string | null
          note: string | null
          quantita: number
          scadenza: string | null
          soglia_riordino: number | null
          tipo: Database["public"]["Enums"]["articolo_sanitario_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          descrizione: string
          id?: string
          lotto?: string | null
          note?: string | null
          quantita?: number
          scadenza?: string | null
          soglia_riordino?: number | null
          tipo?: Database["public"]["Enums"]["articolo_sanitario_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          descrizione?: string
          id?: string
          lotto?: string | null
          note?: string | null
          quantita?: number
          scadenza?: string | null
          soglia_riordino?: number | null
          tipo?: Database["public"]["Enums"]["articolo_sanitario_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "magazzino_sanitario_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magazzino_sanitario_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_outbox: {
        Row: {
          corpo_html: string | null
          corpo_testo: string
          created_at: string
          destinatario: string
          id: string
          inviata_at: string | null
          oggetto: string
          tentativi: number
          ultimo_errore: string | null
        }
        Insert: {
          corpo_html?: string | null
          corpo_testo: string
          created_at?: string
          destinatario: string
          id?: string
          inviata_at?: string | null
          oggetto: string
          tentativi?: number
          ultimo_errore?: string | null
        }
        Update: {
          corpo_html?: string | null
          corpo_testo?: string
          created_at?: string
          destinatario?: string
          id?: string
          inviata_at?: string | null
          oggetto?: string
          tentativi?: number
          ultimo_errore?: string | null
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
          ricerca?: never
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
          ricerca?: never
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
            foreignKeyName: "fk_referente_principale"
            columns: ["referente_principale_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
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
      pal_abbonamenti: {
        Row: {
          accessi_totali: number | null
          accessi_usati: number
          codice: string | null
          created_at: string
          created_by: string | null
          disdetto_at: string | null
          fine: string | null
          formula_id: string
          id: string
          inizio: string
          metodo_pagamento: string
          modulo: string
          note: string | null
          prezzo: number | null
          quota_azienda: number
          rinnovo_automatico: boolean | null
          rinnovo_di: string | null
          socio_id: string
          stato: Database["public"]["Enums"]["pal_abbonamento_stato"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accessi_totali?: number | null
          accessi_usati?: number
          codice?: string | null
          created_at?: string
          created_by?: string | null
          disdetto_at?: string | null
          fine?: string | null
          formula_id: string
          id?: string
          inizio?: string
          metodo_pagamento?: string
          modulo?: string
          note?: string | null
          prezzo?: number | null
          quota_azienda?: number
          rinnovo_automatico?: boolean | null
          rinnovo_di?: string | null
          socio_id: string
          stato?: Database["public"]["Enums"]["pal_abbonamento_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accessi_totali?: number | null
          accessi_usati?: number
          codice?: string | null
          created_at?: string
          created_by?: string | null
          disdetto_at?: string | null
          fine?: string | null
          formula_id?: string
          id?: string
          inizio?: string
          metodo_pagamento?: string
          modulo?: string
          note?: string | null
          prezzo?: number | null
          quota_azienda?: number
          rinnovo_automatico?: boolean | null
          rinnovo_di?: string | null
          socio_id?: string
          stato?: Database["public"]["Enums"]["pal_abbonamento_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_abbonamenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_abbonamenti_formula_id_fkey"
            columns: ["formula_id"]
            isOneToOne: false
            referencedRelation: "pal_formule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_abbonamenti_rinnovo_di_fkey"
            columns: ["rinnovo_di"]
            isOneToOne: false
            referencedRelation: "pal_abbonamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_abbonamenti_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_abbonamenti_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci_stato"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "pal_abbonamenti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_accessi: {
        Row: {
          abbonamento_id: string | null
          carnet_id: string | null
          consentito: boolean
          created_at: string
          created_by: string | null
          id: string
          ingresso_at: string
          modulo: string
          motivo: string | null
          sede_id: string
          servizio: string
          socio_id: string
          tipo: string
          uscita_at: string | null
        }
        Insert: {
          abbonamento_id?: string | null
          carnet_id?: string | null
          consentito: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          ingresso_at?: string
          modulo?: string
          motivo?: string | null
          sede_id: string
          servizio?: string
          socio_id: string
          tipo?: string
          uscita_at?: string | null
        }
        Update: {
          abbonamento_id?: string | null
          carnet_id?: string | null
          consentito?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          ingresso_at?: string
          modulo?: string
          motivo?: string | null
          sede_id?: string
          servizio?: string
          socio_id?: string
          tipo?: string
          uscita_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_accessi_abbonamento_id_fkey"
            columns: ["abbonamento_id"]
            isOneToOne: false
            referencedRelation: "pal_abbonamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_accessi_carnet_id_fkey"
            columns: ["carnet_id"]
            isOneToOne: false
            referencedRelation: "pal_carnet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_accessi_carnet_id_fkey"
            columns: ["carnet_id"]
            isOneToOne: false
            referencedRelation: "pal_carnet_stato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_accessi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_accessi_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "pal_sedi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_accessi_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_accessi_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci_stato"
            referencedColumns: ["socio_id"]
          },
        ]
      }
      pal_appuntamenti: {
        Row: {
          carnet_id: string | null
          cliente_nome: string | null
          created_at: string
          created_by: string | null
          fine: string | null
          id: string
          inizio: string
          modulo: string
          note: string | null
          operatore_id: string | null
          periodo: unknown
          prezzo: number | null
          rata_id: string | null
          risorsa: string | null
          sede_id: string
          servizio_id: string
          socio_id: string | null
          stato: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          carnet_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          created_by?: string | null
          fine?: string | null
          id?: string
          inizio: string
          modulo?: string
          note?: string | null
          operatore_id?: string | null
          periodo?: unknown
          prezzo?: number | null
          rata_id?: string | null
          risorsa?: string | null
          sede_id: string
          servizio_id: string
          socio_id?: string | null
          stato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          carnet_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          created_by?: string | null
          fine?: string | null
          id?: string
          inizio?: string
          modulo?: string
          note?: string | null
          operatore_id?: string | null
          periodo?: unknown
          prezzo?: number | null
          rata_id?: string | null
          risorsa?: string | null
          sede_id?: string
          servizio_id?: string
          socio_id?: string | null
          stato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_appuntamenti_carnet_id_fkey"
            columns: ["carnet_id"]
            isOneToOne: false
            referencedRelation: "pal_carnet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_appuntamenti_carnet_id_fkey"
            columns: ["carnet_id"]
            isOneToOne: false
            referencedRelation: "pal_carnet_stato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_appuntamenti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_appuntamenti_operatore_id_fkey"
            columns: ["operatore_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_appuntamenti_rata_id_fkey"
            columns: ["rata_id"]
            isOneToOne: false
            referencedRelation: "pal_rate"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_appuntamenti_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "pal_sedi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_appuntamenti_servizio_id_fkey"
            columns: ["servizio_id"]
            isOneToOne: false
            referencedRelation: "pal_servizi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_appuntamenti_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_appuntamenti_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci_stato"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "pal_appuntamenti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_armadietti: {
        Row: {
          assegnato_dal: string | null
          assegnato_fino: string | null
          cauzione: number
          cauzione_versata: boolean
          chiave: string | null
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          note: string | null
          numero: string
          sede_id: string
          socio_id: string | null
          stato: string
          updated_at: string
          updated_by: string | null
          zona: string | null
        }
        Insert: {
          assegnato_dal?: string | null
          assegnato_fino?: string | null
          cauzione?: number
          cauzione_versata?: boolean
          chiave?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          note?: string | null
          numero: string
          sede_id: string
          socio_id?: string | null
          stato?: string
          updated_at?: string
          updated_by?: string | null
          zona?: string | null
        }
        Update: {
          assegnato_dal?: string | null
          assegnato_fino?: string | null
          cauzione?: number
          cauzione_versata?: boolean
          chiave?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          note?: string | null
          numero?: string
          sede_id?: string
          socio_id?: string | null
          stato?: string
          updated_at?: string
          updated_by?: string | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_armadietti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_armadietti_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "pal_sedi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_armadietti_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_armadietti_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci_stato"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "pal_armadietti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_carnet: {
        Row: {
          acquistato_il: string
          acquisto: string
          annullato: boolean
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          nome: string
          pacchetto_id: string | null
          prezzo: number
          scadenza: string | null
          servizio: string
          socio_id: string
          totale: number
          updated_at: string
          updated_by: string | null
          usati: number
        }
        Insert: {
          acquistato_il?: string
          acquisto?: string
          annullato?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome: string
          pacchetto_id?: string | null
          prezzo?: number
          scadenza?: string | null
          servizio: string
          socio_id: string
          totale: number
          updated_at?: string
          updated_by?: string | null
          usati?: number
        }
        Update: {
          acquistato_il?: string
          acquisto?: string
          annullato?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome?: string
          pacchetto_id?: string | null
          prezzo?: number
          scadenza?: string | null
          servizio?: string
          socio_id?: string
          totale?: number
          updated_at?: string
          updated_by?: string | null
          usati?: number
        }
        Relationships: [
          {
            foreignKeyName: "pal_carnet_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_carnet_pacchetto_id_fkey"
            columns: ["pacchetto_id"]
            isOneToOne: false
            referencedRelation: "pal_pacchetti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_carnet_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_carnet_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci_stato"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "pal_carnet_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_certificazioni: {
        Row: {
          certificazione: string
          conseguita_il: string | null
          created_at: string
          created_by: string | null
          dipendente_id: string
          ente: string | null
          id: string
          modulo: string
          note: string | null
          scadenza: string | null
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          certificazione: string
          conseguita_il?: string | null
          created_at?: string
          created_by?: string | null
          dipendente_id: string
          ente?: string | null
          id?: string
          modulo?: string
          note?: string | null
          scadenza?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          certificazione?: string
          conseguita_il?: string | null
          created_at?: string
          created_by?: string | null
          dipendente_id?: string
          ente?: string | null
          id?: string
          modulo?: string
          note?: string | null
          scadenza?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_certificazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_certificazioni_dipendente_id_fkey"
            columns: ["dipendente_id"]
            isOneToOne: false
            referencedRelation: "dipendenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_certificazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_convenzioni: {
        Row: {
          al: string | null
          attiva: boolean
          budget_annuo: number | null
          codice: string | null
          created_at: string
          created_by: string | null
          dal: string | null
          formule_ammesse: string[]
          id: string
          modulo: string
          nome: string | null
          note: string | null
          organizzazione_id: string
          quota_azienda_pct: number
          sconto_pct: number
          servizi: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          al?: string | null
          attiva?: boolean
          budget_annuo?: number | null
          codice?: string | null
          created_at?: string
          created_by?: string | null
          dal?: string | null
          formule_ammesse?: string[]
          id?: string
          modulo?: string
          nome?: string | null
          note?: string | null
          organizzazione_id: string
          quota_azienda_pct?: number
          sconto_pct?: number
          servizi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          al?: string | null
          attiva?: boolean
          budget_annuo?: number | null
          codice?: string | null
          created_at?: string
          created_by?: string | null
          dal?: string | null
          formule_ammesse?: string[]
          id?: string
          modulo?: string
          nome?: string | null
          note?: string | null
          organizzazione_id?: string
          quota_azienda_pct?: number
          sconto_pct?: number
          servizi?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_convenzioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_convenzioni_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_convenzioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_corsi: {
        Row: {
          al: string | null
          attivo: boolean
          capienza: number
          colore: string | null
          created_at: string
          created_by: string | null
          dal: string | null
          descrizione: string | null
          disciplina: string
          durata_min: number
          giorni: number[]
          id: string
          istruttore_id: string | null
          livello: string
          modulo: string
          nome: string
          ora: string | null
          sala_id: string | null
          sede_id: string
          servizio: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          al?: string | null
          attivo?: boolean
          capienza?: number
          colore?: string | null
          created_at?: string
          created_by?: string | null
          dal?: string | null
          descrizione?: string | null
          disciplina?: string
          durata_min?: number
          giorni?: number[]
          id?: string
          istruttore_id?: string | null
          livello?: string
          modulo?: string
          nome: string
          ora?: string | null
          sala_id?: string | null
          sede_id: string
          servizio?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          al?: string | null
          attivo?: boolean
          capienza?: number
          colore?: string | null
          created_at?: string
          created_by?: string | null
          dal?: string | null
          descrizione?: string | null
          disciplina?: string
          durata_min?: number
          giorni?: number[]
          id?: string
          istruttore_id?: string | null
          livello?: string
          modulo?: string
          nome?: string
          ora?: string | null
          sala_id?: string | null
          sede_id?: string
          servizio?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_corsi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_corsi_istruttore_id_fkey"
            columns: ["istruttore_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_corsi_istruttore_id_fkey"
            columns: ["istruttore_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer_riepilogo"
            referencedColumns: ["trainer_id"]
          },
          {
            foreignKeyName: "pal_corsi_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "pal_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_corsi_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "pal_sedi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_corsi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_formule: {
        Row: {
          accessi: number | null
          attiva: boolean
          created_at: string
          created_by: string | null
          durata_mesi: number
          fasce: Json | null
          id: string
          limitazioni: string | null
          modulo: string
          nome: string
          ordine: number
          prezzo: number
          quota_iscrizione: number
          rate: number
          rinnovo_automatico: boolean
          servizi: string[]
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accessi?: number | null
          attiva?: boolean
          created_at?: string
          created_by?: string | null
          durata_mesi?: number
          fasce?: Json | null
          id?: string
          limitazioni?: string | null
          modulo?: string
          nome: string
          ordine?: number
          prezzo: number
          quota_iscrizione?: number
          rate?: number
          rinnovo_automatico?: boolean
          servizi?: string[]
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accessi?: number | null
          attiva?: boolean
          created_at?: string
          created_by?: string | null
          durata_mesi?: number
          fasce?: Json | null
          id?: string
          limitazioni?: string | null
          modulo?: string
          nome?: string
          ordine?: number
          prezzo?: number
          quota_iscrizione?: number
          rate?: number
          rinnovo_automatico?: boolean
          servizi?: string[]
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_formule_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_formule_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_lezioni: {
        Row: {
          capienza: number
          corso_id: string
          created_at: string
          created_by: string | null
          fine: string
          id: string
          inizio: string
          istruttore_id: string | null
          modulo: string
          note: string | null
          periodo: unknown
          sala_id: string | null
          sede_id: string
          stato: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          capienza: number
          corso_id: string
          created_at?: string
          created_by?: string | null
          fine: string
          id?: string
          inizio: string
          istruttore_id?: string | null
          modulo?: string
          note?: string | null
          periodo?: never
          sala_id?: string | null
          sede_id: string
          stato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          capienza?: number
          corso_id?: string
          created_at?: string
          created_by?: string | null
          fine?: string
          id?: string
          inizio?: string
          istruttore_id?: string | null
          modulo?: string
          note?: string | null
          periodo?: never
          sala_id?: string | null
          sede_id?: string
          stato?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_lezioni_corso_id_fkey"
            columns: ["corso_id"]
            isOneToOne: false
            referencedRelation: "pal_corsi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_lezioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_lezioni_istruttore_id_fkey"
            columns: ["istruttore_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_lezioni_istruttore_id_fkey"
            columns: ["istruttore_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer_riepilogo"
            referencedColumns: ["trainer_id"]
          },
          {
            foreignKeyName: "pal_lezioni_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "pal_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_lezioni_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "pal_sedi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_lezioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_misurazioni: {
        Row: {
          altezza: number | null
          created_at: string
          created_by: string | null
          data: string
          id: string
          massa_grassa_pct: number | null
          misure: NonNullable<Json>
          modulo: string
          note: string | null
          performance: NonNullable<Json>
          peso: number | null
          socio_id: string
          trainer_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          altezza?: number | null
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          massa_grassa_pct?: number | null
          misure?: NonNullable<Json>
          modulo?: string
          note?: string | null
          performance?: NonNullable<Json>
          peso?: number | null
          socio_id: string
          trainer_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          altezza?: number | null
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          massa_grassa_pct?: number | null
          misure?: NonNullable<Json>
          modulo?: string
          note?: string | null
          performance?: NonNullable<Json>
          peso?: number | null
          socio_id?: string
          trainer_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_misurazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_misurazioni_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_misurazioni_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci_stato"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "pal_misurazioni_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_misurazioni_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer_riepilogo"
            referencedColumns: ["trainer_id"]
          },
          {
            foreignKeyName: "pal_misurazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_pacchetti: {
        Row: {
          attivo: boolean
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          nome: string
          prezzo: number
          updated_at: string
          updated_by: string | null
          validita_giorni: number
          voci: NonNullable<Json>
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome: string
          prezzo: number
          updated_at?: string
          updated_by?: string | null
          validita_giorni?: number
          voci: NonNullable<Json>
        }
        Update: {
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome?: string
          prezzo?: number
          updated_at?: string
          updated_by?: string | null
          validita_giorni?: number
          voci?: NonNullable<Json>
        }
        Relationships: [
          {
            foreignKeyName: "pal_pacchetti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_pacchetti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_prenotazioni: {
        Row: {
          abbonamento_id: string | null
          annullata_at: string | null
          canale: string
          carnet_id: string | null
          check_in_at: string | null
          created_at: string
          created_by: string | null
          id: string
          lezione_id: string
          modulo: string
          penale_rata_id: string | null
          posizione: number | null
          posto: string | null
          socio_id: string
          stato: string
          tardiva: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          abbonamento_id?: string | null
          annullata_at?: string | null
          canale?: string
          carnet_id?: string | null
          check_in_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lezione_id: string
          modulo?: string
          penale_rata_id?: string | null
          posizione?: number | null
          posto?: string | null
          socio_id: string
          stato?: string
          tardiva?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          abbonamento_id?: string | null
          annullata_at?: string | null
          canale?: string
          carnet_id?: string | null
          check_in_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lezione_id?: string
          modulo?: string
          penale_rata_id?: string | null
          posizione?: number | null
          posto?: string | null
          socio_id?: string
          stato?: string
          tardiva?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_prenotazioni_abbonamento_id_fkey"
            columns: ["abbonamento_id"]
            isOneToOne: false
            referencedRelation: "pal_abbonamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_prenotazioni_carnet_id_fkey"
            columns: ["carnet_id"]
            isOneToOne: false
            referencedRelation: "pal_carnet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_prenotazioni_carnet_id_fkey"
            columns: ["carnet_id"]
            isOneToOne: false
            referencedRelation: "pal_carnet_stato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_prenotazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_prenotazioni_lezione_id_fkey"
            columns: ["lezione_id"]
            isOneToOne: false
            referencedRelation: "pal_lezioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_prenotazioni_lezione_id_fkey"
            columns: ["lezione_id"]
            isOneToOne: false
            referencedRelation: "pal_lezioni_posti"
            referencedColumns: ["lezione_id"]
          },
          {
            foreignKeyName: "pal_prenotazioni_penale_rata_id_fkey"
            columns: ["penale_rata_id"]
            isOneToOne: false
            referencedRelation: "pal_rate"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_prenotazioni_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_prenotazioni_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci_stato"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "pal_prenotazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_prove: {
        Row: {
          contatto_id: string
          created_at: string
          created_by: string | null
          deal_id: string | null
          esito: string | null
          id: string
          modulo: string
          quando: string
          sede_id: string
          servizio: string | null
          stato: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contatto_id: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          esito?: string | null
          id?: string
          modulo?: string
          quando: string
          sede_id: string
          servizio?: string | null
          stato?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contatto_id?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          esito?: string | null
          id?: string
          modulo?: string
          quando?: string
          sede_id?: string
          servizio?: string | null
          stato?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_prove_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_prove_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "pal_prove_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_prove_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_prove_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "pal_sedi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_prove_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_rate: {
        Row: {
          abbonamento_id: string | null
          carnet_acquisto: string | null
          conto_id: string | null
          created_at: string
          created_by: string | null
          descrizione: string
          fattura_id: string | null
          id: string
          importo: number
          metodo: string
          modulo: string
          numero: number
          organizzazione_id: string | null
          pagata_il: string | null
          pagatore: string
          prossimo_tentativo: string | null
          scadenza: string
          socio_id: string
          stato: string
          tentativi: number
          ultimo_esito: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          abbonamento_id?: string | null
          carnet_acquisto?: string | null
          conto_id?: string | null
          created_at?: string
          created_by?: string | null
          descrizione: string
          fattura_id?: string | null
          id?: string
          importo: number
          metodo?: string
          modulo?: string
          numero?: number
          organizzazione_id?: string | null
          pagata_il?: string | null
          pagatore?: string
          prossimo_tentativo?: string | null
          scadenza: string
          socio_id: string
          stato?: string
          tentativi?: number
          ultimo_esito?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          abbonamento_id?: string | null
          carnet_acquisto?: string | null
          conto_id?: string | null
          created_at?: string
          created_by?: string | null
          descrizione?: string
          fattura_id?: string | null
          id?: string
          importo?: number
          metodo?: string
          modulo?: string
          numero?: number
          organizzazione_id?: string | null
          pagata_il?: string | null
          pagatore?: string
          prossimo_tentativo?: string | null
          scadenza?: string
          socio_id?: string
          stato?: string
          tentativi?: number
          ultimo_esito?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_rate_abbonamento_id_fkey"
            columns: ["abbonamento_id"]
            isOneToOne: false
            referencedRelation: "pal_abbonamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_rate_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_rate_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "pal_rate_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "pal_rate_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_rate_fattura_id_fkey"
            columns: ["fattura_id"]
            isOneToOne: false
            referencedRelation: "fatture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_rate_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_rate_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_rate_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci_stato"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "pal_rate_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_sale: {
        Row: {
          attiva: boolean
          attrezzature: string[]
          capienza: number | null
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          nome: string
          note: string | null
          sede_id: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attiva?: boolean
          attrezzature?: string[]
          capienza?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome: string
          note?: string | null
          sede_id: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attiva?: boolean
          attrezzature?: string[]
          capienza?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome?: string
          note?: string | null
          sede_id?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_sale_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_sale_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "pal_sedi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_sale_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_schede: {
        Row: {
          attiva: boolean
          created_at: string
          created_by: string | null
          frequenza: string | null
          id: string
          modulo: string
          note_trainer: string | null
          obiettivi: string | null
          precedente_id: string | null
          programma: string | null
          socio_id: string
          titolo: string
          trainer_id: string | null
          updated_at: string
          updated_by: string | null
          valida_dal: string
          valida_fino: string | null
          versione: number
        }
        Insert: {
          attiva?: boolean
          created_at?: string
          created_by?: string | null
          frequenza?: string | null
          id?: string
          modulo?: string
          note_trainer?: string | null
          obiettivi?: string | null
          precedente_id?: string | null
          programma?: string | null
          socio_id: string
          titolo?: string
          trainer_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valida_dal?: string
          valida_fino?: string | null
          versione?: number
        }
        Update: {
          attiva?: boolean
          created_at?: string
          created_by?: string | null
          frequenza?: string | null
          id?: string
          modulo?: string
          note_trainer?: string | null
          obiettivi?: string | null
          precedente_id?: string | null
          programma?: string | null
          socio_id?: string
          titolo?: string
          trainer_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valida_dal?: string
          valida_fino?: string | null
          versione?: number
        }
        Relationships: [
          {
            foreignKeyName: "pal_schede_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_schede_precedente_id_fkey"
            columns: ["precedente_id"]
            isOneToOne: false
            referencedRelation: "pal_schede"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_schede_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_schede_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci_stato"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "pal_schede_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_schede_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer_riepilogo"
            referencedColumns: ["trainer_id"]
          },
          {
            foreignKeyName: "pal_schede_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_schede_esercizi: {
        Row: {
          carico: string | null
          created_at: string
          created_by: string | null
          esercizio: string
          giorno: string
          id: string
          modulo: string
          note: string | null
          ordine: number
          recupero: string | null
          ripetizioni: string | null
          scheda_id: string
          serie: number | null
        }
        Insert: {
          carico?: string | null
          created_at?: string
          created_by?: string | null
          esercizio: string
          giorno?: string
          id?: string
          modulo?: string
          note?: string | null
          ordine?: number
          recupero?: string | null
          ripetizioni?: string | null
          scheda_id: string
          serie?: number | null
        }
        Update: {
          carico?: string | null
          created_at?: string
          created_by?: string | null
          esercizio?: string
          giorno?: string
          id?: string
          modulo?: string
          note?: string | null
          ordine?: number
          recupero?: string | null
          ripetizioni?: string | null
          scheda_id?: string
          serie?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_schede_esercizi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_schede_esercizi_scheda_id_fkey"
            columns: ["scheda_id"]
            isOneToOne: false
            referencedRelation: "pal_schede"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_sedi: {
        Row: {
          attiva: boolean
          avvisi_email: boolean
          cancellazione_ore: number
          comune: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          indirizzo: string | null
          modulo: string
          nome: string
          noshow_blocco_giorni: number
          noshow_consuma_credito: boolean
          noshow_finestra_giorni: number
          noshow_penale: number
          noshow_soglia: number
          note: string | null
          orari: NonNullable<Json>
          referral_giorni: number
          retry_giorni: number
          richiede_certificato: boolean
          telefono: string | null
          tentativi_max: number
          tolleranza_insoluto_giorni: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attiva?: boolean
          avvisi_email?: boolean
          cancellazione_ore?: number
          comune?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          indirizzo?: string | null
          modulo?: string
          nome: string
          noshow_blocco_giorni?: number
          noshow_consuma_credito?: boolean
          noshow_finestra_giorni?: number
          noshow_penale?: number
          noshow_soglia?: number
          note?: string | null
          orari?: NonNullable<Json>
          referral_giorni?: number
          retry_giorni?: number
          richiede_certificato?: boolean
          telefono?: string | null
          tentativi_max?: number
          tolleranza_insoluto_giorni?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attiva?: boolean
          avvisi_email?: boolean
          cancellazione_ore?: number
          comune?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          indirizzo?: string | null
          modulo?: string
          nome?: string
          noshow_blocco_giorni?: number
          noshow_consuma_credito?: boolean
          noshow_finestra_giorni?: number
          noshow_penale?: number
          noshow_soglia?: number
          note?: string | null
          orari?: NonNullable<Json>
          referral_giorni?: number
          retry_giorni?: number
          richiede_certificato?: boolean
          telefono?: string | null
          tentativi_max?: number
          tolleranza_insoluto_giorni?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_sedi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_sedi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_servizi: {
        Row: {
          attivo: boolean
          carnet: string | null
          created_at: string
          created_by: string | null
          durata_min: number
          id: string
          modulo: string
          nome: string
          prezzo: number
          richiede_operatore: boolean
          risorse: string[]
          sede_id: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          carnet?: string | null
          created_at?: string
          created_by?: string | null
          durata_min?: number
          id?: string
          modulo?: string
          nome: string
          prezzo?: number
          richiede_operatore?: boolean
          risorse?: string[]
          sede_id: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          carnet?: string | null
          created_at?: string
          created_by?: string | null
          durata_min?: number
          id?: string
          modulo?: string
          nome?: string
          prezzo?: number
          richiede_operatore?: boolean
          risorse?: string[]
          sede_id?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_servizi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_servizi_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "pal_sedi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_servizi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_sessioni_pt: {
        Row: {
          carnet_id: string | null
          compenso: number
          created_at: string
          created_by: string | null
          fine: string
          id: string
          inizio: string
          modulo: string
          note: string | null
          periodo: unknown
          prezzo: number
          rata_id: string | null
          sala_id: string | null
          sede_id: string
          socio_id: string
          stato: string
          tipo: string
          trainer_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          carnet_id?: string | null
          compenso?: number
          created_at?: string
          created_by?: string | null
          fine: string
          id?: string
          inizio: string
          modulo?: string
          note?: string | null
          periodo?: never
          prezzo?: number
          rata_id?: string | null
          sala_id?: string | null
          sede_id: string
          socio_id: string
          stato?: string
          tipo?: string
          trainer_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          carnet_id?: string | null
          compenso?: number
          created_at?: string
          created_by?: string | null
          fine?: string
          id?: string
          inizio?: string
          modulo?: string
          note?: string | null
          periodo?: never
          prezzo?: number
          rata_id?: string | null
          sala_id?: string | null
          sede_id?: string
          socio_id?: string
          stato?: string
          tipo?: string
          trainer_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_sessioni_pt_carnet_id_fkey"
            columns: ["carnet_id"]
            isOneToOne: false
            referencedRelation: "pal_carnet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_sessioni_pt_carnet_id_fkey"
            columns: ["carnet_id"]
            isOneToOne: false
            referencedRelation: "pal_carnet_stato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_sessioni_pt_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_sessioni_pt_rata_id_fkey"
            columns: ["rata_id"]
            isOneToOne: false
            referencedRelation: "pal_rate"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_sessioni_pt_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "pal_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_sessioni_pt_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "pal_sedi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_sessioni_pt_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_sessioni_pt_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci_stato"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "pal_sessioni_pt_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_sessioni_pt_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer_riepilogo"
            referencedColumns: ["trainer_id"]
          },
          {
            foreignKeyName: "pal_sessioni_pt_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_soci: {
        Row: {
          badge: string | null
          bloccato: boolean
          blocco_fino: string | null
          blocco_motivo: string | null
          certificato_scadenza: string | null
          codice: string | null
          condizioni_accettate: boolean
          condizioni_at: string | null
          consenso_salute: boolean
          consenso_salute_at: string | null
          contatto_id: string
          convenzione_id: string | null
          created_at: string
          created_by: string | null
          data_iscrizione: string
          data_nascita: string | null
          emergenza_nome: string | null
          emergenza_telefono: string | null
          ex_socio_at: string | null
          id: string
          modulo: string
          note: string | null
          preferenze: string | null
          prenotazioni_bloccate_fino: string | null
          presentato_da: string | null
          qr_token: string
          ricerca: unknown
          sede_id: string
          trainer_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          badge?: string | null
          bloccato?: boolean
          blocco_fino?: string | null
          blocco_motivo?: string | null
          certificato_scadenza?: string | null
          codice?: string | null
          condizioni_accettate?: boolean
          condizioni_at?: string | null
          consenso_salute?: boolean
          consenso_salute_at?: string | null
          contatto_id: string
          convenzione_id?: string | null
          created_at?: string
          created_by?: string | null
          data_iscrizione?: string
          data_nascita?: string | null
          emergenza_nome?: string | null
          emergenza_telefono?: string | null
          ex_socio_at?: string | null
          id?: string
          modulo?: string
          note?: string | null
          preferenze?: string | null
          prenotazioni_bloccate_fino?: string | null
          presentato_da?: string | null
          qr_token?: string
          ricerca?: unknown
          sede_id: string
          trainer_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          badge?: string | null
          bloccato?: boolean
          blocco_fino?: string | null
          blocco_motivo?: string | null
          certificato_scadenza?: string | null
          codice?: string | null
          condizioni_accettate?: boolean
          condizioni_at?: string | null
          consenso_salute?: boolean
          consenso_salute_at?: string | null
          contatto_id?: string
          convenzione_id?: string | null
          created_at?: string
          created_by?: string | null
          data_iscrizione?: string
          data_nascita?: string | null
          emergenza_nome?: string | null
          emergenza_telefono?: string | null
          ex_socio_at?: string | null
          id?: string
          modulo?: string
          note?: string | null
          preferenze?: string | null
          prenotazioni_bloccate_fino?: string | null
          presentato_da?: string | null
          qr_token?: string
          ricerca?: unknown
          sede_id?: string
          trainer_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_soci_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: true
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_soci_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: true
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "pal_soci_convenzione_id_fkey"
            columns: ["convenzione_id"]
            isOneToOne: false
            referencedRelation: "pal_convenzioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_soci_convenzione_id_fkey"
            columns: ["convenzione_id"]
            isOneToOne: false
            referencedRelation: "pal_convenzioni_utilizzo"
            referencedColumns: ["convenzione_id"]
          },
          {
            foreignKeyName: "pal_soci_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_soci_presentato_da_fkey"
            columns: ["presentato_da"]
            isOneToOne: false
            referencedRelation: "pal_soci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_soci_presentato_da_fkey"
            columns: ["presentato_da"]
            isOneToOne: false
            referencedRelation: "pal_soci_stato"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "pal_soci_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "pal_sedi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_soci_trainer_fk"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_soci_trainer_fk"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer_riepilogo"
            referencedColumns: ["trainer_id"]
          },
          {
            foreignKeyName: "pal_soci_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_sospensioni: {
        Row: {
          abbonamento_id: string
          al: string | null
          autorizzata_at: string | null
          autorizzata_da: string | null
          created_at: string
          created_by: string | null
          dal: string | null
          giorni: number | null
          id: string
          modulo: string
          motivo: string
          stato: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          abbonamento_id: string
          al?: string | null
          autorizzata_at?: string | null
          autorizzata_da?: string | null
          created_at?: string
          created_by?: string | null
          dal?: string | null
          giorni?: number | null
          id?: string
          modulo?: string
          motivo: string
          stato?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          abbonamento_id?: string
          al?: string | null
          autorizzata_at?: string | null
          autorizzata_da?: string | null
          created_at?: string
          created_by?: string | null
          dal?: string | null
          giorni?: number | null
          id?: string
          modulo?: string
          motivo?: string
          stato?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_sospensioni_abbonamento_id_fkey"
            columns: ["abbonamento_id"]
            isOneToOne: false
            referencedRelation: "pal_abbonamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_sospensioni_autorizzata_da_fkey"
            columns: ["autorizzata_da"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_sospensioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_sospensioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_trainer: {
        Row: {
          attivo: boolean
          colore: string | null
          compenso_lezione: number
          compenso_sessione: number
          competenze: string[]
          created_at: string
          created_by: string | null
          dipendente_id: string | null
          disponibilita: NonNullable<Json>
          id: string
          modulo: string
          nome: string
          note: string | null
          personal_trainer: boolean
          specializzazioni: string[]
          tariffa_sessione: number
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          attivo?: boolean
          colore?: string | null
          compenso_lezione?: number
          compenso_sessione?: number
          competenze?: string[]
          created_at?: string
          created_by?: string | null
          dipendente_id?: string | null
          disponibilita?: NonNullable<Json>
          id?: string
          modulo?: string
          nome: string
          note?: string | null
          personal_trainer?: boolean
          specializzazioni?: string[]
          tariffa_sessione?: number
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          attivo?: boolean
          colore?: string | null
          compenso_lezione?: number
          compenso_sessione?: number
          competenze?: string[]
          created_at?: string
          created_by?: string | null
          dipendente_id?: string | null
          disponibilita?: NonNullable<Json>
          id?: string
          modulo?: string
          nome?: string
          note?: string | null
          personal_trainer?: boolean
          specializzazioni?: string[]
          tariffa_sessione?: number
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_trainer_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_trainer_dipendente_id_fkey"
            columns: ["dipendente_id"]
            isOneToOne: false
            referencedRelation: "dipendenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_trainer_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_trainer_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_valutazioni: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          follow_up: string | null
          id: string
          livello: string | null
          modulo: string
          obiettivi: string | null
          parametri: NonNullable<Json>
          programma_proposto: string | null
          socio_id: string
          test: NonNullable<Json>
          tipo: string
          trainer_id: string | null
          updated_at: string
          updated_by: string | null
          valutazione: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: string
          follow_up?: string | null
          id?: string
          livello?: string | null
          modulo?: string
          obiettivi?: string | null
          parametri?: NonNullable<Json>
          programma_proposto?: string | null
          socio_id: string
          test?: NonNullable<Json>
          tipo?: string
          trainer_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valutazione?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          follow_up?: string | null
          id?: string
          livello?: string | null
          modulo?: string
          obiettivi?: string | null
          parametri?: NonNullable<Json>
          programma_proposto?: string | null
          socio_id?: string
          test?: NonNullable<Json>
          tipo?: string
          trainer_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valutazione?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_valutazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_valutazioni_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_valutazioni_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci_stato"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "pal_valutazioni_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_valutazioni_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer_riepilogo"
            referencedColumns: ["trainer_id"]
          },
          {
            foreignKeyName: "pal_valutazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pazienti: {
        Row: {
          attivo: boolean
          codice: string | null
          codice_fiscale: string | null
          cognome: string | null
          contatto_emergenza: string | null
          convenzione_id: string | null
          created_at: string
          created_by: string | null
          data_nascita: string | null
          documento: string | null
          domicilio: string | null
          email: string | null
          id: string
          luogo_nascita: string | null
          medico_curante: string | null
          nome: string
          note_amministrative: string | null
          residenza: string | null
          ricerca: unknown
          sesso: Database["public"]["Enums"]["paziente_sesso"] | null
          telefono: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          codice?: string | null
          codice_fiscale?: string | null
          cognome?: string | null
          contatto_emergenza?: string | null
          convenzione_id?: string | null
          created_at?: string
          created_by?: string | null
          data_nascita?: string | null
          documento?: string | null
          domicilio?: string | null
          email?: string | null
          id?: string
          luogo_nascita?: string | null
          medico_curante?: string | null
          nome: string
          note_amministrative?: string | null
          residenza?: string | null
          ricerca?: never
          sesso?: Database["public"]["Enums"]["paziente_sesso"] | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          codice?: string | null
          codice_fiscale?: string | null
          cognome?: string | null
          contatto_emergenza?: string | null
          convenzione_id?: string | null
          created_at?: string
          created_by?: string | null
          data_nascita?: string | null
          documento?: string | null
          domicilio?: string | null
          email?: string | null
          id?: string
          luogo_nascita?: string | null
          medico_curante?: string | null
          nome?: string
          note_amministrative?: string | null
          residenza?: string | null
          ricerca?: never
          sesso?: Database["public"]["Enums"]["paziente_sesso"] | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pazienti_convenzione_id_fkey"
            columns: ["convenzione_id"]
            isOneToOne: false
            referencedRelation: "convenzioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pazienti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pazienti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pazienti_comunicazioni: {
        Row: {
          canale: Database["public"]["Enums"]["comunicazione_canale"]
          created_at: string
          created_by: string | null
          data: string
          esito: string | null
          id: string
          oggetto: string
          paziente_id: string
          testo: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canale?: Database["public"]["Enums"]["comunicazione_canale"]
          created_at?: string
          created_by?: string | null
          data?: string
          esito?: string | null
          id?: string
          oggetto: string
          paziente_id: string
          testo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canale?: Database["public"]["Enums"]["comunicazione_canale"]
          created_at?: string
          created_by?: string | null
          data?: string
          esito?: string | null
          id?: string
          oggetto?: string
          paziente_id?: string
          testo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pazienti_comunicazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pazienti_comunicazioni_paziente_id_fkey"
            columns: ["paziente_id"]
            isOneToOne: false
            referencedRelation: "pazienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pazienti_comunicazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pazienti_condizioni: {
        Row: {
          created_at: string
          created_by: string | null
          data: string | null
          descrizione: string
          id: string
          note: string | null
          paziente_id: string
          tipo: Database["public"]["Enums"]["condizione_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: string | null
          descrizione: string
          id?: string
          note?: string | null
          paziente_id: string
          tipo: Database["public"]["Enums"]["condizione_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string | null
          descrizione?: string
          id?: string
          note?: string | null
          paziente_id?: string
          tipo?: Database["public"]["Enums"]["condizione_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pazienti_condizioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pazienti_condizioni_paziente_id_fkey"
            columns: ["paziente_id"]
            isOneToOne: false
            referencedRelation: "pazienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pazienti_condizioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pazienti_consensi: {
        Row: {
          created_at: string
          created_by: string | null
          firmato_il: string
          id: string
          note: string | null
          paziente_id: string
          revocato_il: string | null
          tipo: Database["public"]["Enums"]["consenso_tipo"]
          updated_at: string
          updated_by: string | null
          versione: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          firmato_il?: string
          id?: string
          note?: string | null
          paziente_id: string
          revocato_il?: string | null
          tipo: Database["public"]["Enums"]["consenso_tipo"]
          updated_at?: string
          updated_by?: string | null
          versione?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          firmato_il?: string
          id?: string
          note?: string | null
          paziente_id?: string
          revocato_il?: string | null
          tipo?: Database["public"]["Enums"]["consenso_tipo"]
          updated_at?: string
          updated_by?: string | null
          versione?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pazienti_consensi_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pazienti_consensi_paziente_id_fkey"
            columns: ["paziente_id"]
            isOneToOne: false
            referencedRelation: "pazienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pazienti_consensi_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
      prestazioni: {
        Row: {
          attivo: boolean
          created_at: string
          created_by: string | null
          durata_minuti: number
          id: string
          nome: string
          note: string | null
          tariffa_convenzione: number | null
          tariffa_privata: number | null
          tipo: Database["public"]["Enums"]["prestazione_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          durata_minuti?: number
          id?: string
          nome: string
          note?: string | null
          tariffa_convenzione?: number | null
          tariffa_privata?: number | null
          tipo?: Database["public"]["Enums"]["prestazione_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          created_at?: string
          created_by?: string | null
          durata_minuti?: number
          id?: string
          nome?: string
          note?: string | null
          tariffa_convenzione?: number | null
          tariffa_privata?: number | null
          tipo?: Database["public"]["Enums"]["prestazione_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prestazioni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestazioni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professionisti: {
        Row: {
          albo: string | null
          attivo: boolean
          cognome: string | null
          colore: string | null
          contratto: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          nome: string
          note: string | null
          specializzazione: string | null
          telefono: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          albo?: string | null
          attivo?: boolean
          cognome?: string | null
          colore?: string | null
          contratto?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nome: string
          note?: string | null
          specializzazione?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          albo?: string | null
          attivo?: boolean
          cognome?: string | null
          colore?: string | null
          contratto?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          nome?: string
          note?: string | null
          specializzazione?: string | null
          telefono?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionisti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionisti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionisti_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      referti: {
        Row: {
          contenuto: string
          created_at: string
          created_by: string | null
          id: string
          inviato_at: string | null
          paziente_id: string
          professionista_id: string | null
          stato: Database["public"]["Enums"]["referto_stato"]
          titolo: string
          updated_at: string
          updated_by: string | null
          validato_at: string | null
          visita_id: string | null
        }
        Insert: {
          contenuto: string
          created_at?: string
          created_by?: string | null
          id?: string
          inviato_at?: string | null
          paziente_id: string
          professionista_id?: string | null
          stato?: Database["public"]["Enums"]["referto_stato"]
          titolo: string
          updated_at?: string
          updated_by?: string | null
          validato_at?: string | null
          visita_id?: string | null
        }
        Update: {
          contenuto?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inviato_at?: string | null
          paziente_id?: string
          professionista_id?: string | null
          stato?: Database["public"]["Enums"]["referto_stato"]
          titolo?: string
          updated_at?: string
          updated_by?: string | null
          validato_at?: string | null
          visita_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referti_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referti_paziente_id_fkey"
            columns: ["paziente_id"]
            isOneToOne: false
            referencedRelation: "pazienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referti_professionista_id_fkey"
            columns: ["professionista_id"]
            isOneToOne: false
            referencedRelation: "professionisti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referti_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referti_visita_id_fkey"
            columns: ["visita_id"]
            isOneToOne: false
            referencedRelation: "visite"
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
            foreignKeyName: "riunioni_partecipanti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
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
      segnalazioni_sicurezza: {
        Row: {
          asset_id: string | null
          avvenuta_at: string
          azioni_correttive: string | null
          azioni_immediate: string | null
          chiusa_at: string | null
          codice: string | null
          contatto_id: string | null
          created_at: string
          created_by: string | null
          descrizione: string
          dipendente_id: string | null
          gravita: Database["public"]["Enums"]["segnalazione_gravita"]
          id: string
          luogo: string | null
          modulo: string
          persone_coinvolte: string | null
          primo_soccorso: boolean
          soccorso_esterno: string | null
          stato: Database["public"]["Enums"]["segnalazione_stato"]
          tipo: Database["public"]["Enums"]["segnalazione_tipo"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          asset_id?: string | null
          avvenuta_at?: string
          azioni_correttive?: string | null
          azioni_immediate?: string | null
          chiusa_at?: string | null
          codice?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          descrizione: string
          dipendente_id?: string | null
          gravita?: Database["public"]["Enums"]["segnalazione_gravita"]
          id?: string
          luogo?: string | null
          modulo: string
          persone_coinvolte?: string | null
          primo_soccorso?: boolean
          soccorso_esterno?: string | null
          stato?: Database["public"]["Enums"]["segnalazione_stato"]
          tipo: Database["public"]["Enums"]["segnalazione_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          asset_id?: string | null
          avvenuta_at?: string
          azioni_correttive?: string | null
          azioni_immediate?: string | null
          chiusa_at?: string | null
          codice?: string | null
          contatto_id?: string | null
          created_at?: string
          created_by?: string | null
          descrizione?: string
          dipendente_id?: string | null
          gravita?: Database["public"]["Enums"]["segnalazione_gravita"]
          id?: string
          luogo?: string | null
          modulo?: string
          persone_coinvolte?: string | null
          primo_soccorso?: boolean
          soccorso_esterno?: string | null
          stato?: Database["public"]["Enums"]["segnalazione_stato"]
          tipo?: Database["public"]["Enums"]["segnalazione_tipo"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "segnalazioni_sicurezza_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segnalazioni_sicurezza_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_indicatori"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "segnalazioni_sicurezza_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segnalazioni_sicurezza_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "segnalazioni_sicurezza_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segnalazioni_sicurezza_dipendente_id_fkey"
            columns: ["dipendente_id"]
            isOneToOne: false
            referencedRelation: "dipendenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segnalazioni_sicurezza_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      turni: {
        Row: {
          created_at: string
          created_by: string | null
          dipendente_id: string
          fine: string
          fine_effettivo: string | null
          id: string
          inizio: string
          inizio_effettivo: string | null
          mansione: string | null
          modello_id: string | null
          modulo: string
          note: string | null
          ore_effettive: number | null
          ore_previste: number | null
          pausa_minuti: number
          reparto: string | null
          stato: Database["public"]["Enums"]["turno_stato"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dipendente_id: string
          fine: string
          fine_effettivo?: string | null
          id?: string
          inizio: string
          inizio_effettivo?: string | null
          mansione?: string | null
          modello_id?: string | null
          modulo: string
          note?: string | null
          ore_effettive?: number | null
          ore_previste?: never
          pausa_minuti?: number
          reparto?: string | null
          stato?: Database["public"]["Enums"]["turno_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dipendente_id?: string
          fine?: string
          fine_effettivo?: string | null
          id?: string
          inizio?: string
          inizio_effettivo?: string | null
          mansione?: string | null
          modello_id?: string | null
          modulo?: string
          note?: string | null
          ore_effettive?: number | null
          ore_previste?: never
          pausa_minuti?: number
          reparto?: string | null
          stato?: Database["public"]["Enums"]["turno_stato"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turni_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turni_dipendente_id_fkey"
            columns: ["dipendente_id"]
            isOneToOne: false
            referencedRelation: "dipendenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turni_modello_id_fkey"
            columns: ["modello_id"]
            isOneToOne: false
            referencedRelation: "turni_modelli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turni_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      turni_fabbisogno: {
        Row: {
          created_at: string
          created_by: string | null
          giorno_settimana: number
          id: string
          modulo: string
          ora_fine: string
          ora_inizio: string
          persone_minime: number
          reparto: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          giorno_settimana: number
          id?: string
          modulo: string
          ora_fine: string
          ora_inizio: string
          persone_minime: number
          reparto?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          giorno_settimana?: number
          id?: string
          modulo?: string
          ora_fine?: string
          ora_inizio?: string
          persone_minime?: number
          reparto?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turni_fabbisogno_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turni_fabbisogno_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      turni_modelli: {
        Row: {
          attivo: boolean
          colore: string | null
          created_at: string
          created_by: string | null
          id: string
          modulo: string
          nome: string
          ora_fine: string
          ora_inizio: string
          pausa_minuti: number
          reparto: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attivo?: boolean
          colore?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          modulo: string
          nome: string
          ora_fine: string
          ora_inizio: string
          pausa_minuti?: number
          reparto?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attivo?: boolean
          colore?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          modulo?: string
          nome?: string
          ora_fine?: string
          ora_inizio?: string
          pausa_minuti?: number
          reparto?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turni_modelli_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turni_modelli_updated_by_fkey"
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
          manutentore: boolean
          nome: string
          ospite_demo: boolean
          ruolo: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          attivo?: boolean
          avatar_url?: string | null
          cognome?: string | null
          created_at?: string
          id: string
          manutentore?: boolean
          nome: string
          ospite_demo?: boolean
          ruolo?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          attivo?: boolean
          avatar_url?: string | null
          cognome?: string | null
          created_at?: string
          id?: string
          manutentore?: boolean
          nome?: string
          ospite_demo?: boolean
          ruolo?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      visite: {
        Row: {
          anamnesi: string | null
          appuntamento_id: string | null
          created_at: string
          created_by: string | null
          data: string
          diagnosi: string | null
          esame_obiettivo: string | null
          id: string
          motivo: string | null
          note: string | null
          paziente_id: string
          prescrizioni: string | null
          professionista_id: string | null
          terapia: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          anamnesi?: string | null
          appuntamento_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          diagnosi?: string | null
          esame_obiettivo?: string | null
          id?: string
          motivo?: string | null
          note?: string | null
          paziente_id: string
          prescrizioni?: string | null
          professionista_id?: string | null
          terapia?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          anamnesi?: string | null
          appuntamento_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          diagnosi?: string | null
          esame_obiettivo?: string | null
          id?: string
          motivo?: string | null
          note?: string | null
          paziente_id?: string
          prescrizioni?: string | null
          professionista_id?: string | null
          terapia?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visite_appuntamento_id_fkey"
            columns: ["appuntamento_id"]
            isOneToOne: false
            referencedRelation: "appuntamenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visite_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visite_paziente_id_fkey"
            columns: ["paziente_id"]
            isOneToOne: false
            referencedRelation: "pazienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visite_professionista_id_fkey"
            columns: ["professionista_id"]
            isOneToOne: false
            referencedRelation: "professionisti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visite_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      asset_indicatori: {
        Row: {
          asset_id: string | null
          costo_interventi: number | null
          guasti: number | null
          interventi_aperti: number | null
          modulo: string | null
          mtbf_giorni: number | null
          ore_fermo: number | null
        }
        Relationships: []
      }
      bar_convenzioni_dipendenti_saldi: {
        Row: {
          attivo: boolean | null
          codice_tessera: string | null
          convenzione_id: string | null
          dipendente_id: string | null
          limite_giornaliero: number | null
          limite_mensile: number | null
          modulo: string | null
          nome: string | null
          speso_mese: number | null
          speso_oggi: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bar_convenzioni_dipendenti_convenzione_id_fkey"
            columns: ["convenzione_id"]
            isOneToOne: false
            referencedRelation: "bar_convenzioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_convenzioni_dipendenti_convenzione_id_fkey"
            columns: ["convenzione_id"]
            isOneToOne: false
            referencedRelation: "bar_convenzioni_riepilogo"
            referencedColumns: ["convenzione_id"]
          },
        ]
      }
      bar_convenzioni_riepilogo: {
        Row: {
          attiva: boolean | null
          azienda: string | null
          codice: string | null
          consumazioni_da_fatturare: number | null
          convenzione_id: string | null
          da_fatturare: number | null
          dipendenti_attivi: number | null
          limite_mensile_azienda: number | null
          locale_id: string | null
          modulo: string | null
          organizzazione_id: string | null
          residuo_mese: number | null
          speso_mese: number | null
          ultima_consumazione: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bar_convenzioni_locale_id_fkey"
            columns: ["locale_id"]
            isOneToOne: false
            referencedRelation: "fb_locali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_convenzioni_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_mescite_stato: {
        Row: {
          anomalia: boolean | null
          aperta: boolean | null
          aperta_at: string | null
          articolo: string | null
          articolo_id: string | null
          chiusa_at: string | null
          codice_lotto: string | null
          contenitore: string | null
          costo_sfrido: number | null
          costo_unitario: number | null
          erogato: number | null
          id: string | null
          locale_id: string | null
          lotto_id: string | null
          modulo: string | null
          note: string | null
          quantita_iniziale: number | null
          quantita_residua: number | null
          residuo_teorico: number | null
          sfrido: number | null
          sfrido_pct: number | null
          sfrido_registrato: boolean | null
          unita_misura: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bar_mescite_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_mescite_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "bar_mescite_locale_id_fkey"
            columns: ["locale_id"]
            isOneToOne: false
            referencedRelation: "fb_locali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_mescite_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "mag_lotti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_mescite_lotto_id_fkey"
            columns: ["lotto_id"]
            isOneToOne: false
            referencedRelation: "mag_lotti_stato"
            referencedColumns: ["lotto_id"]
          },
        ]
      }
      conti_saldi: {
        Row: {
          codice: string | null
          conto_id: string | null
          descrizione: string | null
          modulo: string | null
          pagato: number | null
          residuo: number | null
          stato: Database["public"]["Enums"]["conto_stato"] | null
          totale: number | null
        }
        Relationships: []
      }
      controlli_stato: {
        Row: {
          in_ritardo: boolean | null
          modulo: string | null
          nome: string | null
          non_conformita_aperte: number | null
          ogni_ore: number | null
          prossimo_atteso: string | null
          punto_id: string | null
          responsabile_id: string | null
          tipo: Database["public"]["Enums"]["controllo_tipo"] | null
          ubicazione: string | null
          ultimo_controllo: string | null
          ultimo_esito: Database["public"]["Enums"]["controllo_esito"] | null
        }
        Relationships: [
          {
            foreignKeyName: "controlli_punti_responsabile_id_fkey"
            columns: ["responsabile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      distinte_base_riepilogo: {
        Row: {
          allergeni: string[] | null
          codice: string | null
          componenti: number | null
          costo_totale: number | null
          costo_unitario: number | null
          distinta_id: string | null
          modulo: string | null
          nome: string | null
          resa: number | null
          tipo: string | null
          unita_resa: string | null
          usata_in: number | null
        }
        Insert: {
          allergeni?: never
          codice?: string | null
          componenti?: never
          costo_totale?: never
          costo_unitario?: never
          distinta_id?: string | null
          modulo?: string | null
          nome?: string | null
          resa?: number | null
          tipo?: string | null
          unita_resa?: string | null
          usata_in?: never
        }
        Update: {
          allergeni?: never
          codice?: string | null
          componenti?: never
          costo_totale?: never
          costo_unitario?: never
          distinta_id?: string | null
          modulo?: string | null
          nome?: string | null
          resa?: number | null
          tipo?: string | null
          unita_resa?: string | null
          usata_in?: never
        }
        Relationships: []
      }
      eventi_allergeni: {
        Row: {
          allergene: string | null
          evento_id: string | null
          modulo: string | null
          persone: number | null
        }
        Relationships: [
          {
            foreignKeyName: "eventi_partecipanti_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
        ]
      }
      eventi_margini: {
        Row: {
          costi: number | null
          evento_id: string | null
          margine: number | null
          modulo: string | null
          ricavi: number | null
        }
        Relationships: [
          {
            foreignKeyName: "eventi_preventivi_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: true
            referencedRelation: "eventi"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_clienti_riepilogo: {
        Row: {
          contatto_id: string | null
          modulo: string | null
          spesa_totale: number | null
          ticket_medio: number | null
          ultima_visita: string | null
          visite: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_comande_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
        ]
      }
      fb_kds: {
        Row: {
          allergie: string[] | null
          canale: string | null
          comanda_id: string | null
          comanda_numero: number | null
          coperti: number | null
          descrizione: string | null
          in_ritardo: boolean | null
          inviata_at: string | null
          locale_id: string | null
          minuti: number | null
          modulo: string | null
          note: string | null
          padre_id: string | null
          personalizzazioni: string | null
          piatti_uscita: number | null
          preparazione_at: string | null
          presa_at: string | null
          priorita: string | null
          pronta_at: string | null
          pronti_uscita: number | null
          quantita: number | null
          rifacimento_di: string | null
          riga_id: string | null
          ritiro_at: string | null
          stato: Database["public"]["Enums"]["fb_riga_stato"] | null
          stazione_id: string | null
          tavolo: string | null
          tempo_preparazione_min: number | null
          uscita: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_comande_righe_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "fb_comande"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "fb_tavoli_stato"
            referencedColumns: ["comanda_id"]
          },
          {
            foreignKeyName: "fb_comande_righe_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "fb_comande_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "fb_kds"
            referencedColumns: ["riga_id"]
          },
          {
            foreignKeyName: "fb_comande_righe_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "fb_vendite"
            referencedColumns: ["riga_id"]
          },
          {
            foreignKeyName: "fb_comande_righe_rifacimento_di_fkey"
            columns: ["rifacimento_di"]
            isOneToOne: false
            referencedRelation: "fb_comande_righe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_rifacimento_di_fkey"
            columns: ["rifacimento_di"]
            isOneToOne: false
            referencedRelation: "fb_kds"
            referencedColumns: ["riga_id"]
          },
          {
            foreignKeyName: "fb_comande_righe_rifacimento_di_fkey"
            columns: ["rifacimento_di"]
            isOneToOne: false
            referencedRelation: "fb_vendite"
            referencedColumns: ["riga_id"]
          },
          {
            foreignKeyName: "fb_comande_righe_stazione_id_fkey"
            columns: ["stazione_id"]
            isOneToOne: false
            referencedRelation: "fb_stazioni"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_prodotti_economia: {
        Row: {
          allergeni: string[] | null
          costo: number | null
          food_cost_pct: number | null
          margine: number | null
          modulo: string | null
          prezzo_netto: number | null
          prodotto_id: string | null
        }
        Relationships: []
      }
      fb_tavoli_stato: {
        Row: {
          altezza: number | null
          aperta_at: string | null
          cameriere_id: string | null
          comanda_id: string | null
          conto_id: string | null
          conto_richiesto_at: string | null
          coperti: number | null
          forma: string | null
          larghezza: number | null
          locale_id: string | null
          modulo: string | null
          numero: string | null
          posti: number | null
          posti_max: number | null
          prenotazione_id: string | null
          prenotazione_inizio: string | null
          prenotazione_nome: string | null
          prenotazione_persone: number | null
          rotazione: number | null
          sala_id: string | null
          stato: string | null
          tavolo_id: string | null
          x: number | null
          y: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_comande_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "fb_comande_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "fb_tavoli_cameriere_id_fkey"
            columns: ["cameriere_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_tavoli_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "fb_sale"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_vendite: {
        Row: {
          area: string | null
          beverage_tipo: string | null
          cameriere_id: string | null
          canale: string | null
          categoria: string | null
          categoria_id: string | null
          chef_id: string | null
          comanda_id: string | null
          costo: number | null
          giorno: string | null
          locale_id: string | null
          menu: string | null
          modulo: string | null
          omaggio: boolean | null
          ora: number | null
          ordinata_at: string | null
          prodotto: string | null
          prodotto_id: string | null
          promozione_id: string | null
          quantita: number | null
          ricavo: number | null
          ricavo_lordo: number | null
          riga_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_comande_righe_cameriere_id_fkey"
            columns: ["cameriere_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "fb_comande"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_comanda_id_fkey"
            columns: ["comanda_id"]
            isOneToOne: false
            referencedRelation: "fb_tavoli_stato"
            referencedColumns: ["comanda_id"]
          },
          {
            foreignKeyName: "fb_comande_righe_preparata_da_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_prodotto_id_fkey"
            columns: ["prodotto_id"]
            isOneToOne: false
            referencedRelation: "fb_prodotti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_comande_righe_prodotto_id_fkey"
            columns: ["prodotto_id"]
            isOneToOne: false
            referencedRelation: "fb_prodotti_economia"
            referencedColumns: ["prodotto_id"]
          },
          {
            foreignKeyName: "fb_comande_righe_promozione_id_fkey"
            columns: ["promozione_id"]
            isOneToOne: false
            referencedRelation: "fb_promozioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fb_prodotti_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "fb_categorie"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_nps: {
        Row: {
          detrattori: number | null
          mese: string | null
          modulo: string | null
          nps: number | null
          passivi: number | null
          promotori: number | null
          risposte: number | null
          valutazione_media: number | null
        }
        Relationships: []
      }
      fid_saldi: {
        Row: {
          attiva: boolean | null
          codice: string | null
          contatto_id: string | null
          livello: string | null
          modulo: string | null
          premi_disponibili: number | null
          programma_id: string | null
          punti: number | null
          punti_accumulati: number | null
          tessera_id: string | null
          timbri: number | null
          ultimo_movimento: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fid_tessere_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fid_tessere_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "fid_tessere_programma_id_fkey"
            columns: ["programma_id"]
            isOneToOne: false
            referencedRelation: "fid_programmi"
            referencedColumns: ["id"]
          },
        ]
      }
      fior_clienti_riepilogo: {
        Row: {
          consenso_marketing: boolean | null
          contatto_id: string | null
          email: string | null
          giorni_tra_ordini: number | null
          nome: string | null
          ordini: number | null
          organizzazione_id: string | null
          primo_ordine: string | null
          ricorrenze: number | null
          spesa: number | null
          telefono: string | null
          ultimo_ordine: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatti_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
        ]
      }
      fornitori_miglior_prezzo: {
        Row: {
          articolo_id: string | null
          fornitore_id: string | null
          giorni_consegna: number | null
          minimo_ordine: number | null
          modulo: string | null
          prezzo: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fornitori_listini_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornitori_listini_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
          {
            foreignKeyName: "fornitori_listini_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
        ]
      }
      fornitori_rating: {
        Row: {
          completezza: number | null
          continuita: number | null
          fornitore_id: string | null
          modulo: string | null
          non_conformita: number | null
          prezzo: number | null
          punteggio: number | null
          puntualita: number | null
          qualita: number | null
          valutazioni: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fornitori_valutazioni_fornitore_id_fkey"
            columns: ["fornitore_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_clienti_riepilogo: {
        Row: {
          attivo: boolean | null
          cliente_id: string | null
          codice: string | null
          contatto_id: string | null
          contratti_attivi: number | null
          da_pagare: number | null
          dentro: number | null
          email: string | null
          insoluto: number | null
          modulo: string | null
          nome: string | null
          organizzazione_id: string | null
          posti: string | null
          prossima_scadenza: string | null
          targhe: string | null
          telefono: string | null
          tipo: string | null
          ultimo_accesso: string | null
          veicoli: number | null
        }
        Insert: {
          attivo?: boolean | null
          cliente_id?: string | null
          codice?: string | null
          contatto_id?: string | null
          contratti_attivi?: never
          da_pagare?: never
          dentro?: never
          email?: string | null
          insoluto?: never
          modulo?: string | null
          nome?: string | null
          organizzazione_id?: string | null
          posti?: never
          prossima_scadenza?: never
          targhe?: never
          telefono?: string | null
          tipo?: string | null
          ultimo_accesso?: never
          veicoli?: never
        }
        Update: {
          attivo?: boolean | null
          cliente_id?: string | null
          codice?: string | null
          contatto_id?: string | null
          contratti_attivi?: never
          da_pagare?: never
          dentro?: never
          email?: string | null
          insoluto?: never
          modulo?: string | null
          nome?: string | null
          organizzazione_id?: string | null
          posti?: never
          prossima_scadenza?: never
          targhe?: never
          telefono?: string | null
          tipo?: string | null
          ultimo_accesso?: never
          veicoli?: never
        }
        Relationships: [
          {
            foreignKeyName: "gar_clienti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: true
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_clienti_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: true
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "gar_clienti_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
        ]
      }
      gar_colonnine_stato: {
        Row: {
          asset_id: string | null
          codice: string | null
          colonnina_id: string | null
          connettore: string | null
          fermo: string | null
          modulo: string | null
          note: string | null
          posto: string | null
          posto_id: string | null
          potenza_kw: number | null
          prese: number | null
          prese_in_uso: number | null
          prese_libere: number | null
          stato: string | null
          struttura_id: string | null
          tariffa_kwh: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_colonnine_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_colonnine_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_indicatori"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "gar_colonnine_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_colonnine_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti_assegnabili"
            referencedColumns: ["posto_id"]
          },
          {
            foreignKeyName: "gar_colonnine_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "gar_posti_stato"
            referencedColumns: ["posto_id"]
          },
          {
            foreignKeyName: "gar_colonnine_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_colonnine_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture_riepilogo"
            referencedColumns: ["struttura_id"]
          },
        ]
      }
      gar_posti_assegnabili: {
        Row: {
          canone: number | null
          codice: string | null
          coperto: boolean | null
          modulo: string | null
          numero: number | null
          piano: number | null
          posto_id: string | null
          struttura_id: string | null
          tipo: string | null
          zona: string | null
        }
        Insert: {
          canone?: number | null
          codice?: string | null
          coperto?: boolean | null
          modulo?: string | null
          numero?: number | null
          piano?: number | null
          posto_id?: string | null
          struttura_id?: string | null
          tipo?: string | null
          zona?: string | null
        }
        Update: {
          canone?: number | null
          codice?: string | null
          coperto?: boolean | null
          modulo?: string | null
          numero?: number | null
          piano?: number | null
          posto_id?: string | null
          struttura_id?: string | null
          tipo?: string | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_posti_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_posti_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture_riepilogo"
            referencedColumns: ["struttura_id"]
          },
        ]
      }
      gar_posti_stato: {
        Row: {
          assegnato_dal: string | null
          canone: number | null
          cliente: string | null
          cliente_id: string | null
          codice: string | null
          contratto_id: string | null
          coperto: boolean | null
          fermo: string | null
          ingresso_at: string | null
          modulo: string | null
          note: string | null
          numero: number | null
          piano: number | null
          posto_id: string | null
          prenotato_da: string | null
          prenotato_dalle: string | null
          prenotazione_id: string | null
          riservato: boolean | null
          sosta_id: string | null
          stato: string | null
          struttura_id: string | null
          targa: string | null
          targa_assegnata: string | null
          ticket: string | null
          tipo: string | null
          veicolo_id: string | null
          zona: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gar_contratti_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_contratti_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "gar_clienti_riepilogo"
            referencedColumns: ["cliente_id"]
          },
          {
            foreignKeyName: "gar_contratti_veicolo_id_fkey"
            columns: ["veicolo_id"]
            isOneToOne: false
            referencedRelation: "gar_veicoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_posti_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gar_posti_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "gar_strutture_riepilogo"
            referencedColumns: ["struttura_id"]
          },
        ]
      }
      gar_strutture_riepilogo: {
        Row: {
          auto: number | null
          commerciali: number | null
          coperti: number | null
          disabili: number | null
          elettrici: number | null
          fermi: number | null
          modulo: string | null
          moto: number | null
          nome: string | null
          posti: number | null
          scoperti: number | null
          struttura_id: string | null
        }
        Relationships: []
      }
      gift_card_saldi: {
        Row: {
          codice: string | null
          gift_card_id: string | null
          importo_iniziale: number | null
          modulo: string | null
          residuo: number | null
          scadenza: string | null
          stato: string | null
        }
        Relationships: []
      }
      hotel_biancheria_stato: {
        Row: {
          biancheria_id: string | null
          cicli_vita: number | null
          da_sostituire: boolean | null
          descrizione: string | null
          disponibili: number | null
          dotazione: number | null
          in_lavanderia: number | null
          lavaggi_medi: number | null
          lavanderia_30_giorni: number | null
          modulo: string | null
          persi_90_giorni: number | null
          scorta_minima: number | null
          sotto_scorta: boolean | null
          struttura_id: string | null
          tipo: string | null
        }
        Insert: {
          biancheria_id?: string | null
          cicli_vita?: number | null
          da_sostituire?: never
          descrizione?: string | null
          disponibili?: never
          dotazione?: number | null
          in_lavanderia?: number | null
          lavaggi_medi?: never
          lavanderia_30_giorni?: never
          modulo?: string | null
          persi_90_giorni?: never
          scorta_minima?: number | null
          sotto_scorta?: never
          struttura_id?: string | null
          tipo?: string | null
        }
        Update: {
          biancheria_id?: string | null
          cicli_vita?: number | null
          da_sostituire?: never
          descrizione?: string | null
          disponibili?: never
          dotazione?: number | null
          in_lavanderia?: number | null
          lavaggi_medi?: never
          lavanderia_30_giorni?: never
          modulo?: string | null
          persi_90_giorni?: never
          scorta_minima?: number | null
          sotto_scorta?: never
          struttura_id?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_biancheria_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_camere_stato: {
        Row: {
          arrivo_id: string | null
          arrivo_oggi: boolean | null
          arrivo_ora: string | null
          arrivo_ospite: string | null
          camera_id: string | null
          edificio: string | null
          fuori_servizio: boolean | null
          fuori_servizio_motivo: string | null
          modulo: string | null
          numero: string | null
          ordine: number | null
          ospite_nome: string | null
          ospiti: number | null
          partenza_oggi: boolean | null
          partenza_prevista: string | null
          piano: number | null
          posti_letto: number | null
          prenotazione_id: string | null
          stato: string | null
          stato_pulizia:
            Database["public"]["Enums"]["hotel_pulizia_stato"] | null
          struttura_id: string | null
          tipologia: string | null
          tipologia_codice: string | null
          tipologia_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_camere_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_camere_tipologia_id_fkey"
            columns: ["tipologia_id"]
            isOneToOne: false
            referencedRelation: "hotel_tipologie"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_conti_in_casa: {
        Row: {
          arrivo: string | null
          camera: string | null
          cena: boolean | null
          colazione: boolean | null
          conto_id: string | null
          modulo: string | null
          ospite_nome: string | null
          partenza: string | null
          pranzo: boolean | null
          prenotazione_id: string | null
          residuo: number | null
          struttura_id: string | null
          trattamento: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_prenotazioni_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "conti_saldi"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_conto_id_fkey"
            columns: ["conto_id"]
            isOneToOne: false
            referencedRelation: "hotel_insoluti"
            referencedColumns: ["conto_id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_insoluti: {
        Row: {
          aperto_at: string | null
          codice: string | null
          conto_id: string | null
          descrizione: string | null
          giorni: number | null
          modulo: string | null
          pagato: number | null
          partenza: string | null
          prenotazione_id: string | null
          residuo: number | null
          stato_prenotazione:
            Database["public"]["Enums"]["hotel_prenotazione_stato"] | null
          struttura_id: string | null
          totale: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_prenotazioni_struttura_id_fkey"
            columns: ["struttura_id"]
            isOneToOne: false
            referencedRelation: "hotel_strutture"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_ospiti_riepilogo: {
        Row: {
          contatto_id: string | null
          email: string | null
          modulo: string | null
          nome: string | null
          notti: number | null
          prossimo_arrivo: string | null
          soggiorni: number | null
          spesa: number | null
          telefono: string | null
          ultimo_soggiorno: string | null
          vip: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_prenotazioni_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_prenotazioni_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: false
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
        ]
      }
      imm_agenti_riepilogo: {
        Row: {
          acquisizioni_mese: number | null
          agente_id: string | null
          attivo: boolean | null
          clienti: number | null
          lead_aperti: number | null
          locazioni_mese: number | null
          modulo: string | null
          nome: string | null
          obiettivo_acquisizioni: number | null
          obiettivo_chiusure: number | null
          obiettivo_provvigioni: number | null
          portafoglio: number | null
          provvigioni_mese: number | null
          trattative: number | null
          user_id: string | null
          valore_portafoglio: number | null
          vendite_mese: number | null
          visite_mese: number | null
          zone: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "imm_agenti_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mag_giacenze: {
        Row: {
          anomalia_negativa: boolean | null
          articolo_id: string | null
          categoria: string | null
          codice: string | null
          costo_unitario: number | null
          descrizione: string | null
          giacenza: number | null
          modulo: string | null
          scorta_minima: number | null
          sotto_scorta: boolean | null
          unita_misura: string | null
          valore: number | null
        }
        Relationships: []
      }
      mag_lotti_stato: {
        Row: {
          articolo_id: string | null
          codice_lotto: string | null
          data_ricevimento: string | null
          data_scadenza: string | null
          descrizione: string | null
          fine_vita: string | null
          giorni_residui: number | null
          lotto_id: string | null
          modulo: string | null
          residuo: number | null
          ubicazione: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mag_lotti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_articoli"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mag_lotti_articolo_id_fkey"
            columns: ["articolo_id"]
            isOneToOne: false
            referencedRelation: "mag_giacenze"
            referencedColumns: ["articolo_id"]
          },
        ]
      }
      pal_carnet_stato: {
        Row: {
          acquistato_il: string | null
          acquisto: string | null
          annullato: boolean | null
          created_at: string | null
          created_by: string | null
          id: string | null
          modulo: string | null
          nome: string | null
          pacchetto_id: string | null
          prezzo: number | null
          residui: number | null
          scadenza: string | null
          servizio: string | null
          socio_id: string | null
          stato: string | null
          totale: number | null
          updated_at: string | null
          updated_by: string | null
          usati: number | null
        }
        Insert: {
          acquistato_il?: string | null
          acquisto?: string | null
          annullato?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          modulo?: string | null
          nome?: string | null
          pacchetto_id?: string | null
          prezzo?: number | null
          residui?: never
          scadenza?: string | null
          servizio?: string | null
          socio_id?: string | null
          stato?: never
          totale?: number | null
          updated_at?: string | null
          updated_by?: string | null
          usati?: number | null
        }
        Update: {
          acquistato_il?: string | null
          acquisto?: string | null
          annullato?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          modulo?: string | null
          nome?: string | null
          pacchetto_id?: string | null
          prezzo?: number | null
          residui?: never
          scadenza?: string | null
          servizio?: string | null
          socio_id?: string | null
          stato?: never
          totale?: number | null
          updated_at?: string | null
          updated_by?: string | null
          usati?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_carnet_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_carnet_pacchetto_id_fkey"
            columns: ["pacchetto_id"]
            isOneToOne: false
            referencedRelation: "pal_pacchetti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_carnet_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_carnet_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci_stato"
            referencedColumns: ["socio_id"]
          },
          {
            foreignKeyName: "pal_carnet_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_convenzioni_utilizzo: {
        Row: {
          accessi_mese: number | null
          attiva: boolean | null
          attivi: number | null
          azienda: string | null
          budget_annuo: number | null
          codice: string | null
          convenzione_id: string | null
          da_fatturare: number | null
          iscritti: number | null
          organizzazione_id: string | null
          quota_anno: number | null
          quota_azienda_pct: number | null
          sconto_pct: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_convenzioni_organizzazione_id_fkey"
            columns: ["organizzazione_id"]
            isOneToOne: false
            referencedRelation: "organizzazioni"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_lezioni_posti: {
        Row: {
          cancellazioni: number | null
          capienza: number | null
          colore: string | null
          corso: string | null
          corso_id: string | null
          disciplina: string | null
          fine: string | null
          in_attesa: number | null
          inizio: string | null
          iscritti: number | null
          istruttore_id: string | null
          lezione_id: string | null
          livello: string | null
          posti_liberi: number | null
          presenti: number | null
          sala_id: string | null
          sede_id: string | null
          stato: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_lezioni_corso_id_fkey"
            columns: ["corso_id"]
            isOneToOne: false
            referencedRelation: "pal_corsi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_lezioni_istruttore_id_fkey"
            columns: ["istruttore_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_lezioni_istruttore_id_fkey"
            columns: ["istruttore_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer_riepilogo"
            referencedColumns: ["trainer_id"]
          },
          {
            foreignKeyName: "pal_lezioni_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "pal_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_lezioni_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "pal_sedi"
            referencedColumns: ["id"]
          },
        ]
      }
      pal_presenti: {
        Row: {
          ingresso_at: string | null
          nome: string | null
          sede_id: string | null
          servizio: string | null
          socio_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_accessi_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "pal_sedi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_accessi_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_accessi_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "pal_soci_stato"
            referencedColumns: ["socio_id"]
          },
        ]
      }
      pal_soci_stato: {
        Row: {
          badge: string | null
          bloccato: boolean | null
          certificato_scadenza: string | null
          codice: string | null
          condizioni_accettate: boolean | null
          consenso_salute: boolean | null
          contatto_id: string | null
          convenzione_id: string | null
          da_pagare: number | null
          data_iscrizione: string | null
          email: string | null
          nome: string | null
          scadenza: string | null
          sede_id: string | null
          socio_id: string | null
          stato: string | null
          telefono: string | null
          trainer_id: string | null
          ultimo_accesso: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pal_soci_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: true
            referencedRelation: "contatti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_soci_contatto_id_fkey"
            columns: ["contatto_id"]
            isOneToOne: true
            referencedRelation: "fior_clienti_riepilogo"
            referencedColumns: ["contatto_id"]
          },
          {
            foreignKeyName: "pal_soci_convenzione_id_fkey"
            columns: ["convenzione_id"]
            isOneToOne: false
            referencedRelation: "pal_convenzioni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_soci_convenzione_id_fkey"
            columns: ["convenzione_id"]
            isOneToOne: false
            referencedRelation: "pal_convenzioni_utilizzo"
            referencedColumns: ["convenzione_id"]
          },
          {
            foreignKeyName: "pal_soci_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "pal_sedi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_soci_trainer_fk"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pal_soci_trainer_fk"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "pal_trainer_riepilogo"
            referencedColumns: ["trainer_id"]
          },
        ]
      }
      pal_trainer_riepilogo: {
        Row: {
          clienti: number | null
          compensi_mese: number | null
          nome: string | null
          personal_trainer: boolean | null
          sessioni_prenotate: number | null
          sessioni_residue_clienti: number | null
          sessioni_svolte: number | null
          trainer_id: string | null
        }
        Insert: {
          clienti?: never
          compensi_mese?: never
          nome?: string | null
          personal_trainer?: boolean | null
          sessioni_prenotate?: never
          sessioni_residue_clienti?: never
          sessioni_svolte?: never
          trainer_id?: string | null
        }
        Update: {
          clienti?: never
          compensi_mese?: never
          nome?: string | null
          personal_trainer?: boolean | null
          sessioni_prenotate?: never
          sessioni_residue_clienti?: never
          sessioni_svolte?: never
          trainer_id?: string | null
        }
        Relationships: []
      }
      turni_ore_settimana: {
        Row: {
          assenze: number | null
          dipendente_id: string | null
          modulo: string | null
          ore_effettive: number | null
          ore_previste: number | null
          settimana: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turni_dipendente_id_fkey"
            columns: ["dipendente_id"]
            isOneToOne: false
            referencedRelation: "dipendenti"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_agenti_kpi: {
        Row: {
          agente: string | null
          agente_id: string | null
          clienti: number | null
          fatturato_per_visita: number | null
          offerte_accettate: number | null
          offerte_inviate: number | null
          ordini: number | null
          provvigioni_anno: number | null
          tasso_conversione: number | null
          valore_ordini: number | null
          visite: number | null
        }
        Relationships: []
      }
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
      vw_poliambulatorio_kpi: {
        Row: {
          appuntamenti_7gg: number | null
          appuntamenti_oggi: number | null
          eventi_qualita_aperti: number | null
          lista_attesa: number | null
          nuovi_pazienti_mese: number | null
          pazienti_totali: number | null
          referti_da_validare: number | null
          tasso_no_show_30gg: number | null
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
      agente_corrente: { Args: Record<PropertyKey, never>; Returns: string }
      allegato_riservato: { Args: { p_path: string }; Returns: boolean }
      allergeni_distinta: { Args: { p_distinta: string }; Returns: string[] }
      allergeni_ue: { Args: Record<PropertyKey, never>; Returns: string[] }
      applica_coupon: {
        Args: { p_codice: string; p_conto: string }
        Returns: number
      }
      applica_protezioni_tabelle: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      bar_addebita_convenzione: {
        Args: { p_conto: string; p_dipendente: string; p_importo: number }
        Returns: string
      }
      bar_chiudi_mescita: {
        Args: { p_mescita: string; p_note?: string; p_residuo: number }
        Returns: Json
      }
      bar_erogato: { Args: { p_mescita: string }; Returns: number }
      bar_euro: { Args: { p: number }; Returns: string }
      bar_fattura_convenzione: {
        Args: { p_al: string; p_convenzione: string; p_numero: string }
        Returns: string
      }
      bar_mescita_analisi: {
        Args: { p_al: string; p_dal: string; p_locale: string }
        Returns: {
          anomalie: number
          articolo: string
          articolo_id: string
          consumo_reale: number
          contenitori: number
          costo_sfrido: number
          erogato_teorico: number
          quantita_iniziale: number
          sfrido: number
          sfrido_pct: number
          unita_misura: string
        }[]
      }
      bar_numero: { Args: { p: number }; Returns: string }
      calcola_provvigioni: {
        Args: { p_agente: string; p_periodo: string }
        Returns: number
      }
      campagna_invia_interna: { Args: { p_campagna: string }; Returns: number }
      campagna_prepara_interna: {
        Args: { p_campagna: string }
        Returns: number
      }
      campagna_riepilogo: {
        Args: { p_campagna: string }
        Returns: {
          consegnati_al_relay: number
          esclusi: number
          falliti: number
          in_coda: number
          inviati: number
        }[]
      }
      chiudi_conto: { Args: { p_conto: string }; Returns: undefined }
      chiudi_inventario: { Args: { p_inventario: string }; Returns: number }
      chiudi_sessione_cassa: {
        Args: { p_contanti_contati: number; p_sessione: string }
        Returns: number
      }
      conto_per_aliquota: {
        Args: { p_conto: string }
        Returns: {
          aliquota_iva: number
          importo: number
        }[]
      }
      copilot_rate_check: { Args: Record<PropertyKey, never>; Returns: Json }
      costo_distinta: {
        Args: { p_distinta: string; p_profondita?: number }
        Returns: number
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
      credenziali_modificabili: {
        Args: { p_sessione: string; p_utente: string }
        Returns: boolean
      }
      dividi_conto_in_parti: {
        Args: { p_conto: string; p_parti: number }
        Returns: number[]
      }
      esplodi_distinta: {
        Args: { p_distinta: string; p_unita?: number }
        Returns: {
          articolo_id: string
          quantita: number
        }[]
      }
      fb_allergeni_prodotto: { Args: { p_prodotto: string }; Returns: string[] }
      fb_attesa_candidati: {
        Args: { p_locale: string }
        Returns: {
          attesa_id: string
          minuti_attesa: number
          nome: string
          persone: number
          tavolo: string
          tavolo_id: string
        }[]
      }
      fb_beverage_controllo: {
        Args: {
          p_al: string
          p_dal: string
          p_modulo: string
          p_soglia_pct?: number
        }
        Returns: {
          ammanchi: number
          anomalia: boolean
          articolo: string
          articolo_id: string
          effettivo: number
          scostamento_pct: number
          sprechi: number
          teorico: number
          unita: string
          valore_scostamento: number
        }[]
      }
      fb_carta_vini: {
        Args: Record<PropertyKey, never>
        Returns: {
          abbinamenti: string
          annata: number
          denominazione: string
          descrizione: string
          formato: string
          nome: string
          prezzo_bottiglia: number
          prezzo_calice: number
          produttore: string
          regione: string
          tipologia: string
          vitigno: string
        }[]
      }
      fb_cliente_profilo: { Args: { p_contatto: string }; Returns: Json }
      fb_conto_comanda: { Args: { p_comanda: string }; Returns: string }
      fb_costo_prodotto: { Args: { p_prodotto: string }; Returns: number }
      fb_cruscotto: {
        Args: { p_giorno?: string; p_locale: string }
        Returns: Json
      }
      fb_cruscotto_base: {
        Args: { p_giorno?: string; p_locale: string }
        Returns: Json
      }
      fb_fabbisogno_personale: {
        Args: { p_giorno: string; p_locale: string }
        Returns: {
          coperti_previsti: number
          differenza: number
          persone_pianificate: number
          persone_suggerite: number
          reparto: string
        }[]
      }
      fb_food_cost: {
        Args: {
          p_al: string
          p_dal: string
          p_dimensione?: string
          p_locale: string
        }
        Returns: {
          chiave: string
          costo: number
          food_cost_pct: number
          margine: number
          quantita: number
          ricavo: number
        }[]
      }
      fb_imposta_disponibilita: {
        Args: { p_prodotto: string; p_stato: string }
        Returns: undefined
      }
      fb_in_fascia: {
        Args: {
          p_al: string
          p_alle: string
          p_dal: string
          p_dalle: string
          p_giorni: number[]
          p_istante: string
        }
        Returns: boolean
      }
      fb_kpi: {
        Args: { p_al: string; p_dal: string; p_locale: string }
        Returns: Json
      }
      fb_kpi_base: {
        Args: { p_al: string; p_dal: string; p_locale: string }
        Returns: Json
      }
      fb_listino_attuale: {
        Args: { p_canale?: string; p_locale: string; p_tipologia?: string }
        Returns: {
          origine: string
          prezzo: number
          prodotto_id: string
          promozione_id: string
        }[]
      }
      fb_marcia_automatica: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      fb_marcia_uscita: {
        Args: { p_comanda: string; p_uscita: number }
        Returns: number
      }
      fb_menu_engineering: {
        Args: {
          p_al: string
          p_categoria?: string
          p_dal: string
          p_locale: string
        }
        Returns: {
          categoria: string
          classe: string
          costo_unitario: number
          food_cost_pct: number
          margine_totale: number
          margine_unitario: number
          popolare: boolean
          prezzo_medio: number
          prodotto: string
          prodotto_id: string
          quota_pct: number
          redditizio: boolean
          venduti: number
        }[]
      }
      fb_prezzo: {
        Args: {
          p_canale?: string
          p_istante?: string
          p_locale: string
          p_prodotto: string
          p_tipologia?: string
        }
        Returns: {
          origine: string
          prezzo: number
          promozione_id: string
        }[]
      }
      fb_proposta_riordino: {
        Args: { p_giorni?: number; p_locale: string }
        Returns: {
          articolo_id: string
          consumo_medio_giorno: number
          descrizione: string
          fabbisogno_eventi: number
          fabbisogno_ordini: number
          fabbisogno_periodo: number
          fattore_stagionale: number
          fornitore_id: string
          giacenza: number
          in_arrivo: number
          quantita_proposta: number
          scorta_minima: number
          unita_misura: string
        }[]
      }
      fb_registro_allergeni: {
        Args: { p_locale: string }
        Returns: {
          allergeni: string[]
          categoria: string
          contaminazioni: string
          ingredienti_sostituibili: string
          note_operative: string
          possibili_tracce: string[]
          prodotto: string
        }[]
      }
      fb_richiamo_lotto: {
        Args: { p_lotto: string }
        Returns: {
          canale: string
          cliente: string
          comanda_id: string
          comanda_numero: number
          locale: string
          prodotto: string
          quantita_lotto: number
          recapito: string
          riga_id: string
          servito_at: string
          tavolo: string
        }[]
      }
      fb_richiede_direzione: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fb_rifai_riga: {
        Args: { p_motivo: string; p_riga: string }
        Returns: string
      }
      fb_riga_rango: {
        Args: { s: Database["public"]["Enums"]["fb_riga_stato"] }
        Returns: number
      }
      fb_riga_scarica: {
        Args: { r: Database["public"]["Tables"]["fb_comande_righe"]["Row"] }
        Returns: undefined
      }
      fb_sprechi_analisi: {
        Args: { p_al: string; p_dal: string; p_locale: string }
        Returns: {
          causale: string
          costo: number
          eventi: number
        }[]
      }
      fb_stazione_per: {
        Args: { p_locale: string; p_prodotto: string }
        Returns: string
      }
      fb_tempi_cucina: {
        Args: { p_al: string; p_dal: string; p_locale: string }
        Returns: {
          attesa_servizio_min: number
          in_ritardo: number
          piatti: number
          prodotto: string
          stazione: string
          tempo_massimo_min: number
          tempo_medio_min: number
          tempo_previsto_min: number
        }[]
      }
      fid_omaggio_su_conto: {
        Args: { p_conto: string; p_tessera: string }
        Returns: string
      }
      fid_registra_acquisto: {
        Args: {
          p_importo: number
          p_rif_id?: string
          p_rif_tipo?: string
          p_tessera: string
        }
        Returns: Json
      }
      fid_riscatta_premio: {
        Args: { p_rif_id?: string; p_rif_tipo?: string; p_tessera: string }
        Returns: string
      }
      fid_timbri_conto: {
        Args: { p_conto: string; p_riferimenti: string[] }
        Returns: number
      }
      fid_usa_punti_su_conto: {
        Args: { p_conto: string; p_punti: number; p_tessera: string }
        Returns: number
      }
      fior_agenda: {
        Args: { p_al: string; p_dal: string }
        Returns: {
          dettaglio: string
          percorso: string
          quando: string
          riferimento: string
          tipo: string
          titolo: string
        }[]
      }
      fior_cliente_profilo: { Args: { p_contatto: string }; Returns: Json }
      fior_composizioni_disponibili: {
        Args: Record<PropertyKey, never>
        Returns: {
          attributi: Json
          categoria: string
          codice: string
          costo: number
          distinta_id: string
          minuti: number
          nome: string
          prezzo: number
          realizzabili: number
        }[]
      }
      fior_conto_ordine: { Args: { p_ordine: string }; Returns: string }
      fior_cruscotto: { Args: Record<PropertyKey, never>; Returns: Json }
      fior_fabbisogno: {
        Args: { p_giorni?: number }
        Returns: {
          articolo_id: string
          categoria: string
          consumo_medio_giorno: number
          descrizione: string
          fornitore_id: string
          giacenza: number
          per_eventi: number
          per_ordini: number
          quantita_proposta: number
          scorta_minima: number
          stagionalita: string
          unita_misura: string
        }[]
      }
      fior_genera_ordini_abbonamenti: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      fior_kpi: { Args: { p_al: string; p_dal: string }; Returns: Json }
      fior_oggi: { Args: Record<PropertyKey, never>; Returns: string }
      fior_ordine_ricalcola: { Args: { p_ordine: string }; Returns: undefined }
      fior_promemoria_ricorrenze: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      fior_prossima: {
        Args: { p_giorno: number; p_mese: number }
        Returns: string
      }
      fior_regole: {
        Args: Record<PropertyKey, never>
        Returns: {
          abbonamenti_anticipo_giorni: number
          costo_orario: number
          created_at: string
          created_by: string | null
          fasce: string[]
          id: number
          indirizzo: string | null
          modulo: string
          negozio: string | null
          promemoria_ricorrenze_giorni: number
          ricarico_pct: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "fior_impostazioni"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fior_scarica_articoli: { Args: { p_ordine: string }; Returns: undefined }
      fior_sprechi: { Args: { p_al: string; p_dal: string }; Returns: Json }
      fior_stima: {
        Args: { p_materiali: Json; p_minuti?: number }
        Returns: Json
      }
      fior_vendi_banco: {
        Args: { p_contatto?: string; p_righe: Json }
        Returns: string
      }
      gar_apri_conto: {
        Args: {
          p_cliente: string
          p_descrizione: string
          p_id: string
          p_importo: number
          p_iva?: number
          p_riga: string
          p_tipo: string
        }
        Returns: string
      }
      gar_attese_avvisa: { Args: Record<PropertyKey, never>; Returns: number }
      gar_avvisa: {
        Args: { p_cliente: string; p_oggetto: string; p_testo: string }
        Returns: boolean
      }
      gar_calcola_tariffa: {
        Args: { p_ingresso: string; p_tariffario: string; p_uscita: string }
        Returns: Json
      }
      gar_convenzione_consuntivo: {
        Args: { p_al: string; p_convenzione: string; p_dal: string }
        Returns: Json
      }
      gar_cruscotto: { Args: { p_struttura: string }; Returns: Json }
      gar_emetti_rate: {
        Args: { p_contratto: string; p_fino?: string }
        Returns: number
      }
      gar_euro: { Args: { p: number }; Returns: string }
      gar_fattura_convenzione: {
        Args: { p_al: string; p_convenzione: string; p_numero: string }
        Returns: string
      }
      gar_festivo: { Args: { p_data: string }; Returns: boolean }
      gar_giro_notturno: { Args: Record<PropertyKey, never>; Returns: Json }
      gar_incassa_rata: {
        Args: {
          p_metodo?: Database["public"]["Enums"]["pagamento_metodo"]
          p_rata: string
        }
        Returns: string
      }
      gar_ingresso: {
        Args: {
          p_modalita?: string
          p_posto?: string
          p_struttura: string
          p_targa: string
          p_tipo_veicolo?: string
        }
        Returns: Json
      }
      gar_kpi: {
        Args: { p_al: string; p_dal: string; p_struttura: string }
        Returns: Json
      }
      gar_notifica_direzione: {
        Args: {
          p_messaggio: string
          p_tipo?: Database["public"]["Enums"]["notifica_tipo"]
          p_titolo: string
          p_url: string
        }
        Returns: undefined
      }
      gar_oggi: { Args: Record<PropertyKey, never>; Returns: string }
      gar_ricarica_avvia: {
        Args: { p_colonnina: string; p_presa?: number; p_targa: string }
        Returns: string
      }
      gar_ricarica_chiudi: {
        Args: { p_kwh: number; p_ricarica: string }
        Returns: Json
      }
      gar_targa: { Args: { p: string }; Returns: string }
      gar_tariffario_per: {
        Args: {
          p_convenzionato?: boolean
          p_struttura: string
          p_tipo_veicolo: string
        }
        Returns: string
      }
      gar_uscita: {
        Args: { p_modalita?: string; p_sosta: string }
        Returns: Json
      }
      gar_verifica_accesso: {
        Args: { p_istante?: string; p_struttura: string; p_targa: string }
        Returns: Json
      }
      genera_codice: { Args: { p_prefisso: string }; Returns: string }
      genera_codice_gift_card: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      genera_fattura_da_conto: {
        Args: { p_conto: string; p_numero: string; p_scadenza?: string }
        Returns: string
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      hotel_addebita_notti: {
        Args: { p_fino: string; p_prenotazione: string }
        Returns: number
      }
      hotel_addebito: {
        Args: {
          p_aliquota: number
          p_descrizione: string
          p_prenotazione: string
          p_prezzo: number
          p_quantita: number
          p_rif_id: string
          p_rif_tipo: string
        }
        Returns: string
      }
      hotel_alloggiati_controllo: {
        Args: { p_giorno: string; p_struttura: string }
        Returns: {
          mancanti: string[]
          ospite: string
          prenotazione: string
          soggiorno_ospite_id: string
          tipo_alloggiato: string
        }[]
      }
      hotel_alloggiati_file: {
        Args: { p_giorno: string; p_struttura: string }
        Returns: string
      }
      hotel_alloggiati_segna_inviati: {
        Args: { p_giorno: string; p_struttura: string }
        Returns: number
      }
      hotel_annulla_prenotazione: {
        Args: {
          p_motivo: string
          p_prenotazione: string
          p_rimborso_metodo?: Database["public"]["Enums"]["pagamento_metodo"]
        }
        Returns: Json
      }
      hotel_applica_prezzo: {
        Args: {
          p_data: string
          p_prezzo: number
          p_struttura: string
          p_tipologia: string
        }
        Returns: string
      }
      hotel_ari: {
        Args: {
          p_al: string
          p_canale?: string
          p_dal: string
          p_struttura: string
        }
        Returns: {
          chiuso_arrivo: boolean
          chiuso_partenza: boolean
          data: string
          disponibili: number
          piano: string
          piano_codice: string
          prezzo: number
          soggiorno_min: number
          stop_vendita: boolean
          tipologia: string
          tipologia_codice: string
        }[]
      }
      hotel_assegna_pulizie: {
        Args: { p_giorno: string; p_persone: string[]; p_struttura: string }
        Returns: number
      }
      hotel_audit_notturno: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      hotel_check_in: {
        Args: { p_camera?: string; p_prenotazione: string }
        Returns: string
      }
      hotel_check_out: { Args: { p_prenotazione: string }; Returns: Json }
      hotel_confronto_strutture: {
        Args: { p_al: string; p_dal: string }
        Returns: {
          adr: number
          camere_disponibili: number
          camere_vendute: number
          occupazione_pct: number
          revpar: number
          ricavi_totali: number
          struttura: string
          struttura_id: string
          trevpar: number
        }[]
      }
      hotel_conto_prenotazione: {
        Args: { p_prenotazione: string }
        Returns: string
      }
      hotel_disponibilita: {
        Args: { p_al: string; p_dal: string; p_struttura: string }
        Returns: {
          bloccate: number
          camere: number
          data: string
          disponibili: number
          fuori_servizio: number
          overbooking: boolean
          tipologia: string
          tipologia_id: string
          vendute: number
        }[]
      }
      hotel_fattura_conti: {
        Args: {
          p_conti: string[]
          p_numero: string
          p_organizzazione: string
          p_scadenza?: string
        }
        Returns: string
      }
      hotel_forecast: {
        Args: { p_al: string; p_dal: string; p_struttura: string }
        Returns: {
          camere: number
          data: string
          occupazione_pct: number
          prevista_pct: number
          previste: number
          vendute: number
        }[]
      }
      hotel_front_office: {
        Args: { p_giorno?: string; p_struttura: string }
        Returns: Json
      }
      hotel_genera_pulizie: {
        Args: { p_giorno?: string; p_struttura: string }
        Returns: number
      }
      hotel_genera_pulizie_tutte: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      hotel_in_casa: { Args: { p_camera: string }; Returns: string }
      hotel_istat_movimento: {
        Args: { p_giorno: string; p_struttura: string }
        Returns: {
          arrivi: number
          italiano: boolean
          partenze: number
          presenze: number
          provenienza: string
        }[]
      }
      hotel_kpi: {
        Args: { p_al: string; p_dal: string; p_struttura: string }
        Returns: Json
      }
      hotel_no_show: { Args: { p_prenotazione: string }; Returns: number }
      hotel_opzioni_scadute: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      hotel_ospite_profilo: { Args: { p_contatto: string }; Returns: Json }
      hotel_pasti_previsti: {
        Args: { p_giorno?: string; p_struttura: string }
        Returns: {
          camera: string
          ospite: string
          pasto: string
          persone: number
          trattamento: string
        }[]
      }
      hotel_prezzo_notte: {
        Args: {
          p_data: string
          p_persone: number
          p_piano: string
          p_tipologia: string
        }
        Returns: {
          chiuso_arrivo: boolean
          chiuso_partenza: boolean
          prezzo: number
          soggiorno_min: number
          stop_vendita: boolean
        }[]
      }
      hotel_produzione_intermediari: {
        Args: { p_al: string; p_dal: string; p_struttura: string }
        Returns: {
          annullate: number
          commissione: number
          commissione_pct: number
          intermediario_id: string
          nome: string
          notti: number
          prenotazioni: number
          ricavo: number
          tipo: string
        }[]
      }
      hotel_quota: {
        Args: {
          p_adulti?: number
          p_arrivo: string
          p_bambini?: number
          p_canale?: string
          p_partenza: string
          p_piano?: string
          p_prenotata_il?: string
          p_struttura: string
          p_tipologia: string
          p_trattamento?: string
        }
        Returns: Json
      }
      hotel_reparto_riga: {
        Args: { p_rif: string; p_rif_id: string }
        Returns: string
      }
      hotel_rileva_pickup: { Args: { p_giorno?: string }; Returns: number }
      hotel_suggerimenti_tariffe: {
        Args: { p_al: string; p_dal: string; p_struttura: string }
        Returns: {
          data: string
          occupazione_pct: number
          prevista_pct: number
          prezzo_attuale: number
          prezzo_concorrenti: number
          prezzo_suggerito: number
          regola: string
          tipologia: string
          tipologia_id: string
          variazione_pct: number
        }[]
      }
      hotel_tassa_calcola: {
        Args: { p_prenotazione: string }
        Returns: {
          esenzione: string
          eta: number
          importo: number
          nome: string
          notti: number
          notti_tassabili: number
          ospite_id: string
        }[]
      }
      hotel_tassa_rendiconto: {
        Args: { p_al: string; p_dal: string; p_struttura: string }
        Returns: {
          arrivo: string
          codice: string
          dovuto: number
          esenzioni: string
          notti: number
          notti_tassabili: number
          ospite: string
          ospiti: number
          partenza: string
          prenotazione_id: string
          riscosso: number
        }[]
      }
      html_escape: { Args: { p: string }; Returns: string }
      imm_adegua_istat: {
        Args: { p_locazione: string; p_variazione: number }
        Returns: number
      }
      imm_agenda: {
        Args: { p_agente?: string; p_al: string; p_dal: string }
        Returns: {
          dettaglio: string
          percorso: string
          quando: string
          riferimento: string
          tipo: string
          titolo: string
        }[]
      }
      imm_agente_corrente: { Args: Record<PropertyKey, never>; Returns: string }
      imm_avanza: {
        Args: {
          p_contatto: string
          p_fase: string
          p_immobile: string
          p_organizzazione?: string
          p_pipeline: string
          p_valore?: number
        }
        Returns: string
      }
      imm_compila: {
        Args: {
          p_chiusura?: string
          p_contatto?: string
          p_immobile: string
          p_incarico?: string
          p_locazione?: string
          p_modello: string
          p_proposta?: string
        }
        Returns: string
      }
      imm_converti_lead: { Args: { p_lead: string }; Returns: Json }
      imm_crea_provvigione: {
        Args: {
          p_agente: string
          p_base: number
          p_chiusura: string
          p_contatto: string
          p_fisso: number
          p_immobile: string
          p_lato: string
          p_locazione: string
          p_organizzazione: string
          p_pct: number
        }
        Returns: string
      }
      imm_cruscotto: { Args: Record<PropertyKey, never>; Returns: Json }
      imm_euro: { Args: { p: number }; Returns: string }
      imm_fattura_provvigione: {
        Args: { p_numero: string; p_provvigione: string }
        Returns: string
      }
      imm_feed_annunci: { Args: Record<PropertyKey, never>; Returns: string }
      imm_giro_notturno: { Args: Record<PropertyKey, never>; Returns: Json }
      imm_invia_report: { Args: { p_immobile: string }; Returns: number }
      imm_invia_selezione: { Args: { p_richiesta: string }; Returns: number }
      imm_kpi: { Args: { p_al: string; p_dal: string }; Returns: Json }
      imm_match: {
        Args: { p_richiesta: string }
        Returns: {
          immobile_id: string
          motivi: string[]
          punteggio: number
        }[]
      }
      imm_match_immobile: {
        Args: { p_immobile: string }
        Returns: {
          contatto_id: string
          motivi: string[]
          punteggio: number
          richiesta_id: string
        }[]
      }
      imm_notifica_agente: {
        Args: {
          p_agente: string
          p_messaggio: string
          p_tipo?: Database["public"]["Enums"]["notifica_tipo"]
          p_titolo: string
          p_url: string
        }
        Returns: undefined
      }
      imm_notifica_direzione: {
        Args: {
          p_messaggio: string
          p_tipo?: Database["public"]["Enums"]["notifica_tipo"]
          p_titolo: string
          p_url: string
        }
        Returns: undefined
      }
      imm_oggi: { Args: Record<PropertyKey, never>; Returns: string }
      imm_pipeline: { Args: { p_nome: string }; Returns: string }
      imm_proponi: {
        Args: { p_richiesta: string; p_soglia?: number }
        Returns: number
      }
      imm_punteggio: {
        Args: {
          i: Database["public"]["Tables"]["imm_immobili"]["Row"]
          r: Database["public"]["Tables"]["imm_richieste"]["Row"]
        }
        Returns: {
          motivi: string[]
          punteggio: number
        }[]
      }
      imm_report: { Args: { p_immobile: string }; Returns: Json }
      imm_ripartisci: {
        Args: { p_provvigione: string; p_righe: Json }
        Returns: number
      }
      imm_scrivi: {
        Args: { p_contatto: string; p_oggetto: string; p_testo: string }
        Returns: boolean
      }
      imm_stima: {
        Args: { p_correttivi?: Json; p_immobile: string }
        Returns: Json
      }
      invia_campagna: { Args: { p_campagna: string }; Returns: number }
      invia_campagne_programmate: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      mag_produci_distinta: {
        Args: {
          p_codice_lotto?: string
          p_distinta: string
          p_quantita: number
          p_scadenza?: string
        }
        Returns: string
      }
      mag_proposta_riordino: {
        Args: { p_modulo: string }
        Returns: {
          articolo_id: string
          consumo_medio_giorno: number
          descrizione: string
          fornitore_id: string
          giacenza: number
          quantita_proposta: number
          scorta_minima: number
          unita_misura: string
        }[]
      }
      mag_scarica: {
        Args: {
          p_articolo: string
          p_note?: string
          p_quantita: number
          p_riferimento_id?: string
          p_riferimento_tipo?: string
          p_tipo: Database["public"]["Enums"]["mag_movimento_tipo"]
        }
        Returns: number
      }
      match_kb_guida: {
        Args: { match_count?: number; query_embedding: string; soglia?: number }
        Returns: {
          contenuto: string
          similarita: number
          titolo: string
        }[]
      }
      moduli_fb: { Args: Record<PropertyKey, never>; Returns: string[] }
      moduli_fondamenta: { Args: Record<PropertyKey, never>; Returns: string[] }
      modulo_attivo: { Args: { p_slug: string }; Returns: boolean }
      modulo_licenziato: { Args: { p_slug: string }; Returns: boolean }
      notifica_deal_a_rischio: { Args: { giorni?: number }; Returns: number }
      pal_avvisa: {
        Args: { p_oggetto: string; p_socio: string; p_testo: string }
        Returns: boolean
      }
      pal_chiudi_lezione: { Args: { p_lezione: string }; Returns: number }
      pal_chiudi_lezioni_finite: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      pal_cruscotto: { Args: { p_sede: string }; Returns: Json }
      pal_esito_addebito: {
        Args: { p_esito?: string; p_rata: string; p_riuscito: boolean }
        Returns: string
      }
      pal_euro: { Args: { p: number }; Returns: string }
      pal_fattura_convenzione: {
        Args: { p_al: string; p_convenzione: string; p_numero: string }
        Returns: string
      }
      pal_genera_lezioni: {
        Args: { p_al: string; p_dal: string; p_sede: string }
        Returns: number
      }
      pal_in_sospensione: {
        Args: { p_abbonamento: string; p_giorno: string }
        Returns: boolean
      }
      pal_incassa_rata: {
        Args: {
          p_metodo?: Database["public"]["Enums"]["pagamento_metodo"]
          p_rata: string
          p_riferimento?: string
        }
        Returns: string
      }
      pal_kpi: {
        Args: { p_al: string; p_dal: string; p_sede: string }
        Returns: Json
      }
      pal_notifica_direzione: {
        Args: {
          p_messaggio: string
          p_tipo?: Database["public"]["Enums"]["notifica_tipo"]
          p_titolo: string
          p_url: string
        }
        Returns: undefined
      }
      pal_nuova_versione_scheda: { Args: { p_scheda: string }; Returns: string }
      pal_oggi: { Args: Record<PropertyKey, never>; Returns: string }
      pal_pipeline: { Args: Record<PropertyKey, never>; Returns: string }
      pal_promemoria_corsi: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      pal_puo_salute: { Args: { p_socio: string }; Returns: boolean }
      pal_rate_scadute: { Args: Record<PropertyKey, never>; Returns: number }
      pal_registra_ingresso: {
        Args: {
          p_codice: string
          p_sede?: string
          p_servizio?: string
          p_tipo?: string
        }
        Returns: Json
      }
      pal_registra_uscita: { Args: { p_socio: string }; Returns: boolean }
      pal_rendi_carnet: { Args: { p_carnet: string }; Returns: undefined }
      pal_rinnova: {
        Args: { p_abbonamento: string; p_formula?: string }
        Returns: string
      }
      pal_rinnovi_notturni: { Args: Record<PropertyKey, never>; Returns: Json }
      pal_scala_carnet: {
        Args: { p_quando?: string; p_servizio: string; p_socio: string }
        Returns: string
      }
      pal_scorri_attesa: { Args: { p_lezione: string }; Returns: string }
      pal_socio_riepilogo: { Args: { p_socio: string }; Returns: Json }
      pal_trainer_corrente: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      pal_vendi_pacchetto: {
        Args: { p_metodo?: string; p_pacchetto: string; p_socio: string }
        Returns: string
      }
      pal_vendi_prodotti: {
        Args: { p_righe: Json; p_socio?: string }
        Returns: string
      }
      pal_verifica_accesso: {
        Args: { p_istante?: string; p_servizio?: string; p_socio: string }
        Returns: Json
      }
      preleva_mail_da_inviare: {
        Args: { quante?: number }
        Returns: {
          corpo_html: string | null
          corpo_testo: string
          created_at: string
          destinatario: string
          id: string
          inviata_at: string | null
          oggetto: string
          tentativi: number
          ultimo_errore: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mail_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      prepara_campagna: { Args: { p_campagna: string }; Returns: number }
      processa_scadenze: { Args: Record<PropertyKey, never>; Returns: number }
      processa_scadenze_moduli: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      puo_amministrazione: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      puo_clinica: { Args: Record<PropertyKey, never>; Returns: boolean }
      puo_scrivere: { Args: Record<PropertyKey, never>; Returns: boolean }
      revoca_consenso_marketing: { Args: { p_token: string }; Returns: boolean }
      ricerca_globale: {
        Args: { q: string }
        Returns: {
          id: string
          sottotitolo: string
          tipo: string
          titolo: string
        }[]
      }
      ricevi_riga_ordine: {
        Args: {
          p_codice_lotto?: string
          p_quantita: number
          p_riga: string
          p_scadenza?: string
          p_temperatura?: number
          p_ubicazione?: string
        }
        Returns: string
      }
      scarica_distinta: {
        Args: {
          p_distinta: string
          p_riferimento_id?: string
          p_riferimento_tipo?: string
          p_tipo?: Database["public"]["Enums"]["mag_movimento_tipo"]
          p_unita: number
        }
        Returns: number
      }
      scrittura_demo_rifiutata: {
        Args: {
          p_operazione: string
          p_sessione: string
          p_tabella: string
          p_utente: string
        }
        Returns: string
      }
      scrittura_file_consentita: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      seg_detrattori: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_fb_abituali: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_fb_inattivi: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_fb_ricorrenze: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_fior_abituali: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_fior_festa: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_fior_inattivi: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_fior_ricorrenze: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_gar_abbonati: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_gar_ex: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_gar_in_scadenza: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_gar_occasionali: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_hotel_abituali: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_hotel_anniversari: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_hotel_compleanni: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_hotel_inattivi: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_hotel_partiti: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_imm_cercano: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_imm_clienti_conclusi: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_imm_proprietari: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_imm_senza_visite: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_pal_assidui: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_pal_corsi: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_pal_ex: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_pal_in_scadenza: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_pal_inattivi: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_pal_nuovi: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_pal_pt: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_promotori: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_tesserati: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_tesserati_inattivi: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      seg_tutti_i_contatti: {
        Args: { p_modulo: string; p_parametri: Json }
        Returns: string[]
      }
      segna_mail_fallita: {
        Args: { errore: string; mail_id: string }
        Returns: undefined
      }
      segna_mail_inviata: { Args: { mail_id: string }; Returns: undefined }
      send_email_hook: { Args: { event: Json }; Returns: Json }
      sposta_righe_conto: {
        Args: { p_destinazione: string; p_righe: string[] }
        Returns: number
      }
      tabelle_di_servizio: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      turni_carenze: {
        Args: { p_al: string; p_dal: string; p_modulo: string }
        Returns: {
          coperte: number
          data: string
          ora_fine: string
          ora_inizio: string
          reparto: string
          richieste: number
        }[]
      }
      turni_persone: {
        Args: { p_modulo: string }
        Returns: {
          cognome: string
          id: string
          nome: string
          qualifica: string
        }[]
      }
    }
    Enums: {
      agente_stato: "attivo" | "sospeso" | "cessato"
      agente_tipologia:
        "monomandatario" | "plurimandatario" | "procacciatore" | "dipendente"
      apparecchiatura_stato: "operativa" | "in_manutenzione" | "fuori_servizio"
      approvazione_stato: "richiesta" | "approvata" | "rifiutata" | "annullata"
      appuntamento_stato:
        | "prenotato"
        | "confermato"
        | "in_sala"
        | "eseguito"
        | "annullato"
        | "no_show"
      articolo_sanitario_tipo: "farmaco" | "dispositivo" | "consumo"
      assenza_stato: "richiesta" | "approvata" | "rifiutata"
      assenza_tipo: "ferie" | "permesso" | "malattia"
      asset_intervento_stato:
        "segnalato" | "pianificato" | "in_corso" | "chiuso" | "annullato"
      asset_intervento_tipo:
        "preventiva" | "ordinaria" | "straordinaria" | "guasto"
      asset_priorita: "bassa" | "media" | "alta" | "urgente"
      asset_stato:
        "in_uso" | "in_manutenzione" | "guasto" | "fuori_servizio" | "dismesso"
      attivita_stato: "da_fare" | "in_corso" | "completata" | "annullata"
      attivita_tipo: "task" | "chiamata" | "email" | "riunione" | "nota"
      automezzo_acquisizione: "acquisto" | "leasing" | "noleggio"
      automezzo_alimentazione:
        "benzina" | "diesel" | "gpl" | "metano" | "ibrida" | "elettrica"
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
      campagna_canale: "email" | "sms" | "whatsapp" | "push"
      campagna_destinatario_stato: "in_coda" | "inviato" | "escluso"
      campagna_stato: "bozza" | "programmata" | "inviata" | "annullata"
      cantiere_ambiente_tipo:
        "rifiuti" | "emissioni" | "scarichi" | "terre_rocce" | "rumore"
      cantiere_costo_tipo:
        "personale" | "materiali" | "mezzi" | "subappalti" | "altro"
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
        "accettazione" | "corso_opera" | "collaudo" | "prova"
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
        "pianificato" | "in_apertura" | "attivo" | "sospeso" | "chiuso"
      cassa_sessione_stato: "aperta" | "chiusa"
      commessa_stato: "attiva" | "in_pausa" | "completata" | "annullata"
      comunicazione_canale:
        "email" | "sms" | "pec" | "telefono" | "whatsapp" | "notifica"
      condizione_tipo:
        | "patologia"
        | "allergia"
        | "terapia"
        | "intervento"
        | "farmaco"
        | "vaccinazione"
      consenso_tipo: "privacy" | "informato" | "marketing"
      conto_stato: "aperto" | "chiuso" | "annullato"
      controllo_esito: "conforme" | "non_conforme"
      controllo_tipo:
        | "temperatura"
        | "ricevimento"
        | "sanificazione"
        | "pulizia"
        | "infestanti"
        | "olio_frittura"
        | "verifica"
        | "altro"
      coupon_tipo: "percentuale" | "importo"
      evento_qualita_tipo:
        "reclamo" | "non_conformita" | "evento_avverso" | "audit"
      evento_stato:
        | "richiesta"
        | "preventivo"
        | "confermato"
        | "in_corso"
        | "concluso"
        | "annullato"
      evento_voce_categoria:
        | "menu"
        | "bevande"
        | "allestimento"
        | "personale"
        | "fiori"
        | "musica"
        | "noleggio"
        | "location"
        | "trasporto"
        | "altro"
      fattura_direzione: "attiva" | "passiva"
      fattura_stato: "da_pagare" | "pagata" | "scaduta" | "parziale"
      fb_comanda_stato: "aperta" | "chiusa" | "annullata"
      fb_prenotazione_stato:
        | "richiesta"
        | "confermata"
        | "arrivata"
        | "servita"
        | "conclusa"
        | "no_show"
        | "annullata"
      fb_riga_stato:
        | "in_attesa"
        | "da_preparare"
        | "presa_in_carico"
        | "in_preparazione"
        | "pronta"
        | "servita"
        | "annullata"
      feedback_stato: "ricevuto" | "in_gestione" | "risolto" | "chiuso"
      feedback_tipo:
        "nps" | "questionario" | "recensione" | "reclamo" | "suggerimento"
      fid_movimento_tipo:
        | "accumulo"
        | "bonus"
        | "referral"
        | "riscatto"
        | "premio"
        | "scadenza"
        | "rettifica"
      fior_ordine_stato:
        | "ricevuto"
        | "confermato"
        | "in_preparazione"
        | "pronto"
        | "in_consegna"
        | "consegnato"
        | "chiuso"
        | "annullato"
      gara_ati_ruolo: "mandataria" | "mandante" | "consorziata"
      gara_cauzione_tipo:
        "provvisoria" | "definitiva" | "fideiussione" | "polizza_assicurativa"
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
      gift_card_stato: "attiva" | "annullata"
      hotel_prenotazione_stato:
        | "richiesta"
        | "opzionata"
        | "confermata"
        | "in_soggiorno"
        | "partita"
        | "annullata"
        | "no_show"
      hotel_pulizia_stato: "da_pulire" | "in_pulizia" | "pulita" | "verificata"
      hotel_pulizia_tipo:
        | "partenza"
        | "soggiorno"
        | "ordinaria"
        | "straordinaria"
        | "cambio_biancheria"
        | "cambio_asciugamani"
        | "profonda"
      lead_fonte: "fiera" | "referral" | "linkedin" | "web" | "evento" | "altro"
      mag_inventario_stato: "aperto" | "chiuso"
      mag_movimento_tipo:
        | "carico"
        | "reso_cliente"
        | "scarico"
        | "vendita"
        | "consumo"
        | "sfrido"
        | "deterioramento"
        | "rottura"
        | "omaggio"
        | "consumo_interno"
        | "reso_fornitore"
        | "inventario"
        | "trasferimento"
      mag_ordine_stato:
        "bozza" | "inviato" | "ricevuto_parziale" | "ricevuto" | "annullato"
      manutenzione_tipo: "ordinaria" | "straordinaria"
      nota_spese_stato: "presentata" | "approvata" | "rifiutata" | "rimborsata"
      nota_spese_tipo:
        | "carburante"
        | "pedaggi"
        | "vitto"
        | "alloggio"
        | "trasferta"
        | "parcheggi"
        | "altro"
      notifica_tipo: "info" | "warning" | "critical" | "success" | "sistema"
      offerta_stato: "bozza" | "inviata" | "accettata" | "rifiutata" | "scaduta"
      ordine_stato:
        | "bozza"
        | "confermato"
        | "in_consegna"
        | "consegnato"
        | "fatturato"
        | "annullato"
      org_ruolo:
        "cliente" | "fornitore" | "partner" | "potenziale_partner" | "prospect"
      pagamento_metodo:
        | "contanti"
        | "pos"
        | "carta"
        | "bonifico"
        | "online"
        | "buono"
        | "gift_card"
        | "coupon"
        | "addebito_conto"
        | "conto_aziendale"
        | "altro"
      pagamento_stato: "da_incassare" | "incassato" | "in_ritardo" | "parziale"
      pal_abbonamento_stato: "attivo" | "sospeso" | "scaduto" | "disdetto"
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
      paziente_sesso: "m" | "f" | "altro"
      prestazione_tipo:
        "visita" | "esame" | "infermieristica" | "terapia" | "pacchetto"
      priorita_type: "bassa" | "media" | "alta" | "critica"
      progetto_stato:
        | "pianificazione"
        | "in_corso"
        | "in_revisione"
        | "completato"
        | "sospeso"
      progetto_tipo: "cliente" | "interno"
      provvigione_ambito: "cliente" | "zona" | "prodotto" | "fascia_fatturato"
      referto_stato: "bozza" | "da_validare" | "validato" | "inviato"
      scadenza_modulo_stato: "aperta" | "completata" | "annullata"
      sdi_stato:
        | "non_applicabile"
        | "da_inviare"
        | "inviata"
        | "consegnata"
        | "scartata"
        | "mancata_consegna"
      segnalazione_gravita: "bassa" | "media" | "alta" | "critica"
      segnalazione_stato: "aperta" | "in_gestione" | "chiusa"
      segnalazione_tipo:
        | "incidente"
        | "infortunio"
        | "quasi_incidente"
        | "emergenza"
        | "pericolo"
        | "danno"
        | "furto"
        | "non_conformita"
      sinistro_stato: "aperto" | "in_lavorazione" | "liquidato" | "chiuso"
      tassa_stato: "da_pagare" | "pagata" | "scaduta"
      tipo_contratto:
        | "indeterminato"
        | "determinato"
        | "apprendistato"
        | "collaborazione"
        | "stage"
        | "partita_iva"
      turno_stato:
        "pianificato" | "confermato" | "svolto" | "assente" | "annullato"
      user_role: "admin" | "manager" | "operatore"
      visita_esito: "positivo" | "neutro" | "negativo" | "da_ricontattare"
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
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: NonNullable<Json>
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: NonNullable<Json>
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: NonNullable<Json>
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
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
          path_tokens?: never
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
          path_tokens?: never
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
        Args: Record<PropertyKey, never>
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
      operation: { Args: Record<PropertyKey, never>; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      agente_stato: ["attivo", "sospeso", "cessato"],
      agente_tipologia: [
        "monomandatario",
        "plurimandatario",
        "procacciatore",
        "dipendente",
      ],
      apparecchiatura_stato: ["operativa", "in_manutenzione", "fuori_servizio"],
      approvazione_stato: ["richiesta", "approvata", "rifiutata", "annullata"],
      appuntamento_stato: [
        "prenotato",
        "confermato",
        "in_sala",
        "eseguito",
        "annullato",
        "no_show",
      ],
      articolo_sanitario_tipo: ["farmaco", "dispositivo", "consumo"],
      assenza_stato: ["richiesta", "approvata", "rifiutata"],
      assenza_tipo: ["ferie", "permesso", "malattia"],
      asset_intervento_stato: [
        "segnalato",
        "pianificato",
        "in_corso",
        "chiuso",
        "annullato",
      ],
      asset_intervento_tipo: [
        "preventiva",
        "ordinaria",
        "straordinaria",
        "guasto",
      ],
      asset_priorita: ["bassa", "media", "alta", "urgente"],
      asset_stato: [
        "in_uso",
        "in_manutenzione",
        "guasto",
        "fuori_servizio",
        "dismesso",
      ],
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
      campagna_canale: ["email", "sms", "whatsapp", "push"],
      campagna_destinatario_stato: ["in_coda", "inviato", "escluso"],
      campagna_stato: ["bozza", "programmata", "inviata", "annullata"],
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
      cassa_sessione_stato: ["aperta", "chiusa"],
      commessa_stato: ["attiva", "in_pausa", "completata", "annullata"],
      comunicazione_canale: [
        "email",
        "sms",
        "pec",
        "telefono",
        "whatsapp",
        "notifica",
      ],
      condizione_tipo: [
        "patologia",
        "allergia",
        "terapia",
        "intervento",
        "farmaco",
        "vaccinazione",
      ],
      consenso_tipo: ["privacy", "informato", "marketing"],
      conto_stato: ["aperto", "chiuso", "annullato"],
      controllo_esito: ["conforme", "non_conforme"],
      controllo_tipo: [
        "temperatura",
        "ricevimento",
        "sanificazione",
        "pulizia",
        "infestanti",
        "olio_frittura",
        "verifica",
        "altro",
      ],
      coupon_tipo: ["percentuale", "importo"],
      evento_qualita_tipo: [
        "reclamo",
        "non_conformita",
        "evento_avverso",
        "audit",
      ],
      evento_stato: [
        "richiesta",
        "preventivo",
        "confermato",
        "in_corso",
        "concluso",
        "annullato",
      ],
      evento_voce_categoria: [
        "menu",
        "bevande",
        "allestimento",
        "personale",
        "fiori",
        "musica",
        "noleggio",
        "location",
        "trasporto",
        "altro",
      ],
      fattura_direzione: ["attiva", "passiva"],
      fattura_stato: ["da_pagare", "pagata", "scaduta", "parziale"],
      fb_comanda_stato: ["aperta", "chiusa", "annullata"],
      fb_prenotazione_stato: [
        "richiesta",
        "confermata",
        "arrivata",
        "servita",
        "conclusa",
        "no_show",
        "annullata",
      ],
      fb_riga_stato: [
        "in_attesa",
        "da_preparare",
        "presa_in_carico",
        "in_preparazione",
        "pronta",
        "servita",
        "annullata",
      ],
      feedback_stato: ["ricevuto", "in_gestione", "risolto", "chiuso"],
      feedback_tipo: [
        "nps",
        "questionario",
        "recensione",
        "reclamo",
        "suggerimento",
      ],
      fid_movimento_tipo: [
        "accumulo",
        "bonus",
        "referral",
        "riscatto",
        "premio",
        "scadenza",
        "rettifica",
      ],
      fior_ordine_stato: [
        "ricevuto",
        "confermato",
        "in_preparazione",
        "pronto",
        "in_consegna",
        "consegnato",
        "chiuso",
        "annullato",
      ],
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
      gift_card_stato: ["attiva", "annullata"],
      hotel_prenotazione_stato: [
        "richiesta",
        "opzionata",
        "confermata",
        "in_soggiorno",
        "partita",
        "annullata",
        "no_show",
      ],
      hotel_pulizia_stato: ["da_pulire", "in_pulizia", "pulita", "verificata"],
      hotel_pulizia_tipo: [
        "partenza",
        "soggiorno",
        "ordinaria",
        "straordinaria",
        "cambio_biancheria",
        "cambio_asciugamani",
        "profonda",
      ],
      lead_fonte: ["fiera", "referral", "linkedin", "web", "evento", "altro"],
      mag_inventario_stato: ["aperto", "chiuso"],
      mag_movimento_tipo: [
        "carico",
        "reso_cliente",
        "scarico",
        "vendita",
        "consumo",
        "sfrido",
        "deterioramento",
        "rottura",
        "omaggio",
        "consumo_interno",
        "reso_fornitore",
        "inventario",
        "trasferimento",
      ],
      mag_ordine_stato: [
        "bozza",
        "inviato",
        "ricevuto_parziale",
        "ricevuto",
        "annullato",
      ],
      manutenzione_tipo: ["ordinaria", "straordinaria"],
      nota_spese_stato: ["presentata", "approvata", "rifiutata", "rimborsata"],
      nota_spese_tipo: [
        "carburante",
        "pedaggi",
        "vitto",
        "alloggio",
        "trasferta",
        "parcheggi",
        "altro",
      ],
      notifica_tipo: ["info", "warning", "critical", "success", "sistema"],
      offerta_stato: ["bozza", "inviata", "accettata", "rifiutata", "scaduta"],
      ordine_stato: [
        "bozza",
        "confermato",
        "in_consegna",
        "consegnato",
        "fatturato",
        "annullato",
      ],
      org_ruolo: [
        "cliente",
        "fornitore",
        "partner",
        "potenziale_partner",
        "prospect",
      ],
      pagamento_metodo: [
        "contanti",
        "pos",
        "carta",
        "bonifico",
        "online",
        "buono",
        "gift_card",
        "coupon",
        "addebito_conto",
        "conto_aziendale",
        "altro",
      ],
      pagamento_stato: ["da_incassare", "incassato", "in_ritardo", "parziale"],
      pal_abbonamento_stato: ["attivo", "sospeso", "scaduto", "disdetto"],
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
      paziente_sesso: ["m", "f", "altro"],
      prestazione_tipo: [
        "visita",
        "esame",
        "infermieristica",
        "terapia",
        "pacchetto",
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
      provvigione_ambito: ["cliente", "zona", "prodotto", "fascia_fatturato"],
      referto_stato: ["bozza", "da_validare", "validato", "inviato"],
      scadenza_modulo_stato: ["aperta", "completata", "annullata"],
      sdi_stato: [
        "non_applicabile",
        "da_inviare",
        "inviata",
        "consegnata",
        "scartata",
        "mancata_consegna",
      ],
      segnalazione_gravita: ["bassa", "media", "alta", "critica"],
      segnalazione_stato: ["aperta", "in_gestione", "chiusa"],
      segnalazione_tipo: [
        "incidente",
        "infortunio",
        "quasi_incidente",
        "emergenza",
        "pericolo",
        "danno",
        "furto",
        "non_conformita",
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
      turno_stato: [
        "pianificato",
        "confermato",
        "svolto",
        "assente",
        "annullato",
      ],
      user_role: ["admin", "manager", "operatore"],
      visita_esito: ["positivo", "neutro", "negativo", "da_ricontattare"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
