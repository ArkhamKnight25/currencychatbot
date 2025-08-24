import React from 'react';
import './ChatHistory.css';

interface ChatHistoryProps {
  chats: { id: string; name: string }[];
  selectChat: (id: string) => void;
  createNewChat: () => void;
  selectedChatId: string | null;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  chats,
  selectChat,
  createNewChat,
  selectedChatId,
}) => {
  return (
    <div className='chat-history'>
      <button onClick={createNewChat} className='new-chat-button'>
        New Exchange
      </button>
      <ul>
        {chats.map((chat) =>
          chat.id === selectedChatId ? (
            <li
              key={chat.id}
              onClick={() => selectChat(chat.id)}
              className='selected-chat-item'
            >
              {chat.name}
            </li>
          ) : (
            <li
              key={chat.id}
              onClick={() => selectChat(chat.id)}
              className='chat-item'
            >
              {chat.name}
            </li>
          )
        )}
      </ul>
    </div>
  );
};

export default ChatHistory;
