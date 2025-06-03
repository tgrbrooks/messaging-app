import React, { useState } from 'react';
import { SendIcon } from './Icons';
import '../styles/Messages.css';

interface MessageInputProps {
    onSendMessage: (message: string) => void;
}

export default function MessageInput({ onSendMessage }: MessageInputProps) {
    const [newMessage, setNewMessage] = useState('');

    const handleSend = () => {
        if (newMessage.trim()) {
            onSendMessage(newMessage);
            setNewMessage('');
        }
    };

    return (
        <div className="message-input">
            <input
                type="text"
                placeholder="Message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="icon-button" onClick={handleSend}>
                <SendIcon />
            </button>
        </div>
    );
} 