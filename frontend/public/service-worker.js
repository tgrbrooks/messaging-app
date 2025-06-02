const DB_NAME = 'messaging_app';
const DB_VERSION = 1;
const MAX_RETRIES = 5;
const CACHE_NAME = 'messaging-app-v1';

// Service Worker Installation
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        Promise.resolve()
            .then(() => {
                console.log('Service Worker installed');
                self.skipWaiting(); // Activate worker immediately
            })
    );
});

// Service Worker Activation
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        Promise.resolve()
            .then(() => {
                console.log('Service Worker activated');
                return self.clients.claim(); // Take control of all clients
            })
    );
});

// Initialize IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// Get all unsent requests ordered by timestamp
async function getUnsentRequests() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['unsent_requests'], 'readonly');
        const store = transaction.objectStore('unsent_requests');
        const index = store.index('timestamp');
        const request = index.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// Remove a request from the queue
async function removeRequest(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['unsent_requests'], 'readwrite');
        const store = transaction.objectStore('unsent_requests');
        const request = store.delete(id);

        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => resolve();
    });
}

// Calculate delay for exponential backoff
function getBackoffDelay(retryCount) {
    return Math.min(1000 * Math.pow(2, retryCount), 30000); // Cap at 30 seconds
}

// Process a single request with retries
async function processRequest(request, retryCount = 0) {
    try {
        const response = await fetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: request.body
        });

        // Remove request if successful or 404
        if (response.ok || response.status === 404) {
            await removeRequest(request.id);
            return true;
        }

        // Retry with backoff if under max retries
        if (retryCount < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, getBackoffDelay(retryCount)));
            return processRequest(request, retryCount + 1);
        }

        // Remove after max retries
        console.error(`Request failed after ${MAX_RETRIES} retries:`, request);
        await removeRequest(request.id);
        return false;
    } catch (error) {
        if (retryCount < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, getBackoffDelay(retryCount)));
            return processRequest(request, retryCount + 1);
        }
        console.error(`Request failed after ${MAX_RETRIES} retries:`, error);
        await removeRequest(request.id);
        return false;
    }
}

// Process all unsent requests
async function processUnsentRequests() {
    try {
        const requests = await getUnsentRequests();
        if (requests.length === 0) return;

        // Process requests in order
        for (const request of requests) {
            await processRequest(request);
        }
    } catch (error) {
        console.error('Error processing unsent requests:', error);
    }
}

// Listen for online events
self.addEventListener('online', () => {
    console.log('Online event received');
    processUnsentRequests();
});

// Listen for sync events
self.addEventListener('sync', (event) => {
    if (event.tag === 'process-unsent-requests') {
        event.waitUntil(processUnsentRequests());
    }
});
