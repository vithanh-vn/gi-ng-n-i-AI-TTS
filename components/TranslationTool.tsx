import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { translateText, extractTextFromImage, transcribeMedia, translateSubtitle, generateSpeech, getBrowserVoices, cancelSpeech } from '../services/ttsService';
import { parseSubtitle } from '../services/subtitleParser';
import { toSrt, toAss, toTxt } from '../utils/subtitleFormatters';
import { adjustSubtitleTimings } from '../utils/timeUtils';

import { Loader } from './Loader';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { TextIcon } from './icons/TextIcon';
import { ImageIcon } from './icons/ImageIcon';
import { VideoIcon } from './icons/VideoIcon';
import { CopyIcon } from './icons/CopyIcon';
import { SoundWaveIcon } from './icons/SoundWaveIcon';
import { StopIcon } from './icons/StopIcon'; // Assuming you create a StopIcon

import type { Language, LanguageCode, Voice } from '../types';

interface TranslationToolProps {
  languages: Language[];
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const TextTranslator: React.FC<{ languages: Language[] }> = ({ languages }) => {
    const [sourceLang, setSourceLang] = useState<LanguageCode | 'auto-detect'>('auto-detect');
    const [targetLang, setTargetLang] = useState<LanguageCode>('vi-VN');
    const [inputText, setInputText] = useState('');
    const [outputText, setOutputText] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState<string>('');
    const [copyFeedback, setCopyFeedback] = useState(false);
    const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

    const debouncedInputText = useDebounce(inputText, 250);

    useEffect(() => {
        getBrowserVoices().then(setBrowserVoices);
    }, []);

    const voices = useMemo(() => {
        if (browserVoices.length === 0) return [];
        const langPrefix = targetLang.split('-')[0];
        return browserVoices
            .filter(voice => voice.lang === targetLang || voice.lang.startsWith(langPrefix))
            .map(voice => ({
                id: voice.voiceURI,
                name: `${voice.name} (${voice.lang})`,
                gender: 'Neutral' as const,
            }));
    }, [targetLang, browserVoices]);

    useEffect(() => {
        if (voices.length > 0 && !voices.find(v => v.id === selectedVoice)) {
            setSelectedVoice(voices[0].id);
        } else if (voices.length === 0) {
            setSelectedVoice('');
        }
    }, [voices, selectedVoice]);

    useEffect(() => {
        const doTranslate = async () => {
            if (!debouncedInputText.trim()) {
                setOutputText('');
                setError(null);
                return;
            }
            if (sourceLang !== 'auto-detect' && sourceLang === targetLang) {
                setOutputText(debouncedInputText);
                setError(null);
                return;
            }
            
            setIsTranslating(true);
            setError(null);
            setOutputText('');

            try {
                const sourceLangName = languages.find(l => l.code === sourceLang)?.name || 'auto-detect';
                const targetLangName = languages.find(l => l.code === targetLang)?.name || targetLang;
                const stream = await translateText(debouncedInputText, sourceLangName, targetLangName);
                if (stream) {
                    for await (const chunk of stream) {
                        setOutputText(prev => prev + chunk.text);
                    }
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Lỗi không xác định.';
                setError(`Lỗi dịch: ${message}`);
                setOutputText('');
            } finally {
                setIsTranslating(false);
            }
        };

        doTranslate();
    }, [debouncedInputText, sourceLang, targetLang, languages]);


    const handleListen = async () => {
        if (isGeneratingSpeech) {
            cancelSpeech();
            setIsGeneratingSpeech(false);
            return;
        }

        if (!outputText.trim() || !selectedVoice) return;
        setIsGeneratingSpeech(true);
        setError(null);
        
        try {
            await generateSpeech(outputText, selectedVoice);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi tạo giọng nói.');
        } finally {
            setIsGeneratingSpeech(false);
        }
    };
    
    const handleCopy = () => {
        navigator.clipboard.writeText(outputText);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value as LanguageCode | 'auto-detect')}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="auto-detect">Tự động phát hiện</option>
                    {languages.map((lang) => (<option key={lang.code} value={lang.code}>{lang.name}</option>))}
                </select>
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Nhập văn bản để dịch..."
                    className="w-full h-64 p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                />
            </div>
            <div className="space-y-2">
                 <select
                    value={targetLang}
                    onChange={(e) => {
                        setTargetLang(e.target.value as LanguageCode);
                        // Stop speech if language changes
                        cancelSpeech();
                        setIsGeneratingSpeech(false);
                    }}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                    {languages.map((lang) => (<option key={lang.code} value={lang.code}>{lang.name}</option>))}
                </select>
                <div className="relative">
                    <textarea
                        value={outputText}
                        readOnly
                        placeholder="Bản dịch sẽ xuất hiện ở đây..."
                        className="w-full h-64 p-3 bg-gray-900 border-2 border-gray-700 rounded-lg font-mono text-sm"
                    />
                    {isTranslating && <div className="absolute top-3 right-3"><Loader /></div>}
                    <div className="absolute bottom-3 right-3 flex gap-2">
                        <button onClick={handleCopy} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md disabled:opacity-50" disabled={!outputText}>
                            {copyFeedback ? <span className="text-xs px-1">Đã chép!</span> : <CopyIcon />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div className="p-4 bg-gray-900/50 rounded-lg space-y-3">
             <h4 className="font-semibold text-gray-200 text-center">Nghe bản dịch</h4>
             <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 items-center">
                 <select
                    value={selectedVoice}
                    onChange={e => setSelectedVoice(e.target.value)}
                    disabled={voices.length === 0}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                 >
                     {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                     {voices.length === 0 && <option>Không có giọng đọc cho ngôn ngữ này</option>}
                 </select>
                 <button onClick={handleListen} disabled={!outputText.trim() || !selectedVoice} className={`w-full flex items-center justify-center gap-2 p-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isGeneratingSpeech ? 'bg-red-600 hover:bg-red-700' : 'bg-cyan-600 hover:bg-cyan-700'}`}>
                     {isGeneratingSpeech ? <Loader/> : <SoundWaveIcon />}
                     {isGeneratingSpeech ? 'Đang phát...' : 'Nghe'}
                 </button>
             </div>
             {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        </div>
      </div>
    );
};

const ImageTranslator: React.FC<{ languages: Language[] }> = ({ languages }) => {
    const [sourceLang, setSourceLang] = useState<LanguageCode | 'auto-detect'>('auto-detect');
    const [targetLang, setTargetLang] = useState<LanguageCode>('vi-VN');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

    const debouncedExtractedText = useDebounce(extractedText, 250);

    // Effect for text extraction from image
    useEffect(() => {
        if (!imageFile) return;

        const extract = async () => {
            setIsExtracting(true);
            setExtractedText('');
            setTranslatedText('');
            setError(null);
            try {
                const result = await extractTextFromImage(imageFile);
                setExtractedText(result || '(Không tìm thấy văn bản nào trong hình ảnh)');
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Lỗi khi trích xuất văn bản.');
            } finally {
                setIsExtracting(false);
            }
        };

        extract();
    }, [imageFile]);
    
    // Effect for automatic translation
    useEffect(() => {
        const doTranslate = async () => {
            if (!debouncedExtractedText.trim() || debouncedExtractedText.startsWith('(Không tìm thấy')) {
                setTranslatedText('');
                setError(null);
                return;
            }
    
            if (sourceLang !== 'auto-detect' && sourceLang === targetLang) {
                setTranslatedText(debouncedExtractedText);
                return;
            }
    
            setIsTranslating(true);
            setError(null);
            setTranslatedText('');
    
            try {
                const sourceLangName = languages.find(l => l.code === sourceLang)?.name || 'auto-detect';
                const targetLangName = languages.find(l => l.code === targetLang)?.name || targetLang;
                const stream = await translateText(debouncedExtractedText, sourceLangName, targetLangName);
                if (stream) {
                    for await (const chunk of stream) {
                        setTranslatedText(prev => prev + chunk.text);
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi dịch.');
                setTranslatedText('');
            } finally {
                setIsTranslating(false);
            }
        };
        doTranslate();
    }, [debouncedExtractedText, sourceLang, targetLang, languages]);


    const handleFileSelect = (file: File | null) => {
        if (file && supportedMimeTypes.includes(file.type)) {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setError(null);
        } else {
            setImageFile(null);
            setImagePreview(null);
            setExtractedText('');
            setTranslatedText('');
            if (file) {
                setError('Loại tệp không được hỗ trợ. Vui lòng chọn tệp PNG, JPG, WEBP, HEIC, hoặc HEIF.');
            }
        }
    };
    
    useEffect(() => {
      // Cleanup object URL on component unmount
      return () => {
          if (imagePreview) {
              URL.revokeObjectURL(imagePreview);
          }
      };
    }, [imagePreview]);
    
    const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.currentTarget.classList.remove('border-indigo-500');
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            handleFileSelect(event.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.currentTarget.classList.add('border-indigo-500');
    };

    const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
        event.currentTarget.classList.remove('border-indigo-500');
    };
    
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-full">
                    <label 
                        htmlFor="image-upload-tool" 
                        className="flex flex-col items-center justify-center p-6 h-full bg-gray-800/50 hover:bg-gray-800 border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-lg cursor-pointer transition-colors"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                    >
                        {imagePreview ? (
                            <img src={imagePreview} alt="Xem trước" className="max-h-80 w-auto rounded-md object-contain" />
                        ) : (
                            <>
                                <UploadIcon className="w-8 h-8 text-gray-500 mb-2" />
                                <span className="font-semibold text-gray-300">Tải lên hình ảnh</span>
                                <span className="text-xs text-gray-500">Kéo và thả hoặc nhấp để chọn</span>
                            </>
                        )}
                        <input id="image-upload-tool" type="file" className="sr-only" onChange={e => handleFileSelect(e.target.files?.[0] ?? null)} accept="image/png, image/jpeg, image/webp, image/heic, image/heif" />
                    </label>
                </div>

                <div className="space-y-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <div>
                        <label htmlFor="extracted-text-area" className="block text-sm font-medium text-gray-400 mb-1">Văn bản gốc (được trích xuất)</label>
                        <div className="relative">
                            <textarea
                                id="extracted-text-area"
                                value={extractedText}
                                onChange={(e) => setExtractedText(e.target.value)}
                                placeholder="Văn bản từ hình ảnh sẽ xuất hiện ở đây sau khi bạn tải lên."
                                className="w-full min-h-[150px] p-3 bg-gray-800 border-2 border-gray-700 rounded-lg font-mono text-sm text-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-75"
                                disabled={isExtracting}
                            />
                            {isExtracting && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50 rounded-lg" aria-hidden="true">
                                    <Loader />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {imageFile && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Từ ngôn ngữ</label>
                                    <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value as LanguageCode | 'auto-detect')} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500">
                                        <option value="auto-detect">Tự động phát hiện</option>
                                        {languages.map((lang) => (<option key={lang.code} value={lang.code}>{lang.name}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Sang ngôn ngữ</label>
                                    <select value={targetLang} onChange={(e) => setTargetLang(e.target.value as LanguageCode)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500">
                                        {languages.map((lang) => (<option key={lang.code} value={lang.code}>{lang.name}</option>))}
                                    </select>
                                </div>
                            </div>
                            
                            {extractedText && !extractedText.startsWith('(Không tìm thấy') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Văn bản đã dịch</label>
                                    <div className="relative min-h-[150px] p-3 bg-gray-950 border-2 border-gray-700 rounded-lg font-mono text-sm text-white">
                                        {isTranslating ? (
                                            <div className="flex items-center justify-center h-full"><Loader /></div>
                                        ) : (
                                            <pre className="whitespace-pre-wrap break-words">{translatedText}</pre>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        </div>
    );
};
  
const VideoTranslator: React.FC<{ languages: Language[] }> = ({ languages }) => {
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [resultSrt, setResultSrt] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Đang xử lý...');
    const [error, setError] = useState<string | null>(null);
    const [sourceLang, setSourceLang] = useState<LanguageCode>('en-US');
    const [targetLang, setTargetLang] = useState<LanguageCode>('vi-VN');

    const handleFileSelect = (file: File | null) => {
        if(file) {
            setMediaFile(file);
            setFileName(file.name);
            setError(null);
            setResultSrt('');
        }
    };

    const handleProcess = async () => {
        if (!mediaFile) {
          setError('Vui lòng chọn một tệp media.');
          return;
        }
    
        setIsLoading(true);
        setError(null);
        setResultSrt('');
    
        try {
          const srtToTranslate = await transcribeMedia(mediaFile, setLoadingMessage);
          
          if (!srtToTranslate) throw new Error('Không thể tạo phụ đề từ tệp media.');
          
          const sourceLangName = languages.find(l => l.code === sourceLang)?.name || sourceLang;
          const targetLangName = languages.find(l => l.code === targetLang)?.name || targetLang;
          const translatedSrt = await translateSubtitle(srtToTranslate, sourceLangName, targetLangName, setLoadingMessage);
          setResultSrt(translatedSrt);

        } catch (err) {
          setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.');
        } finally {
          setIsLoading(false);
        }
      };

    const handleDownload = (format: 'srt' | 'ass' | 'txt') => {
        if (!resultSrt) return;
        try {
          const cues = parseSubtitle(resultSrt);
          const { adjustedCues } = adjustSubtitleTimings(cues, 1);
          let content = '';
          
          if (format === 'srt') content = toSrt(adjustedCues);
          else if (format === 'ass') content = toAss(adjustedCues);
          else content = toTxt(adjustedCues); 
    
          const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const newFileName = fileName.replace(/\.[^/.]+$/, "") + `.${format}`;
          link.href = url;
          link.download = newFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (e) {
          setError("Lỗi tạo tệp tải về.");
        }
      };
      
    const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.currentTarget.classList.remove('border-indigo-500');
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            handleFileSelect(event.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        event.currentTarget.classList.add('border-indigo-500');
    };

    const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
        event.currentTarget.classList.remove('border-indigo-500');
    };

    return (
        <div className="space-y-4">
             <label 
                htmlFor="video-upload-tool" 
                className="flex flex-col items-center justify-center p-6 bg-gray-800/50 hover:bg-gray-800 border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-lg cursor-pointer transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
             >
                <UploadIcon className="w-8 h-8 text-gray-500 mb-2" />
                <span className="font-semibold text-gray-300">Tải lên Video/Âm thanh</span>
                <span className="text-xs text-gray-500">(.mp4, .mp3, .wav...)</span>
                <input id="video-upload-tool" type="file" className="sr-only" onChange={e => handleFileSelect(e.target.files?.[0] ?? null)} accept="audio/*,video/*" />
            </label>
            {fileName && <p className="text-center text-sm text-gray-300">Đã chọn: <span className="font-medium">{fileName}</span></p>}

            <div className="p-4 bg-gray-900/50 rounded-lg space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Ngôn ngữ gốc (trong video)</label>
                        <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value as LanguageCode)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500">
                            {languages.map((lang) => (<option key={lang.code} value={lang.code}>{lang.name}</option>))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Dịch sang ngôn ngữ</label>
                        <select value={targetLang} onChange={(e) => setTargetLang(e.target.value as LanguageCode)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500">
                             {languages.map((lang) => (<option key={lang.code} value={lang.code}>{lang.name}</option>))}
                        </select>
                    </div>
                 </div>
                 <button onClick={handleProcess} disabled={isLoading || !mediaFile} className="w-full flex items-center justify-center gap-2 p-3 bg-cyan-600 hover:bg-cyan-700 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                     {isLoading ? <><Loader /> <span>{loadingMessage}</span></> : 'Bắt đầu dịch Video/Âm thanh'}
                 </button>
            </div>

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

            {resultSrt && (
                <div className="space-y-4">
                    <h4 className="font-semibold text-gray-200 text-center">Phụ đề đã dịch</h4>
                    <textarea
                        value={resultSrt}
                        readOnly
                        className="w-full h-80 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg font-mono text-sm text-white"
                    />
                    <div className="p-4 bg-gray-900/50 rounded-lg space-y-3">
                        <h4 className="font-semibold text-gray-200 text-center">Tải về phụ đề</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <button onClick={() => handleDownload('srt')} className="w-full flex items-center justify-center gap-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md font-medium transition-colors">
                                <DownloadIcon /> Tải về .SRT
                            </button>
                            <button onClick={() => handleDownload('ass')} className="w-full flex items-center justify-center gap-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md font-medium transition-colors">
                                <DownloadIcon /> Tải về .ASS
                            </button>
                            <button onClick={() => handleDownload('txt')} className="w-full flex items-center justify-center gap-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md font-medium transition-colors">
                                <DownloadIcon /> Tải về .TXT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// FIX: Define TranslationMode type
type TranslationMode = 'text' | 'image' | 'video';

export const TranslationTool: React.FC<TranslationToolProps> = ({ languages }) => {
  const [mode, setMode] = useState<TranslationMode>('text');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-cyan-400">Công cụ Dịch thuật AI Siêu cấp</h3>
        <p className="text-gray-400 mt-2">Dịch văn bản, hình ảnh, và video một cách chính xác và tự nhiên.</p>
      </div>
      
      <div className="flex justify-center border-b border-gray-700">
        <nav className="-mb-px flex space-x-2 sm:space-x-4" aria-label="Translation Modes">
          <button onClick={() => setMode('text')} className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${mode === 'text' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
            <TextIcon /> Văn bản
          </button>
          <button onClick={() => setMode('image')} className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${mode === 'image' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
            <ImageIcon /> Hình ảnh
          </button>
          <button onClick={() => setMode('video')} className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${mode === 'video' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
            <VideoIcon /> Video/Âm thanh
          </button>
        </nav>
      </div>

      <div>
        {mode === 'text' && <TextTranslator languages={languages} />}
        {mode === 'image' && <ImageTranslator languages={languages} />}
        {mode === 'video' && <VideoTranslator languages={languages} />}
      </div>
    </div>
  );
};
