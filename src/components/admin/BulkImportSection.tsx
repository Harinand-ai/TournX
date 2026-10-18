import React, { useState } from 'react';
import { Team, Player } from '../../types/tournament';
import { Tournament } from '../../types/multiTenant';
import {
  validateTeamsCSV,
  validatePlayersCSV,
  TEAM_CSV_TEMPLATE,
  PLAYER_CSV_TEMPLATE,
  ParsedTeamRow,
  ParsedPlayerRow,
  CSVParseResult,
} from '../../utils/csvImporter';
import { localDataService } from '../../services/localDataService';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Shield, 
  Check
} from 'lucide-react';

interface BulkImportSectionProps {
  tournament: Tournament;
  teams: Team[];
  players: Player[];
  onImportComplete: () => void;
}

export const BulkImportSection: React.FC<BulkImportSectionProps> = ({
  tournament,
  teams,
  players,
  onImportComplete,
}) => {
  const [importMode, setImportMode] = useState<'TEAMS' | 'PLAYERS'>('TEAMS');
  const [csvContent, setCsvContent] = useState<string>('');
  const [teamReport, setTeamReport] = useState<CSVParseResult<ParsedTeamRow> | null>(null);
  const [playerReport, setPlayerReport] = useState<CSVParseResult<ParsedPlayerRow> | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleDownloadTemplate = () => {
    const content = importMode === 'TEAMS' ? TEAM_CSV_TEMPLATE : PLAYER_CSV_TEMPLATE;
    const filename = importMode === 'TEAMS' ? 'tournx_teams_template.csv' : 'tournx_players_template.csv';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      setCsvContent(text || '');
      setTeamReport(null);
      setPlayerReport(null);
      setFeedback(null);
    };
    reader.readAsText(file);
  };

  const handleValidate = () => {
    setFeedback(null);
    if (!csvContent.trim()) {
      setFeedback({ type: 'error', message: 'Please paste CSV content or upload a CSV file first.' });
      return;
    }

    if (importMode === 'TEAMS') {
      const rep = validateTeamsCSV(csvContent, teams);
      setTeamReport(rep);
      setPlayerReport(null);
    } else {
      const rep = validatePlayersCSV(csvContent, teams, players);
      setPlayerReport(rep);
      setTeamReport(null);
    }
  };

  const handleCommitImport = () => {
    try {
      if (importMode === 'TEAMS' && teamReport) {
        if (teamReport.validRows.length === 0) {
          setFeedback({ type: 'error', message: 'No valid rows to import.' });
          return;
        }

        const newTeams: Team[] = teamReport.validRows.map(r => ({
          id: `team-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          name: r.name,
          short_name: r.short_name,
          manager_name: r.manager,
          manager_phone: r.manager_phone,
        }));

        const existing = localDataService.getTeams(tournament.id);
        localDataService.setTeams([...existing, ...newTeams], tournament.id);

        setFeedback({
          type: 'success',
          message: `Successfully imported ${newTeams.length} teams into "${tournament.name}".`,
        });
        setTeamReport(null);
        setCsvContent('');
        onImportComplete();
      } else if (importMode === 'PLAYERS' && playerReport) {
        if (playerReport.validRows.length === 0) {
          setFeedback({ type: 'error', message: 'No valid rows to import.' });
          return;
        }

        const teamLookup = new Map<string, string>();
        teams.forEach(t => {
          teamLookup.set(t.name.trim().toLowerCase(), t.id);
          if (t.short_name) {
            teamLookup.set(t.short_name.trim().toLowerCase(), t.id);
          }
        });

        const newPlayers: Player[] = playerReport.validRows.map(r => {
          const tId = teamLookup.get(r.team_name.trim().toLowerCase()) || teams[0]?.id || '';
          return {
            id: `p-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            name: r.name,
            team_id: tId,
            position: r.position,
            is_captain: r.is_captain,
          };
        });

        const existing = localDataService.getPlayers(tournament.id);
        localDataService.setPlayers([...existing, ...newPlayers], tournament.id);

        setFeedback({
          type: 'success',
          message: `Successfully imported ${newPlayers.length} players into "${tournament.name}".`,
        });
        setPlayerReport(null);
        setCsvContent('');
        onImportComplete();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Import failed.' });
    }
  };

  const currentReport = importMode === 'TEAMS' ? teamReport : playerReport;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">Bulk Data Importer</h2>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Import teams or player rosters from CSV with row-level validation, duplicate detection, and instant preview.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-all flex items-center gap-2 border border-zinc-700"
        >
          <Download className="w-4 h-4 text-sky-400" />
          Download {importMode === 'TEAMS' ? 'Teams' : 'Players'} Template
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          )}
          <div className="text-sm">{feedback.message}</div>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => { setImportMode('TEAMS'); setTeamReport(null); setPlayerReport(null); }}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
            importMode === 'TEAMS'
              ? 'bg-sky-500/15 border-sky-500 text-sky-300'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Import Teams ({teams.length} existing)
        </button>
        <button
          type="button"
          onClick={() => { setImportMode('PLAYERS'); setTeamReport(null); setPlayerReport(null); }}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
            importMode === 'PLAYERS'
              ? 'bg-sky-500/15 border-sky-500 text-sky-300'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Import Players ({players.length} existing)
        </button>
      </div>

      {/* Upload and Input Area */}
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-300">
            CSV Input (File or Paste Raw Text)
          </label>
          <label className="cursor-pointer text-xs font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            Upload File
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <textarea
          rows={6}
          value={csvContent}
          onChange={e => {
            setCsvContent(e.target.value);
            setTeamReport(null);
            setPlayerReport(null);
          }}
          placeholder={importMode === 'TEAMS' ? TEAM_CSV_TEMPLATE : PLAYER_CSV_TEMPLATE}
          className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-200 focus:border-sky-500 focus:outline-none"
        />

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleValidate}
            disabled={!csvContent.trim()}
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-sky-500/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            Parse & Validate CSV
          </button>
        </div>
      </div>

      {/* Validation Report Card */}
      {currentReport && (
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-3">
                <span>Validation Results</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-normal">
                  {currentReport.validRows.length} Valid
                </span>
                {currentReport.invalidRows.length > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-normal">
                    {currentReport.invalidRows.length} Errors
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Parsed {currentReport.totalRows} data row(s) from your CSV.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCommitImport}
              disabled={currentReport.validRows.length === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Check className="w-4 h-4" />
              Import {currentReport.validRows.length} Valid {importMode === 'TEAMS' ? 'Teams' : 'Players'}
            </button>
          </div>

          {/* Invalid Rows Table if Any */}
          {currentReport.invalidRows.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Rejected Rows ({currentReport.invalidRows.length}):
              </div>
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 max-h-48 overflow-y-auto divide-y divide-rose-900/40 text-xs">
                {currentReport.invalidRows.map((inv, idx) => (
                  <div key={idx} className="p-3 space-y-1">
                    <div className="font-semibold text-rose-300">
                      Row {inv.rowNumber}:
                    </div>
                    <ul className="list-disc list-inside text-rose-400/90 text-[11px]">
                      {inv.errors.map((e, ei) => (
                        <li key={ei}>{e}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valid Rows Preview Table */}
          {currentReport.validRows.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Accepted Rows Preview ({currentReport.validRows.length}):
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 text-zinc-400 text-[10px] uppercase border-b border-zinc-800">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Name</th>
                      {importMode === 'TEAMS' ? (
                        <>
                          <th className="py-2 px-3">Short</th>
                          <th className="py-2 px-3">Manager</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2 px-3">Team</th>
                          <th className="py-2 px-3">Position</th>
                          <th className="py-2 px-3">Captain</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-300">
                    {currentReport.validRows.slice(0, 50).map((row: any, idx) => (
                      <tr key={idx} className="hover:bg-zinc-900/40">
                        <td className="py-2 px-3 text-zinc-500 font-mono text-[10px]">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-white">{row.name}</td>
                        {importMode === 'TEAMS' ? (
                          <>
                            <td className="py-2 px-3 font-mono">{row.short_name || '—'}</td>
                            <td className="py-2 px-3">{row.manager || '—'}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-3">{row.team_name}</td>
                            <td className="py-2 px-3 font-mono">{row.position}</td>
                            <td className="py-2 px-3">{row.is_captain ? 'Yes' : 'No'}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
