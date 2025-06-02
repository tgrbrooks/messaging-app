import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoutIcon, DeleteIcon, LeaveIcon, SendIcon, AddIcon } from '../components/Icons';
import { clearCurrentUser } from '../utils/auth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import '../styles/Messages.css';

interface Message {
    id: string;
    username: string;
    message: string;
    sent_at: string;
}

interface Group {
    id: string;
    name: string;
    createdBy: string;
}

export default function Messages() {
    const navigate = useNavigate();
    const { user, token } = useCurrentUser();
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [userGroups, setUserGroups] = useState<Group[]>([]);
    const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        if (!user || !token) {
            navigate('/login');
            return;
        }

        // Fetch user's groups
        fetch('/api/rpc/get_user_groups', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ p_user_id: user!.id })
        })
        .then(res => res.json())
        .then(data => setUserGroups(data));

        // Fetch available groups
        fetch('/api/groups', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(res => res.json())
        .then(data => {
            const available = data.filter((group: Group) => 
                !userGroups.some(userGroup => userGroup.id === group.id)
            );
            setAvailableGroups(available);
        });
    }, [user, token, navigate]);

    useEffect(() => {
        if (selectedGroup && token) {
            // Fetch messages for selected group
            fetch(`/api/rpc/get_group_messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ p_group_id: selectedGroup.id })
            })
            .then(res => res.json())
            .then(data => setMessages(data));
        }
    }, [selectedGroup, token]);

    const handleCreateGroup = () => {
        if (newGroupName.trim() && token) {
            fetch('/api/rpc/create_group', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ p_name: newGroupName })
            })
            .then(res => res.json())
            .then(data => {
                setUserGroups([...userGroups, data]);
                setNewGroupName('');
            });
        }
    };

    const handleJoinGroup = (groupId: string) => {
        if (token) {
            fetch('/api/rpc/join_group', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ p_group_id: groupId })
            })
            .then(() => {
                const group = availableGroups.find(g => g.id === groupId);
                if (group) {
                    setUserGroups([...userGroups, group]);
                    setAvailableGroups(availableGroups.filter(g => g.id !== groupId));
                }
            });
        }
    };

    const handleLeaveGroup = (groupId: string) => {
        if (token) {
            fetch('/api/rpc/leave_group', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ p_group_id: groupId })
            })
            .then(() => {
                const group = userGroups.find(g => g.id === groupId);
                if (group) {
                    setUserGroups(userGroups.filter(g => g.id !== groupId));
                    setAvailableGroups([...availableGroups, group]);
                }
                if (selectedGroup?.id === groupId) {
                    setSelectedGroup(null);
                }
            });
        }
    };

    const handleDeleteGroup = (groupId: string) => {
        if (token) {
            fetch(`/api/groups?id=eq.${groupId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(() => {
                setUserGroups(userGroups.filter(g => g.id !== groupId));
                if (selectedGroup?.id === groupId) {
                    setSelectedGroup(null);
                }
            });
        }
    };

    const handleSendMessage = () => {
        if (newMessage.trim() && selectedGroup && token) {
            fetch('/api/rpc/create_message', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    p_group_id: selectedGroup.id,
                    p_message: newMessage
                })
            })
            .then(res => res.json())
            .then(data => {
                setMessages([...messages, data]);
                setNewMessage('');
            });
        }
    };

    const handleLogout = () => {
        clearCurrentUser();
        navigate('/login');
    };

    if (!user || !token) return null;

    return (
        <div className="messages-container">
            <div className="sidebar">
                <div className="user-header">
                    <span>{user.username}</span>
                    <button className="icon-button" onClick={handleLogout}>
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
                                    group.createdBy === user.id
                                        ? handleDeleteGroup(group.id)
                                        : handleLeaveGroup(group.id);
                                }}
                            >
                                {group.createdBy === user.id ? <DeleteIcon /> : <LeaveIcon />}
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
                                    className={`message ${message.username === user.username ? 'sent' : 'received'}`}
                                >
                                    <div className="message-content">
                                        <div className="message-header">
                                            <span className="username">{message.username}</span>
                                            <span className="timestamp">Sent at: {message.sent_at}</span>
                                        </div>
                                        <p className="message-body">{message.message}</p>
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
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
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