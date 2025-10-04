import React, { useState, useEffect } from 'react';
import type { Language, Voice, LanguageCode, SpeakerConfig, VoiceProvider } from '../types';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SoundWaveIcon } from './icons/SoundWaveIcon';
import { Loader } from './Loader';
import { InfoIcon } from './icons/InfoIcon';

interface MultiSpeakerControlsProps {
  languages: Language[];
  selectedLanguage: LanguageCode;
  onLanguageChange: (code: LanguageCode) => void;
  voices: Voice[];
  speakerConfigs: SpeakerConfig[];
  onConfigsChange: (configs: SpeakerConfig[]) => void;
  voiceProvider: VoiceProvider;
  onVoiceProviderChange: (provider: VoiceProvider) => void;
}

const sampleTexts: Record<LanguageCode, string> = {
    'vi-VN': 'Xin chào, đây là bản xem trước của giọng nói được chọn.',
    'en-US': 'Hello, this is a preview of the selected voice.',
    'ja-JP': 'こんにちは、これは選択された音声のプレビューです。',
    'ko-KR': '안녕하세요, 이것은 선택된 음성의 미리보기입니다。',
    'es-ES': 'Hola, esta es una vista previa de la voz seleccionada.',
    'fr-FR': 'Bonjour, ceci est un aperçu de la voix sélectionnée.',
    'de-DE': 'Hallo, dies ist eine Vorschau der ausgewählten Stimme.',
    'cmn-CN': '你好，这是所选声音的预览。',
    'ru-RU': 'Здравствуйте, это предварительный просмотр выбранного голоса.',
    'hi-IN': 'नमस्ते, यह चयनित आवाज़ का पूर्वावलोकन है।',
};

const EdgeRecommendationBanner: React.FC = () => (
    <div className="p-4 bg-cyan-900/30 border border-cyan-700/50 rounded-lg flex items-start gap-3 animate-fade-in">
        <div className="flex-shrink-0 pt-0.5">
            <InfoIcon className="w-5 h-5 text-cyan-300" />
        </div>
        <div>
            <h4 className="font-bold text-cyan-300">Mẹo cho Giọng nói Miễn phí</h4>
            <p className="text-sm text-cyan-400 mt-1">
                Trình duyệt <strong>Microsoft Edge</strong> trên Windows đôi khi cung cấp các giọng nói chất lượng cao như <strong className="font-semibold">Hoài My</strong> và <strong className="font-semibold">Nam Minh</strong> miễn phí. Tuy nhiên, việc này phụ thuộc vào phiên bản Windows và Edge của bạn. Nếu bạn không thấy chúng, Microsoft có thể chưa cung cấp chúng cho các trang web.
            </p>
        </div>
    </div>
);


export const MultiSpeakerControls: React.FC<MultiSpeakerControlsProps> = ({
  languages,
  selectedLanguage,
  onLanguageChange,
  voices,
  speakerConfigs,
  onConfigsChange,
  voiceProvider,
  onVoiceProviderChange
}) => {
  const [previewingId, setPreviewingId] = useState<number | null>(null);
  
  useEffect(() => {
    if (voices.length > 0) {
        const updatedConfigs = speakerConfigs.map(config => {
            // If a speaker's selected voice is not in the new voice list, or if it's empty, update it
            if (!config.voiceId || !voices.find(v => v.id === config.voiceId)) {
                return { ...config, voiceId: voices[0].id };
            }
            return config;
        });
        // Prevents infinite loops by comparing stringified versions
        if (JSON.stringify(updatedConfigs) !== JSON.stringify(speakerConfigs)) {
            onConfigsChange(updatedConfigs);
        }
    } else {
        const clearedConfigs = speakerConfigs.map(config => ({ ...config, voiceId: '' }));
         if (JSON.stringify(clearedConfigs) !== JSON.stringify(speakerConfigs)) {
            onConfigsChange(clearedConfigs);
        }
    }
  }, [voices, speakerConfigs, onConfigsChange]);


  const addSpeaker = () => {
    const newSpeaker: SpeakerConfig = {
      id: Date.now(),
      speakerName: `Người nói ${String.fromCharCode(65 + speakerConfigs.length)}`,
      voiceId: voices[0]?.id || ''
    };
    onConfigsChange([...speakerConfigs, newSpeaker]);
  };

  const removeSpeaker = (id: number) => {
    onConfigsChange(speakerConfigs.filter(s => s.id !== id));
  };

  const updateSpeaker = (id: number, field: 'speakerName' | 'voiceId', value: string) => {
    onConfigsChange(
      speakerConfigs.map(s => s.id === id ? { ...s, [field]: value } : s)
    );
  };

  const handlePreview = (config: SpeakerConfig) => {
    if (voiceProvider !== 'browser') {
      alert("Tính năng nghe thử cho giọng nói API sẽ sớm được cập nhật. Hiện tại, vui lòng sử dụng nút 'Xem trước bản lồng tiếng' chính.");
      return;
    }

    if (!config.voiceId || typeof window.speechSynthesis === 'undefined') {
      console.error("Speech Synthesis not supported.");
      return;
    };
    
    setPreviewingId(config.id);
    
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    const sampleText = sampleTexts[selectedLanguage] || sampleTexts['en-US'];
    const utterance = new SpeechSynthesisUtterance(sampleText);
    
    const browserVoices = window.speechSynthesis.getVoices();
    const matchingBrowserVoice = browserVoices.find(v => v.voiceURI === config.voiceId);
    
    if (matchingBrowserVoice) {
      utterance.voice = matchingBrowserVoice;
    }
    utterance.lang = selectedLanguage;

    utterance.onend = () => {
      setPreviewingId(null);
    };

    utterance.onerror = (event) => {
      console.error("Speech Synthesis Error", event);
      setPreviewingId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-4">
       {selectedLanguage === 'vi-VN' && <EdgeRecommendationBanner />}
      <div>
        <label htmlFor="language-select-multi" className="block text-sm font-medium text-gray-300 mb-2">Ngôn ngữ</label>
        <select
          id="language-select-multi"
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
          className="w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
      </div>

      {selectedLanguage === 'vi-VN' && (
        <div className="mb-2">
            <label htmlFor="provider-select-multi" className="block text-sm font-medium text-gray-300 mb-2">Nguồn giọng nói</label>
            <select
                id="provider-select-multi"
                value={voiceProvider}
                onChange={(e) => onVoiceProviderChange(e.target.value as VoiceProvider)}
                className="w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 transition duration-200"
            >
                <option value="browser">Trình duyệt (Miễn phí - Tốt nhất trên Edge)</option>
                <option value="microsoft">Microsoft Azure (Chất lượng cao, cần API Key)</option>
                <option value="google">Google Cloud (Chất lượng cao, cần API Key)</option>
                <option value="fpt">FPT.AI (Chất lượng cao, cần API Key)</option>
            </select>
        </div>
      )}

      {voices.length === 0 && selectedLanguage === 'vi-VN' && voiceProvider === 'browser' ? (
        <div className="mt-2 flex items-start gap-2 text-xs text-yellow-400 p-2 bg-yellow-900/20 rounded-md border border-yellow-800/50">
          <InfoIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Không tìm thấy giọng Tiếng Việt miễn phí?</strong><br />
            Giọng đọc miễn phí phụ thuộc vào trình duyệt và hệ điều hành của bạn. Hầu hết các trình duyệt phổ biến không có sẵn giọng Tiếng Việt.<br/>
            <strong>Giải pháp tốt nhất (Miễn phí):</strong><br/>
            Hãy thử sử dụng trình duyệt <strong>Microsoft Edge</strong> trên Windows. Đôi khi, nó cung cấp giọng "Hoai My" và "Nam Minh" chất lượng cao miễn phí. Nếu vẫn không có, bạn có thể cần cập nhật Windows/Edge hoặc thử giải pháp API.<br />
            <strong>Giải pháp chất lượng cao (Mọi trình duyệt):</strong><br/>
            Chọn nguồn <strong>Microsoft Azure</strong>, <strong>Google Cloud</strong> hoặc <strong>FPT.AI</strong> và thêm API Key của bạn trong tab "Công cụ AI".
          </span>
        </div>
      ) : (
        <p className="text-xs text-gray-500 mt-2 text-center">
           {voiceProvider === 'browser' ? 'Tất cả giọng đọc đều được cung cấp bởi trình duyệt của bạn.' : `Tất cả giọng đọc đều được cung cấp bởi dịch vụ API trả phí.`}
        </p>
      )}

      <div className="space-y-3">
        {speakerConfigs.map((config) => (
          <div key={config.id} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-center p-3 bg-gray-900/50 rounded-lg">
            <input
              type="text"
              value={config.speakerName}
              onChange={(e) => updateSpeaker(config.id, 'speakerName', e.target.value)}
              placeholder="Tên người nói (ví dụ: Joe)"
              className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="flex gap-2">
                <select
                value={config.voiceId}
                onChange={(e) => updateSpeaker(config.id, 'voiceId', e.target.value)}
                disabled={voices.length === 0}
                className="w-full flex-grow p-2 bg-gray-700 border-2 border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                >
                {voices.length > 0 ? (
                    voices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                        {voice.name}
                    </option>
                    ))
                ) : (
                    <option>Không có giọng đọc</option>
                )}
                </select>
                <button
                    onClick={() => handlePreview(config)}
                    disabled={!config.voiceId || previewingId !== null || voiceProvider !== 'browser'}
                    title={voiceProvider !== 'browser' ? "Tính năng này không khả dụng cho giọng nói API" : "Nghe thử giọng"}
                    className="p-2 bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-md disabled:opacity-50"
                    aria-label="Nghe thử giọng"
                >
                    {previewingId === config.id ? <Loader /> : <SoundWaveIcon />}
                </button>
            </div>
            <button
              onClick={() => removeSpeaker(config.id)}
              disabled={speakerConfigs.length <= 1}
              className="p-2 bg-red-800/50 hover:bg-red-700/70 text-red-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Remove speaker"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addSpeaker}
        className="w-full flex items-center justify-center gap-2 p-2 border-2 border-dashed border-gray-600 hover:border-indigo-500 hover:text-indigo-400 text-gray-400 rounded-lg transition-colors"
      >
        <UserPlusIcon />
        Thêm người nói
      </button>
    </div>
  );
};
