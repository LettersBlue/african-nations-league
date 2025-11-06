'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { speakText, stopSpeech, type TTSProvider } from '@/lib/audio/text-to-speech';

interface CommentaryVoicePlayerProps {
  commentary: string[];
  provider?: TTSProvider;
  autoPlay?: boolean;
}

export default function CommentaryVoicePlayer({
  commentary,
  provider = 'browser',
  autoPlay = false,
}: CommentaryVoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);

  // Check TTS support and initialize on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setTtsSupported(true);
      // Pre-initialize TTS session on component mount
      // This helps with browser autoplay policies
      const initUtterance = new SpeechSynthesisUtterance(' ');
      initUtterance.volume = 0;
      try {
        window.speechSynthesis.speak(initUtterance);
      } catch (error) {
        console.warn('TTS initialization warning:', error);
      }
    } else {
      setTtsSupported(false);
      setInitError('Text-to-Speech is not supported in this browser');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      isPausedRef.current = false;
      stopSpeech();
      audioRefs.current.forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
    };
  }, []);

  const playCommentary = async () => {
    if (isPlayingRef.current) return;

    if (!commentary || commentary.length === 0) {
      console.warn('No commentary available');
      return;
    }

    if (!ttsSupported && provider === 'browser') {
      setInitError('Text-to-Speech is not supported in this browser');
      return;
    }

    isPlayingRef.current = true;
    isPausedRef.current = false;
    setIsPlaying(true);
    setIsPaused(false);
    setIsLoading(true);
    setInitError(null);

    try {
      for (let i = currentIndex; i < commentary.length; i++) {
        // Check if paused or stopped using ref (for reliable state checking)
        if (isPausedRef.current || !isPlayingRef.current) {
          setIsPlaying(false);
          isPlayingRef.current = false;
          break;
        }

        const line = commentary[i].trim();
        if (!line) continue;

        setCurrentIndex(i);
        setIsLoading(true);

        try {
          if (provider === 'browser') {
            // Browser TTS - free, no API needed
            // Use requestAnimationFrame to ensure we're in the right execution context
            await new Promise<void>((resolve) => {
              requestAnimationFrame(async () => {
                try {
                  await speakText(line, { 
                    provider: 'browser', 
                    speed: 1.1,
                    pitch: 1.0,
                    volume: isMuted ? 0 : 1.0
                  });
                  resolve();
                } catch (error) {
                  console.warn(`Failed to speak line ${i}:`, error);
                  resolve(); // Continue anyway
                }
              });
            });
          } else {
            // API-based TTS (OpenAI, ElevenLabs)
            const audio = await speakText(line, { provider }) as HTMLAudioElement;
            if (audio) {
              audioRefs.current[i] = audio;
              audio.volume = isMuted ? 0 : 1;
              
              await new Promise<void>((resolve, reject) => {
                audio.onended = () => resolve();
                audio.onerror = reject;
                audio.play().catch(reject);
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to speak line ${i}:`, error);
          // Continue to next line even if one fails
        }

        // Small pause between lines for natural flow
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      // Finished playing
      isPlayingRef.current = false;
      setIsPlaying(false);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Commentary playback error:', error);
      isPlayingRef.current = false;
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const pauseCommentary = () => {
    isPausedRef.current = true;
    setIsPaused(true);
    stopSpeech();
    audioRefs.current.forEach(audio => {
      if (audio && !audio.paused) {
        audio.pause();
      }
    });
  };

  const resumeCommentary = () => {
    isPausedRef.current = false;
    setIsPaused(false);
    playCommentary();
  };

  const stopCommentary = () => {
    isPlayingRef.current = false;
    isPausedRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentIndex(0);
    stopSpeech();
    audioRefs.current.forEach(audio => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    audioRefs.current.forEach(audio => {
      if (audio) {
        audio.volume = isMuted ? 1 : 0;
      }
    });
  };

  // Auto-play if enabled
  useEffect(() => {
    if (autoPlay && commentary.length > 0 && !isPlaying) {
      playCommentary();
    }
  }, [autoPlay, commentary.length]);

  if (!ttsSupported && provider === 'browser') {
    return (
      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
        <div className="flex items-center gap-2 mb-2">
          <VolumeX className="h-5 w-5 text-yellow-600" />
          <h4 className="font-semibold text-gray-800">Voice Commentary Unavailable</h4>
        </div>
        <p className="text-sm text-gray-600">
          {initError || 'Text-to-Speech is not supported in this browser. Please use Chrome, Edge, Firefox, or Safari.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-blue-600" />
          <h4 className="font-semibold text-gray-800">Voice Commentary</h4>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 hover:bg-blue-100 rounded transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 text-gray-600" />
            ) : (
              <Volume2 className="h-4 w-4 text-gray-600" />
            )}
          </button>
          
          {!isPlaying ? (
            <button
              onClick={playCommentary}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Play className="h-4 w-4" />
              Play Commentary
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  onClick={resumeCommentary}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Play className="h-4 w-4" />
                  Resume
                </button>
              ) : (
                <button
                  onClick={pauseCommentary}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </button>
              )}
              <button
                onClick={stopCommentary}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      {isPlaying && (
        <div className="text-sm text-gray-600">
          <p>Playing: {commentary[currentIndex]}</p>
          <p className="text-xs mt-1">
            Line {currentIndex + 1} of {commentary.length}
          </p>
        </div>
      )}

      {initError && (
        <div className="mt-2 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
          ⚠️ {initError}
        </div>
      )}
      
      {provider === 'browser' && ttsSupported && (
        <div className="mt-2">
          <p className="text-xs text-gray-500">
            Using browser Text-to-Speech (free) • {commentary.length} lines
          </p>
          <p className="text-xs text-blue-600 mt-1">
            💡 Tip: Click "Play Commentary" to hear the match read aloud. Voice quality varies by browser.
          </p>
        </div>
      )}
    </div>
  );
}

