import Message from '../types/message';
import Group from '../types/group';
import { UnsentRequest } from '../types/unsent-request';

const DB_NAME = 'messaging_app';
const DB_VERSION = 1;

export class MessageDB {
    private db: IDBDatabase | null = null;

    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create stores if they don't exist
                if (!db.objectStoreNames.contains('groups')) {
                    db.createObjectStore('groups', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('messages')) {
                    const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
                    messagesStore.createIndex('groupId', 'group_id', { unique: false });
                }
                if (!db.objectStoreNames.contains('unsent_requests')) {
                    const unsentStore = db.createObjectStore('unsent_requests', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    unsentStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    async storeUnsentRequest(request: UnsentRequest): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(['unsent_requests'], 'readwrite');
            const store = transaction.objectStore('unsent_requests');

            const req = store.add(request);

            req.onerror = () => reject(req.error);
            transaction.oncomplete = () => resolve();
        });
    }

    async getUnsentRequests(): Promise<UnsentRequest[]> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(['unsent_requests'], 'readonly');
            const store = transaction.objectStore('unsent_requests');
            const index = store.index('timestamp');
            const request = index.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async removeUnsentRequest(id: number): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(['unsent_requests'], 'readwrite');
            const store = transaction.objectStore('unsent_requests');
            const request = store.delete(id);

            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => resolve();
        });
    }

    async clear(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(['groups', 'messages'], 'readwrite');
            const groupsStore = transaction.objectStore('groups');
            const messagesStore = transaction.objectStore('messages');

            // Clear all data
            groupsStore.clear();
            messagesStore.clear();

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async getGroups(): Promise<Group[]> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(['groups'], 'readonly');
            const store = transaction.objectStore('groups');
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async setGroups(groups: Group[]): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(['groups'], 'readwrite');
            const store = transaction.objectStore('groups');

            // Clear existing groups
            store.clear();

            // Add new groups
            groups.forEach(group => store.add(group));

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async deleteGroup(groupId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(['groups', 'messages'], 'readwrite');
            const groupsStore = transaction.objectStore('groups');
            const messagesStore = transaction.objectStore('messages');
            const messageIndex = messagesStore.index('groupId');

            // Delete group
            groupsStore.delete(groupId);

            // Delete all messages for this group
            const messageRequest = messageIndex.openKeyCursor(IDBKeyRange.only(groupId));
            messageRequest.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    messagesStore.delete(cursor.primaryKey);
                    cursor.continue();
                }
            };

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async getMessages(groupId: string): Promise<Message[]> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(['messages'], 'readonly');
            const store = transaction.objectStore('messages');
            const index = store.index('groupId');
            const request = index.getAll(IDBKeyRange.only(groupId));

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async addMessage(message: Message): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            const request = store.add(message);

            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => resolve();
        });
    }

    async setMessages(groupId: string, messages: Message[]): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            const index = store.index('groupId');

            // Delete existing messages for this group
            const deleteRequest = index.openKeyCursor(IDBKeyRange.only(groupId));
            deleteRequest.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                } else {
                    // Add new messages
                    messages.forEach(message => store.add(message));
                }
            };

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
} 