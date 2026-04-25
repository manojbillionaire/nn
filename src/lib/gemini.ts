import { GoogleGenAI, Modality } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getGemini(apiKey?: string) {
  const key = apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined);
  if (!aiInstance && key) {
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
}

export async function speakWithGemini(text: string, apiKey?: string) {
  const ai = getGemini(apiKey);
  if (!ai) {
    console.warn("Gemini AI not initialized. Using fallback SpeechSynthesis.");
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
    return false;
  }

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' }, // Professional warm voice
          }
        }
      }
    });

    const audioPart = response.response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    const base64Audio = audioPart?.inlineData?.data;
    
    if (base64Audio) {
      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    // Fallback to basic TTS
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
    return false;
  }
}
