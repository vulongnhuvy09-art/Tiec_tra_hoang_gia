// TeaRoomBrawl - Updated với Gemini API Integration
// Group Chat - tất cả 5 nhân vật respond cùng lúc

import React, { useState, useEffect, useRef } from 'react';
import { CharacterId, PlayerProfile } from './types';
import { callGeminiGroupChat, ChatMessage, GroupChatMessage } from './utils/geminiService';
import { getCharacter } from './data/characterData';

interface TeaRoomBrawlProps {
  profile: PlayerProfile;
  onBackToLounge: () => void;
  onSelectCharacter: (charId: CharacterId) => void;
  onUpdateAvatar: (charId: CharacterId, url: string) => void;
}

interface GroupMessage {
  id: string;
  type: 'user' | 'character';
  characterId?: CharacterId;
  characterName?: string;
  content: string;
  timestamp: number;
}

export function TeaRoomBrawl({
  profile,
  onBackToLounge,
  onSelectCharacter,
  onUpdateAvatar,
}: TeaRoomBrawlProps) {
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedResponders, setSelectedResponders] = useState<CharacterId[]>([
    'vincent',
    'kaelen',
    'dante',
    'julian',
    'ezekiel',
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [groupMessages]);

  /**
   * Toggle character response
   */
  const toggleCharacterResponder = (charId: CharacterId) => {
    setSelectedResponders((prev) =>
      prev.includes(charId) ? prev.filter((id) => id !== charId) : [...prev, charId]
    );
  };

  /**
   * Handle player message in group
   */
  const handleSendGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    setError(null);

    // Add player message to display
    const playerMessage: GroupMessage = {
      id: `player-${Date.now()}`,
      type: 'user',
      content: userInput,
      timestamp: Date.now(),
    };
    setGroupMessages((prev) => [...prev, playerMessage]);

    // Add to chat history for context
    const userChatMessage: ChatMessage = {
      role: 'user',
      content: userInput,
    };
    setChatHistory((prev) => [...prev, userChatMessage]);

    setUserInput('');

    // Get responses from selected characters
    setIsLoading(true);
    try {
      const responses = await callGeminiGroupChat(userInput, chatHistory, selectedResponders);

      // Add each character response
      responses.forEach((resp) => {
        const groupMsg: GroupMessage = {
          id: `${resp.characterId}-${resp.timestamp}`,
          type: 'character',
          characterId: resp.characterId,
          characterName: resp.characterName,
          content: resp.message,
          timestamp: resp.timestamp,
        };
        setGroupMessages((prev) => [...prev, groupMsg]);

        // Add to chat history
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `[${resp.characterName}]: ${resp.message}`,
          },
        ]);
      });

      if (responses.length === 0) {
        setError('Không có character nào được chọn hoặc API error');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Group chat error';
      setError(errorMsg);
      console.error('Group chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 py-6 flex flex-col h-full">
      {/* Header */}
      <div className="mb-4 pb-4 border-b-2 border-[#E8C5CE]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-playfair text-2xl font-bold text-[#8C3953]">
            茶 室 - 群 聊 (Tea Room Group Chat)
          </h2>
          <button
            onClick={onBackToLounge}
            className="px-4 py-2 rounded-lg bg-[#E8C5CE] text-[#8C3953] hover:bg-[#D4A5B0] transition-colors"
          >
            Back to Lounge
          </button>
        </div>

        {/* Character Selector */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-[#7A5060]">Ai sẽ trả lời?</p>
          <div className="flex flex-wrap gap-2">
            {(['vincent', 'kaelen', 'dante', 'julian', 'ezekiel'] as CharacterId[]).map(
              (charId) => {
                const character = getCharacter(charId);
                const isSelected = selectedResponders.includes(charId);
                return (
                  <button
                    key={charId}
                    onClick={() => toggleCharacterResponder(charId)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-[#B85D75] text-white'
                        : 'bg-[#FAF0F2] text-[#7A5060] border border-[#E8C5CE]'
                    }`}
                  >
                    {character?.name.split(' ')[0]}
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-3">
        {groupMessages.length === 0 ? (
          <div className="text-center text-[#A88A94] py-12">
            <p className="font-playfair text-lg mb-2">Phòng trà đang yên tĩnh...</p>
            <p className="text-sm">Hãy nói chuyện với cả nhóm F5!</p>
          </div>
        ) : (
          <>
            {groupMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-sm px-4 py-3 rounded-lg ${
                    msg.type === 'user'
                      ? 'bg-[#B85D75] text-white rounded-br-none'
                      : 'bg-[#FAF0F2] text-[#37232B] rounded-bl-none border-2 border-[#E8C5CE]'
                  }`}
                >
                  {msg.type === 'character' && (
                    <p className="text-xs font-bold text-[#8C3953] mb-1">{msg.characterName}</p>
                  )}
                  <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start gap-2">
                {selectedResponders.map((charId) => {
                  const character = getCharacter(charId);
                  return (
                    <div
                      key={charId}
                      className="bg-[#FAF0F2] text-[#37232B] px-3 py-2 rounded-lg border border-[#E8C5CE] text-xs"
                    >
                      <p className="font-bold mb-1">{character?.name.split(' ')[0]}</p>
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-[#A88A94] rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-[#A88A94] rounded-full animate-bounce delay-100" />
                        <div className="w-1.5 h-1.5 bg-[#A88A94] rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  );
                })}
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
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendGroupMessage} className="flex gap-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Nói chuyện với cả nhóm..."
          className="flex-1 px-4 py-2 rounded-lg bg-white border-2 border-[#E8C5CE] text-[#37232B] placeholder-[#A88A94] focus:outline-none focus:border-[#B85D75] transition-colors"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !userInput.trim() || selectedResponders.length === 0}
          className="px-6 py-2 rounded-lg bg-[#B85D75] text-white hover:bg-[#A85568] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Đợi...' : 'Gửi'}
        </button>
      </form>

      {/* Tips */}
      <div className="mt-3 text-xs text-[#A88A94] text-center">
        <p>💡 Mỗi câu chat ảnh hưởng đến tất cả nhân vật được chọn</p>
      </div>
    </div>
  );
}
