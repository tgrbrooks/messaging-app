import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearCurrentUser } from '../utils/auth';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { MessageDB } from '../utils/db';
import { useNetwork } from '../context/NetworkContext';
import { useFetch } from '../hooks/useFetch';
import Group from '../types/group';
import Message from '../types/message';
import GroupSection from '../components/GroupSection';
import ChatSection from '../components/ChatSection';

const db = new MessageDB();
const POLL_INTERVAL = 5000; // 5 seconds

export default function Messages() {
    const navigate = useNavigate();
    const { user, token } = useCurrentUser();
    const { isOnline, toggleOnline } = useNetwork();
    const { fetch: networkFetch } = useFetch();
    const [dbInitialized, setDbInitialized] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [userGroups, setUserGroups] = useState<Group[]>([]);
    const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);

    // Initialize IndexedDB
    useEffect(() => {
        db.init()
            .then(() => setDbInitialized(true))
            .catch(console.error);
    }, []);

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

        pollMessages();
        const intervalId = setInterval(pollMessages, POLL_INTERVAL);

        return () => clearInterval(intervalId);
    }, [token, isOnline, selectedGroup]);

    // Inital load of data
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
                setUserGroups(cachedGroups);
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
    }, [user, token, navigate, dbInitialized]);

    // Load messages for selected group
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
                db.setMessages(selectedGroup.id, data).catch(console.error);
            })
            .catch(error => {
                console.error('Error fetching messages:', error);
            });
    }, [selectedGroup, token, networkFetch, dbInitialized]);

    const handleCreateGroup = (name: string) => {
        if (!token || !user) return;

        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        networkFetch('/api/rpc/create_group', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ p_id: id, p_name: name, p_created_at: createdAt }),
            storeUnsent: true,
            offlineResponse: {
                id,
                name,
                created_by: user.id,
                created_at: createdAt
            }
        })
        .then(res => res.json())
        .then(data => {
            const updatedGroups = [...userGroups, data];
            setUserGroups(updatedGroups);
            db.setGroups(updatedGroups).catch(console.error);
        })
        .catch(error => {
            console.error('Error creating group:', error);
        });
    };

    const handleJoinGroup = (groupId: string) => {
        if (!token) return;

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
                db.setGroups(updatedGroups).catch(console.error);
            }
        })
        .catch(error => {
            console.error('Error joining group:', error);
        });
    };

    const handleLeaveGroup = (groupId: string) => {
        if (!token) return;

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
                db.setGroups(updatedGroups).catch(console.error);
                db.deleteGroup(groupId).catch(console.error);
            }
            if (selectedGroup?.id === groupId) {
                setSelectedGroup(null);
            }
        })
        .catch(error => {
            console.error('Error leaving group:', error);
        });
    };

    const handleDeleteGroup = (groupId: string) => {
        if (!token) return;

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
            db.setGroups(updatedGroups).catch(console.error);
            db.deleteGroup(groupId).catch(console.error);
            if (selectedGroup?.id === groupId) {
                setSelectedGroup(null);
            }
        })
        .catch(error => {
            console.error('Error deleting group:', error);
        });
    };

    const handleSendMessage = (message: string) => {
        if (!selectedGroup || !token || !user) return;

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
                p_message: message,
                p_sent_at: sentAt
            }),
            storeUnsent: true,
            offlineResponse: {
                id,
                group_id: selectedGroup.id,
                message,
                sent_at: sentAt
            }
        })
        .then(res => res.json())
        .then(data => {
            const updatedMessages = [...messages, { ...data, username: user.username }];
            setMessages(updatedMessages);
            db.setMessages(selectedGroup.id, updatedMessages).catch(console.error);
        })
        .catch(error => {
            console.error('Error sending message:', error);
        });
    };

    const handleLogout = async () => {
        await clearCurrentUser();
        navigate('/login');
    };

    if (!user || !token) return null;

    return (
        <div className="messages-container">
            <GroupSection
                username={user.username}
                userGroups={userGroups}
                availableGroups={availableGroups}
                selectedGroup={selectedGroup}
                currentUserId={user.id}
                onCreateGroup={handleCreateGroup}
                onJoinGroup={handleJoinGroup}
                onLeaveGroup={handleLeaveGroup}
                onDeleteGroup={handleDeleteGroup}
                onSelectGroup={setSelectedGroup}
                onLogout={handleLogout}
            />
            <ChatSection
                selectedGroup={selectedGroup}
                messages={messages}
                currentUsername={user.username}
                isOnline={isOnline}
                onToggleOnline={toggleOnline}
                onSendMessage={handleSendMessage}
            />
        </div>
    );
} 