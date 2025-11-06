'use client';

import { useState, useEffect } from 'react';
import { Match } from '@/types';
import ProgressiveMatchSimulation from './ProgressiveMatchSimulation';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface MatchReplayProps {
  match: Match;
}

export default function MatchReplay({ match }: MatchReplayProps) {
  const [showReplay, setShowReplay] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure events exist and is an array
  const hasEvents = mounted && match.events && Array.isArray(match.events) && match.events.length > 0;

  if (!mounted) {
    return null; // Wait for mount to prevent hydration issues
  }

  if (!hasEvents) {
    return null; // No events to replay
  }

  if (!showReplay) {
    return (
      <div className="text-center py-6">
        <Button 
          onClick={() => {
            console.log('Watch Match Replay clicked, events:', match.events?.length);
            setShowReplay(true);
          }}
          size="lg"
          className="flex items-center gap-2"
        >
          <Play className="h-5 w-5" />
          Watch Match Replay
        </Button>
      </div>
    );
  }

  console.log('Rendering ProgressiveMatchSimulation, showReplay:', showReplay, 'events:', match.events?.length);

  return (
    <div key={`replay-container-${showReplay}`}>
      <ProgressiveMatchSimulation 
        key={`replay-${match.id}-${Date.now()}`}
        match={match} 
        onComplete={() => {
          console.log('Replay completed');
          setShowReplay(false);
        }}
      />
    </div>
  );
}

