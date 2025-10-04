import type { Voice } from '../types';

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let currentAuthToken: { token: string; expiry: number } | null = null;

const MICROSOFT_VOICES: Voice[] = [
  { id: 'microsoft-vi-VN-HoaiMyNeural', name: 'Microsoft Hoài My (Nữ)', gender: 'Female' },
  { id: 'microsoft-vi-VN-NamMinhNeural', name: 'Microsoft Nam Minh (Nam)', gender: 'Male' },
];

export const getMicrosoftVoices = (): Voice[] => MICROSOFT_VOICES;

export const cancelMicrosoftSpeech = () => {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
        currentAudio = null;
    }
    if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = null;
    }
};

const getAuthToken = async (apiKey: string, region: string): Promise<string> => {
    // Check if token is valid for at least 1 more minute
    if (currentAuthToken && currentAuthToken.expiry > Date.now() + 60000) { 
        return currentAuthToken.token;
    }

    const response = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    if (!response.ok) {
        throw new Error(`Không thể lấy token xác thực từ Azure. Status: ${response.status}`);
    }

    const token = await response.text();
    // Tokens are valid for 10 minutes, refresh after 9 to be safe
    currentAuthToken = { token, expiry: Date.now() + 9 * 60 * 1000 }; 
    return token;
};


export const playMicrosoftSpeech = (text: string, voiceId: string): Promise<void> => {
    cancelMicrosoftSpeech();
    return new Promise(async (resolve, reject) => {
        const apiKey = localStorage.getItem('MICROSOFT_API_KEY');
        const region = localStorage.getItem('MICROSOFT_API_REGION');

        if (!apiKey || !region) {
            return reject(new Error('Vui lòng nhập Khóa API và Khu vực của Microsoft Azure trong tab Công cụ AI.'));
        }

        try {
            const authToken = await getAuthToken(apiKey, region);
            const voiceName = voiceId.replace('microsoft-', '');

            const ssml = `
                <speak version='1.0' xml:lang='vi-VN'>
                    <voice xml:lang='vi-VN' name='${voiceName}'>
                        ${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                    </voice>
                </speak>`;
            
            const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-24khz-160kbitrate-mono-mp3'
                },
                body: ssml
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Lỗi Microsoft TTS API: ${response.status} - ${errorText}`);
            }
            
            const audioBlob = await response.blob();
            const objectUrl = URL.createObjectURL(audioBlob);
            currentObjectUrl = objectUrl;
            
            const audio = new Audio(objectUrl);
            currentAudio = audio;

            const onEnded = () => { cleanup(); resolve(); };
            const onError = () => { cleanup(); reject(new Error('Không thể phát tệp âm thanh từ Microsoft.')); };

            const cleanup = () => {
                audio.removeEventListener('ended', onEnded);
                audio.removeEventListener('error', onError);
                if (currentObjectUrl) {
                    URL.revokeObjectURL(currentObjectUrl);
                    currentObjectUrl = null;
                }
                if (currentAudio === audio) {
                    currentAudio = null;
                }
            };

            audio.addEventListener('ended', onEnded);
            audio.addEventListener('error', onError);
            
            audio.play().catch(err => {
                console.error("Lỗi khi phát âm thanh Microsoft:", err);
                onError();
            });

        } catch (error) {
            console.error("Lỗi khi gọi API Microsoft TTS:", error);
            return reject(error as Error);
        }
    });
};
