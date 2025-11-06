import { getMatch } from '@/app/actions/match';
import { getTournamentStatus } from '@/app/actions/tournament';
import { MatchRound, SimulationType, Match } from '@/types';
import Link from 'next/link';
import { ArrowLeft, Trophy, Clock, Target } from 'lucide-react';
import MatchReplay from '@/components/match/MatchReplay';
import CommentaryVoicePlayer from '@/components/match/CommentaryVoicePlayer';

// Helper function to serialize Date objects and Firestore Timestamps to ISO strings
function serializeMatchForClient(match: Match): Match {
  const serialized: any = {
    ...match,
    createdAt: match.createdAt instanceof Date ? match.createdAt.toISOString() : match.createdAt,
    completedAt: match.completedAt instanceof Date ? match.completedAt.toISOString() : match.completedAt,
  };
  
  // Serialize events if they exist
  if (match.events && Array.isArray(match.events)) {
    serialized.events = match.events.map(event => ({
      ...event,
      // Ensure all Date-like objects are strings
    }));
  }
  
  return serialized as Match;
}

const ROUND_LABELS: Record<MatchRound, string> = {
  quarterFinal: 'Quarter Final',
  semiFinal: 'Semi Final',
  final: 'Final',
};

export default async function PublicMatchPage({ 
  params 
}: { 
  params: Promise<{ matchId: string }> 
}) {
  const { matchId } = await params;
  const matchResult = await getMatch(matchId);
  const tournamentStatus = await getTournamentStatus();
  
  if (!matchResult.success || !matchResult.match) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="card card-padding text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Match Not Found</h1>
            <p className="text-gray-600 mb-6">The match you're looking for doesn't exist.</p>
            <Link 
              href="/" 
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  const match = matchResult.match;
  const isPlayed = match.simulationType === 'played';
  const isSimulated = match.simulationType === 'simulated';
  const isCompleted = match.status === 'completed';
  
  // Serialize match data for client components to prevent hydration errors
  const serializedMatch = serializeMatchForClient(match);
  
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tournament
        </Link>
        
        <div className="card card-padding">
          {/* Match Header */}
          <div className="border-b pb-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-500 uppercase">
                {ROUND_LABELS[match.round] || match.round}
                {match.bracketPosition && ` • ${match.bracketPosition}`}
              </span>
              {isSimulated && (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  Simulated Match
                </span>
              )}
              {isPlayed && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  AI Commentary Match
                </span>
              )}
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-8 mb-4">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-800">{match.team1.name}</h2>
                </div>
                <div className="text-4xl font-bold text-gray-800">
                  {isCompleted && match.result ? (
                    <>
                      {match.result.team1Score} - {match.result.team2Score}
                    </>
                  ) : (
                    'vs'
                  )}
                </div>
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-800">{match.team2.name}</h2>
                </div>
              </div>
              
              {isCompleted && match.result && (
                <div className="flex items-center justify-center gap-2 text-lg text-gray-600">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold">
                    Winner: {match.result.winnerId === match.team1.id ? match.team1.name : match.team2.name}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Match Details */}
          {isCompleted && match.result && (
            <>
              {/* Goal Scorers */}
              {match.result.goalScorers && match.result.goalScorers.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Goal Scorers
                  </h3>
                  <div className="space-y-2">
                    {match.result.goalScorers.map((goal, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-blue-600">
                            {goal.minute}'
                          </span>
                          <span className="font-medium text-gray-800">
                            {goal.playerName}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({goal.isExtraTime ? 'ET' : goal.isPenalty ? 'Pen' : ''})
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {goal.teamId === match.team1.id ? match.team1.name : match.team2.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Extra Time / Penalties Info */}
              {(match.result.wentToExtraTime || match.result.wentToPenalties) && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800 mb-2">
                    <Clock className="h-5 w-5" />
                    <span className="font-semibold">Match Duration</span>
                  </div>
                  {match.result.wentToExtraTime && (
                    <p className="text-sm text-yellow-700">This match went to extra time.</p>
                  )}
                  {match.result.wentToPenalties && match.result.penaltyShootout && (
                    <div className="mt-2 text-sm text-yellow-700">
                      <p className="font-semibold mb-1">Penalty Shootout:</p>
                      <p>
                        {match.team1.name}: {match.result.penaltyShootout.team1Score} - {match.team2.name}: {match.result.penaltyShootout.team2Score}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* AI Commentary (for played matches) */}
              {isPlayed && match.commentary && match.commentary.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Match Commentary
                  </h3>
                  
                  {/* Voice Commentary Player */}
                  <div className="mb-4">
                    <CommentaryVoicePlayer 
                      commentary={match.commentary} 
                      provider="browser"
                      autoPlay={false}
                    />
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
                    <div className="space-y-3">
                      {match.commentary.map((line, idx) => {
                        // Highlight goals
                        const isGoal = line.toLowerCase().includes('goal');
                        return (
                          <p 
                            key={idx}
                            className={`text-sm ${
                              isGoal 
                                ? 'font-semibold text-blue-700 bg-blue-50 p-2 rounded' 
                                : 'text-gray-700'
                            }`}
                          >
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Simulated Match Notice */}
              {isSimulated && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-6">
                  <p className="text-sm text-gray-600">
                    This match was simulated without AI commentary. Only the final scoreline and goal scorers are shown.
                  </p>
                </div>
              )}
              
              {/* Match Replay */}
              {serializedMatch.events && Array.isArray(serializedMatch.events) && serializedMatch.events.length > 0 ? (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Match Replay
                  </h3>
                  <MatchReplay match={serializedMatch} />
                </div>
              ) : null}
            </>
          )}
          
          {!isCompleted && (
            <div className="text-center py-8 text-gray-500">
              <p>This match has not been played yet.</p>
            </div>
          )}
        </div>
        
        <div className="mt-6 text-center">
          <Link 
            href="/" 
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Tournament Bracket
          </Link>
        </div>
      </div>
    </div>
  );
}
