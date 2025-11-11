'use client';

import { useState, useEffect } from 'react';
import { Tournament, Team } from '@/types';
import { SingleEliminationBracket, MatchType, ParticipantType } from '@g-loot/react-tournament-brackets';

interface BracketViewProps {
  tournament: Tournament;
  teams: Team[];
  matches: any[];
}

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

export default function BracketView({ tournament, teams, matches }: BracketViewProps) {
  // Track window size for responsive design
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check on mount
    checkMobile();
    
    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  
  // Helper to get match from database by matchId
  const getMatchResult = (matchId: string) => {
    return matches.find(m => m.id === matchId);
  };

  // Helper to get team from teams array by teamId
  const getTeamById = (teamId: string | null | undefined) => {
    if (!teamId) return null;
    return teams.find(t => t.id === teamId) || null;
  };

  // Helper to get team flag from country name (from match document)
  const getTeamFlag = (countryName: string | null | undefined) => {
    if (!countryName) return null;
    return COUNTRY_FLAGS[countryName] || null;
  };

  // Helper to check if team is winner (using match result)
  const isWinner = (match: any, teamId: string) => {
    if (!match?.result || !teamId) return false;
    return match.result.winnerId === teamId;
  };

  // Helper to format match score with penalties
  const formatMatchScore = (match: any, team1Score: number, team2Score: number): string => {
    if (!match?.result) return '';
    
    // If match went to penalties, show penalty score
    if (match.result.wentToPenalties && match.result.penaltyShootout) {
      const penaltyScore = match.result.penaltyShootout;
      return `${team1Score} - ${team2Score} pens (${penaltyScore.team1Score} - ${penaltyScore.team2Score})`;
    }
    
    // If match went to extra time but not penalties, show ET indicator
    if (match.result.wentToExtraTime && !match.result.wentToPenalties) {
      return `${team1Score} - ${team2Score} (ET)`;
    }
    
    return `${team1Score} - ${team2Score}`;
  };

  // Helper to get match score
  const getMatchScore = (matchId: string) => {
    const match = getMatchResult(matchId);
    if (!match?.result) return null;
    return formatMatchScore(match, match.result.team1Score, match.result.team2Score);
  };

  const { quarterFinals = [], semiFinals = [], final = { matchId: null, team1Id: null, team2Id: null } } = tournament.bracket || {};

  // Debug logging
  console.log('🔍 BracketView Debug Info:');
  console.log('Tournament status:', tournament.status);
  console.log('Teams array length:', teams.length);
  console.log('Teams:', teams.map(t => ({ id: t.id, country: t.country })));
  console.log('Quarter Finals from bracket:', quarterFinals);
  console.log('Semi Finals from bracket:', semiFinals);
  console.log('Final from bracket:', final);

  // Ensure we always have 4 QF, 2 SF, and 1 Final - pad with empty entries if needed
  const paddedQuarterFinals = [...quarterFinals];
  while (paddedQuarterFinals.length < 4) {
    paddedQuarterFinals.push({ matchId: null, team1Id: null, team2Id: null });
  }

  const paddedSemiFinals = [...semiFinals];
  while (paddedSemiFinals.length < 2) {
    paddedSemiFinals.push({ matchId: null, team1Id: null, team2Id: null });
  }

  // If tournament hasn't started and we have registered teams, assign them to bracket slots
  // This allows teams to be visible in the bracket even before the tournament starts
  const registeredTeamIds = teams.map(t => t.id);
  console.log('Registered team IDs:', registeredTeamIds);
  
  let displayQuarterFinals = [...paddedQuarterFinals];
  
  if (tournament.status === 'registration' && registeredTeamIds.length > 0) {
    // Count how many teams are already assigned in the bracket
    const assignedTeamIds = new Set<string>();
    paddedQuarterFinals.forEach(qf => {
      if (qf.team1Id) assignedTeamIds.add(qf.team1Id);
      if (qf.team2Id) assignedTeamIds.add(qf.team2Id);
    });
    
    console.log('Already assigned team IDs:', Array.from(assignedTeamIds));
    
    // Get unassigned teams
    const unassignedTeamIds = registeredTeamIds.filter(id => !assignedTeamIds.has(id));
    console.log('Unassigned team IDs:', unassignedTeamIds);
    
    // Assign unassigned teams to empty bracket slots
    let unassignedIndex = 0;
    displayQuarterFinals = displayQuarterFinals.map((qf, idx) => {
      const updated = { ...qf };
      
      // Fill empty team1 slot
      if (!updated.team1Id && unassignedIndex < unassignedTeamIds.length) {
        updated.team1Id = unassignedTeamIds[unassignedIndex];
        console.log(`Assigning team ${unassignedTeamIds[unassignedIndex]} to QF${idx + 1} team1`);
        unassignedIndex++;
      }
      
      // Fill empty team2 slot
      if (!updated.team2Id && unassignedIndex < unassignedTeamIds.length) {
        updated.team2Id = unassignedTeamIds[unassignedIndex];
        console.log(`Assigning team ${unassignedTeamIds[unassignedIndex]} to QF${idx + 1} team2`);
        unassignedIndex++;
      }
      
      return updated;
    });
    
    console.log('Final displayQuarterFinals:', displayQuarterFinals);
  } else {
    console.log('Skipping team assignment - status:', tournament.status, 'teams count:', registeredTeamIds.length);
  }

  // Convert our bracket format to the library's format
  const convertToMatches = (): MatchType[] => {
    const matchesArray: MatchType[] = [];

    // Quarter Finals matches (4 matches) - Always show all 4 matches
    displayQuarterFinals.forEach((qf, idx) => {
      const match = getMatchResult(qf.matchId || '');
      
      // Determine next match ID based on bracket structure
      // QF 0,1 -> SF 0, QF 2,3 -> SF 1
      // Use placeholder IDs if matchId doesn't exist (during registration)
      let nextMatchId: string | null = null;
      if (idx < 2) {
        nextMatchId = paddedSemiFinals[0]?.matchId || 'sf0-placeholder';
      } else {
        nextMatchId = paddedSemiFinals[1]?.matchId || 'sf1-placeholder';
      }
      
      // Get team data - prioritize match data, then bracket teamIds, then TBD
      let team1Id: string | null = null;
      let team2Id: string | null = null;
      let team1Name: string | null = null;
      let team2Name: string | null = null;
      
      if (match) {
        // Match exists - use match data (source of truth)
        team1Id = match.team1?.id || null;
        team2Id = match.team2?.id || null;
        team1Name = match.team1?.name || null;
        team2Name = match.team2?.name || null;
        console.log(`QF${idx + 1}: Using match data - team1: ${team1Name}, team2: ${team2Name}`);
      } else if (qf.team1Id || qf.team2Id) {
        // No match but teams assigned in bracket - look up from teams array
        console.log(`QF${idx + 1}: Looking up teams from bracket - team1Id: ${qf.team1Id}, team2Id: ${qf.team2Id}`);
        if (qf.team1Id) {
          const team1 = getTeamById(qf.team1Id);
          team1Id = qf.team1Id;
          team1Name = team1?.country || null;
          console.log(`QF${idx + 1}: Found team1:`, team1 ? team1.country : 'NOT FOUND');
        }
        if (qf.team2Id) {
          const team2 = getTeamById(qf.team2Id);
          team2Id = qf.team2Id;
          team2Name = team2?.country || null;
          console.log(`QF${idx + 1}: Found team2:`, team2 ? team2.country : 'NOT FOUND');
        }
      } else {
        console.log(`QF${idx + 1}: No match and no teamIds - showing TBD`);
      }
      
      const qfWon = match?.result ? isWinner(match, team1Id || '') : false;

      matchesArray.push({
        id: qf.matchId || `qf${idx}-placeholder`,
        name: `QF${idx + 1}`,
        nextMatchId,
        startTime: '',
        state: match?.status === 'completed' ? 'PLAYED' : (team1Id && team2Id ? 'NO_SHOW' : 'NO_PARTY'),
        tournamentRoundText: 'Quarter Finals',
        participants: [
          {
            id: team1Id || `qf${idx}-team1`,
            name: team1Name ? `${getTeamFlag(team1Name) || ''} ${team1Name}` : 'TBD',
            isWinner: qfWon,
            status: team1Id ? 'PLAYED' : 'NO_PARTY',
            resultText: match?.result && team1Id ? match.result.team1Score?.toString() : null,
          },
          {
            id: team2Id || `qf${idx}-team2`,
            name: team2Name ? `${getTeamFlag(team2Name) || ''} ${team2Name}` : 'TBD',
            isWinner: match?.result ? !qfWon : false,
            status: team2Id ? 'PLAYED' : 'NO_PARTY',
            resultText: match?.result && team2Id ? match.result.team2Score?.toString() : null,
          },
        ],
        match: match || null, // Pass match data for penalty info
      });
    });

    // Semi Finals matches (2 matches) - Always show both matches
    paddedSemiFinals.forEach((sf, idx) => {
      const match = getMatchResult(sf.matchId || '');
      
      // Get team data - prioritize match data, then bracket teamIds, then TBD
      let team1Id: string | null = null;
      let team2Id: string | null = null;
      let team1Name: string | null = null;
      let team2Name: string | null = null;
      
      if (match) {
        // Match exists - use match data (source of truth)
        team1Id = match.team1?.id || null;
        team2Id = match.team2?.id || null;
        team1Name = match.team1?.name || null;
        team2Name = match.team2?.name || null;
      } else if (sf.team1Id || sf.team2Id) {
        // No match but teams assigned in bracket - look up from teams array
        if (sf.team1Id) {
          const team1 = getTeamById(sf.team1Id);
          team1Id = sf.team1Id;
          team1Name = team1?.country || null;
        }
        if (sf.team2Id) {
          const team2 = getTeamById(sf.team2Id);
          team2Id = sf.team2Id;
          team2Name = team2?.country || null;
        }
      }
      
      const sfWon = match?.result ? isWinner(match, team1Id || '') : false;

      matchesArray.push({
        id: sf.matchId || `sf${idx}-placeholder`,
        name: `SF${idx + 1}`,
        nextMatchId: final.matchId || 'final-placeholder',
        startTime: '',
        state: match?.status === 'completed' ? 'PLAYED' : (team1Id && team2Id ? 'NO_SHOW' : 'NO_PARTY'),
        tournamentRoundText: 'Semi Finals',
        participants: [
          {
            id: team1Id || `sf${idx}-team1`,
            name: team1Name ? `${getTeamFlag(team1Name) || ''} ${team1Name}` : 'TBD',
            isWinner: sfWon,
            status: team1Id ? 'PLAYED' : 'NO_PARTY',
            resultText: match?.result && team1Id ? match.result.team1Score?.toString() : null,
          },
          {
            id: team2Id || `sf${idx}-team2`,
            name: team2Name ? `${getTeamFlag(team2Name) || ''} ${team2Name}` : 'TBD',
            isWinner: match?.result ? !sfWon : false,
            status: team2Id ? 'PLAYED' : 'NO_PARTY',
            resultText: match?.result && team2Id ? match.result.team2Score?.toString() : null,
          },
        ],
        match: match || null, // Pass match data for penalty info
      });
    });

    // Final match - Always show
    const finalMatch = getMatchResult(final.matchId || '');
    
    // Get team data - prioritize match data, then bracket teamIds, then TBD
    let team1Id: string | null = null;
    let team2Id: string | null = null;
    let team1Name: string | null = null;
    let team2Name: string | null = null;
    
    if (finalMatch) {
      // Match exists - use match data (source of truth)
      team1Id = finalMatch.team1?.id || null;
      team2Id = finalMatch.team2?.id || null;
      team1Name = finalMatch.team1?.name || null;
      team2Name = finalMatch.team2?.name || null;
    } else if (final.team1Id || final.team2Id) {
      // No match but teams assigned in bracket - look up from teams array
      if (final.team1Id) {
        const team1 = getTeamById(final.team1Id);
        team1Id = final.team1Id;
        team1Name = team1?.country || null;
      }
      if (final.team2Id) {
        const team2 = getTeamById(final.team2Id);
        team2Id = final.team2Id;
        team2Name = team2?.country || null;
      }
    }
    
    const finalWon = finalMatch?.result ? isWinner(finalMatch, team1Id || '') : false;

    matchesArray.push({
      id: final.matchId || 'final-placeholder',
      name: 'Final',
      nextMatchId: null, // No next match - winner is positioned absolutely
      startTime: '',
      state: finalMatch?.status === 'completed' ? 'PLAYED' : (team1Id && team2Id ? 'NO_SHOW' : 'NO_PARTY'),
      tournamentRoundText: 'Final',
      participants: [
        {
          id: team1Id || 'final-team1',
          name: team1Name ? `${getTeamFlag(team1Name) || ''} ${team1Name}` : 'TBD',
          isWinner: finalWon,
          status: team1Id ? 'PLAYED' : 'NO_PARTY',
          resultText: finalMatch?.result && team1Id ? finalMatch.result.team1Score?.toString() : null,
        },
        {
          id: team2Id || 'final-team2',
          name: team2Name ? `${getTeamFlag(team2Name) || ''} ${team2Name}` : 'TBD',
          isWinner: finalMatch?.result ? !finalWon : false,
          status: team2Id ? 'PLAYED' : 'NO_PARTY',
          resultText: finalMatch?.result && team2Id ? finalMatch.result.team2Score?.toString() : null,
        },
      ],
      match: finalMatch || null, // Pass match data for penalty info
    });

    // Winner match is now rendered separately with absolute positioning
    // No need to add it to the bracket matches array
    
    return matchesArray;
  };

  const bracketMatches = convertToMatches();
  
  // Debug: Log what's being passed to the bracket
  console.log('📊 bracketMatches array:', bracketMatches);
  console.log('📊 bracketMatches length:', bracketMatches.length);
  console.log('📊 Expected: 7 matches (4 QF + 2 SF + 1 Final)');
  
  const qfMatches = bracketMatches.filter(m => m.tournamentRoundText === 'Quarter Finals');
  const sfMatches = bracketMatches.filter(m => m.tournamentRoundText === 'Semi Finals');
  const finalMatches = bracketMatches.filter(m => m.tournamentRoundText === 'Final');
  
  console.log(`📊 QF matches: ${qfMatches.length}/4`);
  console.log(`📊 SF matches: ${sfMatches.length}/2`);
  console.log(`📊 Final matches: ${finalMatches.length}/1`);
  
  bracketMatches.forEach((m: any, idx: number) => {
    const participants = m.participants?.map((p: any) => p.name) || [];
    console.log(`Match ${idx + 1} (${m.name || m.tournamentRoundText}):`, {
      id: m.id,
      participants: participants,
      participantCount: participants.length,
      state: m.state,
      tournamentRoundText: m.tournamentRoundText,
      hasBothParticipants: participants.length === 2
    });
  });

  // Create a map of match IDs to match data for quick lookup
  const matchDataMap = new Map<string, any>();
  bracketMatches.forEach((m: any) => {
    if (m.id && m.match) {
      matchDataMap.set(m.id, m.match);
    }
  });

  // Shared team box component to ensure identical sizing/styling
  const TeamBox = ({ 
    name, 
    won, 
    resultText, 
    match, 
    teamId 
  }: { 
    name: string; 
    won: boolean; 
    resultText?: string;
    match?: any;
    teamId?: string;
  }) => {
    // Get additional penalty info if available
    let displayText = resultText || '';
    if (match?.result?.wentToPenalties && match.result.penaltyShootout && teamId) {
      const penaltyScore = match.result.penaltyShootout;
      const isTeam1 = match.team1?.id === teamId;
      const penaltyScoreForTeam = isTeam1 ? penaltyScore.team1Score : penaltyScore.team2Score;
      const regularScore = isTeam1 ? match.result.team1Score : match.result.team2Score;
      displayText = `${regularScore} (pens: ${penaltyScoreForTeam})`;
    }
    
    // Responsive sizing for team boxes
    const boxHeight = isMobile ? '56px' : '64px';
    const padding = isMobile ? '10px 12px' : '14px 16px';
    const nameFontSize = isMobile ? 'text-sm' : 'text-base';
    const scoreFontSize = isMobile ? 'text-[10px]' : 'text-xs';
    
    return (
      <div
        className={`team-box w-full rounded-lg border-2 glass ${
          won ? 'border-yellow-400 shadow-lg' : 'border-gray-300'
        }`}
        style={{
          // Fixed dimensions to avoid clipping - ensure enough height for content
          height: boxHeight, // Responsive height
          padding: padding,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible', // Ensure content is never clipped
          boxSizing: 'border-box',
        }}
      >
        <div className="text-center" style={{ overflow: 'visible' }}>
          <div className={`${nameFontSize} font-semibold text-white whitespace-nowrap overflow-visible`}>{name}</div>
          {displayText && <div className={`${scoreFontSize} text-white/80 mt-0.5 md:mt-1`}>{displayText}</div>}
        </div>
      </div>
    );
  };

  // Custom match component using the unified TeamBox
  const CustomMatchComponent = ({
    topParty,
    bottomParty,
    topWon,
    bottomWon,
    match,
  }: any) => {
    const topName = topParty?.name || 'TBD';
    const bottomName = bottomParty?.name || 'TBD';
    
    // Get the actual match data for penalty info
    // Try multiple ways to get the match ID
    let matchData = null;
    let matchId = null;
    
    if (match?.id) {
      matchId = match.id;
    } else if (topParty?.id || bottomParty?.id) {
      // Find match by participant IDs
      const foundMatch = bracketMatches.find((m: any) => 
        m.participants?.some((p: any) => p.id === topParty?.id || p.id === bottomParty?.id)
      );
      matchId = foundMatch?.id;
    }
    
    if (matchId) {
      matchData = matchDataMap.get(matchId) || getMatchResult(matchId);
    }


    // Responsive min-width for match container
    const minWidth = isMobile ? '180px' : '220px';
    
    return (
      <div 
        className="flex flex-col items-center relative" 
        style={{ 
          minWidth,
          overflow: 'visible',
          paddingTop: isMobile ? '12px' : '16px',
          paddingBottom: isMobile ? '12px' : '16px', // Extra bottom padding to prevent clipping
        }}
      >
        <TeamBox 
          name={topName} 
          won={!!topWon} 
          resultText={topParty?.resultText}
          match={matchData}
          teamId={topParty?.id}
        />
        <div className="text-xs text-white/70 font-medium my-1 md:my-2" style={{ height: isMobile ? '16px' : '20px' }}>vs</div>
        <TeamBox 
          name={bottomName} 
          won={!!bottomWon} 
          resultText={bottomParty?.resultText}
          match={matchData}
          teamId={bottomParty?.id}
        />
      </div>
    );
  };

  // Responsive bracket options based on screen size
  const bracketOptions = {
    style: {
      connectorColor: '#fb923c',
      connectorColorHighlight: '#ea580c',
      roundHeader: {
        isShown: true,
        // backgroundColor controlled by CSS in globals.css
        fontColor: '#ffffff',
        fontFamily: 'system-ui',
        fontSize: isMobile ? 12 : 16,
        height: isMobile ? 40 : 50,
        marginBottom: isMobile ? 20 : 30,
                  roundTextGenerator: (currentRound: number, roundsTotal: number) => {
                    const rounds = ['Quarter Finals', 'Semi Finals', 'Final'];
                    return rounds[currentRound - 1] || `Round ${currentRound}`;
                  },
      },
      // Responsive box height
      boxHeight: isMobile ? 180 : 210,
      // Responsive padding
      canvasPadding: isMobile ? 30 : 60,
      // Responsive spacing between columns and rows
      spaceBetweenColumns: isMobile ? 100 : 200,
      spaceBetweenRows: isMobile ? 40 : 80,
      lineInfo: {
        separation: isMobile ? 15 : 20,
        homeVisitorSpread: isMobile ? 10 : 15,
      },
    },
  };

  return (
    <div className="w-full overflow-x-auto glass rounded-xl p-4 md:p-6 lg:p-8">
      <div className="text-center mb-4 md:mb-6 lg:mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2">
          {tournament.name || 'African Nations League'}
        </h2>
        <p className="text-base md:text-xl lg:text-2xl text-orange-500 font-bold">ROAD TO THE FINAL</p>
      </div>

      <div 
        className="rounded-lg p-3 md:p-4 lg:p-6 overflow-x-auto" 
        style={{ 
          overflowY: 'visible',
          backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(/field.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backdropFilter: 'blur(10px) saturate(180%)',
          WebkitBackdropFilter: 'blur(10px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)'
        }}
      >
        <div className="inline-block min-w-full tournament-bracket-container">
          <SingleEliminationBracket
            matches={bracketMatches}
            matchComponent={CustomMatchComponent}
            options={bracketOptions}
          />
        </div>
      </div>

      {/* Trophy display below bracket - always visible */}
      <div className="text-center mt-8 md:mt-12">
        <div className="relative inline-block">
          {/* Trophy Image */}
          <div className="relative">
            <img 
              src="/Trophy.jpg" 
              alt="AFKON Cup Trophy" 
              className="w-32 h-auto md:w-48 lg:w-64 mx-auto drop-shadow-2xl"
              style={{ maxHeight: '400px' }}
            />
          </div>
          
          {/* Winner Container - always visible below trophy */}
          <div className="mt-4 md:mt-6 glass rounded-lg p-4 md:p-6 min-w-[200px] md:min-w-[300px]">
            {(() => {
              const finalMatch = getMatchResult(final.matchId);
              const hasWinner = finalMatch?.result?.winnerId;
              
              if (!hasWinner) {
                // No winner yet - show TBD
                return (
                  <>
                    <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-white/70">
                      TBD
                    </h3>
                    <p className="text-sm md:text-base text-white/50 mt-1">Champions</p>
                  </>
                );
              }
              
              // Get winner team information
              const winnerId = finalMatch.result.winnerId;
              const winnerTeam = finalMatch.team1?.id === winnerId ? finalMatch.team1 : finalMatch.team2;
              const winnerName = winnerTeam?.name || 'Winner';
              const winnerFlag = getTeamFlag(winnerName);
              
              return (
                <>
                  {/* Winner Badge/Emoji */}
                  <div className="text-4xl md:text-5xl lg:text-6xl mb-2">
                    {winnerFlag || '🏆'}
                  </div>
                  {/* Winner Name */}
                  <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-1">
                    {winnerName}
                  </h3>
                  <p className="text-sm md:text-base text-yellow-400 font-semibold">Champions</p>
                </>
              );
            })()}
          </div>
        </div>
      </div>

    </div>
  );
}
