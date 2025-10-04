
import { GoogleGenAI, Modality } from "@google/genai";
import { parseSubtitle, ParsedCue } from './subtitleParser';
import { toSrt } from '../utils/subtitleFormatters';
import type { SpeakerConfig } from '../types';
import { srtTimeToSeconds } from '../utils/timeUtils';
import { playFptAiSpeech, cancelFptSpeech } from './fptAiService';
import { playGoogleSpeech, cancelGoogleSpeech } from './googleTtsService';
import { playMicrosoftSpeech, cancelMicrosoftSpeech } from './microsoftTtsService';

// --- Gemini AI Client Initialization ---
const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
const GEMINI_MULTIMODAL_MODEL = 'gemini-2.5-flash';

const getGeminiClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("Khóa API Google Gemini chưa được cấu hình. Vui lòng đảm bảo biến môi trường API_KEY đã được thiết lập.");
    }
    return new GoogleGenAI({ apiKey });
};

// --- Helper Functions ---
const fileToGenerativePart = async (file: File, onProgress: (message: string) => void) => {
    onProgress('Đang chuyển đổi tệp sang định dạng base64...');
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            onProgress('Đã chuyển đổi xong.');
            resolve((reader.result as string).split(',')[1]);
        };
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

// --- Browser Speech Synthesis (TTS) ---

let browserVoices: SpeechSynthesisVoice[] = [];
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let isSpeechCancelled = false;

/**
 * Fetches and caches voices available in the user's browser.
 * This is notoriously flaky, so it includes multiple fallbacks.
 * @returns A promise that resolves to an array of SpeechSynthesisVoice objects.
 */
export const getBrowserVoices = (): Promise<SpeechSynthesisVoice[]> => {
    if (browserVoices.length > 0) return Promise.resolve(browserVoices);
    if (voicesPromise) return voicesPromise;

    voicesPromise = new Promise((resolve) => {
        if (!window.speechSynthesis) {
            resolve([]);
            return;
        }

        let resolved = false;

        const checkAndResolve = () => {
            if (resolved) return;
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                resolved = true;
                browserVoices = voices;
                window.speechSynthesis.onvoiceschanged = null; // Clean up listener
                resolve(voices);
            }
        };

        // 1. Check immediately, as voices might already be loaded.
        checkAndResolve();
        if (resolved) return;

        // 2. Set up the onvoiceschanged event listener. This is the standard method.
        window.speechSynthesis.onvoiceschanged = checkAndResolve;

        // 3. Set a timeout as a fallback, especially for browsers that don't fire
        //    the event reliably or if the event fired before the listener was attached.
        setTimeout(() => {
            if (!resolved) {
                checkAndResolve(); // Try one last time
            }
            // 4. Final fallback: If still no voices, resolve with an empty array
            //    to prevent the app from hanging.
            if (!resolved) {
                resolved = true;
                window.speechSynthesis.onvoiceschanged = null; // Clean up listener
                resolve([]);
            }
        }, 1000); // 1-second timeout
    });
    return voicesPromise;
};

const speakChunk = (text: string, voice: SpeechSynthesisVoice | undefined, forRecording: boolean = false): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (isSpeechCancelled || !text.trim() || !window.speechSynthesis) {
            resolve();
            return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        }

        if (forRecording) {
            utterance.volume = 0; // Mute for recording
            utterance.rate = 10;  // Max speed for recording
        }

        utterance.onend = () => {
            currentUtterance = null;
            resolve();
        };
        utterance.onerror = (e) => {
            console.error("Lỗi SpeechSynthesis:", e);
            currentUtterance = null;
            reject(e);
        };
        currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
    });
};

/**
 * Stops any currently speaking or queued utterances from all providers.
 */
export const cancelSpeech = () => {
    isSpeechCancelled = true;
    if (currentUtterance) {
        currentUtterance.onend = null;
        currentUtterance = null;
    }
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    cancelFptSpeech();
    cancelGoogleSpeech();
    cancelMicrosoftSpeech();
};

/**
 * Generates speech by dispatching to the appropriate service based on voiceId prefix.
 * @param text The text to speak.
 * @param voiceId The voiceURI/ID of the selected voice.
 * @param forRecording Whether to configure utterance for silent, fast recording.
 */
export const generateSpeech = async (text: string, voiceId: string, forRecording: boolean = false): Promise<void> => {
    cancelSpeech();
    isSpeechCancelled = false; // Reset cancellation flag
    
    // Handle custom cloned voices
    if (voiceId.startsWith('custom-')) {
        const watermarkText = "Giọng nói được tổng hợp. ";
        const allVoices = await getBrowserVoices();
        const baseVoice = allVoices.find(v => v.lang === 'vi-VN') || allVoices.find(v => v.lang.startsWith('vi')) || allVoices[0];
        if (!baseVoice) throw new Error("Không tìm thấy giọng nói cơ sở của trình duyệt để tạo giọng nói tùy chỉnh.");

        if (isSpeechCancelled) return;
        // The watermark is played at normal speed even when recording, as it's part of the output.
        await speakChunk(watermarkText, baseVoice, false);
        
        if (isSpeechCancelled) return;
        await speakChunk(text, baseVoice, forRecording);
        return;
    }

    if (voiceId.startsWith('fpt-')) {
        if (isSpeechCancelled) return;
        await playFptAiSpeech(text, voiceId);
        return;
    }
    
    if (voiceId.startsWith('microsoft-')) {
        if (isSpeechCancelled) return;
        await playMicrosoftSpeech(text, voiceId);
        return;
    }

    if (voiceId.startsWith('vi-VN-') || voiceId.startsWith('en-US-') || voiceId.startsWith('ja-JP-')) { // Google voice prefixes
        if (isSpeechCancelled) return;
        await playGoogleSpeech(text, voiceId);
        return;
    }

    // Default to browser voices
    const allVoices = await getBrowserVoices();
    const selectedVoice = allVoices.find(v => v.voiceURI === voiceId);
    
    // Split text by lines to preserve pauses, then chunk long lines
    const lines = text.split('\n').filter(line => line.trim() !== '');
    for (const line of lines) {
         if (isSpeechCancelled) break;
        const subChunks = line.match(/[\s\S]{1,200}/g) || []; // Chunk long lines for stability
        for (const subChunk of subChunks) {
            if (isSpeechCancelled) break;
            await speakChunk(subChunk, selectedVoice, forRecording);
        }
    }
};

/**
 * Plays back subtitle cues with different speakers, respecting timestamps.
 * @param cues Array of subtitle cues.
 * @param speakerConfigs Configuration mapping speaker names to voice IDs.
 * @param onProgress Callback to update the UI with progress.
 * @param forRecording Whether to configure utterance for silent, fast recording.
 */
export async function playMultiSpeakerWithTimings(cues: ParsedCue[], speakerConfigs: SpeakerConfig[], onProgress: (message: string) => void, forRecording: boolean = false): Promise<void> {
    cancelSpeech();
    isSpeechCancelled = false;

    const allVoices = await getBrowserVoices();
    let lastEndTimeSeconds = 0;

    const playCue = async (cue: ParsedCue, index: number) => {
        if (isSpeechCancelled) return;
        onProgress(`Đang ${forRecording ? 'tạo' : 'phát'} dòng ${index + 1}/${cues.length}...`);
        
        const startTimeSeconds = srtTimeToSeconds(cue.startTime);
        const endTimeSeconds = srtTimeToSeconds(cue.endTime);
        const delayMs = Math.max(0, (startTimeSeconds - lastEndTimeSeconds) * 1000);
        
        if (!forRecording && delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        if (isSpeechCancelled) return;

        const config = speakerConfigs.find(c => c.speakerName === cue.speaker) || speakerConfigs[0];
        
        if (!config) {
            console.warn(`No speaker config found for speaker: ${cue.speaker}, skipping cue.`);
            lastEndTimeSeconds = endTimeSeconds;
            return;
        }

        const voiceId = config.voiceId;
        if (!voiceId) {
             console.warn(`No voiceId found for speaker: ${config.speakerName}, skipping cue.`);
             lastEndTimeSeconds = endTimeSeconds;
             return;
        }
        
        if (voiceId.startsWith('custom-')) {
            const watermarkText = "Giọng nói được tổng hợp. ";
            const baseVoice = allVoices.find(v => v.lang === 'vi-VN') || allVoices.find(v => v.lang.startsWith('vi')) || allVoices[0];
            if (baseVoice) {
                await speakChunk(watermarkText, baseVoice, false); // Watermark at normal speed
                if (isSpeechCancelled) return;
                await speakChunk(cue.text, baseVoice, forRecording);
            }
        } else if (voiceId.startsWith('fpt-')) {
            await playFptAiSpeech(cue.text, voiceId);
        } else if (voiceId.startsWith('microsoft-')) {
            await playMicrosoftSpeech(cue.text, voiceId);
        } else if (voiceId.startsWith('vi-VN-') || voiceId.startsWith('en-US-') || voiceId.startsWith('ja-JP-')) {
             await playGoogleSpeech(cue.text, voiceId);
        } else {
            const voice = allVoices.find(v => v.voiceURI === voiceId);
            await speakChunk(cue.text, voice, forRecording);
        }
        
        lastEndTimeSeconds = endTimeSeconds;
    };

    for (const [index, cue] of cues.entries()) {
        if (isSpeechCancelled) break;
        await playCue(cue, index);
    }
}

// --- NEW RECORDING FUNCTIONS ---

/**
 * Records the audio from the current tab by asking the user for permission.
 * This is the only reliable way to capture browser `speechSynthesis` output.
 * @param speakFn A function that, when called, will play the audio to be recorded.
 * @param onProgress A callback to update UI with recording status.
 * @returns A promise that resolves to an audio Blob.
 */
const recordTabAudio = async (speakFn: () => Promise<void>, onProgress: (message: string) => void): Promise<Blob> => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
      throw new Error("Tính năng ghi âm không được trình duyệt của bạn hỗ trợ. Hãy thử trên trình duyệt máy tính như Chrome hoặc Firefox.");
    }
    
    onProgress('Đang chờ quyền ghi âm...');
    let stream: MediaStream;
    try {
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: true, 
            audio: true,
        });
    } catch (e) {
        console.error("Error getting display media", e);
        if (e instanceof DOMException && e.name === 'NotAllowedError') {
            throw new Error("Quyền ghi âm đã bị từ chối. Để tạo tệp âm thanh, bạn phải cho phép trình duyệt ghi lại âm thanh của tab này. Vui lòng thử lại, chọn tab 'Trình tạo giọng nói AI' và quan trọng là phải tích vào ô 'Chia sẻ âm thanh tab' (Share tab audio) trước khi nhấn 'Chia sẻ'.");
        }
        throw new Error("Không thể bắt đầu ghi âm. Trình duyệt của bạn có thể không hỗ trợ hoặc đã xảy ra lỗi. Vui lòng thử lại.");
    }

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error("Không có âm thanh nào được chia sẻ. Vui lòng đảm bảo bạn đã tích vào ô 'Chia sẻ âm thanh tab' (Share tab audio) khi được hỏi.");
    }

    stream.getVideoTracks().forEach(track => track.stop());

    return new Promise((resolve, reject) => {
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        const recordedChunks: Blob[] = [];

        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            stream.getAudioTracks().forEach(track => track.stop());
            if (recordedChunks.length === 0) {
                reject(new Error("Không có âm thanh nào được ghi lại. Vui lòng đảm bảo bạn đã chọn 'Chia sẻ âm thanh tab' khi được hỏi."));
                return;
            }
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            resolve(blob);
        };
        
        mediaRecorder.onerror = (event) => {
            reject(new Error(`Lỗi ghi âm: ${(event as any).error.message}`));
        };

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.onended = () => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            };
        }
        
        mediaRecorder.start();
        onProgress('Đang tạo âm thanh...');
        speakFn().then(() => {
            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, 2000);
        }).catch(err => {
            reject(err);
            if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
        });
    });
};


export const recordSpeech = async (text: string, voiceId: string, onProgress: (message: string) => void): Promise<Blob> => {
    cancelSpeech();
    isSpeechCancelled = false;
    const speakFn = () => generateSpeech(text, voiceId, true);
    return recordTabAudio(speakFn, onProgress);
};

export const recordMultiSpeakerWithTimings = (cues: ParsedCue[], speakerConfigs: SpeakerConfig[], onProgress: (message: string) => void): Promise<Blob> => {
    cancelSpeech();
    isSpeechCancelled = false;
    const speakFn = () => playMultiSpeakerWithTimings(cues, speakerConfigs, onProgress, true);
    return recordTabAudio(speakFn, onProgress);
};


// --- AI / Gemini Functions ---

export async function removeTextFromImage(imageFile: File, onProgress: (message: string) => void): Promise<string> {
    onProgress('Đang chuẩn bị hình ảnh...');
    const ai = getGeminiClient();
    const imagePart = await fileToGenerativePart(imageFile, (msg) => onProgress(`[1/3] ${msg}`));

    onProgress('AI đang xử lý hình ảnh...');
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                imagePart,
                { text: 'Remove all text from this image. Do not change anything else. Return only the image with the text removed.' },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    onProgress('Đang xử lý kết quả...');
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
    }
    
    const textResponse = response.text;
    if (textResponse) {
      throw new Error(`AI đã trả về văn bản thay vì hình ảnh: "${textResponse}"`);
    }

    throw new Error('Không thể xóa văn bản. AI không trả về hình ảnh đã xử lý.');
}


export async function getConversionGuide(fromFormat: string, toFormat: string): Promise<string> {
  const ai = getGeminiClient();
  const prompt = `Act as a helpful file conversion expert. The user wants to convert a file from ".${fromFormat}" to ".${toFormat}". Provide a clear, concise, and safe guide.

  Your response should include:
  1.  **A brief explanation:** What does this conversion entail? Is it simple or complex?
  2.  **Recommended Tools:** Suggest 1-2 of the most popular and reputable **free online tools** or **free software** for this specific conversion. Provide their names, not just URLs.
  3.  **Step-by-Step Guide:** Give a very simple, numbered list of steps for a typical conversion process (e.g., 1. Go to the website, 2. Upload your file, 3. Select the output format, 4. Click convert).
  4.  **Important Note:** Add a "Lưu ý quan trọng" section with a crucial tip, like potential quality loss, or a warning about not uploading sensitive documents to online tools.

  Format the response using Markdown for readability. Do not include any introductory or concluding pleasantries. Go straight to the guide.`;
  
  const response = await ai.models.generateContent({ model: GEMINI_TEXT_MODEL, contents: prompt });
  return response.text.trim();
}

export async function translateText(text: string, sourceLangName: string, targetLangName:string) {
  if (!text.trim()) return null;
  const ai = getGeminiClient();

  const fromLanguage = sourceLangName.toLowerCase() === 'auto-detect' ? 'auto-detect' : `from ${sourceLangName}`;
  
  return ai.models.generateContentStream({
    model: GEMINI_TEXT_MODEL,
    contents: `Translate the following text ${fromLanguage} to ${targetLangName}:\n\n${text}`,
    config: {
        systemInstruction: `You are a literal translation engine. Your task is to provide a direct, word-for-word equivalent of the source text in the target language.
- Translate STRICTLY line by line.
- DO NOT add any words, explanations, or context that are not present in the original text.
- DO NOT attempt to interpret the meaning or be creative.
- Preserve the original line breaks exactly.
- Your output must be ONLY the translated text and nothing else.`
    }
  });
}

export async function extractTextFromImage(imageFile: File): Promise<string> {
    const ai = getGeminiClient();
    const imagePart = await fileToGenerativePart(imageFile, () => {}); // No progress needed for small files
  
    const response = await ai.models.generateContent({
      model: GEMINI_MULTIMODAL_MODEL,
      contents: { parts: [{ text: "Extract all text from this image, preserving line breaks." }, imagePart] },
      config: {
          systemInstruction: 'You are a highly accurate OCR engine. Your only job is to extract text from images. Do not interpret the text. Do not add any words or characters that are not in the image. Do not add any explanations or markdown. Output only the raw text.'
      }
    });
  
    return response.text.trim();
}

const translateBatch = async (texts: string[], sourceLangName: string, targetLangName: string): Promise<string[]> => {
    if (texts.every(t => !t.trim())) return texts;
    const ai = getGeminiClient();
    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
        try {
            const response = await ai.models.generateContent({
                model: GEMINI_TEXT_MODEL,
                contents: `Translate each string in the JSON array from ${sourceLangName} to ${targetLangName}.\nInput: ${JSON.stringify({ texts })}\nOutput:`,
                config: {
                    responseMimeType: 'application/json',
                    systemInstruction: `You are a literal translation engine.
- Provide a direct, literal translation for each string.
- DO NOT add any words, explanations, or creative interpretations.
- Maintain the exact JSON array structure and number of elements.
- Respond ONLY with the translated JSON object.`
                },
            });

            const jsonResponse = JSON.parse(response.text);
            const translatedTexts = jsonResponse.texts;

            if (Array.isArray(translatedTexts) && translatedTexts.length === texts.length) {
                return translatedTexts;
            }
            console.warn(`Translation attempt ${attempt + 1} failed: Mismatched cue count.`);
            attempt++;
        } catch (error) {
            console.error(`Translation attempt ${attempt + 1} failed with error:`, error);
            attempt++;
        }
        if (attempt < maxRetries) await new Promise(res => setTimeout(res, 1000));
    }
    throw new Error("Failed to translate subtitle batch after multiple retries.");
};

export async function translateSubtitle(srtContent: string, sourceLangName: string, targetLangName: string, onProgress: (message: string) => void): Promise<string> {
    const cues = parseSubtitle(srtContent);
    if (cues.length === 0) return '';
    
    const batchSize = 50;
    const translatedCues: ParsedCue[] = [];
    const totalBatches = Math.ceil(cues.length / batchSize);

    for (let i = 0; i < cues.length; i += batchSize) {
        const batchIndex = Math.floor(i / batchSize) + 1;
        onProgress(`Đang dịch phụ đề... (Lô ${batchIndex}/${totalBatches})`);
        const batchCues = cues.slice(i, i + batchSize);
        const textsToTranslate = batchCues.map(cue => cue.text);
        const translatedTexts = await translateBatch(textsToTranslate, sourceLangName, targetLangName);
        
        const newCues = batchCues.map((cue, index) => ({
            ...cue,
            text: translatedTexts[index] || cue.text,
        }));
        translatedCues.push(...newCues);
    }
    
    onProgress('Đã dịch xong. Đang định dạng lại tệp...');
    return toSrt(translatedCues);
}

export async function transcribeMedia(mediaFile: File, onProgress: (message: string) => void): Promise<string> {
    onProgress('[1/3] Đang gửi tệp đến AI...');
    const ai = getGeminiClient();
    const part = await fileToGenerativePart(mediaFile, (msg) => onProgress(`[1/3] ${msg}`));
    const prompt = `You are an expert transcriptionist. Transcribe the audio from the provided media file. Your output must be in the SubRip Text (SRT) format. Ensure accurate timestamps and text. Do not include any explanations or extra text outside of the SRT format.`;

    onProgress('[2/3] AI đang xử lý và gỡ băng âm thanh...');
    const response = await ai.models.generateContent({
        model: GEMINI_MULTIMODAL_MODEL,
        contents: { parts: [{ text: prompt }, part] },
    });
    
    onProgress('[3/3] Đã xử lý xong. Đang hoàn tất...');
    return response.text.trim();
}
