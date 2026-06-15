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
      ajustes_puntos_manuales: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          motivo: string
          puntos: number
          usuario_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          motivo: string
          puntos: number
          usuario_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          motivo?: string
          puntos?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_puntos_manuales_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "ajustes_puntos_manuales_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_puntos_manuales_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "ajustes_puntos_manuales_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion: {
        Row: {
          goleador_oficial: string | null
          id: number
          puntos_campeon: number
          puntos_goleador: number
          puntos_marcador_exacto: number
          puntos_solo_ganador: number
          puntos_subcampeon: number
          updated_at: string
        }
        Insert: {
          goleador_oficial?: string | null
          id: number
          puntos_campeon?: number
          puntos_goleador?: number
          puntos_marcador_exacto?: number
          puntos_solo_ganador?: number
          puntos_subcampeon?: number
          updated_at?: string
        }
        Update: {
          goleador_oficial?: string | null
          id?: number
          puntos_campeon?: number
          puntos_goleador?: number
          puntos_marcador_exacto?: number
          puntos_solo_ganador?: number
          puntos_subcampeon?: number
          updated_at?: string
        }
        Relationships: []
      }
      equipos: {
        Row: {
          api_id: number
          codigo_pais: string
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          api_id: number
          codigo_pais: string
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          api_id?: number
          codigo_pais?: string
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      log_auditoria: {
        Row: {
          accion: Database["public"]["Enums"]["accion_auditoria"]
          admin_id: string
          entidad_id: string | null
          entidad_tipo: string
          fecha: string
          id: string
          motivo: string | null
          valor_anterior: Json | null
          valor_nuevo: Json | null
        }
        Insert: {
          accion: Database["public"]["Enums"]["accion_auditoria"]
          admin_id: string
          entidad_id?: string | null
          entidad_tipo: string
          fecha?: string
          id?: string
          motivo?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Update: {
          accion?: Database["public"]["Enums"]["accion_auditoria"]
          admin_id?: string
          entidad_id?: string | null
          entidad_tipo?: string
          fecha?: string
          id?: string
          motivo?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "log_auditoria_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "log_auditoria_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      partidos: {
        Row: {
          api_id: number
          created_at: string
          equipo_local_id: string
          equipo_visitante_id: string
          estado: Database["public"]["Enums"]["estado_partido"]
          fase: Database["public"]["Enums"]["fase_partido"]
          fecha_hora_kickoff: string
          habilitado_para_predecir: boolean
          id: string
          marcador_local_real: number | null
          marcador_visitante_real: number | null
          updated_at: string
        }
        Insert: {
          api_id: number
          created_at?: string
          equipo_local_id: string
          equipo_visitante_id: string
          estado?: Database["public"]["Enums"]["estado_partido"]
          fase: Database["public"]["Enums"]["fase_partido"]
          fecha_hora_kickoff: string
          habilitado_para_predecir?: boolean
          id?: string
          marcador_local_real?: number | null
          marcador_visitante_real?: number | null
          updated_at?: string
        }
        Update: {
          api_id?: number
          created_at?: string
          equipo_local_id?: string
          equipo_visitante_id?: string
          estado?: Database["public"]["Enums"]["estado_partido"]
          fase?: Database["public"]["Enums"]["fase_partido"]
          fecha_hora_kickoff?: string
          habilitado_para_predecir?: boolean
          id?: string
          marcador_local_real?: number | null
          marcador_visitante_real?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partidos_equipo_local_id_fkey"
            columns: ["equipo_local_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partidos_equipo_visitante_id_fkey"
            columns: ["equipo_visitante_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      predicciones_bonus: {
        Row: {
          created_at: string
          editado_por_admin: boolean
          id: string
          pregunta_bonus_id: string
          puntos_obtenidos: number
          respuesta: Json
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          editado_por_admin?: boolean
          id?: string
          pregunta_bonus_id: string
          puntos_obtenidos?: number
          respuesta: Json
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          editado_por_admin?: boolean
          id?: string
          pregunta_bonus_id?: string
          puntos_obtenidos?: number
          respuesta?: Json
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predicciones_bonus_pregunta_bonus_id_fkey"
            columns: ["pregunta_bonus_id"]
            isOneToOne: false
            referencedRelation: "preguntas_bonus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predicciones_bonus_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "predicciones_bonus_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      predicciones_partido: {
        Row: {
          created_at: string
          editado_por_admin: boolean
          id: string
          marcador_local: number
          marcador_visitante: number
          partido_id: string
          puntos_obtenidos: number
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          editado_por_admin?: boolean
          id?: string
          marcador_local: number
          marcador_visitante: number
          partido_id: string
          puntos_obtenidos?: number
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          editado_por_admin?: boolean
          id?: string
          marcador_local?: number
          marcador_visitante?: number
          partido_id?: string
          puntos_obtenidos?: number
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predicciones_partido_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predicciones_partido_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "predicciones_partido_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      predicciones_torneo: {
        Row: {
          campeon_equipo_id: string | null
          created_at: string
          goleador_nombre: string | null
          id: string
          puntos_campeon: number
          puntos_goleador: number
          puntos_subcampeon: number
          subcampeon_equipo_id: string | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          campeon_equipo_id?: string | null
          created_at?: string
          goleador_nombre?: string | null
          id?: string
          puntos_campeon?: number
          puntos_goleador?: number
          puntos_subcampeon?: number
          subcampeon_equipo_id?: string | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          campeon_equipo_id?: string | null
          created_at?: string
          goleador_nombre?: string | null
          id?: string
          puntos_campeon?: number
          puntos_goleador?: number
          puntos_subcampeon?: number
          subcampeon_equipo_id?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predicciones_torneo_campeon_equipo_id_fkey"
            columns: ["campeon_equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predicciones_torneo_subcampeon_equipo_id_fkey"
            columns: ["subcampeon_equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predicciones_torneo_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "leaderboard"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "predicciones_torneo_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      preguntas_bonus: {
        Row: {
          created_at: string
          enunciado: string
          id: string
          opciones: Json | null
          partido_id: string
          puntos: number
          respuesta_correcta: Json | null
          tipo: Database["public"]["Enums"]["tipo_pregunta_bonus"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          enunciado: string
          id?: string
          opciones?: Json | null
          partido_id: string
          puntos?: number
          respuesta_correcta?: Json | null
          tipo: Database["public"]["Enums"]["tipo_pregunta_bonus"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          enunciado?: string
          id?: string
          opciones?: Json | null
          partido_id?: string
          puntos?: number
          respuesta_correcta?: Json | null
          tipo?: Database["public"]["Enums"]["tipo_pregunta_bonus"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preguntas_bonus_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          created_at: string
          email: string
          es_admin: boolean
          foto_url: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          email: string
          es_admin?: boolean
          foto_url?: string | null
          id: string
          nombre: string
        }
        Update: {
          created_at?: string
          email?: string
          es_admin?: boolean
          foto_url?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          foto_url: string | null
          marcadores_exactos: number | null
          nombre: string | null
          puntos_bonus: number | null
          puntos_totales: number | null
          usuario_id: string | null
        }
        Insert: {
          foto_url?: string | null
          marcadores_exactos?: never
          nombre?: string | null
          puntos_bonus?: never
          puntos_totales?: never
          usuario_id?: string | null
        }
        Update: {
          foto_url?: string | null
          marcadores_exactos?: never
          nombre?: string | null
          puntos_bonus?: never
          puntos_totales?: never
          usuario_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calcular_puntos_bonus: {
        Args: { p_pregunta_id: string }
        Returns: undefined
      }
      calcular_puntos_partido: {
        Args: { p_partido_id: string }
        Returns: undefined
      }
      calcular_puntos_torneo: { Args: never; Returns: undefined }
      mundial_iniciado: { Args: never; Returns: boolean }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      accion_auditoria:
        | "editar_prediccion_partido"
        | "editar_prediccion_bonus"
        | "ajuste_puntos_manual"
        | "editar_resultado_partido"
        | "editar_config"
        | "habilitar_partido"
        | "crear_pregunta_bonus"
        | "editar_pregunta_bonus"
        | "eliminar_pregunta_bonus"
        | "ver_perfil_usuario"
        | "editar_prediccion_torneo"
      estado_partido: "programado" | "en_curso" | "finalizado" | "suspendido"
      fase_partido:
        | "grupos"
        | "octavos"
        | "cuartos"
        | "semis"
        | "tercer_puesto"
        | "final"
      tipo_pregunta_bonus: "numero" | "over_under" | "si_no" | "opcion_multiple"
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
      accion_auditoria: [
        "editar_prediccion_partido",
        "editar_prediccion_bonus",
        "ajuste_puntos_manual",
        "editar_resultado_partido",
        "editar_config",
        "habilitar_partido",
        "crear_pregunta_bonus",
        "editar_pregunta_bonus",
        "eliminar_pregunta_bonus",
        "ver_perfil_usuario",
        "editar_prediccion_torneo",
      ],
      estado_partido: ["programado", "en_curso", "finalizado", "suspendido"],
      fase_partido: [
        "grupos",
        "octavos",
        "cuartos",
        "semis",
        "tercer_puesto",
        "final",
      ],
      tipo_pregunta_bonus: ["numero", "over_under", "si_no", "opcion_multiple"],
    },
  },
} as const
