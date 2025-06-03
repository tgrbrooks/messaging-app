import { useCallback } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { MessageDB } from '../utils/db';
import { UnsentRequest } from '../types/unsent-request';

const db = new MessageDB();

interface FetchOptions extends RequestInit {
    storeUnsent?: boolean;
    offlineResponse?: any;
}

export function useFetch() {
    const { isOnline } = useNetwork();

    const fetchWithNetwork = useCallback(async (url: string, options: FetchOptions = {}) => {
        await db.init();
        if (!isOnline) {
            if (options.storeUnsent) {
                // Store the request for later if we're offline
                const request: UnsentRequest = {
                    url,
                    method: options.method || 'GET',
                    headers: options.headers as { [key: string]: string } || {},
                    body: typeof options.body === 'string' ? options.body : undefined,
                    timestamp: Date.now()
                };

                await db.storeUnsentRequest(request);
                return new Response(options.offlineResponse ? JSON.stringify(options.offlineResponse) : null, { status: 200 });
            }
            throw new Error('Network is offline.');
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
    }, [isOnline]);

    return { fetch: fetchWithNetwork };
} 