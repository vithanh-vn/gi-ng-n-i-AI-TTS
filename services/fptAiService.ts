import type { Voice } from '../types';

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;

const FPT_VOICES: Voice[] = [
  { id: 'fpt-leminh', name: 'Lê Minh (Nam miền Bắc)', gender: 'Male' },
  { id: 'fpt-banmai', name: 'Ban Mai (Nữ miền Bắc)', gender: 'Female' },
  { id: 'fpt-giahuy', name: 'Gia Huy (Nam miền Nam)', gender: 'Male' },
  { id: 'fpt-myan', name: 'Mỹ An (Nữ miền Nam)', gender: 'Female' },
  { id: 'fpt-lientrang', name: 'Liên Trang (Nữ miền Trung)', gender: 'Female' },
  { id: 'fpt-thuminh', name: 'Thu Minh (Nữ miền Trung)', gender: 'Female' },
];

export const getFptVoices = (): Voice[] => FPT_VOICES;

export const cancelFptSpeech = () => {
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

export const playFptAiSpeech = (text: string, voiceId: string): Promise<void> => {
    cancelFptSpeech();
    return new Promise(async (resolve, reject) => {
        const apiKey = localStorage.getItem('FPT_API_KEY');
        if (!apiKey) {
            return reject(new Error('Vui lòng nhập khóa API của FPT.AI trong tab Công cụ AI.'));
        }

        const fptVoiceName = voiceId.replace('fpt-', '');
        let audioFileUrl: string;

        // --- Step 1: Call FPT API to get the audio URL ---
        try {
            const apiResponse = await fetch('https://api.fpt.ai/hmi/tts/v5', {
                method: 'POST',
                headers: {
                    'api-key': apiKey,
                    'voice': fptVoiceName,
                    'Content-Type': 'text/plain',
                },
                body: text,
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json().catch(() => ({ message: 'Lỗi không xác định' }));
                throw new Error(`Lỗi FPT.AI: ${apiResponse.status} - ${errorData.message || 'Không có thông báo lỗi'}`);
            }

            const data = await apiResponse.json();
            if (data.error !== 0 || !data.async) {
                throw new Error(`Lỗi FPT.AI: ${data.message || 'API không trả về đường dẫn âm thanh.'}`);
            }

            audioFileUrl = data.async;

        } catch (error) {
            console.error("Lỗi khi gọi API FPT.AI:", error);
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                return reject(new Error(
                    'Lỗi kết nối đến API của FPT.AI. Trình duyệt có thể đã chặn yêu cầu vì lý do bảo mật (CORS). ' +
                    'Hãy đảm bảo khóa API của bạn chính xác và bạn đã kết nối internet. API này có thể không hỗ trợ gọi trực tiếp từ trình duyệt.'
                ));
            }
            return reject(error as Error);
        }

        // --- Step 2: Fetch the audio file as a blob to bypass playback issues ---
        try {
            const audioResponse = await fetch(audioFileUrl);
            if (!audioResponse.ok) {
                throw new Error(`Không thể tải tệp âm thanh từ FPT.AI (HTTP ${audioResponse.status}).`);
            }
            const audioBlob = await audioResponse.blob();

            // --- Step 3: Create an object URL and play it ---
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
                 console.error("Lỗi khi phát âm thanh:", err);
                 onError();
            });

        } catch (error) {
            console.error("Lỗi khi tải tệp âm thanh từ FPT.AI:", error);
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                return reject(new Error(
                    'Lỗi tải tệp âm thanh từ FPT.AI. Yêu cầu đã bị trình duyệt chặn (CORS). Điều này đôi khi xảy ra với các liên kết tạm thời.'
                ));
            }
            return reject(error as Error);
        }
    });
};
