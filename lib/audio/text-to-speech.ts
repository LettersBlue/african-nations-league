/**
 * Text-to-Speech utilities for match commentary
 * Supports multiple TTS providers with fallback options
 */

export type TTSProvider = 'browser' | 'openai' | 'elevenlabs';

export interface TTSOptions {
  voice?: string;
  speed?: number; // 0.5 to 2.0
  pitch?: number; // 0 to 2
  volume?: number; // 0 to 1
  provider?: TTSProvider;
}

/**
 * Initialize TTS session - required by some browsers (especially Safari)
 * Fires an empty utterance to activate the speech synthesis engine
 */
let ttsInitialized = false;
function initializeTTSSession(): Promise<void> {
  return new Promise((resolve) => {
    if (ttsInitialized) {
      resolve();
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    // Fire an empty utterance to initialize the session
    // This is required by Safari and helps with other browsers
    const initUtterance = new SpeechSynthesisUtterance(' ');
    initUtterance.volume = 0;
    initUtterance.onend = () => {
      ttsInitialized = true;
      resolve();
    };
    initUtterance.onerror = () => {
      // Even if initialization fails, mark as initialized to avoid loops
      ttsInitialized = true;
      resolve();
    };

    try {
      window.speechSynthesis.speak(initUtterance);
      // Also set a timeout in case events don't fire
      setTimeout(() => {
        ttsInitialized = true;
        resolve();
      }, 100);
    } catch (error) {
      ttsInitialized = true;
      resolve();
    }
  });
}

/**
 * Wait for voices to be loaded (they load asynchronously)
 */
function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    // First, ensure TTS session is initialized
    initializeTTSSession().then(() => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }

      // Wait for voices to load
      const onVoicesChanged = () => {
        const loadedVoices = window.speechSynthesis.getVoices();
        if (loadedVoices.length > 0) {
          window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
          resolve(loadedVoices);
        }
      };

      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
      
      // Fallback timeout
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        resolve(window.speechSynthesis.getVoices());
      }, 2000);
    });
  });
}

/**
 * Convert text to speech using browser SpeechSynthesis API (free)
 * Based on MDN Web Audio API best practices and SpeechSynthesis API
 */
export async function speakWithBrowser(
  text: string,
  options: TTSOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      reject(new Error('SpeechSynthesis not supported in this browser'));
      return;
    }

    // Ensure TTS session is initialized and voices are loaded
    waitForVoices()
      .then((voices) => {
        if (voices.length === 0) {
          console.warn('No voices available');
          resolve(); // Continue anyway
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure voice - prefer English voices
        const preferredVoice = voices.find(v => 
          v.lang.startsWith('en-US') && 
          (options.voice ? v.name.toLowerCase().includes(options.voice.toLowerCase()) : true)
        ) || voices.find(v => 
          v.lang.startsWith('en') && 
          (v.name.toLowerCase().includes('us') || v.name.toLowerCase().includes('english'))
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
          utterance.lang = preferredVoice.lang;
        } else {
          utterance.lang = 'en-US';
        }
        
        utterance.rate = Math.max(0.1, Math.min(2.0, options.speed || 1.1));
        utterance.pitch = Math.max(0, Math.min(2, options.pitch || 1.0));
        utterance.volume = Math.max(0, Math.min(1, options.volume || 1.0));

        let resolved = false;
        const finish = () => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        };

        utterance.onend = () => {
          finish();
        };
        
        utterance.onerror = (error) => {
          console.warn('Speech synthesis error:', error);
          // Log the specific error for debugging
          if (error.error) {
            console.warn('Error type:', error.error);
          }
          finish(); // Always resolve to allow continuation
        };

        // Cancel any ongoing speech first
        try {
          window.speechSynthesis.cancel();
          
          // Small delay to ensure cancel takes effect
          // Use requestAnimationFrame for better timing
          requestAnimationFrame(() => {
            try {
              window.speechSynthesis.speak(utterance);
            } catch (speakError) {
              console.warn('Failed to start speech:', speakError);
              finish();
            }
          });
        } catch (error) {
          console.warn('Error in speech synthesis setup:', error);
          finish();
        }
      })
      .catch((error) => {
        console.warn('Failed to load voices:', error);
        resolve(); // Continue anyway to prevent blocking
      });
  });
}

/**
 * Convert text to speech using OpenAI TTS API
 * Requires OPENAI_API_KEY environment variable
 */
export async function speakWithOpenAI(
  text: string,
  options: TTSOptions = {}
): Promise<HTMLAudioElement> {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1', // or 'tts-1-hd' for higher quality
      input: text,
      voice: options.voice || 'alloy', // alloy, echo, fable, onyx, nova, shimmer
      speed: options.speed || 1.0,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI TTS failed: ${response.statusText}`);
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  
  return audio;
}

/**
 * Convert text to speech using ElevenLabs API
 * Requires ELEVENLABS_API_KEY environment variable
 */
export async function speakWithElevenLabs(
  text: string,
  options: TTSOptions = {}
): Promise<HTMLAudioElement> {
  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  const voiceId = options.voice || '21m00Tcm4TlvDq8ikWAM'; // Default: Rachel
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  
  return audio;
}

/**
 * Universal TTS function that tries providers in order of preference
 */
export async function speakText(
  text: string,
  options: TTSOptions = {}
): Promise<HTMLAudioElement | void> {
  const provider = options.provider || 'browser';

  try {
    switch (provider) {
      case 'openai':
        return await speakWithOpenAI(text, options);
      
      case 'elevenlabs':
        return await speakWithElevenLabs(text, options);
      
      case 'browser':
      default:
        return await speakWithBrowser(text, options);
    }
  } catch (error) {
    // For browser TTS, don't fallback - just log and continue
    if (provider === 'browser') {
      console.warn('Browser TTS error (may be due to browser policies):', error);
      // Return void to indicate it completed (even if it failed)
      // This allows the commentary to continue
      return;
    }
    // Fallback to browser if API fails
    console.warn(`TTS provider ${provider} failed, falling back to browser:`, error);
    try {
      return await speakWithBrowser(text, options);
    } catch (browserError) {
      console.warn('Browser fallback also failed:', browserError);
      return;
    }
  }
}

/**
 * Stop all ongoing speech
 */
export function stopSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Get available browser voices
 */
export function getBrowserVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  return window.speechSynthesis.getVoices();
}

