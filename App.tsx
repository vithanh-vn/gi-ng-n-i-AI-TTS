
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { LanguageCode, SpeakerConfig, ParsedCue, Voice, VoiceProvider, CustomVoice } from './types';
import { languages } from './constants';
import { parseSubtitle } from './services/subtitleParser';
import { toSrt, toAss, toTxtScript } from './utils/subtitleFormatters';
import { adjustSubtitleTimings } from './utils/timeUtils';

import { Header } from './components/Header';
import { VoiceControls } from './components/VoiceControls';
import { TabButton } from './components/TabButton';
import { Loader } from './components/Loader';
import { MultiSpeakerControls } from './components/MultiSpeakerControls';
import { UserIcon } from './components/icons/UserIcon';
import { UsersIcon } from './components/icons/UsersIcon';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { SoundWaveIcon } from './components/icons/SoundWaveIcon';
import { WaveformIcon } from './components/icons/WaveformIcon';
import { FindAndReplace } from './components/FindAndReplace';
import { AudioAnalysis } from './components/AudioAnalysis';
import { TranslationControls } from './components/TranslationControls';
import { SubtitleTranslationControls } from './components/SubtitleTranslationControls';
import { ClockIcon } from './components/icons/ClockIcon';
import { GlobeIcon } from './components/icons/GlobeIcon';
import { TranslationTool } from './components/TranslationTool';
import { FileConverter } from './components/FileConverter';
import { TextRemover } from './components/TextRemover';
import { VoiceCloning } from './components/VoiceCloning';
import { DesktopVersion } from './components/DesktopVersion';
import { DesktopIcon } from './components/icons/DesktopIcon';
import { generateSpeech, playMultiSpeakerWithTimings, getBrowserVoices, cancelSpeech, recordSpeech, recordMultiSpeakerWithTimings } from './services/ttsService';
import { UploadIcon } from './components/icons/UploadIcon';
import { InfoIcon } from './components/icons/InfoIcon';
import { AudioPlayer } from './components/AudioPlayer';
import { getFptVoices } from './services/fptAiService';
import { getGoogleVoices } from './services/googleTtsService';
import { getMicrosoftVoices } from './services/microsoftTtsService';
import { ApiKeyManager } from './components/ApiKeyManager';


type MainMode = 'single' | 'multi' | 'ai-translation' | 'tools' | 'voice-cloning' | 'desktop';

const InstructionalModal: React.FC<{ onConfirm: () => void; onCancel: () => void; }> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full border border-indigo-500/50">
        <div className="p-6">
          <h3 className="text-xl font-bold text-center text-indigo-300">Hướng dẫn Ghi âm Giọng nói</h3>
          <p className="text-sm text-gray-400 mt-4">
            Trình duyệt không cho phép tải trực tiếp tệp âm thanh. Để lưu lại, chúng ta cần <strong>ghi âm lại âm thanh của chính tab này.</strong>
          </p>
          <div className="mt-5 p-4 bg-gray-900 rounded-md border border-gray-700">
             <h4 className="font-semibold text-gray-200">Quan trọng: Hãy làm theo các bước sau</h4>
             <ol className="list-decimal list-inside mt-2 space-y-2 text-sm text-gray-300">
                <li>Khi một cửa sổ mới hiện lên, hãy chọn tab có tên <strong>"Trình tạo giọng nói AI"</strong>.</li>
                <li>Ở góc dưới, hãy chắc chắn bạn đã tích vào ô <strong>"Chia sẻ âm thanh tab" (Share tab audio)</strong>. Đây là bước quan trọng nhất!</li>
                <li>Nhấn nút <strong>"Chia sẻ" (Share)</strong>. Quá trình ghi âm sẽ bắt đầu.</li>
             </ol>
          </div>
           <p className="text-xs text-gray-500 mt-4 text-center">
            Bạn sẽ thấy một thông báo của trình duyệt cho biết tab đang được chia sẻ. Đây là dấu hiệu ghi âm đang hoạt động.
           </p>
        </div>
        <div className="bg-gray-900/50 px-6 py-4 flex justify-end gap-4 rounded-b-lg">
            <button onClick={onCancel} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-medium transition-colors">Hủy</button>
            <button onClick={onConfirm} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md font-bold transition-colors">Tôi đã hiểu, Bắt đầu!</button>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [mainMode, setMainMode] = useState<MainMode>('single');
  
  // Common state
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('vi-VN');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Đang tạo giọng nói...');
  const [error, setError] = useState<string | null>(null);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [generatedAudioBlob, setGeneratedAudioBlob] = useState<Blob | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>('browser');
  const [customVoices, setCustomVoices] = useState<CustomVoice[]>([]);
  
  // Recording flow state
  const [isRecordingSupported, setIsRecordingSupported] = useState(false);
  const [isInstructionModalVisible, setInstructionModalVisible] = useState(false);
  const [recordingTask, setRecordingTask] = useState<'single' | 'multi' | null>(null);
  
  // Single Speaker mode state
  const [text, setText] = useState('Chào mừng bạn đến với trình tạo giọng nói AI. Nhập văn bản của bạn tại đây.');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  
  // Multi Speaker (Subtitle) mode state
  const [subtitleRawText, setSubtitleRawText] = useState('');
  const [subtitleCues, setSubtitleCues] = useState<ParsedCue[]>([]);
  const [speakerConfigs, setSpeakerConfigs] = useState<SpeakerConfig[]>([
    { id: Date.now(), speakerName: 'Người nói A', voiceId: '' }
  ]);
  const [fileName, setFileName] = useState<string>('subtitle');
  const [subtitleInfo, setSubtitleInfo] = useState<{ cues: number; duration: string } | null>(null);
  const [adjustmentFeedback, setAdjustmentFeedback] = useState<string | null>(null);
  const adjustmentFeedbackTimeoutRef = useRef<number | null>(null);
  const [minGap, setMinGap] = useState<number>(1);
  
  // Effect to load browser voices, custom voices, and check for recording support
  useEffect(() => {
    getBrowserVoices().then(setBrowserVoices);
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
      setIsRecordingSupported(true);
    }
     try {
        const stored = localStorage.getItem('customVoices');
        if (stored) {
            setCustomVoices(JSON.parse(stored));
        }
    } catch (e) {
        console.error("Failed to parse custom voices from localStorage", e);
        localStorage.removeItem('customVoices');
    }
  }, []);

  const voices = useMemo((): Voice[] => {
    const customVoiceList: Voice[] = customVoices.map(cv => ({
        id: cv.id,
        name: cv.name,
        gender: 'Neutral' as const,
    }));

    let providerVoices: Voice[] = [];

    if (selectedLanguage === 'vi-VN') {
        if (voiceProvider === 'fpt') providerVoices = getFptVoices();
        else if (voiceProvider === 'google') providerVoices = getGoogleVoices();
        else if (voiceProvider === 'microsoft') providerVoices = getMicrosoftVoices();
    }
    
    // Fallback to browser voices if no API provider is selected or for other languages
    if (providerVoices.length === 0 && browserVoices.length > 0) {
        const langPrefix = selectedLanguage.split('-')[0];
        const filtered = browserVoices
            .filter(voice => voice.lang === selectedLanguage || voice.lang.startsWith(langPrefix))
            .map(voice => ({
                id: voice.voiceURI,
                name: `${voice.name} (${voice.lang})`,
                gender: 'Neutral' as const,
            }));
        
        providerVoices = filtered.sort((a, b) => {
            const aIsMicrosoft = a.name.toLowerCase().includes('microsoft');
            const bIsMicrosoft = b.name.toLowerCase().includes('microsoft');
            if (aIsMicrosoft && !bIsMicrosoft) return -1;
            if (!aIsMicrosoft && bIsMicrosoft) return 1;
            const aIsNative = a.name.toLowerCase().includes('native');
            const bIsNative = b.name.toLowerCase().includes('native');
            if (aIsNative && !bIsNative) return -1;
            if (!aIsNative && bIsNative) return 1;
            return 0;
        });
    }

    return [...customVoiceList, ...providerVoices];
  }, [selectedLanguage, browserVoices, voiceProvider, customVoices]);


  // Effect to update selected voice when language or voices change
  useEffect(() => {
    if (voices.length > 0) {
      if (mainMode === 'single') {
        if (!selectedVoice || !voices.find(v => v.id === selectedVoice)) {
          setSelectedVoice(voices[0].id);
        }
      } else if (mainMode === 'multi') {
        setSpeakerConfigs(configs => configs.map(c => ({
          ...c,
          voiceId: c.voiceId && voices.find(v => v.id === c.voiceId) ? c.voiceId : voices[0].id
        })));
      }
    } else {
      if (mainMode === 'single') {
        setSelectedVoice('');
      } else if (mainMode === 'multi') {
        setSpeakerConfigs(configs => configs.map(c => ({ ...c, voiceId: '' })));
      }
    }
  }, [voices, mainMode]);
  
  // Effect to clean up object URL for the audio player
  useEffect(() => {
    return () => {
      if (generatedAudioUrl) {
        URL.revokeObjectURL(generatedAudioUrl);
      }
    };
  }, [generatedAudioUrl]);

  // Subtitle parser effect
  useEffect(() => {
    if (mainMode !== 'multi') return;
    try {
        const cues = parseSubtitle(subtitleRawText);
        setSubtitleCues(cues);

        if (cues.length > 0) {
            const lastCue = cues[cues.length - 1];
            setSubtitleInfo({ cues: cues.length, duration: lastCue.endTime.split(',')[0] });
        } else {
            setSubtitleInfo(null);
        }

        const detectedSpeakers = new Set(cues.map(cue => cue.speaker).filter(Boolean) as string[]);
        if (detectedSpeakers.size > 0) {
            const currentSpeakers = new Set(speakerConfigs.map(c => c.speakerName));
            if (detectedSpeakers.size !== currentSpeakers.size || ![...detectedSpeakers].every(s => currentSpeakers.has(s))) {
                 const newConfigs: SpeakerConfig[] = Array.from(detectedSpeakers).map((name, index) => ({
                    id: Date.now() + index,
                    speakerName: name,
                    voiceId: voices[index % voices.length]?.id || ''
                }));
                setSpeakerConfigs(newConfigs.length > 0 ? newConfigs : [{ id: Date.now(), speakerName: 'Người nói A', voiceId: voices[0]?.id || '' }]);
            }
        }
    } catch (e) {
        console.error("Error parsing subtitle:", e);
        setSubtitleCues([]);
        setSubtitleInfo(null);
    }
  }, [subtitleRawText, voices, mainMode]);
  
  const handleLanguageChange = (code: LanguageCode) => {
    cancelSpeech();
    setIsLoading(false);
    setIsRecording(false);
    setSelectedLanguage(code);
    setGeneratedAudioUrl(null);
    setGeneratedAudioBlob(null);
    if (code !== 'vi-VN') {
      setVoiceProvider('browser');
    }
  };
  
  const handleModeChange = (newMode: MainMode) => {
    setMainMode(newMode);
    setGeneratedAudioUrl(null);
    setGeneratedAudioBlob(null);
    setError(null);
  };

  const handleAdjustTimings = useCallback(() => {
    if (!subtitleRawText) return;

    if (adjustmentFeedbackTimeoutRef.current) {
        clearTimeout(adjustmentFeedbackTimeoutRef.current);
    }

    try {
      const cues = parseSubtitle(subtitleRawText);
      const { adjustedCues, adjustmentsCount } = adjustSubtitleTimings(cues, minGap);
      const newSrtContent = toSrt(adjustedCues);
      setSubtitleRawText(newSrtContent);

      if (adjustmentsCount > 0) {
        setAdjustmentFeedback(`Đã căn chỉnh thành công ${adjustmentsCount} dòng có lỗi thời gian.`);
      } else {
        setAdjustmentFeedback('Không tìm thấy lỗi thời gian nào cần căn chỉnh.');
      }
      
      adjustmentFeedbackTimeoutRef.current = window.setTimeout(() => {
        setAdjustmentFeedback(null);
      }, 4000);

    } catch (e) {
      console.error("Error adjusting timings:", e);
      setError("Lỗi khi căn chỉnh thời gian.");
    }
  }, [subtitleRawText, minGap]);

 const handleSingleSpeakerFileSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setText(content);
    };
    reader.readAsText(file);
    setFileName(file.name.replace(/\.[^/.]+$/, ""));
  }, []);

  const handleSubtitleFileSelect = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setSubtitleRawText(content);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.classList.remove('border-indigo-500');
    const file = event.dataTransfer.files[0];
    if (file) {
      if (mainMode === 'multi') {
        handleSubtitleFileSelect(file);
      } else {
        handleSingleSpeakerFileSelect(file);
      }
    }
  };
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.classList.add('border-indigo-500');
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.classList.remove('border-indigo-500');
  };

  const handleGenerateSpeech = async () => {
    if (isLoading || isRecording) {
      cancelSpeech();
      setIsLoading(false);
      setIsRecording(false);
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Đang khởi tạo...');
    setError(null);
    
    try {
      if (mainMode === 'single') {
        if (!text.trim() || !selectedVoice) throw new Error('Vui lòng nhập văn bản và chọn một giọng đọc.');
        setLoadingMessage('Đang phát giọng nói...');
        await generateSpeech(text, selectedVoice);
      } else if (mainMode === 'multi') {
        if (subtitleCues.length === 0) throw new Error('Vui lòng tải lên tệp phụ đề.');
        await playMultiSpeakerWithTimings(subtitleCues, speakerConfigs, setLoadingMessage);
      }
    } catch (err) {
      if ((err as Error).message.includes('cancelled')) {
         // Don't show error for user cancellation
      } else {
        setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Voice Cloning Handlers ---
    const handleAddCustomVoice = (voiceName: string, audioFile: File): Promise<void> => {
        // In a real app, this would be an async call to a backend.
        // Here, we just update local state and storage.
        const newVoice: CustomVoice = {
            id: `custom-${Date.now()}`,
            name: `[Tùy chỉnh] ${voiceName}`,
        };
        const updatedVoices = [...customVoices, newVoice];
        setCustomVoices(updatedVoices);
        localStorage.setItem('customVoices', JSON.stringify(updatedVoices));
        return Promise.resolve();
    };

    const handleDeleteCustomVoice = (id: string) => {
        const updatedVoices = customVoices.filter(v => v.id !== id);
        setCustomVoices(updatedVoices);
        localStorage.setItem('customVoices', JSON.stringify(updatedVoices));
    };

  // --- Recording Flow ---
  
  const handleOpenRecordingModal = (task: 'single' | 'multi') => {
    if (!isRecordingSupported) {
      setError("Tính năng ghi âm không được trình duyệt của bạn hỗ trợ. Hãy thử trên trình duyệt máy tính như Chrome hoặc Firefox.");
      return;
    }
    setRecordingTask(task);
    setInstructionModalVisible(true);
  };

  const handleConfirmRecording = async () => {
    setInstructionModalVisible(false);
    if (isRecording || isLoading) return;

    setIsRecording(true);
    setError(null);
    setGeneratedAudioUrl(null);
    setGeneratedAudioBlob(null);

    try {
      let audioBlob: Blob;
      if (recordingTask === 'single') {
        if (!text.trim() || !selectedVoice) throw new Error('Vui lòng nhập văn bản và chọn một giọng đọc.');
        setLoadingMessage('Đang tạo tệp âm thanh (đơn)...');
        audioBlob = await recordSpeech(text, selectedVoice, setLoadingMessage);
      } else if (recordingTask === 'multi') {
        if (subtitleCues.length === 0) throw new Error('Vui lòng tải lên tệp phụ đề.');
        setLoadingMessage('Đang tạo tệp âm thanh (nhiều)...');
        audioBlob = await recordMultiSpeakerWithTimings(subtitleCues, speakerConfigs, setLoadingMessage);
      } else {
        throw new Error("Tác vụ ghi âm không xác định.");
      }

      setGeneratedAudioBlob(audioBlob);
      setGeneratedAudioUrl(URL.createObjectURL(audioBlob));

    } catch (err) {
      if (!(err as Error).message.includes('cancelled')) {
        setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.');
      }
    } finally {
      setIsRecording(false);
      setRecordingTask(null);
    }
  };

  const handleDownloadGeneratedAudio = () => {
    if (!generatedAudioUrl) return;

    const link = document.createElement('a');
    const newFileName = fileName.replace(/\.[^/.]+$/, "") + `.webm`;
    link.href = generatedAudioUrl;
    link.download = newFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // --- Download Functions for Subtitles ---

  const handleDownloadSubtitle = (format: 'srt' | 'ass') => {
    try {
        const cues = parseSubtitle(subtitleRawText);
        const { adjustedCues } = adjustSubtitleTimings(cues, minGap);
        const content = format === 'srt' ? toSrt(adjustedCues) : toAss(adjustedCues);
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const newFileName = fileName.replace(/\.[^/.]+$/, "") + `.${format}`;
        link.setAttribute('href', url);
        link.setAttribute('download', newFileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Error creating download file:", e);
        setError("Lỗi tạo tệp tải về.");
    }
  };

  const handleDownloadScript = () => {
    try {
        const cues = parseSubtitle(subtitleRawText);
        const content = toTxtScript(cues, fileName);
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const newFileName = fileName.replace(/\.[^/.]+$/, "") + `_script.txt`;
        link.setAttribute('href', url);
        link.setAttribute('download', newFileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Error creating script file:", e);
        setError("Lỗi tạo tệp kịch bản.");
    }
  };
  
  const renderSharedAudioPlayer = () => (
    generatedAudioUrl && (
      <div className="p-4 bg-gray-800 rounded-lg space-y-3 border border-green-700/50 animate-fade-in">
        <h4 className="font-semibold text-green-300 text-center">Tệp âm thanh đã được tạo</h4>
        <AudioPlayer src={generatedAudioUrl} />
        <button
          onClick={handleDownloadGeneratedAudio}
          className="w-full flex items-center justify-center gap-2 p-2 bg-green-700 hover:bg-green-600 rounded-md font-medium transition-colors"
        >
          <DownloadIcon /> Tải về tệp này (.WEBM)
        </button>
      </div>
    )
  );
  
  const renderSingleSpeakerMode = () => (
    <>
      <div 
        className="relative border-2 border-dashed border-gray-700 rounded-lg p-2"
        onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhập văn bản của bạn ở đây..."
          className="w-full h-48 p-2 bg-transparent border-none focus:ring-0 text-white font-mono text-sm"
        />
        <div className="absolute bottom-3 right-3">
            <label htmlFor="file-upload-text" className="cursor-pointer flex items-center gap-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-md transition-colors">
                <UploadIcon className="w-4 h-4" />
                <span>Tải tệp lên</span>
                <input id="file-upload-text" type="file" className="sr-only" onChange={e => e.target.files && handleSingleSpeakerFileSelect(e.target.files[0])} accept=".txt,.srt,.vtt" />
            </label>
        </div>
      </div>
      <TranslationControls 
        text={text}
        setText={setText}
        setSelectedLanguage={setSelectedLanguage}
        languages={languages}
      />
      <VoiceControls
        languages={languages}
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        voices={voices}
        selectedVoice={selectedVoice}
        onVoiceChange={setSelectedVoice}
        voiceProvider={voiceProvider}
        onVoiceProviderChange={setVoiceProvider}
      />
      {renderSharedAudioPlayer()}
      <div className="flex flex-col sm:flex-row gap-4">
            <button
                onClick={handleGenerateSpeech}
                disabled={isRecording}
                className={`w-full flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold rounded-full transition-all duration-200 transform hover:scale-105 disabled:cursor-not-allowed disabled:scale-100 shadow-lg ${
                  isLoading
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader />
                    <span>{loadingMessage} (Nhấn để dừng)</span>
                  </>
                ) : 'Phát giọng nói (Xem trước nhanh)'}
              </button>
             <button
                onClick={() => handleOpenRecordingModal('single')}
                disabled={isLoading || isRecording || !isRecordingSupported}
                title={!isRecordingSupported ? "Trình duyệt của bạn không hỗ trợ tính năng ghi âm này." : ""}
                className={`w-full flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold rounded-full transition-all duration-200 transform hover:scale-105 disabled:cursor-not-allowed disabled:scale-100 disabled:bg-cyan-900/50 shadow-lg ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30'
                    : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/30'
                }`}
              >
                 {isRecording ? <Loader /> : <SoundWaveIcon className="w-6 h-6" />}
                 <span>{isRecording ? 'Đang tạo tệp...' : 'Tạo tệp âm thanh (.WEBM)'}</span>
              </button>
      </div>
    </>
  );

  const renderMultiSpeakerMode = () => (
    <>
      <div 
          className="p-4 bg-gray-900 border-2 border-dashed border-gray-700 rounded-lg text-center cursor-pointer hover:border-indigo-500 transition-colors duration-200"
          onClick={() => document.getElementById('file-upload-sub')?.click()}
          onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
      >
          <UploadIcon className="w-8 h-8 mx-auto text-gray-500 mb-2" />
          <p className="font-semibold text-gray-300">Kéo và thả tệp phụ đề (.srt, .vtt) vào đây</p>
          <p className="text-sm text-gray-500">hoặc nhấp để chọn tệp</p>
          <input id="file-upload-sub" type="file" className="sr-only" onChange={e => e.target.files && handleSubtitleFileSelect(e.target.files[0])} accept=".srt,.vtt,.txt" />
      </div>
      {subtitleRawText && (
        <>
          <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg text-sm">
            <p className="text-gray-300"><span className="font-medium">Tệp:</span> {fileName}</p>
            {subtitleInfo && <p className="text-gray-400">{subtitleInfo.cues} dòng / {subtitleInfo.duration}</p>}
          </div>
          <div className="relative">
            <textarea
              value={subtitleRawText}
              onChange={(e) => setSubtitleRawText(e.target.value)}
              placeholder="Nội dung phụ đề sẽ xuất hiện ở đây..."
              className="w-full h-64 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition font-mono text-sm text-white"
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-gray-900/50 px-2 py-1 rounded">
              {subtitleRawText.length.toLocaleString('vi-VN')} ký tự
            </div>
          </div>
          <FindAndReplace 
              content={subtitleRawText}
              onContentChange={setSubtitleRawText}
          />
          <SubtitleTranslationControls 
              onFileSelect={handleSubtitleFileSelect}
              subtitleContent={subtitleRawText}
              onTranslationComplete={setSubtitleRawText}
              languages={languages}
          />
          <div className="p-4 bg-gray-900/50 rounded-lg space-y-3">
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                 <h4 className="font-semibold text-gray-200">Căn chỉnh thời gian</h4>
                 <p className="text-xs text-gray-500">Tự động sửa lỗi chồng chéo &amp; đảm bảo khoảng cách tối thiểu.</p>
             </div>
             <div className='flex items-center gap-4'>
                <label htmlFor="min-gap" className="text-sm font-medium text-gray-300 whitespace-nowrap">Khoảng cách tối thiểu (ms):</label>
                <input
                    id="min-gap"
                    type="number"
                    value={minGap}
                    onChange={(e) => setMinGap(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                    min="0"
                />
             </div>
             <button onClick={handleAdjustTimings} className="w-full flex items-center justify-center gap-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md font-medium transition-colors">
                 <ClockIcon /> Căn chỉnh ngay
             </button>
             {adjustmentFeedback && (
                <p className="text-sm text-center text-green-400 transition-opacity duration-300">
                    {adjustmentFeedback}
                </p>
            )}
          </div>
          <div className="p-4 bg-gray-900/50 rounded-lg space-y-3">
              <h4 className="font-semibold text-gray-200 text-center">Tải về tệp</h4>
              <p className="text-xs text-gray-500 text-center">Tải về phụ đề đã chỉnh sửa hoặc kịch bản lồng tiếng.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button onClick={() => handleDownloadSubtitle('srt')} className="w-full flex items-center justify-center gap-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md font-medium transition-colors">
                      <DownloadIcon /> Tải về .SRT
                  </button>
                  <button onClick={() => handleDownloadSubtitle('ass')} className="w-full flex items-center justify-center gap-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md font-medium transition-colors">
                      <DownloadIcon /> Tải về .ASS
                  </button>
                   <button onClick={handleDownloadScript} className="w-full flex items-center justify-center gap-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md font-medium transition-colors">
                      <DownloadIcon /> Tải về kịch bản (.TXT)
                  </button>
              </div>
          </div>
        </>
      )}
      <MultiSpeakerControls
        languages={languages}
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        voices={voices}
        speakerConfigs={speakerConfigs}
        onConfigsChange={setSpeakerConfigs}
        voiceProvider={voiceProvider}
        onVoiceProviderChange={setVoiceProvider}
      />
      {renderSharedAudioPlayer()}
       <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleGenerateSpeech}
            disabled={isRecording}
            className={`w-full flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold rounded-full transition-all duration-200 transform hover:scale-105 disabled:cursor-not-allowed disabled:scale-100 shadow-lg ${
              isLoading
                ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'
            }`}
          >
            {isLoading ? (
              <>
                <Loader />
                <span>{loadingMessage} (Nhấn để dừng)</span>
              </>
            ) : (
              'Xem trước bản lồng tiếng'
            )}
          </button>
          <button
                onClick={() => handleOpenRecordingModal('multi')}
                disabled={isLoading || isRecording || !subtitleRawText || !isRecordingSupported}
                title={!isRecordingSupported ? "Trình duyệt của bạn không hỗ trợ tính năng ghi âm này." : ""}
                className={`w-full flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold rounded-full transition-all duration-200 transform hover:scale-105 disabled:cursor-not-allowed disabled:scale-100 disabled:bg-cyan-900/50 shadow-lg ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30'
                    : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/30'
                }`}
              >
                 {isRecording ? <Loader /> : <SoundWaveIcon className="w-6 h-6" />}
                 <span>{isRecording ? 'Đang tạo tệp...' : 'Tạo tệp âm thanh (.WEBM)'}</span>
              </button>
      </div>
    </>
  );

 const renderToolsTab = () => (
    <div className="space-y-8">
        <div className="mt-8 pt-8 border-t border-gray-700/50">
             <ApiKeyManager />
        </div>
        <div className="mt-8 pt-8 border-t border-gray-700/50">
            <TextRemover />
        </div>
        <div className="mt-8 pt-8 border-t border-gray-700/50">
            <AudioAnalysis languages={languages} />
        </div>
        <div className="mt-8 pt-8 border-t border-gray-700/50">
            <FileConverter />
        </div>
    </div>
 );

  const renderAITranslationTab = () => (
    <TranslationTool languages={languages} />
  );
  
  const renderVoiceCloningTab = () => (
    <VoiceCloning
        customVoices={customVoices}
        onVoiceAdd={handleAddCustomVoice}
        onVoiceDelete={handleDeleteCustomVoice}
    />
  );
  
  const renderDesktopVersionTab = () => (
    <DesktopVersion />
  );


  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Header />
        
        {isInstructionModalVisible && (
          <InstructionalModal 
            onConfirm={handleConfirmRecording} 
            onCancel={() => {
              setInstructionModalVisible(false);
              setRecordingTask(null);
            }} 
          />
        )}
        
        <div className="mt-10 mb-8 border-b border-gray-700">
          <div className="flex flex-wrap justify-center -mb-px">
            <TabButton isActive={mainMode === 'single'} onClick={() => handleModeChange('single')}>
              <UserIcon /> Một giọng nói
            </TabButton>
            <TabButton isActive={mainMode === 'multi'} onClick={() => handleModeChange('multi')}>
              <UsersIcon /> Nhiều giọng nói
            </TabButton>
             <TabButton isActive={mainMode === 'voice-cloning'} onClick={() => handleModeChange('voice-cloning')}>
              <WaveformIcon /> Nhân bản Giọng nói
            </TabButton>
            <TabButton isActive={mainMode === 'ai-translation'} onClick={() => handleModeChange('ai-translation')}>
              <GlobeIcon /> Dịch thuật AI
            </TabButton>
            <TabButton isActive={mainMode === 'tools'} onClick={() => handleModeChange('tools')}>
              <SparklesIcon /> Công cụ AI
            </TabButton>
             <TabButton isActive={mainMode === 'desktop'} onClick={() => handleModeChange('desktop')}>
              <DesktopIcon /> Phiên bản Desktop
            </TabButton>
          </div>
        </div>

        <main className="space-y-6">
          {mainMode === 'single' && renderSingleSpeakerMode()}
          {mainMode === 'multi' && renderMultiSpeakerMode()}
          {mainMode === 'voice-cloning' && renderVoiceCloningTab()}
          {mainMode === 'ai-translation' && renderAITranslationTab()}
          {mainMode === 'tools' && renderToolsTab()}
          {mainMode === 'desktop' && renderDesktopVersionTab()}

          {['single', 'multi'].includes(mainMode) && (
            <>
              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">
                  <p>{error}</p>
                </div>
              )}
              
              {!isLoading && !isRecording && (
                 <div className="bg-gray-800/50 border border-gray-700 text-gray-400 px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
                    <div className="flex-shrink-0 pt-0.5">
                        <InfoIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <strong>Lưu ý:</strong> 
                        Giọng nói được tạo miễn phí bằng công nghệ của trình duyệt. Việc tạo tệp âm thanh yêu cầu quyền ghi âm lại âm thanh của tab và có thể không được hỗ trợ trên tất cả các thiết bị (đặc biệt là di động).
                    </div>
                </div>
              )}
              {isRecording && (
                <div className="bg-cyan-900/50 border border-cyan-700 text-cyan-300 px-4 py-3 rounded-lg flex items-center justify-center gap-3 text-sm">
                    <Loader />
                    <div>
                        <strong>{loadingMessage}</strong><br/>
                        Quá trình ghi âm đang diễn ra. Đừng đóng thông báo chia sẻ của trình duyệt.
                    </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
