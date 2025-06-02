import { useState } from 'react';
import { LogoutIcon, DeleteIcon, LeaveIcon, SendIcon, AddIcon } from '../components/Icons';
import '../styles/Messages.css';

interface Message {
    id: string;
    userId: string;
    username: string;
    content: string;
    sentAt: string;
}

interface Group {
    id: string;
    name: string;
    createdBy: string;
}

export default function Messages() {
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [newMessage, setNewMessage] = useState('');
    
    // Mock data - replace with real data from API
    const currentUser = { id: '1', username: 'User1' };
    const userGroups: Group[] = [
        { id: '1', name: 'Group 1', createdBy: '1' },
        { id: '2', name: 'Group 2', createdBy: '2' },
        { id: '3', name: 'Group 3', createdBy: '3' },
    ];
    const availableGroups: Group[] = [
        { id: '4', name: 'Group 4', createdBy: '2' },
        { id: '5', name: 'Group 5', createdBy: '3' },
    ];
    const messages: Message[] = [
        { id: '1', userId: '2', username: 'User2', content: 'Hello, how are you?', sentAt: '10:01am 02-06-2025' },
        { id: '2', userId: '3', username: 'User3', content: "I'm good", sentAt: '10:04am 02-06-2025' },
        { id: '3', userId: '1', username: 'User1', content: 'Me too, how are you?', sentAt: '10:06am 02-06-2025' },
    ];

    const handleCreateGroup = () => {
        if (newGroupName.trim()) {
            // API call to create group
            setNewGroupName('');
        }
    };

    const handleJoinGroup = (groupId: string) => {
        // API call to join group
    };

    const handleLeaveGroup = (groupId: string) => {
        // API call to leave group
    };

    const handleDeleteGroup = (groupId: string) => {
        // API call to delete group
    };

    const handleSendMessage = () => {
        if (newMessage.trim() && selectedGroup) {
            // API call to send message
            setNewMessage('');
        }
    };

    return (
        <div className="messages-container">
            <div className="sidebar">
                <div className="user-header">
                    <span>{currentUser.username}</span>
                    <button className="icon-button">
                        <LogoutIcon />
                    </button>
                </div>

                <div className="group-actions">
                    <div className="add-group">
                        <input
                            type="text"
                            placeholder="Add group"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                        />
                        <button className="icon-button" onClick={handleCreateGroup}>
                            <AddIcon />
                        </button>
                    </div>

                    <div className="join-group">
                        <select onChange={(e) => handleJoinGroup(e.target.value)}>
                            <option value="">Join group</option>
                            {availableGroups.map(group => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="groups-list">
                    <h2>Your groups</h2>
                    {userGroups.map(group => (
                        <div
                            key={group.id}
                            className={`group-item ${selectedGroup?.id === group.id ? 'selected' : ''}`}
                            onClick={() => setSelectedGroup(group)}
                        >
                            <span>{group.name}</span>
                            <button
                                className="icon-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    group.createdBy === currentUser.id
                                        ? handleDeleteGroup(group.id)
                                        : handleLeaveGroup(group.id);
                                }}
                            >
                                {group.createdBy === currentUser.id ? <DeleteIcon /> : <LeaveIcon />}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="chat-area">
                {selectedGroup ? (
                    <>
                        <div className="chat-header">
                            <h2>{selectedGroup.name}</h2>
                            <div className="online-status">
                                <span>Online</span>
                                <div className="status-indicator online"></div>
                            </div>
                        </div>

                        <div className="messages-list">
                            {messages.map(message => (
                                <div
                                    key={message.id}
                                    className={`message ${message.userId === currentUser.id ? 'sent' : 'received'}`}
                                >
                                    <div className="message-content">
                                        <div className="message-header">
                                            <span className="username">{message.username}</span>
                                            <span className="timestamp">Sent at: {message.sentAt}</span>
                                        </div>
                                        <p className="message-body">{message.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="message-input">
                            <input
                                type="text"
                                placeholder="Message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button className="icon-button" onClick={handleSendMessage}>
                                <SendIcon />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="no-group-selected">
                        <p>Select a group to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
} 