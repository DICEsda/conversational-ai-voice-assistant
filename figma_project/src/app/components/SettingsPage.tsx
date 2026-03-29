import { ArrowLeft, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Config } from '../../types/assistant';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [recordSeconds, setRecordSeconds] = useState(5);
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [opacity, setOpacity] = useState(0);
  const [buttonsVisible, setButtonsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load config on mount
  useEffect(() => {
    loadConfig();
    // Fade in content
    setTimeout(() => setOpacity(1), 50);
  }, []);

  const loadConfig = async () => {
    try {
      const config: Config = await api.getConfig();
      setTemperature(config.temperature);
      setMaxTokens(config.max_tokens);
      setRecordSeconds(config.record_seconds);
      setStreamEnabled(config.enable_streaming);
      setConnected(true);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load config:', error);
      setConnected(false);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    
    try {
      await api.updateConfig({
        temperature,
        max_tokens: maxTokens,
        record_seconds: recordSeconds,
        enable_streaming: streamEnabled
      });
      
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
      setSaveMessage('Failed to save settings');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setButtonsVisible(scrollTop === 0);
  };

  return (
    <>
      {/* Exit button - top left corner */}
      <button 
        className="absolute top-2 left-2 p-1.5 opacity-40 hover:opacity-60 transition-opacity duration-100 z-10"
        aria-label="Exit"
        onClick={() => window.close()}
        style={{ opacity: buttonsVisible ? 0.4 : 0, pointerEvents: buttonsVisible ? 'auto' : 'none' }}
      >
        <X className="w-4 h-4 text-gray-700" />
      </button>

      {/* Back button - top right corner */}
      <button 
        className="absolute top-2 right-2 p-1.5 opacity-40 hover:opacity-60 transition-opacity duration-100 z-10"
        aria-label="Back"
        onClick={() => navigate('/')}
        style={{ opacity: buttonsVisible ? 0.4 : 0, pointerEvents: buttonsVisible ? 'auto' : 'none' }}
      >
        <ArrowLeft className="w-4 h-4 text-gray-700 rotate-180" />
      </button>

      {/* Content */}
      <div className="w-full h-full flex flex-col px-5 py-8 pb-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 transition-opacity duration-300" style={{ opacity }} onScroll={handleScroll}>
        
        {/* Connection status badge */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-700">LLM Settings</h2>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {loading ? 'Loading...' : connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32 text-xs text-gray-500">
            Loading settings...
          </div>
        ) : !connected ? (
          <div className="flex flex-col items-center justify-center h-32 text-xs text-red-500">
            <p>Failed to load settings</p>
            <p className="text-[10px] text-gray-500 mt-1">Is the backend running?</p>
          </div>
        ) : (
          <>
            {/* Temperature */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-600">Temperature</label>
                <span className="text-xs text-gray-500">{temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-300 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500 
                  [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:bg-orange-600
                  [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
                  [&::-moz-range-thumb]:bg-orange-500 [&::-moz-range-thumb]:border-0 
                  [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:hover:bg-orange-600"
                style={{
                  background: `linear-gradient(to right, #fb923c 0%, #fb923c ${(temperature / 2) * 100}%, #d1d5db ${(temperature / 2) * 100}%, #d1d5db 100%)`
                }}
              />
              <p className="text-[10px] text-gray-500 mt-1">Controls randomness. Lower = more focused.</p>
            </div>

            {/* Max Tokens */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-600">Max Tokens</label>
                <span className="text-xs text-gray-500">{maxTokens}</span>
              </div>
              <input
                type="range"
                min="50"
                max="4096"
                step="50"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-300 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500 
                  [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:bg-orange-600
                  [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
                  [&::-moz-range-thumb]:bg-orange-500 [&::-moz-range-thumb]:border-0 
                  [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:hover:bg-orange-600"
                style={{
                  background: `linear-gradient(to right, #fb923c 0%, #fb923c ${(maxTokens / 4096) * 100}%, #d1d5db ${(maxTokens / 4096) * 100}%, #d1d5db 100%)`
                }}
              />
              <p className="text-[10px] text-gray-500 mt-1">Maximum response length.</p>
            </div>

            {/* Recording Duration */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-600">Recording Duration</label>
                <span className="text-xs text-gray-500">{recordSeconds}s</span>
              </div>
              <input
                type="range"
                min="3"
                max="10"
                step="1"
                value={recordSeconds}
                onChange={(e) => setRecordSeconds(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-300 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500 
                  [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:bg-orange-600
                  [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
                  [&::-moz-range-thumb]:bg-orange-500 [&::-moz-range-thumb]:border-0 
                  [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:hover:bg-orange-600"
                style={{
                  background: `linear-gradient(to right, #fb923c 0%, #fb923c ${((recordSeconds - 3) / 7) * 100}%, #d1d5db ${((recordSeconds - 3) / 7) * 100}%, #d1d5db 100%)`
                }}
              />
              <p className="text-[10px] text-gray-500 mt-1">How long to record after hotword.</p>
            </div>

            {/* Stream Toggle */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <label className="text-xs text-gray-600">Stream Responses</label>
                <p className="text-[10px] text-gray-500 mt-0.5">Show text as it generates</p>
              </div>
              <button
                onClick={() => setStreamEnabled(!streamEnabled)}
                className={`w-9 h-5 rounded-full relative transition-colors ${
                  streamEnabled ? 'bg-orange-400' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`block w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
                    streamEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Save button */}
            <div className="mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2 px-4 text-xs bg-orange-400 text-white rounded-lg hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Apply Settings'}
              </button>
              
              {/* Save message */}
              {saveMessage && (
                <p className={`text-[10px] text-center mt-2 ${
                  saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {saveMessage}
                </p>
              )}
              
              <p className="text-[10px] text-gray-500 text-center mt-2">
                Some changes require backend restart
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
