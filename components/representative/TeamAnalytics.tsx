'use client';

import { useEffect, useState } from 'react';
import { getTeamAnalytics } from '@/app/actions/analytics';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Target, TrendingUp, Award } from 'lucide-react';

interface TeamAnalytics {
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  goalDifference: number;
  winRate: number;
  avgGoalsPerMatch: number;
  matchHistory: Array<{
    matchId: string;
    opponent: string;
    score: string;
    result: 'win' | 'draw' | 'loss';
    goalsScored: number;
    goalsConceded: number;
    round: string;
    date: Date;
  }>;
  topScorer: {
    playerId: string;
    playerName: string;
    goals: number;
    position: string;
  } | null;
  playerGoals: Array<{
    playerId: string;
    playerName: string;
    goals: number;
    position: string;
  }>;
  goalsPerMatch: Array<{
    matchNumber: number;
    goalsScored: number;
    goalsConceded: number;
  }>;
}

interface TeamAnalyticsProps {
  representativeUid: string;
}

const COLORS = {
  win: '#22c55e',
  draw: '#eab308',
  loss: '#ef4444',
};

export default function TeamAnalytics({ representativeUid }: TeamAnalyticsProps) {
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const result = await getTeamAnalytics(representativeUid);
        if (result.success && result.analytics) {
          setAnalytics(result.analytics);
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [representativeUid]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics || analytics.matchesPlayed === 0) {
    return (
      <div className="text-center py-8">
        <Target className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">Analytics will appear here once your team plays matches.</p>
      </div>
    );
  }

  // Prepare data for charts
  const winLossData = [
    { name: 'Wins', value: analytics.wins, color: COLORS.win },
    { name: 'Draws', value: analytics.draws, color: COLORS.draw },
    { name: 'Losses', value: analytics.losses, color: COLORS.loss },
  ];

  const topPlayers = analytics.playerGoals.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-green-600">{analytics.winRate.toFixed(1)}%</p>
              </div>
              <Trophy className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Goals Scored</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.goalsScored}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Goals/Match</p>
                <p className="text-2xl font-bold text-purple-600">{analytics.avgGoalsPerMatch.toFixed(1)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Goal Difference</p>
                <p className={`text-2xl font-bold ${analytics.goalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.goalDifference >= 0 ? '+' : ''}{analytics.goalDifference}
                </p>
              </div>
              <Award className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win/Draw/Loss Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Match Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={winLossData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Goals Per Match Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Goals Per Match</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.goalsPerMatch}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="matchNumber" label={{ value: 'Match', position: 'insideBottom', offset: -5 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="goalsScored" stroke="#3b82f6" name="Goals Scored" strokeWidth={2} />
                <Line type="monotone" dataKey="goalsConceded" stroke="#ef4444" name="Goals Conceded" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Player Goals Bar Chart */}
      {topPlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Goal Scorers</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPlayers} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="playerName" type="category" width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="goals" fill="#3b82f6" name="Goals" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Scorer */}
      {analytics.topScorer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Scorer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="bg-yellow-100 rounded-full p-4">
                <Trophy className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{analytics.topScorer.playerName}</h3>
                <p className="text-gray-600">{analytics.topScorer.position} • {analytics.topScorer.goals} Goals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match History Table */}
      {analytics.matchHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Match History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Opponent</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Round</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Score</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analytics.matchHistory.map((match) => (
                    <tr key={match.matchId} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-800">{match.opponent}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{match.round}</td>
                      <td className="px-4 py-2 text-sm text-center font-semibold">{match.score}</td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            match.result === 'win'
                              ? 'bg-green-100 text-green-700'
                              : match.result === 'draw'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {match.result.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
