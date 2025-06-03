const DB_NAME = 'messaging_app';
const DB_VERSION = 1;
const MAX_RETRIES = 5;
const MAX_BACKOFF_DELAY = 30000;
const CACHE_NAME = 'messaging-app-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(
        Promise.resolve()
            .then(() => {
                self.skipWaiting(); // Activate worker immediately
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.resolve()
            .then(() => {
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

function getBackoffDelay(retryCount) {
    return Math.min(1000 * Math.pow(2, retryCount), MAX_BACKOFF_DELAY);
}

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

async function processUnsentRequests() {
    try {
        const requests = await getUnsentRequests();
        if (requests.length === 0) return;

        for (const request of requests) {
            await processRequest(request);
        }
    } catch (error) {
        console.error('Error processing unsent requests:', error);
    }
}

self.addEventListener('online', () => {
    console.log('Online event received');
    processUnsentRequests();
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'process-unsent-requests') {
        event.waitUntil(processUnsentRequests());
    }
});
