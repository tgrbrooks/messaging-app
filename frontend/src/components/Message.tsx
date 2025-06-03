import React from 'react';
import { formatTimestamp } from '../utils/dateFormat';
import Message from '../types/message';
import '../styles/Messages.css';

interface MessageProps {
    message: Message;
    isCurrentUser: boolean;
}

export default function MessageComponent({ message, isCurrentUser }: MessageProps) {
    return (
        <div className={`message ${isCurrentUser ? 'sent' : 'received'}`}>
            <div className="message-content">
                <div className="message-header">
                    <span className="username">{message.username}</span>
                    <span className="timestamp">
                        {formatTimestamp(message.sent_at)}
                    </span>
                </div>
                <p className="message-body">{message.message}</p>
            </div>
        </div>
    );
} 