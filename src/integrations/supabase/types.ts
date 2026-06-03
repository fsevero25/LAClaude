export type LeadStatus =
  | "aguardando_atendimento"
  | "primeira_chamada"
  | "segunda_chamada"
  | "terceira_chamada"
  | "em_atendimento"
  | "visita_gerada"
  | "futuro_lancamento"
  | "lancamento"
  | "proprietario_atendimento"
  | "proprietario_concluido"
  | "descarte_sem_perfil"
  | "descarte_nao_responde"
  | "descarte_tentativa_futura"
  | "negocio_fechado"
  | "pasta_feita";

export type LeadTemperature = "frio" | "morno" | "quente";

export type AppRole = "admin" | "corretor" | "gestor";

export type Team = "PB" | "FLN";

export type ShiftType = "plantao" | "gestao" | "folga";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  team: Team | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: LeadStatus;
  temperature: LeadTemperature | null;
  team: Team | null;
  source_id: string | null;
  corretor_id: string | null;
  notes: string | null;
  vista_lead_id: string | null;
  entered_status_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadHistory {
  id: string;
  lead_id: string;
  from_status: LeadStatus | null;
  to_status: LeadStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface LeadSource {
  id: string;
  name: string;
  team: Team | null;
  active: boolean;
  created_at: string;
}

export interface ContactAttempt {
  id: string;
  lead_id: string;
  corretor_id: string | null;
  notes: string | null;
  attempt_number: number;
  created_at: string;
}

export interface DutyShift {
  id: string;
  corretor_id: string | null;
  team: Team;
  date: string;
  start_time: string;
  end_time: string;
  shift_type: ShiftType;
  slot: "A" | "B" | null;
  batch_id: string | null;
  created_at: string;
}

export interface DutyPdfUpload {
  id: string;
  uploaded_by: string | null;
  storage_path: string;
  team: Team;
  parsed: boolean;
  created_at: string;
}

export interface DutyScheduleBatch {
  id: string;
  uploaded_by: string | null;
  team: Team;
  pdf_upload_id: string | null;
  confirmed: boolean;
  created_at: string;
}

export interface CorretorUnavailability {
  id: string;
  corretor_id: string;
  date: string;
  reason: string | null;
  created_at: string;
}

export interface TeamManager {
  id: string;
  team: Team;
  weekday: number;
  corretor_id: string;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  id: string;
  roleta_ativa: boolean;
  vista_sync_enabled: boolean;
  vista_api_url: string | null;
  vista_api_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSettingsKv {
  id: string;
  key: string;
  value: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  read: boolean;
  link: string | null;
  created_at: string;
}

export interface ReportSnapshot {
  id: string;
  created_by: string | null;
  title: string;
  data: Record<string, unknown>;
  pdf_url: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      user_roles: {
        Row: UserRole;
        Insert: Omit<UserRole, "id" | "created_at">;
        Update: Partial<Omit<UserRole, "id">>;
      };
      leads: {
        Row: Lead;
        Insert: Omit<Lead, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Lead, "id">>;
      };
      lead_history: {
        Row: LeadHistory;
        Insert: Omit<LeadHistory, "id" | "created_at">;
        Update: Partial<Omit<LeadHistory, "id">>;
      };
      lead_sources: {
        Row: LeadSource;
        Insert: Omit<LeadSource, "id" | "created_at">;
        Update: Partial<Omit<LeadSource, "id">>;
      };
      contact_attempts: {
        Row: ContactAttempt;
        Insert: Omit<ContactAttempt, "id" | "created_at">;
        Update: Partial<Omit<ContactAttempt, "id">>;
      };
      duty_shifts: {
        Row: DutyShift;
        Insert: Omit<DutyShift, "id" | "created_at">;
        Update: Partial<Omit<DutyShift, "id">>;
      };
      duty_pdf_uploads: {
        Row: DutyPdfUpload;
        Insert: Omit<DutyPdfUpload, "id" | "created_at">;
        Update: Partial<Omit<DutyPdfUpload, "id">>;
      };
      duty_schedule_batches: {
        Row: DutyScheduleBatch;
        Insert: Omit<DutyScheduleBatch, "id" | "created_at">;
        Update: Partial<Omit<DutyScheduleBatch, "id">>;
      };
      corretor_unavailability: {
        Row: CorretorUnavailability;
        Insert: Omit<CorretorUnavailability, "id" | "created_at">;
        Update: Partial<Omit<CorretorUnavailability, "id">>;
      };
      team_managers: {
        Row: TeamManager;
        Insert: Omit<TeamManager, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<TeamManager, "id">>;
      };
      app_settings: {
        Row: AppSettings;
        Insert: Omit<AppSettings, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<AppSettings, "id">>;
      };
      app_settings_kv: {
        Row: AppSettingsKv;
        Insert: Omit<AppSettingsKv, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<AppSettingsKv, "id">>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, "id" | "created_at">;
        Update: Partial<Omit<Notification, "id">>;
      };
      report_snapshots: {
        Row: ReportSnapshot;
        Insert: Omit<ReportSnapshot, "id" | "created_at">;
        Update: Partial<Omit<ReportSnapshot, "id">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      lead_status: LeadStatus;
      lead_temperature: LeadTemperature;
      app_role: AppRole;
      team: Team;
      shift_type: ShiftType;
    };
  };
}
