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

export async function speakWithGemini(text: string, apiKey?: string) {
  // Stop any existing playback
  stopSpeaking();

  const ai = getGemini(apiKey);
  if (!ai) {
    console.warn("Gemini AI not initialized. Using fallback SpeechSynthesis.");
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
      return true;
    }
    return false;
  }

  try {
    // Sanitize text for TTS: remove asterisks and excessive formatting to avoid "asterisk" reading
    const cleanText = text.replace(/\*/g, '').replace(/#/g, '').replace(/_{1,2}/g, '').trim();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: ["AUDIO"] as any,
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((p: any) => p.inlineData);
    const base64Audio = audioPart?.inlineData?.data;
    
    console.log("Gemini 2.5 candidate found:", !!candidate);
    if (base64Audio) {
      console.log("Audio data received, decoding...");
      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }
      
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      
      // Attempt to resume immediately
      await audioContext.resume();
      
      currentAudioContext = audioContext;
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
      currentAudioSource = source;
      console.log("Playback started.");

      return new Promise((resolve) => {
        source.onended = () => {
          if (currentAudioSource === source) {
            currentAudioSource = null;
          }
          resolve(true);
        };
        setTimeout(() => resolve(true), 30000);
      });
    }
    console.warn("No audio data in response candidate.");
    throw new Error("Missing audio data in response");
  } catch (error) {
    console.error("Gemini TTS Execution Error:", error);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      console.log("Falling back to local SpeechSynthesis.");
      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);
        window.speechSynthesis.speak(utterance);
        setTimeout(() => resolve(true), 15000);
      });
    }
    return false;
  }
}

export async function consultGemini(message: string, history: any[] = [], apiKey?: string) {
  const ai = getGemini(apiKey);
  if (!ai) throw new Error("Gemini AI not initialized.");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
