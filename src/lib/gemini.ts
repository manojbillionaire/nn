import { GoogleGenAI, Modality } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getGemini(apiKey?: string) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    if (typeof window !== 'undefined') {
      // In the browser, we might not have process.env.GEMINI_API_KEY if not injected
      // But AI Studio usually injects it or uses it on the proxy.
      // If the user provided their own key, use that.
    }
  }
  
  if (!aiInstance && key) {
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
}

export async function speakWithGemini(text: string, apiKey?: string) {
  const ai = getGemini(apiKey);
  if (!ai) throw new Error("Gemini AI not initialized. Missing API Key.");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' }, // Clear and professional
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
}
