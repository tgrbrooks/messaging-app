import { useState } from 'react';
import { TEST_USERS, User } from '../types/user';
import '../styles/Login.css';

interface LoginProps {
    onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const handleUserSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const userId = event.target.value;
        const user = TEST_USERS.find(u => u.id === userId) || null;
        setSelectedUser(user);
        if (user) {
            onLogin();
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Login</h1>
                <div className="select-wrapper">
                    <select 
                        value={selectedUser?.id || ''} 
                        onChange={handleUserSelect}
                        className="user-select"
                    >
                        <option value="" disabled>Select user</option>
                        {TEST_USERS.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.username}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
} 