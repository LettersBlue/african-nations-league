'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getUser } from '@/lib/firebase/firestore';
import { getUserTeam } from '@/app/actions/team';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users2, ArrowLeft, Trophy, Shield, Target, Zap, Award } from 'lucide-react';
import { Player, Position, POSITION_LABELS } from '@/types';

const POSITION_COLORS: Record<Position, string> = {
  GK: 'bg-blue-100 text-blue-800 border-blue-300',
  DF: 'bg-green-100 text-green-800 border-green-300',
  MD: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  AT: 'bg-red-100 text-red-800 border-red-300',
};

export default function TeamDetailPage() {
  const [user, setUser] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await getUser(firebaseUser.uid);
        if (!userData || userData.role !== 'representative') {
          router.push('/login');
        } else {
          setUser(userData);
          
          // Load team data
          const teamResult = await getUserTeam(firebaseUser.uid);
          if (teamResult.success && teamResult.team) {
            setTeam(teamResult.team);
          } else {
            // Redirect if no team
            router.push('/representative');
          }
          
          setLoading(false);
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return null;
  }

  // Group players by position
  const playersByPosition = team.players.reduce((acc: Record<Position, Player[]>, player: Player) => {
    if (!acc[player.naturalPosition]) {
      acc[player.naturalPosition] = [];
    }
    acc[player.naturalPosition].push(player);
    return acc;
  }, {} as Record<Position, Player[]>);

  // Get captain
  const captain = team.players.find((p: Player) => p.isCaptain);

  // Calculate position averages
  const positionAverages = (Object.entries(playersByPosition) as [Position, Player[]][]).map(([position, players]) => {
    const avgRating = players.reduce((sum: number, p: Player) => {
      // Calculate overall rating as average of all position ratings
      const overall = (p.ratings.GK + p.ratings.DF + p.ratings.MD + p.ratings.AT) / 4;
      return sum + overall;
    }, 0) / players.length;
    return { position, players, avgRating };
  });

  return (
    <div className="min-h-screen ">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="outline" onClick={() => router.push('/representative')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <h1 className="text-4xl font-bold text-blue-900">{team.country}</h1>
            </div>
            <p className="text-gray-600 text-lg">Manager: {team.managerName}</p>
            <div className="mt-4 inline-flex items-center gap-4">
              <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold">
                Overall Rating: {team.overallRating.toFixed(1)}
              </span>
              <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                {team.players.length} Players
              </span>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{team.stats.wins}</div>
                <div className="text-sm text-gray-600 mt-1">Wins</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{team.stats.draws}</div>
                <div className="text-sm text-gray-600 mt-1">Draws</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{team.stats.goalsScored}</div>
                <div className="text-sm text-gray-600 mt-1">Goals Scored</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{team.stats.goalsConceded}</div>
                <div className="text-sm text-gray-600 mt-1">Goals Conceded</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Captain */}
        {captain && (
          <Card className="mb-8 border-yellow-400 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                Captain
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold">{captain.name}</div>
                  <div className="text-sm text-gray-600">{POSITION_LABELS[captain.naturalPosition as Position]}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    Rating: {((captain.ratings.GK + captain.ratings.DF + captain.ratings.MD + captain.ratings.AT) / 4).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-500">Goals: {captain.goals || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Players by Position */}
        <div className="space-y-6">
          {positionAverages.map(({ position, players, avgRating }) => (
            <Card key={position}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {position === 'GK' && <Shield className="h-5 w-5 text-blue-600" />}
                    {position === 'DF' && <Shield className="h-5 w-5 text-green-600" />}
                    {position === 'MD' && <Zap className="h-5 w-5 text-yellow-600" />}
                    {position === 'AT' && <Target className="h-5 w-5 text-red-600" />}
                    {POSITION_LABELS[position as Position]} ({players.length})
                  </CardTitle>
                  <span className="text-sm text-gray-600">
                    Avg Rating: <span className="font-semibold">{avgRating.toFixed(1)}</span>
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {players.map((player: Player) => (
                    <div
                      key={player.id}
                      className={`p-4 rounded-lg border-2 ${
                        player.isCaptain
                          ? 'border-yellow-400 bg-yellow-50'
                          : POSITION_COLORS[player.naturalPosition]
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">{player.name}</span>
                            {player.isCaptain && (
                              <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-semibold">
                                C
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {POSITION_LABELS[player.naturalPosition]}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Overall:</span>
                          <span className="font-semibold">
                            {((player.ratings.GK + player.ratings.DF + player.ratings.MD + player.ratings.AT) / 4).toFixed(1)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 pt-1">
                          <div className="flex justify-between">
                            <span>GK:</span>
                            <span className="font-medium">{player.ratings.GK.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>DF:</span>
                            <span className="font-medium">{player.ratings.DF.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>MD:</span>
                            <span className="font-medium">{player.ratings.MD.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>AT:</span>
                            <span className="font-medium">{player.ratings.AT.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="pt-2 mt-2 border-t border-gray-300">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Goals:</span>
                            <span className="font-semibold">{player.goals || 0}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Apps:</span>
                            <span>{player.appearances || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

