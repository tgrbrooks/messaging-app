import React, { createContext, useContext, useState, useCallback } from 'react';

interface NetworkContextType {
    isOnline: boolean;
    toggleOnline: () => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
    const [isOnline, setIsOnline] = useState(true);

    const toggleOnline = useCallback(async () => {
        const newState = !isOnline;
        setIsOnline(newState);

        if (newState && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
            try {
                const registration = await navigator.serviceWorker.ready;
                if ('sync' in registration) {
                    await (registration as any).sync.register('process-unsent-requests');
                    console.log('Triggered background sync for unsent requests');
                }
            } catch (error) {
                console.error('Failed to trigger background sync:', error);
            }
        }
    }, [isOnline]);

    return (
        <NetworkContext.Provider value={{ isOnline, toggleOnline }}>
            {children}
        </NetworkContext.Provider>
    );
}

export function useNetwork() {
    const context = useContext(NetworkContext);
    if (context === undefined) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }
    return context;
} 