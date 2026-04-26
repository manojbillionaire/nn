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
      if (window.speechSynthesis.speaking) {
        console.log("Speech is taking longer than expected, resolving anyway.");
        resolve(true);
      } else if (!window.speechSynthesis.pending) {
        // If not even pending, something went wrong
        console.warn("Speech stuck in state. Moving on.");
        resolve(false);
      }
    }, 20000);
  });
}

export async function consultGemini(message: string, history: any[] = [], apiKey?: string) {
  const ai = getGemini(apiKey);
  if (!ai) throw new Error("Gemini AI not initialized.");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        ...history.map(h => ({
          role: h.role === 'ai' ? 'model' : 'user',
          parts: [{ text: h.text }]
        })),
        { role: 'user', parts: [{ text: message }] }
      ]
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Consult Error:", error);
    throw error;
  }
}
