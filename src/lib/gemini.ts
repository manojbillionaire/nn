import { GoogleGenAI, Modality } from "@google/genai";

export function getGemini(apiKey?: string) {
  const key = apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

let currentAudioSource: AudioBufferSourceNode | null = null;
let currentAudioContext: AudioContext | null = null;

export function stopSpeaking() {
  if (currentAudioSource) {
    try {
      currentAudioSource.stop();
    } catch (e) {
      // Ignore if already stopped
    }
    currentAudioSource = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export async function speakWithGemini(text: string, apiKey?: string): Promise<boolean> {
  // Stop any existing playback
  stopSpeaking();

  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn("SpeechSynthesis not supported.");
      resolve(false);
      return;
    }

    // Sanitize text for TTS: remove asterisks and excessive formatting
    const cleanText = text.replace(/\*/g, '').replace(/#/g, '').replace(/_{1,2}/g, '').trim();
    
    const startSpeaking = () => {
      // Force resume in case it's paused
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Try to find a high-quality voice
      const voices = window.speechSynthesis.getVoices();
      console.log(`Available voices: ${voices.length}`);
      
      const preferredVoice = voices.find(v => 
        (v.name.includes('Google') || v.name.includes('Neural')) && 
        (v.lang.startsWith('en-IN') || v.lang.startsWith('en-GB') || v.lang.startsWith('en-US'))
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

      if (preferredVoice) {
        console.log(`Using voice: ${preferredVoice.name}`);
        utterance.voice = preferredVoice;
      }

      utterance.volume = 1.0;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => console.log("Speech started");
      utterance.onend = () => {
        console.log("Speech ended");
        resolve(true);
      };
      utterance.onerror = (e) => {
        console.error("SpeechSynthesis Error:", e);
        resolve(false);
      };

      window.speechSynthesis.speak(utterance);
    };

    // If voices are not loaded yet, wait for them
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        startSpeaking();
      };
    } else {
      startSpeaking();
    }

    // Safety timeout: resolve if it gets stuck
    setTimeout(() => {
      resolve(true);
    }, 15000);
  });
}

export async function consultGemini(message: string, history: any[] = [], apiKey?: string) {
  const ai = getGemini(apiKey);
  if (!ai) throw new Error("Gemini AI not initialized.");

  const contents = [
    ...history.map(h => ({
      role: h.role === 'ai' ? 'model' : 'user',
      parts: [{ text: h.text }]
    })),
    { role: 'user', parts: [{ text: message }] }
  ];

  try {
    // Primary: Gemini 2.5 Flash
    console.log("Consulting primary model: gemini-2.5-flash");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents
    });
    return response.text;
  } catch (error) {
    console.warn("Gemini 2.5 Flash encountered an issue. Falling back to Gemma 2...", error);
    
    try {
      // Fallback: Gemma 2
      const fallbackResponse = await ai.models.generateContent({
        model: "gemma-2-9b-it",
        contents
      });
      return fallbackResponse.text;
    } catch (fallbackError) {
      console.error("Gemma fallback also failed:", fallbackError);
      throw fallbackError;
    }
  }
}
