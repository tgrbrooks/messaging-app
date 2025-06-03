export interface UnsentRequest {
    id?: number;  // Auto-incremented
    url: string;
    method: string;
    headers: { [key: string]: string };
    body?: string;
    timestamp: number;
}