export interface User {
    id: string;
    username: string;
}

export const TEST_USERS: User[] = [
    { id: '123e4567-e89b-12d3-a456-426614174000', username: 'alice' },
    { id: '223e4567-e89b-12d3-a456-426614174000', username: 'bob' },
    { id: '323e4567-e89b-12d3-a456-426614174000', username: 'charlie' },
    { id: '423e4567-e89b-12d3-a456-426614174000', username: 'david' },
    { id: '523e4567-e89b-12d3-a456-426614174000', username: 'eve' },
    { id: '623e4567-e89b-12d3-a456-426614174000', username: 'frank' },
    { id: '723e4567-e89b-12d3-a456-426614174000', username: 'grace' },
    { id: '823e4567-e89b-12d3-a456-426614174000', username: 'henry' },
    { id: '923e4567-e89b-12d3-a456-426614174000', username: 'ivy' },
    { id: 'a23e4567-e89b-12d3-a456-426614174000', username: 'jack' }
]; 