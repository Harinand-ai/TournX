/**
 * Tournament Service (Local Synthetic Data Foundation)
 *
 * Implements the application data access layer by delegating to localDataService.
 * Strictly decoupled from external network access and production Supabase backend.
 */

import {
  Team,
  Match,
  Player,
  Goal,
  Assist,
  ManOfTheMatch,
  CommitteeMember,
  POTMPoll,
  POTMCandidate,
  POTMVote,
} from '../types/tournament';
import { localDataService, FTM_STORAGE_KEYS } from './localDataService';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

class TournamentService {
  constructor() {
    localDataService.initialize();
  }

  // ================= TEAMS =================
  async getTeams(): Promise<Team[]> {
    return localDataService.getTeams();
  }

  async updateTeamManager(teamId: string, managerName: string): Promise<void> {
    localDataService.updateTeamManager(teamId, managerName);
  }

  // ================= MATCHES =================
  async getMatches(): Promise<Match[]> {
    return localDataService.getMatches();
  }

  async updateMatch(match: Match): Promise<void> {
    localDataService.updateMatch(match);
  }

  // ================= PLAYERS =================
  async getPlayers(): Promise<Player[]> {
    return localDataService.getPlayers();
  }

  async addPlayer(player: Omit<Player, 'id'>): Promise<Player> {
    const newPlayer: Player = {
      id: generateId('player'),
      ...player,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localDataService.addPlayer(newPlayer);
    return newPlayer;
  }

  async updatePlayer(player: Player): Promise<void> {
    localDataService.updatePlayer({
      ...player,
      updated_at: new Date().toISOString(),
    });
  }

  async deletePlayer(id: string): Promise<void> {
    localDataService.deletePlayer(id);
  }

  // ================= GOALS =================
  async getGoals(): Promise<Goal[]> {
    return localDataService.getGoals();
  }

  // ================= ASSISTS =================
  async getAssists(): Promise<Assist[]> {
    return localDataService.getAssists();
  }

  // ================= MAN OF THE MATCH =================
  async getManOfTheMatches(): Promise<ManOfTheMatch[]> {
    return localDataService.getMotm();
  }

  // ================= SAVE MATCH EDIT =================
  async saveSimplifiedMatch(
    matchId: string,
    status: Match['status'],
    fixtureDetails: {
      scheduled_date: string | null;
      scheduled_time: string | null;
      venue: string | null;
      referee: string | null;
      assistant_referee_1: string | null;
      assistant_referee_2: string | null;
    },
    homeScore: number | null,
    awayScore: number | null,
    goals: { player_id: string; team_id: string }[],
    motmPlayerId?: string
  ): Promise<void> {
    const matches = await this.getMatches();
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;

    targetMatch.status = status;
    targetMatch.scheduled_date = fixtureDetails.scheduled_date;
    targetMatch.scheduled_time = fixtureDetails.scheduled_time;
    targetMatch.venue = fixtureDetails.venue;
    targetMatch.referee = fixtureDetails.referee;
    targetMatch.assistant_referee_1 = fixtureDetails.assistant_referee_1;
    targetMatch.assistant_referee_2 = fixtureDetails.assistant_referee_2;
    targetMatch.home_score =
      status === 'COMPLETED'
        ? (homeScore ?? goals.filter(g => g.team_id === targetMatch.home_team_id).length)
        : homeScore;
    targetMatch.away_score =
      status === 'COMPLETED'
        ? (awayScore ?? goals.filter(g => g.team_id === targetMatch.away_team_id).length)
        : awayScore;
    targetMatch.updated_at = new Date().toISOString();

    await this.updateMatch(targetMatch);

    // Update match goals
    const newGoals: Goal[] = goals.map(g => ({
      id: generateId('goal'),
      match_id: matchId,
      player_id: g.player_id,
      team_id: g.team_id,
      minute: 0,
      created_at: new Date().toISOString(),
    }));

    const allGoals = (await this.getGoals()).filter(g => g.match_id !== matchId);
    allGoals.push(...newGoals);
    localDataService.setGoals(allGoals);

    // Update MOTM
    if (motmPlayerId) {
      const motmItem: ManOfTheMatch = {
        id: generateId('motm'),
        match_id: matchId,
        player_id: motmPlayerId,
        created_at: new Date().toISOString(),
      };
      const allMotm = (await this.getManOfTheMatches()).filter(m => m.match_id !== matchId);
      allMotm.push(motmItem);
      localDataService.setMotm(allMotm);
    }
  }

  async saveMatchResult(
    matchId: string,
    homeScore: number,
    awayScore: number,
    goals: { player_id: string; team_id: string; minute: number; assist_player_id?: string | null }[],
    _assists: { player_id: string; team_id: string; minute?: number }[],
    motmPlayerId?: string
  ): Promise<void> {
    const matches = await this.getMatches();
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;

    await this.saveSimplifiedMatch(
      matchId,
      'COMPLETED',
      {
        scheduled_date: targetMatch.scheduled_date ?? null,
        scheduled_time: targetMatch.scheduled_time ?? null,
        venue: targetMatch.venue ?? null,
        referee: targetMatch.referee ?? null,
        assistant_referee_1: targetMatch.assistant_referee_1 ?? null,
        assistant_referee_2: targetMatch.assistant_referee_2 ?? null,
      },

      homeScore,
      awayScore,
      goals.map(g => ({ player_id: g.player_id, team_id: g.team_id })),
      motmPlayerId
    );
  }

  // ================= COMMITTEE =================
  async getCommitteeMembers(): Promise<CommitteeMember[]> {
    return localDataService.getCommittee();
  }

  async updateCommitteeMember(member: CommitteeMember): Promise<void> {
    const members = await this.getCommitteeMembers();
    const updated = members.map(m => (m.id === member.id ? member : m));
    localDataService.setCommittee(updated);
  }

  // ================= POTM POLLS & LOCAL VOTING =================
  async getPolls(): Promise<POTMPoll[]> {
    return localDataService.getPolls();
  }

  async getPollByMatchId(matchId: string): Promise<POTMPoll | null> {
    const polls = await this.getPolls();
    return polls.find(p => p.match_id === matchId) || null;
  }

  async getActivePolls(): Promise<POTMPoll[]> {
    const polls = await this.getPolls();
    return polls.filter(p => p.status === 'active');
  }

  async createPoll(matchId: string, title: string, candidatePlayerIds: string[]): Promise<POTMPoll> {
    const pollId = generateId('poll');
    const newPoll: POTMPoll = {
      id: pollId,
      match_id: matchId,
      title,
      status: 'active',
      opened_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const newCandidates: POTMCandidate[] = candidatePlayerIds.map(playerId => ({
      id: generateId('candidate'),
      poll_id: pollId,
      player_id: playerId,
    }));

    const polls = await this.getPolls();
    polls.unshift(newPoll);
    localDataService.setPolls(polls);

    const allCandidates = localDataService.getCandidates();
    allCandidates.push(...newCandidates);
    localDataService.setCandidates(allCandidates);

    return newPoll;
  }

  async closePoll(pollId: string): Promise<void> {
    const polls = await this.getPolls();
    const updated = polls.map(p =>
      p.id === pollId
        ? { ...p, status: 'closed' as const, closed_at: new Date().toISOString() }
        : p
    );
    localDataService.setPolls(updated);
  }

  async getCandidates(pollId: string): Promise<POTMCandidate[]> {
    const all = localDataService.getCandidates();
    return all.filter(c => c.poll_id === pollId);
  }

  async getVotes(pollId: string): Promise<POTMVote[]> {
    const all = localDataService.getVotes();
    return all.filter(v => v.poll_id === pollId);
  }

  async getCurrentVoterId(): Promise<string> {
    return localDataService.getOrCreateVoterId();
  }

  async submitVote(
    pollId: string,
    candidateId: string,
    customUserId?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!pollId || !candidateId) {
      return { success: false, error: 'Poll and candidate selection are required.' };
    }

    const voterId = customUserId || localDataService.getOrCreateVoterId();
    const allVotes = localDataService.getVotes();
    const alreadyVoted = allVotes.some(v => v.poll_id === pollId && v.user_id === voterId);
    if (alreadyVoted) {
      return { success: false, error: 'You have already voted in this poll.' };
    }

    const newVote: POTMVote = {
      id: generateId('vote'),
      poll_id: pollId,
      candidate_id: candidateId,
      user_id: voterId,
      created_at: new Date().toISOString(),
    };

    allVotes.push(newVote);
    localDataService.setVotes(allVotes);

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`ftm_dev_potm_voted_${pollId}`, candidateId);
      } catch {}
    }

    return { success: true };
  }

  resetToOfficialFixtures(): void {
    localDataService.resetDemoData();
  }
}

export const tournamentService = new TournamentService();
