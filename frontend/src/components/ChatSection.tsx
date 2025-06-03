import React from 'react';
import Message from './Message';
import MessageInput from './MessageInput';
import ToggleSwitch from './ToggleSwitch';
import Group from '../types/group';
import MessageType from '../types/message';
import '../styles/Messages.css';

interface ChatSectionProps {
    selectedGroup: Group | null;
    messages: MessageType[];
    currentUsername: string;
    isOnline: boolean;
    onToggleOnline: () => void;
    onSendMessage: (message: string) => void;
}

export default function ChatSection({
    selectedGroup,
    messages,
    currentUsername,
    isOnline,
    onToggleOnline,
    onSendMessage
}: ChatSectionProps) {
    if (!selectedGroup) {
        return (
            <div className="chat-area">
                <div className="chat-header">
                    <h2 />
                    <div className="online-status">
                        <ToggleSwitch
                            isOn={isOnline}
                            onToggle={onToggleOnline}
                            label="Network"
                        />
                    </div>
                </div>
                <div className="no-group-selected">
                    <p>Select a group to start messaging</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-area">
            <div className="chat-header">
                <h2>{selectedGroup.name}</h2>
                <div className="online-status">
                    <ToggleSwitch
                        isOn={isOnline}
                        onToggle={onToggleOnline}
                        label="Network"
                    />
                </div>
            </div>

            <div className="messages-list">
                {messages
                    .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
                    .map(message => (
                        <Message
                            key={message.id}
                            message={message}
                            isCurrentUser={message.username === currentUsername}
                        />
                    ))}
                {!isOnline && (
                    <div className="offline-message">
                        <p>You are offline. New messages may appear when you are back online.</p>
                    </div>
                )}
            </div>

            <MessageInput onSendMessage={onSendMessage} />
        </div>
    );
} 