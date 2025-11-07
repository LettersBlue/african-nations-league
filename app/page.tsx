import Link from "next/link";
import React, { Suspense } from "react";
import { getMatchesByTournament, getTeamsByTournament } from "@/lib/firebase/firestore";
import { getTournamentStatus } from "@/app/actions/tournament";
import BracketViewWrapper from "@/components/tournament/BracketViewWrapper";

// Country to flag emoji mapping
const COUNTRY_FLAGS: Record<string, string> = {
  'Algeria': '🇩🇿',
  'Angola': '🇦🇴',
  'Benin': '🇧🇯',
  'Botswana': '🇧🇼',
  'Burkina Faso': '🇧🇫',
  'Burundi': '🇧🇮',
  'Cameroon': '🇨🇲',
  'Cape Verde': '🇨🇻',
  'Central African Republic': '🇨🇫',
  'Chad': '🇹🇩',
  'Comoros': '🇰🇲',
  'Congo': '🇨🇬',
  'Congo (DRC)': '🇨🇩',
  'Djibouti': '🇩🇯',
  'Egypt': '🇪🇬',
  'Equatorial Guinea': '🇬🇶',
  'Eritrea': '🇪🇷',
  'Eswatini': '🇸🇿',
  'Ethiopia': '🇪🇹',
  'Gabon': '🇬🇦',
  'Gambia': '🇬🇲',
  'Ghana': '🇬🇭',
  'Guinea': '🇬🇳',
  'Guinea-Bissau': '🇬🇼',
  'Ivory Coast': '🇨🇮',
  'Kenya': '🇰🇪',
  'Lesotho': '🇱🇸',
  'Liberia': '🇱🇷',
  'Libya': '🇱🇾',
  'Madagascar': '🇲🇬',
  'Malawi': '🇲🇼',
  'Mali': '🇲🇱',
  'Mauritania': '🇲🇷',
  'Mauritius': '🇲🇺',
  'Morocco': '🇲🇦',
  'Mozambique': '🇲🇿',
  'Namibia': '🇳🇦',
  'Niger': '🇳🇪',
  'Nigeria': '🇳🇬',
  'Rwanda': '🇷🇼',
  'São Tomé and Príncipe': '🇸🇹',
  'Senegal': '🇸🇳',
  'Seychelles': '🇸🇨',
  'Sierra Leone': '🇸🇱',
  'Somalia': '🇸🇴',
  'South Africa': '🇿🇦',
  'South Sudan': '🇸🇸',
  'Sudan': '🇸🇩',
  'Tanzania': '🇹🇿',
  'Togo': '🇹🇬',
  'Tunisia': '🇹🇳',
  'Uganda': '🇺🇬',
  'Zambia': '🇿🇲',
  'Zimbabwe': '🇿🇼',
};

// Helper function to get team flag
function getTeamFlag(country: string | null | undefined): string {
  if (!country) return '';
  return COUNTRY_FLAGS[country] || '';
}

// Stable, locale-independent date formatting to avoid hydration mismatches
function formatDateStable(dateLike: any): string {
  try {
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '';
    const iso = d.toISOString(); // e.g. 2025-10-30T21:12
    return iso.slice(0, 16).replace('T', ' ');
  } catch {
    return '';
  }
}

// Helper function to serialize Date objects and Firestore Timestamps to ISO strings
function serializeForClient(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  // Handle Firestore Timestamps (objects with seconds and nanoseconds)
  if (obj && typeof obj === 'object' && 'seconds' in obj && 'nanoseconds' in obj) {
    return new Date(obj.seconds * 1000 + obj.nanoseconds / 1000000).toISOString();
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(serializeForClient);
  }
  
  // Handle plain objects
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeForClient(obj[key]);
      }
    }
    return serialized;
  }
  
  // Return primitives as-is
  return obj;
}

export default async function HomePage() {
  // Use Admin SDK-backed server action to ensure consistent SSR data
  const tournamentStatus = await getTournamentStatus();
  const tournament = tournamentStatus?.success ? tournamentStatus.tournament : null;
  let matches: any[] = [];
  let teams: any[] = [];
  
  if (tournament?.id) {
    matches = await getMatchesByTournament(tournament.id);
    teams = await getTeamsByTournament(tournament.id);
    // Optional: sort by createdAt ascending
    matches.sort((a: any, b: any) => (a.createdAt?.getTime?.() || 0) - (b.createdAt?.getTime?.() || 0));
  }

  // Serialize data before passing to Client Components
  const serializedTournament = tournament ? serializeForClient(tournament) : null;
  const serializedTeams = serializeForClient(teams);
  const serializedMatches = serializeForClient(matches);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-10">
        <div className="card card-padding mb-8">
          <h1 className="heading-primary">African Nations League</h1>
          <p className="text-description mt-2">Public matches overview</p>
        </div>

        {!tournament && (
          <div className="card card-sm">
            <p className="text-description">No tournament found yet. Please check back later.</p>
          </div>
        )}

        {tournament && (
          <>
            <div className="space-y-6">
              <div className="card card-padding flex items-center justify-between">
                <div>
                  <h2 className="heading-tertiary">{tournament.name || "Current Tournament"}</h2>
                  <p className="text-muted mt-1">Status: {tournament.status || 'registration'}</p>
                </div>
                <div className="flex gap-2">
                  <Link href="/tournament/scorers" className="text-link">Top Scorers</Link>
                  <span className="text-white/50">|</span>
                  <Link href="/tournament/history" className="text-link">History</Link>
                  <span className="text-white/50">|</span>
                  <Link href="/login" className="text-link">Login</Link>
                </div>
              </div>

            {/* Tournament Bracket Visualization */}
            {tournament.bracket && tournament.bracket.quarterFinals && tournament.bracket.quarterFinals.length > 0 && (
              <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-xl shadow-2xl overflow-hidden">
                <BracketViewWrapper tournament={serializedTournament} teams={serializedTeams} matches={serializedMatches} />
              </div>
            )}

            <div className="card">
              <div className="border-b px-4 py-3">
                <h3 className="heading-quaternary">Matches</h3>
              </div>

              {matches.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted">
                  No matches yet. When the tournament starts, they will appear here.
                </div>
              ) : (() => {
                // Get all match IDs from the current tournament bracket
                const bracketMatchIds = new Set<string>();
                if (tournament.bracket) {
                  tournament.bracket.quarterFinals?.forEach((qf: any) => {
                    if (qf.matchId) bracketMatchIds.add(qf.matchId);
                  });
                  tournament.bracket.semiFinals?.forEach((sf: any) => {
                    if (sf.matchId) bracketMatchIds.add(sf.matchId);
                  });
                  if (tournament.bracket.final?.matchId) {
                    bracketMatchIds.add(tournament.bracket.final.matchId);
                  }
                }
                
                // Filter matches to only show those in the current bracket, and sort by round then bracketPosition
                const filteredMatches = matches
                  .filter((m: any) => bracketMatchIds.has(m.id))
                  .sort((a: any, b: any) => {
                    // Sort by round order: quarterFinal -> semiFinal -> final
                    const roundOrder: Record<string, number> = {
                      quarterFinal: 1,
                      semiFinal: 2,
                      final: 3,
                    };
                    const roundDiff = (roundOrder[a.round] || 0) - (roundOrder[b.round] || 0);
                    if (roundDiff !== 0) return roundDiff;
                    
                    // Within same round, sort by bracketPosition
                    const posA = a.bracketPosition || '';
                    const posB = b.bracketPosition || '';
                    return posA.localeCompare(posB);
                  });
                
                if (filteredMatches.length === 0) {
                  return (
                    <div className="px-4 py-8 text-center text-muted">
                      No matches found for the current bracket.
                    </div>
                  );
                }
                
                return (
                  <ul className="divide-y">
                    {filteredMatches.map((m: any) => {
                      // Get team names from match object (team1.name or team1.id -> lookup from teams array)
                      const team1Name = m.team1?.name || (m.team1?.id && teams.find((t: any) => t.id === m.team1.id)?.country) || 'Team 1';
                      const team2Name = m.team2?.name || (m.team2?.id && teams.find((t: any) => t.id === m.team2.id)?.country) || 'Team 2';
                      const team1Flag = getTeamFlag(team1Name);
                      const team2Flag = getTeamFlag(team2Name);
                      const team1Score = m.result?.team1Score ?? m.team1Score;
                      const team2Score = m.result?.team2Score ?? m.team2Score;
                      
                      // Format score with penalties if applicable
                       let scoreDisplay: string | React.ReactElement = 'Scheduled';
                      if (typeof team1Score === 'number' && typeof team2Score === 'number') {
                        if (m.result?.wentToPenalties && m.result.penaltyShootout) {
                          const penaltyScore = m.result.penaltyShootout;
                          scoreDisplay = (
                            <span className="text-white font-medium">
                              {team1Score} - {team2Score} <span className="text-xs text-white/80">pens ({penaltyScore.team1Score} - {penaltyScore.team2Score})</span>
                            </span>
                          );
                        } else if (m.result?.wentToExtraTime && !m.result.wentToPenalties) {
                          scoreDisplay = (
                            <span className="text-white font-medium">
                              {team1Score} - {team2Score} <span className="text-xs text-white/80">(ET)</span>
                            </span>
                          );
                        } else {
                          scoreDisplay = (
                            <span className="text-white font-medium">
                              {team1Score} - {team2Score}
                            </span>
                          );
                        }
                      }
                      
                      return (
                        <li key={m.id} className="px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">
                              {team1Flag} {team1Name} vs {team2Flag} {team2Name}
                            </p>
                            <p className="text-sm text-muted">
                              {m.round || 'Match'}{m.bracketPosition ? ` (${m.bracketPosition})` : ''}{m.createdAt ? ` · ${formatDateStable(m.createdAt)}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            {typeof team1Score === 'number' && typeof team2Score === 'number' ? (
                              scoreDisplay
                            ) : (
                              <span className="text-xs px-2 py-1 rounded glass text-white/80">Scheduled</span>
                            )}
                            <Link href={`/tournament/matches/${m.id}`} className="text-link">
                              Details
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

