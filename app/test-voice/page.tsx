'use client';

import { useState } from 'react';
import CommentaryVoicePlayer from '@/components/match/CommentaryVoicePlayer';

// Test commentary for voice playback
const testCommentary = [
  "Welcome to the African Nations League Quarter Final!",
  "The match kicks off between Senegal and South Africa.",
  "Early pressure from Senegal as they push forward.",
  "GOAL! 5 minutes in - Fahad 99 scores for Senegal! What a strike!",
  "South Africa looking to respond immediately.",
  "Great save by the goalkeeper to deny Senegal a second goal!",
  "GOAL! 27 minutes - Mpoto, Mondli equalizes for South Africa!",
  "The match is heating up now, both teams pushing for the lead.",
  "Half time whistle blows. The score is 1-1.",
  "Second half underway and Senegal are on the attack.",
  "GOAL! 41 minutes - Mohamed 44 puts Senegal back in front!",
  "GOAL! 43 minutes - Mahmoud 94 extends Senegal's lead!",
  "South Africa need to respond quickly now.",
  "GOAL! 54 minutes - Hassan 50 makes it 4-1 for Senegal!",
  "This is getting away from South Africa now.",
  "GOAL! 60 minutes - Youssef 18 adds another for Senegal!",
  "South Africa pull one back through Dithejane, Puso in the 78th minute!",
  "GOAL! 79 minutes - Fahad 78 restores Senegal's four goal advantage!",
  "GOAL! 81 minutes - Leaner, Renaldo scores for South Africa!",
  "Full time! Senegal win 6-3 in an entertaining match!",
];

export default function TestVoicePage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="card card-padding">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            🎙️ Voice Commentary Test
          </h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Free Browser TTS Test:</strong> This uses your browser's built-in text-to-speech (completely free, no API keys needed).
            </p>
            <p className="text-xs text-gray-600">
              Click "Play Commentary" below to hear the match commentary read aloud. The voice quality depends on your browser.
            </p>
          </div>

          <CommentaryVoicePlayer 
            commentary={testCommentary}
            provider="browser"
            autoPlay={false}
          />

          <div className="mt-6 bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Commentary Text:</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testCommentary.map((line, idx) => {
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

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">Browser TTS Tips:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Chrome/Edge: Good quality voices</li>
              <li>• Firefox: Decent quality</li>
              <li>• Safari: Good quality on Mac</li>
              <li>• Voice quality varies by browser and OS</li>
              <li>• Requires user interaction (clicking Play) due to browser policies</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

