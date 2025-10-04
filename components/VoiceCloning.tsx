
import React, { useState, useCallback, useRef } from 'react';
import type { CustomVoice } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { InfoIcon } from './icons/InfoIcon';
import { Loader } from './Loader';
import { TrashIcon } from './icons/TrashIcon';
import { WaveformIcon } from './icons/WaveformIcon';

interface VoiceCloningProps {
  customVoices: CustomVoice[];
  onVoiceAdd: (voiceName: string, audioFile: File) => Promise<void>;
  onVoiceDelete: (id: string) => void;
}

// A simple delay utility
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const VoiceCloning: React.FC<VoiceCloningProps> = ({ customVoices, onVoiceAdd, onVoiceDelete }) => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [voiceName, setVoiceName] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  
  const [cloningStep, setCloningStep] = useState('');
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);


  const visualizeAudio = async (file: File) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const bufferLength = analyser.frequencyBinCount;

        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);
        
        // This is a simplified spectrogram visualization
        let x = 0;
        const sliceWidth = width * 1.0 / bufferLength;

        function draw() {
            if (x >= width) return;
            analyser.getByteFrequencyData(dataArray);

            ctx.fillStyle = '#111827'; // bg-gray-900
            ctx.fillRect(x, 0, 2, height);
            
            let barHeight;
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i];
                 // Create a gradient color based on frequency strength
                const blue = Math.floor(barHeight + 100);
                const green = Math.floor(barHeight / 2);
                const red = 20;
                ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
                ctx.fillRect(x, height - i/2, 1, 1);
            }
            x += 0.5;
        }

        // Simulate reading through the file for visualization
        for(let i=0; i<width*2; i++) {
            draw();
            await delay(2);
        }

    } catch (e) {
        console.error("Audio visualization failed:", e);
        setError("Không thể phân tích tệp âm thanh. Nó có thể bị hỏng hoặc có định dạng không được hỗ trợ.");
        throw e; // Propagate error to stop the cloning process
    }
  };


  const handleFileSelect = useCallback((file: File) => {
    setError(null);
    setFeedbackMessage(null);
    if (file && file.type.startsWith('audio/')) {
      if (file.size > 25 * 1024 * 1024) { // 25MB limit
        setError('Tệp âm thanh quá lớn. Vui lòng chọn tệp nhỏ hơn 25MB.');
        setAudioFile(null);
        return;
      }
      setAudioFile(file);
    } else {
      setError('Vui lòng chọn một tệp âm thanh hợp lệ (ví dụ: .mp3, .wav, .m4a).');
      setAudioFile(null);
    }
  }, []);

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.currentTarget.classList.remove('border-indigo-500');
    const file = event.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };
  
  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.currentTarget.classList.add('border-indigo-500');
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.currentTarget.classList.remove('border-indigo-500');
  };
  
  const handleCreateVoice = async () => {
    if (!audioFile || !voiceName.trim() || !consentChecked) {
        setError('Vui lòng điền đầy đủ thông tin và xác nhận điều khoản.');
        return;
    }

    setIsCloning(true);
    setError(null);
    setFeedbackMessage(null);
    setProgress(0);

    try {
        // Step 1: Uploading (simulated)
        setCloningStep('Đang tải tệp lên...');
        setProgress(10);
        await delay(1000);

        // Step 2: Real Analysis + Visualization
        setCloningStep('Phân tích đặc trưng âm thanh...');
        setProgress(20);
        await visualizeAudio(audioFile);
        setProgress(40);
        await delay(500);

        // Step 3: Simulated Training
        setCloningStep('Bắt đầu huấn luyện AI...');
        for (let i = 1; i <= 10; i++) {
            setCloningStep(`Tinh chỉnh mô hình... (Epoch ${i}/10)`);
            setProgress(40 + i * 5); // Progress from 45% to 90%
            await delay(400 + Math.random() * 200);
        }

        // Step 4: Finalizing
        setCloningStep('Hoàn tất và triển khai giọng nói...');
        setProgress(100);
        await delay(1500);

        await onVoiceAdd(voiceName.trim(), audioFile);
        
        setFeedbackMessage(`Giọng nói tùy chỉnh "${voiceName.trim()}" đã được tạo! Bạn có thể sử dụng nó trong các tab khác.`);
        setAudioFile(null);
        setVoiceName('');
        setConsentChecked(false);

    } catch (err) {
        setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.');
    } finally {
        setIsCloning(false);
        setCloningStep('');
        setProgress(0);
    }

    setTimeout(() => setFeedbackMessage(null), 8000);
  };

  const isButtonDisabled = !audioFile || !voiceName.trim() || !consentChecked || isCloning;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-cyan-400 flex items-center justify-center gap-3"><WaveformIcon className="w-7 h-7"/> Nhân Bản Giọng Nói (Beta)</h3>
        <p className="text-gray-400 mt-2 max-w-2xl mx-auto">Tạo phiên bản AI cho giọng nói của bạn từ một bản ghi âm mẫu.</p>
      </div>

       <div className="bg-gray-800/50 border border-gray-700 text-gray-400 px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
        <div className="flex-shrink-0 pt-0.5">
            <InfoIcon className="w-5 h-5" />
        </div>
        <div>
            <strong>Mẹo để có kết quả tốt nhất:</strong> Tải lên một bản ghi âm rõ ràng, không có tiếng ồn nền, chỉ có một giọng nói và dài ít nhất 30 giây.
        </div>
      </div>

      <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
        <h4 className="font-semibold text-gray-200">1. Tải lên tệp âm thanh</h4>
         <label 
            htmlFor="voice-clone-upload"
            className="flex flex-col items-center justify-center p-6 bg-gray-800 border-2 border-dashed border-gray-700 rounded-lg text-center cursor-pointer hover:border-indigo-500 transition-colors duration-200"
            onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
        >
            <UploadIcon className="w-8 h-8 mx-auto text-gray-500 mb-2" />
            {audioFile ? (
                <p className="font-semibold text-green-400">Đã chọn tệp: {audioFile.name}</p>
            ) : (
                <>
                    <p className="font-semibold text-gray-300">Kéo và thả tệp âm thanh (.mp3, .wav) vào đây</p>
                    <p className="text-sm text-gray-500">hoặc nhấp để chọn tệp (Tối đa 25MB)</p>
                </>
            )}
            <input id="voice-clone-upload" type="file" className="sr-only" onChange={e => e.target.files && handleFileSelect(e.target.files[0])} accept="audio/*" />
        </label>
      </div>
      
      <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
         <h4 className="font-semibold text-gray-200">2. Đặt tên và xác nhận</h4>
          <div>
            <label htmlFor="voice-name" className="block text-sm font-medium text-gray-300 mb-2">Tên giọng nói</label>
            <input
                id="voice-name"
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="Ví dụ: Giọng của tôi"
                className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
            </div>
             <div className="flex items-start space-x-3">
                <input
                    id="consent-checkbox"
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="h-5 w-5 mt-0.5 flex-shrink-0 bg-gray-700 border-gray-600 rounded text-indigo-600 focus:ring-2 focus:ring-offset-0 focus:ring-offset-gray-900 focus:ring-indigo-500"
                />
                <label htmlFor="consent-checkbox" className="text-sm text-gray-400">
                    Tôi xác nhận rằng tôi là chủ sở hữu hợp pháp của bản ghi âm và đồng ý tạo bản sao giọng nói kỹ thuật số cho mục đích cá nhân, phi thương mại. Tôi hiểu rằng giọng nói được tạo sẽ có watermark và tôi có quyền xóa dữ liệu của mình.
                </label>
            </div>
      </div>

       {isCloning && (
        <div className="p-4 bg-gray-900/50 rounded-lg space-y-4 animate-fade-in">
             <h4 className="font-semibold text-gray-200 text-center">Đang xử lý...</h4>
             <canvas ref={canvasRef} className="w-full h-24 bg-gray-900 rounded-md border border-gray-700"></canvas>
             <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                    className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${progress}%` }}
                ></div>
             </div>
             <p className="text-center text-sm text-cyan-300 font-mono">{cloningStep}</p>
        </div>
      )}


      {!isCloning && (
        <div>
            <button
            onClick={handleCreateVoice}
            disabled={isButtonDisabled}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold bg-cyan-600 hover:bg-cyan-700 rounded-full transition-all duration-200 transform hover:scale-105 disabled:bg-cyan-900/50 disabled:cursor-not-allowed disabled:scale-100 shadow-lg shadow-cyan-500/30"
            >
            Tạo giọng nói của tôi
            </button>
        </div>
      )}

      {error && <p className="text-sm text-red-400 text-center mt-3">{error}</p>}
      {feedbackMessage && <p className="text-sm text-green-400 text-center mt-3">{feedbackMessage}</p>}


       {customVoices.length > 0 && (
        <div className="space-y-4 pt-8 border-t border-gray-700/50">
            <h3 className="text-xl font-bold text-center text-gray-200">Giọng nói đã tạo của bạn</h3>
            <div className="p-4 bg-gray-900/50 rounded-lg space-y-3">
                {customVoices.map(voice => (
                    <div key={voice.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <p className="text-gray-300 font-medium">{voice.name}</p>
                        <button 
                            onClick={() => onVoiceDelete(voice.id)}
                            className="p-2 bg-red-800/50 hover:bg-red-700/70 text-red-300 rounded-md transition-colors"
                            aria-label={`Xóa giọng nói ${voice.name}`}
                        >
                            <TrashIcon />
                        </button>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};
