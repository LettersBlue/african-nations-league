'use client';

import { useState, useEffect, useRef } from 'react';
import { Match, MatchEvent, MatchEventType, Team } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Target, Clock, Trophy, Volume2, VolumeX, AlertTriangle, Flag, Megaphone, Users, 
  Play, Pause, SkipForward, Circle, Save, X, CheckCircle, XCircle, 
  ArrowRight, CreditCard, Activity, Zap, RefreshCw
} from 'lucide-react';
import { speakText, stopSpeech } from '@/lib/audio/text-to-speech';
import { generateEventCommentary, CommentaryContext } from '@/lib/commentary/event-commentary';
import { generateContinuousCommentary } from '@/lib/ai/cohere';
import { getTeam } from '@/app/actions/team';

interface ProgressiveMatchSimulationProps {
  match: Match;
  onComplete: (result: any) => void;
}

export default function ProgressiveMatchSimulation({ match, onComplete }: ProgressiveMatchSimulationProps) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [timerSeconds, setTimerSeconds] = useState<number>(0); // Timer counts in seconds (0-90 or 0-120)
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [currentScore, setCurrentScore] = useState({ team1: 0, team2: 0 });
  const [commentaryEnabled, setCommentaryEnabled] = useState(true);
  const [currentCommentary, setCurrentCommentary] = useState<string>('');
  const [team1Data, setTeam1Data] = useState<Team | null>(null);
  const [team2Data, setTeam2Data] = useState<Team | null>(null);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [processedEvents, setProcessedEvents] = useState<Set<string>>(new Set());
  const [recentEvents, setRecentEvents] = useState<MatchEvent[]>([]);
  
  const initializedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextUnlockedRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const commentaryQueueRef = useRef<string[]>([]);
  const lastCommentaryTimeRef = useRef<number>(0);
  const commentaryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCommentarySecondsRef = useRef<number>(0);

  // Calculate total match duration (90 seconds for normal, 120 if extra time)
  const hasExtraTime = match.result?.wentToExtraTime || false;
  const totalMatchSeconds = hasExtraTime ? 120 : 90;
  const currentMatchMinute = Math.floor(timerSeconds); // 1 second = 1 minute

  // Unlock audio context
  const unlockAudioContext = async () => {
    if (audioContextUnlockedRef.current) return;
    try {
      const testAudio = new Audio('/sounds/referee-whistle.mp3');
      testAudio.volume = 0.01;
      await testAudio.play().then(() => {
        testAudio.pause();
        testAudio.currentTime = 0;
        audioContextUnlockedRef.current = true;
      }).catch(() => {});
    } catch (error) {
      console.warn('Failed to unlock audio context:', error);
    }
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    unlockAudioContext();

    // Load team data
    const loadTeams = async () => {
      try {
        setIsLoadingTeams(true);
        
        // Always fetch full team data (match.team1/team2 only has basic info)
        const [team1Result, team2Result] = await Promise.all([
          getTeam(match.team1.id),
          getTeam(match.team2.id),
        ]);
        
        if (team1Result.success && team1Result.team) {
          setTeam1Data(team1Result.team);
        } else {
          console.warn('Failed to load team1 data');
          setTeam1Data(null);
        }
        
        if (team2Result.success && team2Result.team) {
          setTeam2Data(team2Result.team);
        } else {
          console.warn('Failed to load team2 data');
          setTeam2Data(null);
        }
      } catch (error) {
        console.error('Error loading team data:', error);
        setTeam1Data(null);
        setTeam2Data(null);
      } finally {
        setIsLoadingTeams(false);
      }
    };
    
    loadTeams();

    // Load events
    if (match.events && Array.isArray(match.events) && match.events.length > 0) {
      setEvents(match.events);
      if (match.events[0]?.score) {
        setCurrentScore(match.events[0].score);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (commentaryIntervalRef.current) clearInterval(commentaryIntervalRef.current);
      stopSpeech();
      isSpeakingRef.current = false;
    };
  }, [match]);

  // Timer countdown
  useEffect(() => {
    if (!isPlaying || isPaused || isLoadingTeams || !team1Data || !team2Data) {
      return;
    }

    if (timerSeconds >= totalMatchSeconds) {
      // Match complete
      setIsPlaying(false);
      if (match.result) {
        setCurrentScore({ team1: match.result.team1Score, team2: match.result.team2Score });
        setTimeout(() => onComplete(match.result), 1000);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        const newSeconds = prev + 1;
        return newSeconds;
      });
    }, 1000); // 1 second = 1 minute of match time

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, isPaused, timerSeconds, totalMatchSeconds, isLoadingTeams, team1Data, team2Data, match.result, onComplete]);

  // Process events at their scheduled times
  useEffect(() => {
    if (!team1Data || !team2Data || events.length === 0) return;

    events.forEach(event => {
      const eventMinute = Math.floor(event.minute);
      
      // Check if this event should trigger now (within 1 second tolerance)
      if (Math.abs(currentMatchMinute - eventMinute) <= 1 && !processedEvents.has(event.id)) {
        // Mark as processed
        setProcessedEvents(prev => new Set(prev).add(event.id));
        
        // Update score
        if (event.score) {
          setCurrentScore(event.score);
        }
        
        // Add to recent events
        setRecentEvents(prev => {
          const newEvents = [...prev, event].slice(-10); // Keep last 10
          return newEvents;
        });
        
        // Play sound for event
        playSoundForEvent(event);
        
        // Check if this is a priority event (goals, dangerous set pieces)
        const isPriorityEvent = event.type === 'goal' || event.type === 'own_goal' || 
                                event.type === 'penalty_kick' || 
                                (event.type === 'corner_kick') ||
                                (event.type === 'free_kick');
        
        if (isPriorityEvent && commentaryEnabled) {
          // Clear queue and stop current commentary for priority events
          stopSpeech();
          isSpeakingRef.current = false;
          commentaryQueueRef.current = [];
        }
        
        // Generate event-specific commentary
        const tournamentRound = match.round === 'quarterFinal' ? 'Quarter Final' 
          : match.round === 'semiFinal' ? 'Semi Final' 
          : 'Final';
        
        const commentaryContext: CommentaryContext = {
          match,
          team1: team1Data,
          team2: team2Data,
          currentScore: event.score || currentScore,
          tournamentRound,
          eventIndex: events.indexOf(event),
          totalEvents: events.length,
        };

        const eventCommentary = generateEventCommentary(event, commentaryContext);
        
        // Add to commentary queue (priority events go to front)
        if (commentaryEnabled && eventCommentary) {
          if (isPriorityEvent) {
            commentaryQueueRef.current.unshift(eventCommentary); // Add to front
          } else {
            commentaryQueueRef.current.push(eventCommentary);
          }
        }
      }
    });
  }, [currentMatchMinute, events, team1Data, team2Data, processedEvents, currentScore, match, commentaryEnabled]);

  // Continuous commentary generation (every 10-15 seconds, reduced frequency)
  useEffect(() => {
    if (!commentaryEnabled || !team1Data || !team2Data || isSpeakingRef.current) return;

    const generateAndQueueCommentary = async () => {
      const now = Date.now();
      const secondsSinceLastCommentary = timerSeconds - lastCommentarySecondsRef.current;
      
      // Only generate if at least 10 seconds have passed since last commentary
      // AND queue is empty or very short (to prevent continuous talking)
      if (secondsSinceLastCommentary < 10 || commentaryQueueRef.current.length > 2) {
        return;
      }
      
      lastCommentaryTimeRef.current = now;
      lastCommentarySecondsRef.current = timerSeconds;

      try {
        const tournamentRound = match.round === 'quarterFinal' ? 'Quarter Final' 
          : match.round === 'semiFinal' ? 'Semi Final' 
          : 'Final';

        const commentary = await generateContinuousCommentary(
          match,
          team1Data,
          team2Data,
          currentMatchMinute,
          currentScore,
          recentEvents,
          {
            tournamentRound,
            totalEvents: events.length,
            isExtraTime: currentMatchMinute > 90,
          }
        );

        if (commentary && commentaryQueueRef.current.length < 3) {
          commentaryQueueRef.current.push(commentary);
        }
      } catch (error) {
        console.warn('Failed to generate commentary:', error);
      }
    };

    // Generate commentary every 12 seconds (reduced from 6)
    commentaryIntervalRef.current = setInterval(generateAndQueueCommentary, 12000);

    return () => {
      if (commentaryIntervalRef.current) clearInterval(commentaryIntervalRef.current);
    };
  }, [commentaryEnabled, team1Data, team2Data, currentMatchMinute, currentScore, recentEvents, events.length, match, timerSeconds]);

  // Play commentary from queue with gaps between commentary
  useEffect(() => {
    if (!commentaryEnabled || isSpeakingRef.current) {
      return;
    }

    const playNextCommentary = async () => {
      if (commentaryQueueRef.current.length === 0 || isSpeakingRef.current) return;

      const commentary = commentaryQueueRef.current.shift();
      if (!commentary) return;

      isSpeakingRef.current = true;
      setCurrentCommentary(commentary);

      try {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(async () => {
            try {
              await speakText(commentary, {
                provider: 'browser',
                speed: 1.1,
                pitch: 1.0,
                volume: 1.0,
              });
              resolve();
            } catch (error) {
              console.warn('Commentary TTS error:', error);
              resolve();
            } finally {
              isSpeakingRef.current = false;
              // Add a gap after commentary finishes (2-3 seconds of silence)
              setTimeout(() => {
                setCurrentCommentary('');
              }, 2000);
            }
          });
        });
      } catch (error) {
        console.warn('Commentary playback error:', error);
        isSpeakingRef.current = false;
        setCurrentCommentary('');
      }
    };

    // Check queue periodically (less frequently to add gaps)
    const queueInterval = setInterval(() => {
      if (!isSpeakingRef.current && commentaryQueueRef.current.length > 0) {
        playNextCommentary();
      }
    }, 1000); // Increased from 500ms to add more spacing

    return () => clearInterval(queueInterval);
  }, [commentaryEnabled]);

  const playSoundForEvent = (event: MatchEvent) => {
    const playAudio = (audioSrc: string, volume: number = 0.7): Promise<void> => {
      return new Promise((resolve) => {
        try {
          const audio = new Audio(audioSrc);
          audio.volume = volume;
          audio.preload = 'auto';
          
          const attemptPlay = () => {
            audio.play().then(() => resolve()).catch(() => resolve());
          };

          if (audio.readyState >= 2) {
            attemptPlay();
          } else {
            audio.addEventListener('canplaythrough', attemptPlay, { once: true });
            audio.load();
          }
        } catch (error) {
          resolve();
        }
      });
    };

    try {
      switch (event.type) {
        case 'kickoff':
        case 'halftime':
        case 'fulltime':
        case 'final':
          playAudio('/sounds/referee-whistle.mp3', 0.7);
          break;
        case 'goal':
        case 'own_goal':
          playAudio('/sounds/goal-net.mp3', 0.7).then(() => {
            setTimeout(() => playAudio('/sounds/crowd-cheer.mp3', 0.7), 2600);
          });
          break;
        case 'penalty_kick':
        case 'red_card':
          playAudio('/sounds/referee-whistle.mp3', 0.7);
          break;
      }
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  };

  const handlePlayPause = () => {
    if (isPaused) {
      setIsPaused(false);
      setIsPlaying(true);
    } else {
      setIsPaused(true);
      setIsPlaying(false);
      stopSpeech();
      isSpeakingRef.current = false;
    }
  };

  const handleToggleCommentary = () => {
    setCommentaryEnabled(prev => {
      if (prev) {
        stopSpeech();
        isSpeakingRef.current = false;
        commentaryQueueRef.current = [];
      }
      return !prev;
    });
  };

  const handleSkip = () => {
    setIsPlaying(false);
    setTimerSeconds(totalMatchSeconds);
    stopSpeech();
    isSpeakingRef.current = false;
    commentaryQueueRef.current = [];
    if (match.result) {
      setCurrentScore({ team1: match.result.team1Score, team2: match.result.team2Score });
      onComplete(match.result);
    }
  };

  const getEventIcon = (type: MatchEventType) => {
    const iconClass = "h-5 w-5";
    const icons: Record<MatchEventType, React.ReactElement> = {
      kickoff: <Circle className={`${iconClass} text-green-600`} />,
      goal: <Trophy className={`${iconClass} text-yellow-500`} />,
      own_goal: <XCircle className={`${iconClass} text-red-600`} />,
      shot_on_target: <Target className={`${iconClass} text-blue-500`} />,
      shot_off_target: <X className={`${iconClass} text-gray-500`} />,
      save: <Save className={`${iconClass} text-blue-600`} />,
      assist: <CheckCircle className={`${iconClass} text-green-500`} />,
      offside: <Flag className={`${iconClass} text-orange-500`} />,
      foul: <AlertTriangle className={`${iconClass} text-orange-600`} />,
      free_kick: <Megaphone className={`${iconClass} text-purple-500`} />,
      penalty_kick: <Target className={`${iconClass} text-red-600`} />,
      corner_kick: <Target className={`${iconClass} text-blue-400`} />,
      goal_kick: <Circle className={`${iconClass} text-gray-600`} />,
      throw_in: <ArrowRight className={`${iconClass} text-gray-500`} />,
      yellow_card: <CreditCard className={`${iconClass} text-yellow-500`} />,
      red_card: <CreditCard className={`${iconClass} text-red-600`} />,
      substitution: <Users className={`${iconClass} text-gray-500`} />,
      halftime: <Clock className={`${iconClass} text-yellow-600`} />,
      fulltime: <Clock className={`${iconClass} text-blue-600`} />,
      injury_stoppage: <Activity className={`${iconClass} text-red-500`} />,
      var_review: <RefreshCw className={`${iconClass} text-purple-600`} />,
      added_time: <Clock className={`${iconClass} text-gray-600`} />,
      extratime: <Clock className={`${iconClass} text-orange-600`} />,
      penalties: <Target className={`${iconClass} text-red-700`} />,
      final: <Trophy className={`${iconClass} text-gold-600`} />,
    };
    return icons[type] || <Activity className={`${iconClass} text-gray-400`} />;
  };

  if (events.length === 0 || isLoadingTeams || !team1Data || !team2Data) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading match...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (timerSeconds >= totalMatchSeconds && match.result) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-2xl font-bold mb-2">Match Complete!</h3>
            <div className="text-4xl font-bold mb-4">
              {match.team1.name} {match.result.team1Score} - {match.result.team2Score} {match.team2.name}
            </div>
            <p className="text-gray-600">Final Score</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = (timerSeconds / totalMatchSeconds) * 100;
  const currentDisplayMinute = currentMatchMinute > 90 ? currentMatchMinute : currentMatchMinute;

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-center flex-1">
              <div className="text-2xl font-bold mb-1">
                {match.team1.name} {currentScore.team1} - {currentScore.team2} {match.team2.name}
              </div>
              <div className="text-sm text-gray-500">
                <Clock className="inline h-4 w-4 mr-1" />
                {currentDisplayMinute}' {hasExtraTime && currentMatchMinute > 90 ? ' + ET' : ''}
                <span className="ml-2 text-blue-600">
                  ({totalMatchSeconds - timerSeconds}s remaining)
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handlePlayPause} variant="outline" size="sm" className="flex items-center gap-2">
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {isPaused ? 'Play' : 'Pause'}
              </Button>
              <Button onClick={handleToggleCommentary} variant="outline" size="sm" className="flex items-center gap-2">
                {commentaryEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button onClick={handleSkip} variant="outline" size="sm" className="flex items-center gap-2">
                <SkipForward className="h-4 w-4" />
                Skip
              </Button>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
            {currentDisplayMinute} / {totalMatchSeconds} minutes
            {isSpeakingRef.current && (
              <span className="ml-2 text-blue-600">🎙️ Commentary playing...</span>
            )}
          </div>
        </div>

        {/* Current Commentary */}
        {currentCommentary && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Volume2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 italic">{currentCommentary}</p>
            </div>
          </div>
        )}

        {/* Recent Events */}
        {recentEvents.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Events</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentEvents.slice(-5).map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-2 rounded bg-gray-50">
                  <div className="flex-shrink-0">{getEventIcon(event.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">{Math.floor(event.minute)}'</span>
                      <span className="text-xs text-gray-700 truncate">{event.description}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
