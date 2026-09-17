// PrivateChatRoom - Updated với Gemini API Integration
// Chỉ cần copy cái chat logic này thay vào original component

import React, { useState, useEffect, useRef } from 'react';
import { CharacterId, PlayerProfile } from './types';
import { callGeminiPrivateChat, ChatMessage } from './utils/geminiService';
import { getCharacter } from './data/characterData';

interface PrivateChatRoomProps {
  selectedCharacterId: CharacterId;
  onSelectCharacter: (charId: CharacterId) => void;
  profile: PlayerProfile;
  onUpdateStats: (charId: CharacterId, deltaAff: number, deltaCorr: number) => void;
  onUseProp: (propId: string) => void;
  onBackToLounge: () => void;
  onUpdateAvatar: (charId: CharacterId, url: string) => void;
}

export function PrivateChatRoom({
  selectedCharacterId,
  onSelectCharacter,
  profile,
  onUpdateStats,
  onUseProp,
  onBackToLounge,
  onUpdateAvatar,
}: PrivateChatRoomProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const character = getCharacter(selectedCharacterId);
  const characterStats = profile.characterStats[selectedCharacterId] || {
    affection: 20,
    corruption: 10,
  };

  // Auto-scroll to bottom khi có message mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  /**
   * Handle player message + get AI response
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    setError(null);

    // Add player message to chat
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userInput,
    };
    setChatMessages((prev) => [...prev, newUserMessage]);
    setUserInput('');

    // Call Gemini API
    setIsLoading(true);
    try {
      const response = await callGeminiPrivateChat(
        selectedCharacterId,
        userInput,
        chatMessages
      );

      // Add character response to chat
      const characterMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
      };
      setChatMessages((prev) => [...prev, characterMessage]);

      // Update character stats based on AI response
      if (response.affectionDelta !== 0 || response.corruptionDelta !== 0) {
        onUpdateStats(selectedCharacterId, response.affectionDelta, response.corruptionDelta);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Chat error occurred';
      setError(errorMsg);
      console.error('Chat error:', err);

      // Add error message to chat
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `[Error: ${errorMsg}. Kiểm tra API key trong .env.local]`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!character) {
    return (
      <div className="max-w-2xl mx-auto p-4 py-6">
        <p>Character not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 py-6 flex flex-col h-full">
      {/* Character Header */}
      <div className="mb-4 pb-4 border-b-2 border-[#E8C5CE]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-playfair text-2xl font-bold text-[#8C3953]">
              {character.name}
            </h2>
            <p className="text-sm text-[#7A5060]">{character.title}</p>
          </div>
          <button
            onClick={onBackToLounge}
            className="px-4 py-2 rounded-lg bg-[#E8C5CE] text-[#8C3953] hover:bg-[#D4A5B0] transition-colors"
          >
            Back to Lounge
          </button>
        </div>

        {/* Character Stats */}
        <div className="mt-3 flex gap-4 text-sm">
          <div>
            <span className="text-[#7A5060]">Tình Cảm:</span>
            <div className="w-32 h-2 bg-[#FAF0F2] rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-[#E88B9E] transition-all"
                style={{ width: `${characterStats.affection}%` }}
              />
            </div>
          </div>
          <div>
            <span className="text-[#7A5060]">Hắc Hóa:</span>
            <div className="w-32 h-2 bg-[#FAF0F2] rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-[#4A3D45] transition-all"
                style={{ width: `${characterStats.corruption}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="text-center text-[#A88A94] py-12">
            <p className="font-playfair text-lg mb-2">Bắt đầu hội thoại...</p>
            <p className="text-sm">{character.publicPersona}</p>
          </div>
        ) : (
          <>
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-[#B85D75] text-white rounded-br-none'
                      : 'bg-[#FAF0F2] text-[#37232B] rounded-bl-none border border-[#E8C5CE]'
                  }`}
                >
                  <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#FAF0F2] text-[#37232B] px-4 py-3 rounded-lg border border-[#E8C5CE]">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-[#A88A94] rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-[#A88A94] rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-[#A88A94] rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
          <p className="text-xs mt-2">
            Hãy kiểm tra .env.local có VITE_GEMINI_API_KEY không
          </p>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={`Chat với ${character.name}...`}
          className="flex-1 px-4 py-2 rounded-lg bg-white border-2 border-[#E8C5CE] text-[#37232B] placeholder-[#A88A94] focus:outline-none focus:border-[#B85D75] transition-colors"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !userInput.trim()}
          className="px-6 py-2 rounded-lg bg-[#B85D75] text-white hover:bg-[#A85568] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Đợi...' : 'Gửi'}
        </button>
      </form>

      {/* Tips */}
      <div className="mt-3 text-xs text-[#A88A94] text-center">
        <p>💡 Mỗi câu chat ảnh hưởng đến Tình Cảm & Hắc Hóa của nhân vật</p>
      </div>
    </div>
  );
}
