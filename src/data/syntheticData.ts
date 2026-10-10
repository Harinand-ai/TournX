import { Team, Match, Player, CommitteeMember, TournamentRule, Goal, ManOfTheMatch, Assist } from '../types/tournament';

export const DEMO_TOURNAMENT_INFO = {
  id: 'ftm-demo-tourney-01',
  name: 'TournX Championship',
  tagline: 'think.prompt.organise',
  season: '2026 Edition',
  description: 'Official tournament powered by TournX — think.prompt.organise.',
  status: 'IN_PROGRESS',
};

export const DEMO_TEAMS: Team[] = [
  {
    id: 'team-apex',
    name: 'Apex FC',
    short_name: 'APX',
    manager_name: 'Alex Rivers',
    primary_color: '#2563eb',
    secondary_color: '#93c5fd',
  },
  {
    id: 'team-cobalt',
    name: 'Cobalt United',
    short_name: 'CBL',
    manager_name: 'Marcus Vance',
    primary_color: '#0d9488',
    secondary_color: '#5eead4',
  },
  {
    id: 'team-solaris',
    name: 'Solaris City',
    short_name: 'SOL',
    manager_name: 'Elena Rostova',
    primary_color: '#d97706',
    secondary_color: '#fcd34d',
  },
  {
    id: 'team-vanguard',
    name: 'Vanguard Rovers',
    short_name: 'VAN',
    manager_name: 'David Sterling',
    primary_color: '#dc2626',
    secondary_color: '#fca5a5',
  },
];

export const DEMO_PLAYERS: Player[] = [
  // Apex FC
  { id: 'p-apx-1', team_id: 'team-apex', name: 'Jordan Hayes', position: 'GK', is_captain: false },
  { id: 'p-apx-2', team_id: 'team-apex', name: 'Liam Carter', position: 'CB', is_captain: true },
  { id: 'p-apx-3', team_id: 'team-apex', name: 'Noah Bennett', position: 'MID', is_captain: false },
  { id: 'p-apx-4', team_id: 'team-apex', name: 'Ethan Cole', position: 'CF', is_captain: false },
  { id: 'p-apx-5', team_id: 'team-apex', name: 'Lucas Gray', position: 'MID', is_captain: false },

  // Cobalt United
  { id: 'p-cbl-1', team_id: 'team-cobalt', name: 'Mason Clark', position: 'GK', is_captain: false },
  { id: 'p-cbl-2', team_id: 'team-cobalt', name: 'Oliver Scott', position: 'CB', is_captain: true },
  { id: 'p-cbl-3', team_id: 'team-cobalt', name: 'James Evans', position: 'MID', is_captain: false },
  { id: 'p-cbl-4', team_id: 'team-cobalt', name: 'Daniel Miller', position: 'CF', is_captain: false },
  { id: 'p-cbl-5', team_id: 'team-cobalt', name: 'Aiden Brooks', position: 'CF', is_captain: false },

  // Solaris City
  { id: 'p-sol-1', team_id: 'team-solaris', name: 'Alexander Reed', position: 'GK', is_captain: false },
  { id: 'p-sol-2', team_id: 'team-solaris', name: 'Benjamin Ross', position: 'CB', is_captain: true },
  { id: 'p-sol-3', team_id: 'team-solaris', name: 'Sebastian Price', position: 'MID', is_captain: false },
  { id: 'p-sol-4', team_id: 'team-solaris', name: 'Gabriel Torres', position: 'CF', is_captain: false },
  { id: 'p-sol-5', team_id: 'team-solaris', name: 'Henry Wright', position: 'MID', is_captain: false },

  // Vanguard Rovers
  { id: 'p-van-1', team_id: 'team-vanguard', name: 'Samuel Diaz', position: 'GK', is_captain: false },
  { id: 'p-van-2', team_id: 'team-vanguard', name: 'William Foster', position: 'CB', is_captain: true },
  { id: 'p-van-3', team_id: 'team-vanguard', name: 'Jack Richardson', position: 'MID', is_captain: false },
  { id: 'p-van-4', team_id: 'team-vanguard', name: 'Owen Morgan', position: 'CF', is_captain: false },
  { id: 'p-van-5', team_id: 'team-vanguard', name: 'Wyatt Cooper', position: 'CF', is_captain: false },
];

export const DEMO_MATCHES: Match[] = [
  {
    id: 'match-demo-01',
    match_number: 1,
    round_number: 1,
    home_team_id: 'team-apex',
    away_team_id: 'team-cobalt',
    scheduled_date: '2026-04-10',
    scheduled_time: '18:00',
    venue: 'Community Stadium - Pitch A',
    referee: 'Robert Chen',
    assistant_referee_1: 'Marco Silva',
    assistant_referee_2: 'Kenji Sato',
    status: 'COMPLETED',
    home_score: 2,
    away_score: 1,
  },
  {
    id: 'match-demo-02',
    match_number: 2,
    round_number: 1,
    home_team_id: 'team-solaris',
    away_team_id: 'team-vanguard',
    scheduled_date: '2026-04-10',
    scheduled_time: '19:30',
    venue: 'Community Stadium - Pitch A',
    referee: 'Robert Chen',
    assistant_referee_1: 'Marco Silva',
    assistant_referee_2: 'Kenji Sato',
    status: 'COMPLETED',
    home_score: 1,
    away_score: 1,
  },
  {
    id: 'match-demo-03',
    match_number: 3,
    round_number: 2,
    home_team_id: 'team-apex',
    away_team_id: 'team-solaris',
    scheduled_date: '2026-04-12',
    scheduled_time: '18:00',
    venue: 'Community Stadium - Pitch A',
    referee: 'Sarah Jenkins',
    assistant_referee_1: 'Tariq Al-Mansoor',
    assistant_referee_2: 'Carlos Gomez',
    status: 'UPCOMING',
    home_score: null,
    away_score: null,
  },
  {
    id: 'match-demo-04',
    match_number: 4,
    round_number: 2,
    home_team_id: 'team-cobalt',
    away_team_id: 'team-vanguard',
    scheduled_date: '2026-04-12',
    scheduled_time: '19:30',
    venue: 'Community Stadium - Pitch A',
    referee: 'Sarah Jenkins',
    assistant_referee_1: 'Tariq Al-Mansoor',
    assistant_referee_2: 'Carlos Gomez',
    status: 'UPCOMING',
    home_score: null,
    away_score: null,
  },
  {
    id: 'match-demo-05',
    match_number: 5,
    round_number: 3,
    home_team_id: 'team-vanguard',
    away_team_id: 'team-apex',
    scheduled_date: '2026-04-15',
    scheduled_time: '18:00',
    venue: 'Community Stadium - Pitch B',
    referee: 'Kenji Sato',
    assistant_referee_1: 'Robert Chen',
    assistant_referee_2: 'Marco Silva',
    status: 'UPCOMING',
    home_score: null,
    away_score: null,
  },
  {
    id: 'match-demo-06',
    match_number: 6,
    round_number: 3,
    home_team_id: 'team-cobalt',
    away_team_id: 'team-solaris',
    scheduled_date: '2026-04-15',
    scheduled_time: '19:30',
    venue: 'Community Stadium - Pitch B',
    referee: 'Kenji Sato',
    assistant_referee_1: 'Robert Chen',
    assistant_referee_2: 'Marco Silva',
    status: 'UPCOMING',
    home_score: null,
    away_score: null,
  },
];

export const DEMO_GOALS: Goal[] = [
  {
    id: 'goal-demo-1',
    match_id: 'match-demo-01',
    player_id: 'p-apx-4', // Ethan Cole
    team_id: 'team-apex',
    minute: 14,
    description: 'Curled right-footed strike into the top corner',
  },
  {
    id: 'goal-demo-2',
    match_id: 'match-demo-01',
    player_id: 'p-cbl-4', // Daniel Miller
    team_id: 'team-cobalt',
    minute: 28,
    description: 'Equalizer header from set piece',
  },
  {
    id: 'goal-demo-3',
    match_id: 'match-demo-01',
    player_id: 'p-apx-3', // Noah Bennett
    team_id: 'team-apex',
    minute: 42,
    description: 'Match winning volley',
  },
  {
    id: 'goal-demo-4',
    match_id: 'match-demo-02',
    player_id: 'p-sol-4', // Gabriel Torres
    team_id: 'team-solaris',
    minute: 19,
    description: 'Low drive from edge of the box',
  },
  {
    id: 'goal-demo-5',
    match_id: 'match-demo-02',
    player_id: 'p-van-4', // Owen Morgan
    team_id: 'team-vanguard',
    minute: 37,
    description: 'Close range rebound finish',
  },
];

export const DEMO_ASSISTS: Assist[] = [
  {
    id: 'assist-demo-1',
    match_id: 'match-demo-01',
    player_id: 'p-apx-5',
    team_id: 'team-apex',
    minute: 14,
  },
  {
    id: 'assist-demo-2',
    match_id: 'match-demo-01',
    player_id: 'p-cbl-3',
    team_id: 'team-cobalt',
    minute: 28,
  },
  {
    id: 'assist-demo-3',
    match_id: 'match-demo-02',
    player_id: 'p-sol-3',
    team_id: 'team-solaris',
    minute: 19,
  },
];

export const DEMO_MOTM: ManOfTheMatch[] = [
  {
    id: 'motm-demo-1',
    match_id: 'match-demo-01',
    player_id: 'p-apx-4', // Ethan Cole
  },
  {
    id: 'motm-demo-2',
    match_id: 'match-demo-02',
    player_id: 'p-sol-4', // Gabriel Torres
  },
];

export const DEMO_COMMITTEE: CommitteeMember[] = [
  {
    id: 'cm-demo-1',
    name: 'Tournament Director',
    role: 'Lead Coordinator',
    phone: '+1 (555) 019-2831',
    display_order: 1,
  },
  {
    id: 'cm-demo-2',
    name: 'Chief Match Official',
    role: 'Head Referee & Disciplinary',
    phone: '+1 (555) 019-2832',
    display_order: 2,
  },
  {
    id: 'cm-demo-3',
    name: 'Operations Manager',
    role: 'Fixtures & Logistics',
    phone: '+1 (555) 019-2833',
    display_order: 3,
  },
];

export const DEMO_RULES: TournamentRule[] = [
  {
    id: 1,
    title: 'Match Duration',
    description: 'Each standard fixture consists of two 25-minute halves with a 5-minute half-time interval.',
  },
  {
    id: 2,
    title: 'Squad & Lineup Rules',
    description: 'Teams must register eligible players before kickoff. Rolling substitutions are permitted at referee stoppage.',
  },
  {
    id: 3,
    title: 'Scoring & Points System',
    description: 'Win = 3 Points, Draw = 1 Point, Loss = 0 Points. Standings tie-breakers: Points, Goal Difference, Goals Scored, Head-to-Head.',
  },
  {
    id: 4,
    title: 'Discipline & Conduct',
    description: 'Fair play is strictly enforced. Two yellow cards in consecutive matches result in a one-match suspension.',
  },
  {
    id: 5,
    title: 'Official Timekeeping',
    description: 'Match timing and stoppage time are controlled solely by the designated match referee.',
  },
];
