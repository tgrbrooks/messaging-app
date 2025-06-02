# Messaging App

A full stack web application with React frontend and PostgREST backend.

## Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- PostgreSQL (will run in Docker)

## Project Structure

```
messaging-app/
├── frontend/         # React frontend application
└── backend/         # PostgreSQL and PostgREST configuration
```

## Setup and Running

1. Start the backend services:
```bash
cd backend
docker-compose up -d
```

2. Start the frontend development server:
```bash
cd frontend
npm install
npm start
```

3. Access the application:
- Frontend: http://localhost:3000
- PostgREST API: http://localhost:3000/api

## API Endpoints

- `GET /health` - Health check endpoint, returns 200 OK 