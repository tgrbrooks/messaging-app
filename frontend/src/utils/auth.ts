import { User } from '../types/user';

// Pre-generated tokens for test users
const TEST_TOKENS: { [key: string]: string } = {
    'alice': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXBwX3VzZXIiLCJ1c2VyX2lkIjoiMTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwIiwidXNlcm5hbWUiOiJhbGljZSIsImF1ZCI6Im1lc3NhZ2luZ19hcHAiLCJpYXQiOjE3NDg4NzY5MTl9.ljv5LQMBXwZ6JCbB5NaryE9sd4DY2v9WfPkiUoPokTc',
    'bob': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXBwX3VzZXIiLCJ1c2VyX2lkIjoiMjIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwIiwidXNlcm5hbWUiOiJib2IiLCJhdWQiOiJtZXNzYWdpbmdfYXBwIiwiaWF0IjoxNzQ4ODc2OTE5fQ.irxFGB18Tan8KCOxNKHWMDz_gTDGs-x-Mq8YyNstJyo',
    'charlie': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXBwX3VzZXIiLCJ1c2VyX2lkIjoiMzIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwIiwidXNlcm5hbWUiOiJjaGFybGllIiwiYXVkIjoibWVzc2FnaW5nX2FwcCIsImlhdCI6MTc0ODg3NjkxOX0.P_XEaF7YlwuFBQqXYcQ-6t3oOM3v8PUxIMyLrzfEGcU',
    'david': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXBwX3VzZXIiLCJ1c2VyX2lkIjoiNDIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwIiwidXNlcm5hbWUiOiJkYXZpZCIsImF1ZCI6Im1lc3NhZ2luZ19hcHAiLCJpYXQiOjE3NDg4NzY5MTl9.jy7fNqOLxs_M4dQg8GQgQrNgwQJGWnhKehKbg8eL7Mo',
    'eve': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXBwX3VzZXIiLCJ1c2VyX2lkIjoiNTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwIiwidXNlcm5hbWUiOiJldmUiLCJhdWQiOiJtZXNzYWdpbmdfYXBwIiwiaWF0IjoxNzQ4ODc2OTE5fQ.O-HZZcL2tLnvYa0oZOyqI0ZMbJGOSZ14KZkL_HiGaZc',
    'frank': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXBwX3VzZXIiLCJ1c2VyX2lkIjoiNjIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwIiwidXNlcm5hbWUiOiJmcmFuayIsImF1ZCI6Im1lc3NhZ2luZ19hcHAiLCJpYXQiOjE3NDg4NzY5MTl9.jd93xxaPUspTR6EwUPL8w0Gb7IcxdqvW8C0CaLr2YQw',
    'grace': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXBwX3VzZXIiLCJ1c2VyX2lkIjoiNzIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwIiwidXNlcm5hbWUiOiJncmFjZSIsImF1ZCI6Im1lc3NhZ2luZ19hcHAiLCJpYXQiOjE3NDg4NzY5MTl9._d195KNauFUTNIST6wdnMGLBxPTzycfdF3kcgl64OLY',
    'henry': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXBwX3VzZXIiLCJ1c2VyX2lkIjoiODIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwIiwidXNlcm5hbWUiOiJoZW5yeSIsImF1ZCI6Im1lc3NhZ2luZ19hcHAiLCJpYXQiOjE3NDg4NzY5MTl9.bRtE9UrsGbtyChP_gSpJmASkMTlzQAjti52dfqiahQ8',
    'ivy': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXBwX3VzZXIiLCJ1c2VyX2lkIjoiOTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwIiwidXNlcm5hbWUiOiJpdnkiLCJhdWQiOiJtZXNzYWdpbmdfYXBwIiwiaWF0IjoxNzQ4ODc2OTE5fQ.VgJWO1DZlALYOPdYZodEv333nZvYHx34Qyca6bTUSS8',
    'jack': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXBwX3VzZXIiLCJ1c2VyX2lkIjoiYTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwIiwidXNlcm5hbWUiOiJqYWNrIiwiYXVkIjoibWVzc2FnaW5nX2FwcCIsImlhdCI6MTc0ODg3NjkxOX0.sRjTmNja5fYx7yE1ZgB4gIjWyX0OrKISSfyx5qtDNQA'
};

export function getAuthToken(): string | null {
    const user = getCurrentUser();
    if (!user) return null;
    return TEST_TOKENS[user.username];
}

export function getCurrentUser(): User | null {
    // Get user from local storage
    const user = localStorage.getItem('user');
    if (!user) return null;
    return JSON.parse(user);
}

export function setCurrentUser(user: User) {
    localStorage.setItem('user', JSON.stringify(user));
}

export function clearCurrentUser() {
    localStorage.removeItem('user');
}