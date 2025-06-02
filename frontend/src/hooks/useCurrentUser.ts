import { useMemo } from 'react';
import { User } from '../types/user';
import { getCurrentUser, getAuthToken } from '../utils/auth';

export interface CurrentUserState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
}

export function useCurrentUser(): CurrentUserState {
    return useMemo(() => {
        const user = getCurrentUser();
        const token = getAuthToken();
        return {
            user,
            token,
            isAuthenticated: Boolean(user && token)
        };
    }, []); // Empty deps since we're reading from localStorage which can't trigger re-renders
} 