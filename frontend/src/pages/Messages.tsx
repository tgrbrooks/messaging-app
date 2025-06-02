import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoutIcon, DeleteIcon, LeaveIcon, SendIcon, AddIcon } from '../components/Icons';
import { clearCurrentUser } from '../utils/auth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { MessageDB } from '../utils/db';
import { useNetwork } from '../context/NetworkContext';
import { useFetch } from '../hooks/useFetch';
import Group from '../types/group';
import Message from '../types/message';
import { formatTimestamp } from '../utils/dateFormat';
import ToggleSwitch from '../components/ToggleSwitch';
import '../styles/Messages.css';

const db = new MessageDB();

const POLL_INTERVAL = 5000; // 5 seconds

export default function Messages() {
    const navigate = useNavigate();
    const { user, token } = useCurrentUser();
    const { isOnline, toggleOnline } = useNetwork();
    const { fetch: networkFetch } = useFetch();
    const [dbInitialized, setDbInitialized] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [userGroups, setUserGroups] = useState<Group[]>([]);
    const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    // Initialize IndexedDB
    useEffect(() => {
        db.init()
            .then(() => setDbInitialized(true))
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (!user || !token) {
            navigate('/login');
            return;
        }

        if (!dbInitialized) {
            return;
        }

        // Try to load groups from cache first
        db.getGroups()
            .then(cachedGroups => {
                if (cachedGroups.length > 0) {
                    setUserGroups(cachedGroups);
                }
            })
            .catch(console.error);

        // Fetch user's groups from server
        networkFetch('/api/rpc/get_user_groups', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ p_user_id: user!.id })
        })
            .then(res => res.json())
            .then(data => {
                setUserGroups(data);
                // Update cache
                db.setGroups(data).catch(console.error);
            })
            .catch(error => {
                console.error('Error fetching groups:', error);
            });

        // Fetch available groups
        networkFetch('/api/groups', {
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
            })
            .catch(error => {
                console.error('Error fetching available groups:', error);
            });
    }, [user, token, navigate, networkFetch, dbInitialized]);

    useEffect(() => {
        if (!selectedGroup || !token || !dbInitialized) {
            return;
        }

        // Try to load messages from cache first
        db.getMessages(selectedGroup.id)
            .then(cachedMessages => {
                setMessages(cachedMessages);
            })
            .catch(console.error);

        // Fetch messages from server
        networkFetch(`/api/rpc/get_group_messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ p_group_id: selectedGroup.id })
        })
            .then(res => res.json())
            .then(data => {
                setMessages(data);
                // Update cache
                db.setMessages(selectedGroup.id, data).catch(console.error);
            })
            .catch(error => {
                console.error('Error fetching messages:', error);
            });
    }, [selectedGroup, token, networkFetch, dbInitialized]);

    // Poll for new messages in selected group
    useEffect(() => {
        if (!token || !isOnline || !selectedGroup) return;

        const pollMessages = async () => {
            try {
                const response = await networkFetch(`/api/rpc/get_group_messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ p_group_id: selectedGroup.id })
                });
                
                const newMessages = await response.json();
                setMessages(newMessages);
                // Update cache
                await db.setMessages(selectedGroup.id, newMessages);
            } catch (error) {
                console.error('Error polling messages:', error);
            }
        };

        // Initial poll
        pollMessages();

        // Set up polling interval
        const intervalId = setInterval(pollMessages, POLL_INTERVAL);

        // Cleanup
        return () => clearInterval(intervalId);
    }, [token, isOnline, selectedGroup, networkFetch]);

    const handleCreateGroup = () => {
        if (newGroupName.trim() && token) {
            const id = crypto.randomUUID();
            const createdAt = new Date().toISOString();
            networkFetch('/api/rpc/create_group', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ p_id: id, p_name: newGroupName, p_created_at: createdAt }),
                storeUnsent: true,
                offlineResponse: {
                        id,
                        name: newGroupName,
                        created_by: user?.id || '',
                        created_at: createdAt
                    }
            })
                .then(res => res.json())
                .then(data => {
                    const updatedGroups = [...userGroups, data];
                    setUserGroups(updatedGroups);
                    // Update cache
                    db.setGroups(updatedGroups).catch(console.error);
                    setNewGroupName('');
                })
                .catch(error => {
                    console.error('Error creating group:', error);
                });
        }
    };

    const handleJoinGroup = (groupId: string) => {
        if (token) {
            networkFetch('/api/rpc/join_group', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ p_group_id: groupId }),
                storeUnsent: true,
            })
                .then(() => {
                    const group = availableGroups.find(g => g.id === groupId);
                    if (group) {
                        const updatedGroups = [...userGroups, group];
                        setUserGroups(updatedGroups);
                        setAvailableGroups(availableGroups.filter(g => g.id !== groupId));
                        // Update cache
                        db.setGroups(updatedGroups).catch(console.error);
                    }
                })
                .catch(error => {
                    console.error('Error joining group:', error);
                });
        }
    };

    const handleLeaveGroup = (groupId: string) => {
        if (token) {
            networkFetch('/api/rpc/leave_group', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ p_group_id: groupId }),
                storeUnsent: true,
            })
                .then(() => {
                    const group = userGroups.find(g => g.id === groupId);
                    if (group) {
                        const updatedGroups = userGroups.filter(g => g.id !== groupId);
                        setUserGroups(updatedGroups);
                        setAvailableGroups([...availableGroups, group]);
                        // Update cache
                        db.setGroups(updatedGroups).catch(console.error);
                        // Delete group and its messages from cache
                        db.deleteGroup(groupId).catch(console.error);
                    }
                    if (selectedGroup?.id === groupId) {
                        setSelectedGroup(null);
                    }
                })
                .catch(error => {
                    console.error('Error leaving group:', error);
                });
        }
    };

    const handleDeleteGroup = (groupId: string) => {
        if (token) {
            networkFetch(`/api/groups?id=eq.${groupId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                storeUnsent: true,
            })
                .then(() => {
                    const updatedGroups = userGroups.filter(g => g.id !== groupId);
                    setUserGroups(updatedGroups);
                    // Update cache
                    db.setGroups(updatedGroups).catch(console.error);
                    // Delete group and its messages from cache
                    db.deleteGroup(groupId).catch(console.error);
                    if (selectedGroup?.id === groupId) {
                        setSelectedGroup(null);
                    }
                })
                .catch(error => {
                    console.error('Error deleting group:', error);
                });
        }
    };

    const handleSendMessage = () => {
        if (newMessage.trim() && selectedGroup && token) {
            const id = crypto.randomUUID();
            const sentAt = new Date().toISOString();
            networkFetch('/api/rpc/create_message', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    p_id: id,
                    p_group_id: selectedGroup.id,
                    p_message: newMessage,
                    p_sent_at: sentAt
                }),
                storeUnsent: true,
                offlineResponse: {
                        id,
                        group_id: selectedGroup.id,
                        message: newMessage,
                        sent_at: sentAt
                }
            })
                .then(res => res.json())
                .then(data => {
                    const updatedMessages = [...messages, { ...data, username: user?.username }];
                    setMessages(updatedMessages);
                    // Update cache
                    db.setMessages(selectedGroup.id, updatedMessages).catch(console.error);
                    setNewMessage('');
                })
                .catch(error => {
                    console.error('Error sending message:', error);
                    setNewMessage('');
                });
        }
    };

    const handleLogout = async () => {
        await clearCurrentUser();
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
                    {userGroups.sort((a, b) => a.name.localeCompare(b.name)).map(group => (
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
                                    group.created_by === user.id
                                        ? handleDeleteGroup(group.id)
                                        : handleLeaveGroup(group.id);
                                }}
                            >
                                {group.created_by === user.id ? <DeleteIcon /> : <LeaveIcon />}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="chat-area">
                <div className="chat-header">
                    <h2>{selectedGroup?.name}</h2>
                    <div className="online-status">
                        <ToggleSwitch
                            isOn={isOnline}
                            onToggle={toggleOnline}
                            label="Network"
                        />
                    </div>
                </div>
                {selectedGroup ? (
                    <>
                        <div className="messages-list">
                            {messages
                            .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
                            .map(message => (
                                <div
                                    key={message.id}
                                    className={`message ${message.username === user.username ? 'sent' : 'received'}`}
                                >
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
                            ))}
                            {!isOnline && (
                                <div className="offline-message">
                                    <p>You are offline. New messages may appear when you are back online.</p>
                                </div>
                            )}
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