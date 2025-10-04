import type { Voice } from '../types';

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;

const GOOGLE_API_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

const GOOGLE_VI_VOICES: Voice[] = [
  { id: 'vi-VN-Standard-A', name: 'Google Standard A (Nữ)', gender: 'Female' },
  { id: 'vi-VN-Standard-B', name: 'Google Standard B (Nam)', gender: 'Male' },
  { id: 'vi-VN-Standard-C', name: 'Google Standard C (Nữ)', gender: 'Female' },
  { id: 'vi-VN-Standard-D', name: 'Google Standard D (Nam)', gender: 'Male' },
  { id: 'vi-VN-Wavenet-A', name: 'Google Wavenet A (Nữ)', gender: 'Female' },
  { id: 'vi-VN-Wavenet-B', name: 'Google Wavenet B (Nam)', gender: 'Male' },
  { id: 'vi-VN-Wavenet-C', name: 'Google Wavenet C (Nữ)', gender: 'Female' },
  { id: 'vi-VN-Wavenet-D', name: 'Google Wavenet D (Nam)', gender: 'Male' },
];

export const getGoogleVoices = (): Voice[] => GOOGLE_VI_VOICES;

export const cancelGoogleSpeech = () => {
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

const base64ToBlob = (base64: string, contentType: string = 'audio/mpeg'): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
};

export const playGoogleSpeech = (text: string, voiceId: string): Promise<void> => {
    cancelGoogleSpeech();
    return new Promise(async (resolve, reject) => {
        const apiKey = localStorage.getItem('GOOGLE_API_KEY');
        if (!apiKey) {
            return reject(new Error('Vui lòng nhập khóa API của Google Cloud trong tab Công cụ AI.'));
        }

        try {
            const requestBody = {
                input: { text: text },
                voice: {
                    languageCode: 'vi-VN',
                    name: voiceId
                },
                audioConfig: {
                    audioEncoding: 'MP3'
                }
            };

            const response = await fetch(`${GOOGLE_API_ENDPOINT}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error?.message || 'Lỗi không xác định từ Google API.';
                throw new Error(`Lỗi Google TTS API: ${response.status} - ${errorMessage}`);
            }

            const data = await response.json();
            if (!data.audioContent) {
                throw new Error('API không trả về nội dung âm thanh.');
            }
            
            const audioBlob = base64ToBlob(data.audioContent);
            const objectUrl = URL.createObjectURL(audioBlob);
            currentObjectUrl = objectUrl;
            
            const audio = new Audio(objectUrl);
            currentAudio = audio;

            const onEnded = () => {
                cleanup();
                resolve();
            };
            
            const onError = () => {
                let detailedMessage = 'Không thể phát tệp âm thanh đã tải về.';
                if (audio.error) {
                     detailedMessage += ` (Mã lỗi: ${audio.error.code}, Thông điệp: ${audio.error.message})`;
                }
                cleanup();
                reject(new Error(detailedMessage));
            };

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
                 console.error("Lỗi khi phát âm thanh Google:", err);
                 onError();
            });

        } catch (error) {
            console.error("Lỗi khi gọi API Google TTS:", error);
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                 return reject(new Error(
                    'Lỗi kết nối đến API của Google. Trình duyệt có thể đã chặn yêu cầu vì lý do bảo mật (CORS). Hãy đảm bảo khóa API của bạn chính xác và không có giới hạn nào trên đó.'
                ));
            }
            return reject(error as Error);
        }
    });
};
