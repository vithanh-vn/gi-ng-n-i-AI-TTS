import React, { useState, useCallback } from 'react';
import type { Language, LanguageCode } from '../types';
import { translateSubtitle } from '../services/ttsService';
import { Loader } from './Loader';
import { TranslateIcon } from './icons/TranslateIcon';
import { UploadIcon } from './icons/UploadIcon';

interface SubtitleTranslationControlsProps {
  subtitleContent: string;
  onTranslationComplete: (translatedSrt: string) => void;
  languages: Language[];
  onFileSelect: (file: File) => void;
}

export const SubtitleTranslationControls: React.FC<SubtitleTranslationControlsProps> = ({
  subtitleContent,
  onTranslationComplete,
  languages,
  onFileSelect,
}) => {
  const [sourceLang, setSourceLang] = useState<LanguageCode>('en-US');
  const [targetLang, setTargetLang] = useState<LanguageCode>('vi-VN');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    event.target.value = ''; // Allow re-uploading the same file
  };

  const handleTranslate = useCallback(async () => {
    if (!subtitleContent.trim()) {
      setError("Không có nội dung phụ đề để dịch.");
      return;
    }
    if (sourceLang === targetLang) {
      setError("Ngôn ngữ gốc và ngôn ngữ đích phải khác nhau.");
      return;
    }
    
    setIsTranslating(true);
    setError(null);

    try {
      const sourceLangName = languages.find(l => l.code === sourceLang)?.name || sourceLang;
      const targetLangName = languages.find(l => l.code === targetLang)?.name || targetLang;
      // FIX: Added the missing onProgress callback function as the fourth argument.
      const result = await translateSubtitle(subtitleContent, sourceLangName, targetLangName, () => {});
      onTranslationComplete(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định.';
      setError(`Lỗi dịch phụ đề: ${message}`);
    } finally {
      setIsTranslating(false);
    }
  }, [subtitleContent, sourceLang, targetLang, languages, onTranslationComplete]);
  
  return (
    <div className="p-4 bg-gray-900/50 rounded-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h4 className="font-semibold text-gray-200">Dịch phụ đề</h4>
          <label
            htmlFor="translate-file-upload"
            className="cursor-pointer flex items-center justify-center gap-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 sm:py-1 rounded-md transition-colors"
          >
            <UploadIcon className="w-4 h-4"/>
            <span>Tải tệp lên để dịch</span>
            <input 
              id="translate-file-upload" 
              name="translate-file-upload" 
              type="file" 
              className="sr-only"
              onChange={handleFileChange} 
              accept=".srt,.vtt,.txt"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="source-lang-select-sub" className="block text-sm font-medium text-gray-400 mb-1">Từ ngôn ngữ</label>
                <select
                id="source-lang-select-sub"
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value as LanguageCode)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
                </select>
            </div>
            <div>
                <label htmlFor="target-lang-select-sub" className="block text-sm font-medium text-gray-400 mb-1">Sang ngôn ngữ</label>
                <select
                id="target-lang-select-sub"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as LanguageCode)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
                </select>
            </div>
        </div>
        <button
            onClick={handleTranslate}
            disabled={isTranslating || !subtitleContent.trim()}
            className="w-full flex items-center justify-center gap-2 p-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-900/50 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
        >
            {isTranslating ? <Loader /> : <TranslateIcon />}
            {isTranslating ? 'Đang dịch...' : 'Dịch phụ đề'}
        </button>
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
    </div>
  );
};