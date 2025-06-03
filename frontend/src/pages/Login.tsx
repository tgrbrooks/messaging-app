import { TEST_USERS } from '../types/user';
import { setCurrentUser, getCurrentUser } from '../utils/auth';
import '../styles/Login.css';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const navigate = useNavigate();

    const handleUserSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const userId = event.target.value;
        const user = TEST_USERS.find(u => u.id === userId) || null;
        if (user) {
            setCurrentUser(user);
            navigate('/messages');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Login</h1>
                <div className="select-wrapper">
                    <select
                        value={getCurrentUser()?.id || ''}
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