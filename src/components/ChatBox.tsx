import React from 'react';
import ReactMarkdown from 'react-markdown';
import './ChatBox.css';

interface Message {
  role: string;
  content: string;
}

interface ChatBoxProps {
  messages: Message[];
  loading: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, loading }) => {
  return (
    <div className='chat-box'>
      {messages.map((message, index) => (
        <div key={index} className={`message ${message.role}`}>
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      ))}
      {loading && (
        <div className='message system'>Thinking...</div>
      )}
    </div>
  );
};

export default ChatBox;
