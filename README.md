# Messaging App

A full stack web application with React frontend and PostgREST backend designed to work offline.

## Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- PostgreSQL (will run in Docker)

## Setup and Running

1. Start the backend services:
```bash
cd backend
docker compose up -d
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

For the MVP the online/offline state is simulated through a toggle on the messages page, not everything is in place in order to actually work offline using devtools or switching off the backend.

## Project planning and description

This section details my thought process for designing the MVP, the designs do not necessarily reflect the resulting MVP due to time constraints but I have done my best to highlight where there are differences and the reason why.

### Requirements

- Users can create and delete groups (add and remove was exact wording, but join is also another requirement so it is assumed add means create here). Should only allow deletion if the user created the group
- Users can send messages to groups (only if joined)
- Users can join any available groups
- Users are happy to wait 5-10 seconds for messages to appear after they are sent
- Same actions available offline, when online they should receive messages

### Technology

- Frontend: React app as per requirements with react router and indexedDB for the cache
- Database: Postgres chosen as relational database due to familiarity, the type of data being stored and IO requirements are pretty simple, so pretty much any SQL database would have been appropriate
- API: Decided to use PostgREST, I hadn't used it before but the mention of it in the job description peaked my interest and it seemed appropriate for the basic CRUD requirements of the API. While it did mean the API could be defined with very little boilerplate using an unfamiliar technology may have been a mistake as I'm sure there are several best practices I've not implemented. The biggest issues for me were that adding any business logic turned the endpoints into RPCs and I'm sure there are a bunch of exposed endpoints that could cause issues if this was a real app.

### Architecture

The architechture of the underlying messaging app is very simple CRUD app restricted to just the features outlined in the requirements due to the time constraints. Users can create, delete, join and leave groups and send messages to groups. New messages are received by polling every 5 seconds, this is not ideal as in production this would create unneccesary load for the server. Ideally I would use something like server side events for this, but they require an open stream which might be hard to manage with the offline first requirement and as there was a hint that users are happy to wait 5-10 seconds for messages to appear I thought it best to not open that can of worms.

In order to make the app offline first the following modifications are needed:
- Ensure that all the HTML and JS for the app is loaded up front (not specifically addressed here)
- Do an up front load of any data needed for the app to be functional (e.g. all the available groups). Given more time I would also load the most recent page of messages for the most recently active groups that the user has joined.
- Cache the results of any queries in the frontend. I've chosen to use the indexedDB to store this structured data as it's easy to update and modify by key.
- Load data from the cache if there is no network access, when there is network access overwrite the cache with the updated data. To save time the MVP only deals with updating all groups at once or all messages in a group at once, but in reality I would want to handle pagination and partial updates of the cache.
- When queries fail because there is no network access, store the queries in the indexedDB with a timestamp. If given more time I would store events rather than the raw queries as this gives more flexibility for updating the API and gives better support for PUT requests where whole objects are replaced.
- Add a service worker to consume the unsent requests from the oldest to the newest when the application is online. I added a toggle in the app to switch between online and offline but this doesn't play that nicely with the network switcher in devtools, so the toggle in the app forces the worker to run as a bit of a shortcut. If a query fails it is retried with an exponential backoff up to 5 times, for times sake the request is skipped if it keeps failing but in reality I would show a message to the user and give them an opportunity to correct or ignore the error where appropriate. 404 errors are treated as successess as they can happen when there are multiple group deletions for example.

### Data model

- `users`: a collection of users of the system
  - `id`: a UUID identifying the user
  - `username`: a unique name for the user
  - `password_hash`: hashed password for the user, auth not considered for the MVP so this is unused
- `groups`: the messaging groups created by users
  - `id`: a UUID identifying the group
  - `name`: a name for the group, duplicate names are allowed to avoid having to deal with conflict resolution and save time
  - `created_by`: the ID of the user who created the group
  - `created_at`: when the user created the group
  - `saved_at`: when the group was created in the database
- `user_to_group`: used to represent the many-to-many relationship between users and groups
  - `user_id`
  - `group_id`
- `messages`: messages in groups, assumed that only user to group messaging was required, does not account for user to user messaging
  - `id`: a UUID identifying the message
  - `group_id`: the ID of the group the message was sent to
  - `message`: the contents of the message
  - `sent_by`: the ID of the user that sent the message
  - `sent_at`: when the message was sent by the user
  - `saved_at`: when the message was created in the database

### Front end cache

- `groups`: stores all available groups, joined and unjoined
- `messages`: stores all the fetched messages, indexed by group ID
- `unsent_requests`: stores any API calls that have not been sent because the user is offline, with timestamp of when the request was originally sent

### API endpoints

As mentioned in the technology section, there were some issues configuring the API how I would have liked it. I'm sure that with more time these issues could all have been resolved. This is what I was intending the API endpoints to look like:

- `GET /users/:id` (returns all info about user)
- `POST /user-to-group` body: `{group_id: uuid}` (gets the user ID from the token, creates a user_to_group in db, return 200 if user-to-group already exists)
- `DELETE /user-to-group/:groupId` (gets user ID from the token, deletes user_to_group in db, return 200 if user_to_group does not exist)
- `GET /groups` (returns all groups, if there was more time this would be paginated by most recent message in group)
- `POST /groups` body: `{id: uuid, name: string, created_at: timestamp}` (creates a new group, returns group, passing in the ID is weird, I thought it might make updating the frontend cache easier but I didn't implement partial updates in the end so it was a bit pointless)
- `DELETE /groups/:id` (checks user created group, delete group and all messages)
- `GET /users/:id/groups` (checks user ID, returns all groups that the user has joined)
- `GET /groups/:id/messages` (returns all messages in group)
- `POST /groups/:id/messages` body: `{id: uuid, message: string, sent_at: timestamp}` (creates a new message in a group, checks group exists, checks user has joined group)


### Considerations and edge cases

- The glaring issue is that there are no tests, but I thought it was more important to focus on having a working MVP
- I chose to order messages by the time they were originally sent rather than when they were saved in the DB which could have some UX problems if a message doesn't get sent for a very long time as the message could appear above other already read messages.
- In cases where a group deleted offline and messages were sent to this group online before the deletion goes through all the new messages would get deleted with the group. With more time I would warn the deleting user that more messages were sent since the deletion request was made.
- If the user closes browser or logs out before going online all their pending changes would be lost, with more time I would at least warn the user.
- I haven't had time to do much in the way of error handling, either when using the app online or when catching up. I've tried to make the API idempotent where possible to reduce the number of potential errors from requests arriving out of order and added some retries to the service worker, given more time I would also expose errors to the user when it is important they know something has gone wrong or they are able to fix the request.
- Additional work is required around determining if message has been read or not, and how to determine which messages have been received. For the latter I would use the `saved_at` timestamp from the most recent message to fetch older messages.
- Conflicts could occur when catching up if the user was trying to send messages to groups they left in a separate online session, in this case I would show a message to the user asking if they want to rejoin the group or discard the message.
