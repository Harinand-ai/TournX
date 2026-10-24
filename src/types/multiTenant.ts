/**
 * TournX Multi-Tenant Domain Models & Types
 * think.prompt.organise
 *
 * Defines the TypeScript types for the normalized, multi-tenant tournament architecture.
 */

export type TournamentStatus = 'DRAFT' | 'REGISTRATION' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export type TournamentVisibility = 'PRIVATE' | 'UNLISTED' | 'PUBLIC';

export type TournamentRole = 'ORGANIZER' | 'SCORE' | 'VIEW';

export type StageType = 
  | 'SINGLE_ROUND_ROBIN'
  | 'DOUBLE_ROUND_ROBIN'
  | 'GROUP_STAGE'
  | 'SINGLE_ELIMINATION'
  | 'DOUBLE_ELIMINATION'
  | 'LEAGUE_WITH_PLAYOFFS';

export type StageStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED';

export type PlayerPosition = 'GK' | 'CB' | 'MID' | 'CF' | 'TBD';

export type MatchStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';

export type MatchEventType = 
  | 'GOAL'
  | 'ASSIST'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'SUBSTITUTION'
  | 'OWN_GOAL'
  | 'PENALTY_SCORED'
  | 'PENALTY_MISSED';

export type MediaAssetType = 'TOURNAMENT_LOGO' | 'TEAM_CREST' | 'PLAYER_PHOTO' | 'DOCUMENT';

export type TieBreakerCriterion = 
  | 'POINTS'
  | 'GOAL_DIFFERENCE'
  | 'GOALS_FOR'
  | 'HEAD_TO_HEAD'
  | 'FAIR_PLAY'
  | 'COIN_TOSS';

export interface TournamentRulesConfig {
  points_for_win: number;
  points_for_draw: number;
  points_for_loss: number;
  tie_breaker_order: TieBreakerCriterion[];
  match_duration_minutes: number;
  half_time_duration_minutes: number;
  max_substitutes?: number;
  allow_draws?: boolean;
  extra_time_enabled?: boolean;
  penalty_shootout_enabled?: boolean;
  sport?: string;
  match_type?: string;
  starting_players_per_team?: number;
  substitutes_per_team?: number;
  squad_size?: number;
  playoff_qualifiers?: 2 | 4;
  include_third_place_playoff?: boolean;
  [key: string]: any;
}

export interface Tournament {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  season?: string | null;
  logo_url?: string | null;
  status: TournamentStatus;
  visibility: TournamentVisibility;
  rules_config: TournamentRulesConfig;
  created_by?: string | null;
  expires_at?: string | null;
  last_activity_at?: string | null;
  deleted_at?: string | null;
  inactivity_days?: number;
  created_at: string;
  updated_at: string;
}

export interface TournamentMember {
  id: string;
  tournament_id: string;
  user_id: string;
  role: TournamentRole;
  created_at: string;
  updated_at: string;
}

export interface AccessCode {
  id: string;
  tournament_id: string;
  role: 'VIEW' | 'SCORE';
  code_hash: string;
  label?: string | null;
  is_active: boolean;
  max_uses?: number | null;
  use_count: number;
  expires_at?: string | null;
  last_used_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
}

export interface TournamentStage {
  id: string;
  tournament_id: string;
  name: string;
  sequence_order: number;
  stage_type: StageType;
  settings: Record<string, any>;
  status: StageStatus;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  tournament_id: string;
  stage_id: string;
  name: string;
  sequence_order: number;
  created_at: string;
}

export interface StageTeam {
  id: string;
  tournament_id: string;
  stage_id: string;
  group_id?: string | null;
  team_id: string;
  seed?: number | null;
  created_at: string;
}

export interface MultiTenantTeam {
  id: string;
  tournament_id: string;
  name: string;
  short_name: string;
  manager_name?: string | null;
  logo_url?: string | null;
  primary_color: string;
  secondary_color: string;
  created_at: string;
  updated_at: string;
}

export interface MultiTenantPlayer {
  id: string;
  tournament_id: string;
  team_id: string;
  name: string;
  position: PlayerPosition;
  jersey_number?: number | null;
  is_captain: boolean;
  photo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MultiTenantMatch {
  id: string;
  tournament_id: string;
  stage_id: string;
  group_id?: string | null;
  match_number: number;
  round_number: number;
  home_team_id: string;
  away_team_id: string;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  venue?: string | null;
  referee?: string | null;
  assistant_referee_1?: string | null;
  assistant_referee_2?: string | null;
  status: MatchStatus;
  home_score?: number | null;
  away_score?: number | null;
  is_override: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MatchEvent {
  id: string;
  tournament_id: string;
  match_id: string;
  team_id: string;
  player_id: string;
  event_type: MatchEventType;
  minute: number;
  secondary_player_id?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface MediaAsset {
  id: string;
  tournament_id: string;
  asset_type: MediaAssetType;
  storage_path: string;
  public_url: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  associated_entity_type?: string | null;
  associated_entity_id?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tournament_id: string;
  actor_id?: string | null;
  actor_role: TournamentRole;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  previous_state?: Record<string, any> | null;
  new_state?: Record<string, any> | null;
  created_at: string;
}

/**
 * Role Permission Capability Matrix
 */
export interface RolePermissions {
  canViewOverview: boolean;
  canViewFixtures: boolean;
  canViewResults: boolean;
  canViewStandings: boolean;
  canEnterScores: boolean;
  canRecordEvents: boolean;
  canCorrectScores: boolean;
  canManageTeams: boolean;
  canManagePlayers: boolean;
  canGenerateFixtures: boolean;
  canEditRules: boolean;
  canManageAccessCodes: boolean;
  canDeleteTournament: boolean;
}

export const ROLE_PERMISSION_MATRIX: Record<TournamentRole, RolePermissions> = {
  VIEW: {
    canViewOverview: true,
    canViewFixtures: true,
    canViewResults: true,
    canViewStandings: true,
    canEnterScores: false,
    canRecordEvents: false,
    canCorrectScores: false,
    canManageTeams: false,
    canManagePlayers: false,
    canGenerateFixtures: false,
    canEditRules: false,
    canManageAccessCodes: false,
    canDeleteTournament: false,
  },
  SCORE: {
    canViewOverview: true,
    canViewFixtures: true,
    canViewResults: true,
    canViewStandings: true,
    canEnterScores: true,
    canRecordEvents: true,
    canCorrectScores: true, // If authorized by organizer
    canManageTeams: false,
    canManagePlayers: false,
    canGenerateFixtures: false,
    canEditRules: false,
    canManageAccessCodes: false,
    canDeleteTournament: false,
  },
  ORGANIZER: {
    canViewOverview: true,
    canViewFixtures: true,
    canViewResults: true,
    canViewStandings: true,
    canEnterScores: true,
    canRecordEvents: true,
    canCorrectScores: true,
    canManageTeams: true,
    canManagePlayers: true,
    canGenerateFixtures: true,
    canEditRules: true,
    canManageAccessCodes: true,
    canDeleteTournament: true,
  },
};
