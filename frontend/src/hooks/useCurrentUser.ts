import { useMemo } from 'react';
import User from '../types/user';
import { getCurrentUser, getAuthToken } from '../utils/auth';

export interface CurrentUserState {
    user: User | null;
    token: string | null;
}

export function useCurrentUser(): CurrentUserState {
    return useMemo(() => {
        const user = getCurrentUser();
        const token = getAuthToken();
        return {
            user,
            token,
        };
    }, []);
} 