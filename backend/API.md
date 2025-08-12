# Phoenix Tracker API

Base URL: http://localhost:3001/api
- Replace 3001 with your backend PORT if different.
- All endpoints (except /auth/* and /ws) require a valid Bearer token in Authorization header.
- For many project-scoped endpoints, your token should include a selected project_id. If not selected, some endpoints return 400 Bad Request or empty lists. Obtain a project-scoped token via POST /auth/switch-project and use the returned token for subsequent calls.

Authorization header format
- Authorization: Bearer <JWT>

WebSocket
- ws://localhost:3001/ws?token=Bearer%20<JWT>


Auth
1) POST /auth/register
- Body: { "name": "string", "email": "string" }
- Returns: { user_id, token, expires_at, project_id: null }
- Example:
  curl -X POST http://localhost:3001/api/auth/register \
    -H 'Content-Type: application/json' \
    -d '{"name":"Alice","email":"alice@example.com"}'

2) POST /auth/login
- Body: { "email": "string" }
- Returns: { user_id, token, expires_at, project_id: null }
- Example:
  curl -X POST http://localhost:3001/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"alice@example.com"}'

3) POST /auth/logout
- Body: {}
- Effect: Stateless (client should discard token)
- Example:
  curl -X POST http://localhost:3001/api/auth/logout \
    -H 'Authorization: Bearer <JWT>' \
    -H 'Content-Type: application/json' \
    -d '{}'

4) POST /auth/switch-project
- Body: { "projectId": number }
- Returns: { user_id, token, expires_at, project_id }
- Example:
  curl -X POST http://localhost:3001/api/auth/switch-project \
    -H 'Authorization: Bearer <JWT-without-or-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"projectId": 123}'


Users
Note: Routes under /users require auth; project is not required for creating/fetching a user by id/email, but some list operations are project-scoped.

1) POST /users
- Body: { "name": "string", "email": "string" }
- Returns: created user
- Example:
  curl -X POST http://localhost:3001/api/users \
    -H 'Authorization: Bearer <JWT>' \
    -H 'Content-Type: application/json' \
    -d '{"name":"Bob","email":"bob@example.com"}'

2) GET /users
- Returns: users in selected project; empty array if no project selected
- Example:
  curl http://localhost:3001/api/users \
    -H 'Authorization: Bearer <JWT>'

3) GET /users/:id
- Returns: user by id
- Example:
  curl http://localhost:3001/api/users/42 \
    -H 'Authorization: Bearer <JWT>'

4) PUT /users/:id
- Body: { "name"?: "string", "email"?: "string" }
- Example:
  curl -X PUT http://localhost:3001/api/users/42 \
    -H 'Authorization: Bearer <JWT>' \
    -H 'Content-Type: application/json' \
    -d '{"name":"Robert"}'

5) DELETE /users/:id
- Example:
  curl -X DELETE http://localhost:3001/api/users/42 \
    -H 'Authorization: Bearer <JWT>'

6) GET /users/by-email?email=alice@example.com
- Example:
  curl 'http://localhost:3001/api/users/by-email?email=alice%40example.com' \
    -H 'Authorization: Bearer <JWT>'

7) POST /users/invite
- Body: { "email": "string" }
- Requires: requester must be project owner (project selected)
- Example:
  curl -X POST http://localhost:3001/api/users/invite \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"email":"teammate@example.com"}'

8) DELETE /users/:id/remove
- Removes a user from the current project; requires owner
- Example:
  curl -X DELETE http://localhost:3001/api/users/42/remove \
    -H 'Authorization: Bearer <JWT-with-project>'


Projects
Note: Auth required; project selection not required to create or list own projects.

1) POST /projects
- Body: { "name": "string" }
- Creates a project and associates the current user
- Example:
  curl -X POST http://localhost:3001/api/projects \
    -H 'Authorization: Bearer <JWT>' \
    -H 'Content-Type: application/json' \
    -d '{"name":"Demo Project"}'

2) GET /projects/:id
- Example:
  curl http://localhost:3001/api/projects/123 \
    -H 'Authorization: Bearer <JWT>'

3) PUT /projects/:id
- Body: { "name"?: "string", "ownerId"?: number }
- Example:
  curl -X PUT http://localhost:3001/api/projects/123 \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"name":"Renamed Project"}'

4) DELETE /projects/:id
- Example:
  curl -X DELETE http://localhost:3001/api/projects/123 \
    -H 'Authorization: Bearer <JWT-with-project>'

5) GET /projects/user/me
- Returns: projects for the current user
- Example:
  curl http://localhost:3001/api/projects/user/me \
    -H 'Authorization: Bearer <JWT>'

6) POST /projects/:id/user
- Select project context (server returns project details). For token-scoped selection use /auth/switch-project.
- Example:
  curl -X POST http://localhost:3001/api/projects/123/user \
    -H 'Authorization: Bearer <JWT>'


Issues
Note: Most issue routes require a selected project. Some return empty lists if no project selected.

1) POST /issues
- Body: {
    "title": "string",
    "description"?: "string",
    "priority": number,
    "points"?: number|null,
    "isIcebox": boolean,
    "workType": number,
    "targetReleaseAt"?: ISO8601 timestamp
  }
- Example:
  curl -X POST http://localhost:3001/api/issues \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"title":"Bug","description":"Details","priority":1,"points":3,"isIcebox":false,"workType":0}'

2) GET /issues
- Backlog issues for current project
- Example:
  curl http://localhost:3001/api/issues \
    -H 'Authorization: Bearer <JWT-with-project>'

3) GET /issues/:id
- Example:
  curl http://localhost:3001/api/issues/55 \
    -H 'Authorization: Bearer <JWT-with-project>'

4) PUT /issues/:id
- Body (all optional): {
    "title"?: "string",
    "description"?: "string",
    "priority"?: number,
    "points"?: number|null,
    "status"?: number,
    "isIcebox"?: boolean,
    "workType"?: number,
    "targetReleaseAt"?: ISO8601 timestamp
  }
- Example:
  curl -X PUT http://localhost:3001/api/issues/55 \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"status":2,"isIcebox":false}'

5) PUT /issues/:id/start | finish | deliver | accept | reject
- Example (start):
  curl -X PUT http://localhost:3001/api/issues/55/start \
    -H 'Authorization: Bearer <JWT-with-project>'

6) DELETE /issues/:id
- Example:
  curl -X DELETE http://localhost:3001/api/issues/55 \
    -H 'Authorization: Bearer <JWT-with-project>'

7) PUT /issues/bulk-priority
- Body: { "issuePriorities": [[issueId, newPriority], ...] }
- Example:
  curl -X PUT http://localhost:3001/api/issues/bulk-priority \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"issuePriorities":[[55,1],[56,2]]}'

8) GET /issues/me
- Issues assigned to current user in selected project
- Example:
  curl http://localhost:3001/api/issues/me \
    -H 'Authorization: Bearer <JWT-with-project>'

9) GET /issues/tag/:id
- Issues by tag id
- Example:
  curl http://localhost:3001/api/issues/tag/7 \
    -H 'Authorization: Bearer <JWT-with-project>'

10) GET /issues/accepted
- Example:
  curl http://localhost:3001/api/issues/accepted \
    -H 'Authorization: Bearer <JWT-with-project>'

11) GET /issues/icebox
- Example:
  curl http://localhost:3001/api/issues/icebox \
    -H 'Authorization: Bearer <JWT-with-project>'

12) GET /issues/weekly-points-average
- Example:
  curl http://localhost:3001/api/issues/weekly-points-average \
    -H 'Authorization: Bearer <JWT-with-project>'

13) GET /issues/user/:id
- Issues for a given user id in selected project (empty if none selected)
- Example:
  curl http://localhost:3001/api/issues/user/42 \
    -H 'Authorization: Bearer <JWT-with-project>'


Tasks
1) POST /tasks
- Body: { "title": "string", "issueId": number, "completed": boolean, "percent": number }
- Example:
  curl -X POST http://localhost:3001/api/tasks \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"title":"Do thing","issueId":55,"completed":false,"percent":0}'

2) GET /tasks/:id
- Example:
  curl http://localhost:3001/api/tasks/77 \
    -H 'Authorization: Bearer <JWT-with-project>'

3) GET /tasks/issue/:id
- Example:
  curl http://localhost:3001/api/tasks/issue/55 \
    -H 'Authorization: Bearer <JWT-with-project>'

4) PUT /tasks/:id
- Body: { "title"?: "string", "completed"?: boolean, "percent"?: number }
- Example:
  curl -X PUT http://localhost:3001/api/tasks/77 \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"completed":true,"percent":100}'

5) DELETE /tasks/:id
- Example:
  curl -X DELETE http://localhost:3001/api/tasks/77 \
    -H 'Authorization: Bearer <JWT-with-project>'


Comments
1) POST /comments
- Body: { "content": "string", "issueId": number }
- Example:
  curl -X POST http://localhost:3001/api/comments \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"content":"Looks good","issueId":55}'

2) GET /comments/:id
- Example:
  curl http://localhost:3001/api/comments/12 \
    -H 'Authorization: Bearer <JWT-with-project>'

3) GET /comments/issue/:id
- Example:
  curl http://localhost:3001/api/comments/issue/55 \
    -H 'Authorization: Bearer <JWT-with-project>'

4) GET /comments/user/:id
- Example:
  curl http://localhost:3001/api/comments/user/42 \
    -H 'Authorization: Bearer <JWT-with-project>'

5) PUT /comments/:id
- Body: { "content": "string" }
- Example:
  curl -X PUT http://localhost:3001/api/comments/12 \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"content":"Updated"}'

6) DELETE /comments/:id
- Example:
  curl -X DELETE http://localhost:3001/api/comments/12 \
    -H 'Authorization: Bearer <JWT-with-project>'


Tags
1) POST /tags
- Body: { "name": "string", "isEpic": boolean }
- Example:
  curl -X POST http://localhost:3001/api/tags \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"name":"UI","isEpic":false}'

2) GET /tags
- Example:
  curl http://localhost:3001/api/tags \
    -H 'Authorization: Bearer <JWT-with-project>'

3) GET /tags/counts
- Example:
  curl http://localhost:3001/api/tags/counts \
    -H 'Authorization: Bearer <JWT-with-project>'

4) GET /tags/:id
- Example:
  curl http://localhost:3001/api/tags/7 \
    -H 'Authorization: Bearer <JWT-with-project>'

5) PUT /tags/:id
- Body: { "name"?: "string", "isEpic"?: boolean }
- Example:
  curl -X PUT http://localhost:3001/api/tags/7 \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"name":"UX"}'

6) DELETE /tags/:id
- Example:
  curl -X DELETE http://localhost:3001/api/tags/7 \
    -H 'Authorization: Bearer <JWT-with-project>'


Issue Tags
1) POST /issue-tags
- Body: { "issueId": number, "tagId": number }
- Example:
  curl -X POST http://localhost:3001/api/issue-tags \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"issueId":55,"tagId":7}'

2) GET /issue-tags/issue/:id
- Example:
  curl http://localhost:3001/api/issue-tags/issue/55 \
    -H 'Authorization: Bearer <JWT-with-project>'

3) GET /issue-tags/tag/:id
- Example:
  curl http://localhost:3001/api/issue-tags/tag/7 \
    -H 'Authorization: Bearer <JWT-with-project>'

4) DELETE /issue-tags/:issue_id/:tag_id
- Example:
  curl -X DELETE http://localhost:3001/api/issue-tags/55/7 \
    -H 'Authorization: Bearer <JWT-with-project>'


Issue Assignees
1) POST /issue-assignees
- Body: { "issueId": number, "userId": number }
- Example:
  curl -X POST http://localhost:3001/api/issue-assignees \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"issueId":55,"userId":42}'

2) GET /issue-assignees/issue/:id
- Example:
  curl http://localhost:3001/api/issue-assignees/issue/55 \
    -H 'Authorization: Bearer <JWT-with-project>'

3) GET /issue-assignees/user/:id
- Example:
  curl http://localhost:3001/api/issue-assignees/user/42 \
    -H 'Authorization: Bearer <JWT-with-project>'

4) DELETE /issue-assignees/:issue_id/:user_id
- Example:
  curl -X DELETE http://localhost:3001/api/issue-assignees/55/42 \
    -H 'Authorization: Bearer <JWT-with-project>'


Blockers
1) POST /blockers
- Body: { "blockerId": number, "blockedId": number }
- Example:
  curl -X POST http://localhost:3001/api/blockers \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"blockerId":1,"blockedId":2}'

2) GET /blockers/blocker/:id
- Example:
  curl http://localhost:3001/api/blockers/blocker/1 \
    -H 'Authorization: Bearer <JWT-with-project>'

3) GET /blockers/blocked/:id
- Example:
  curl http://localhost:3001/api/blockers/blocked/2 \
    -H 'Authorization: Bearer <JWT-with-project>'

4) DELETE /blockers/:blocker_id/:blocked_id
- Example:
  curl -X DELETE http://localhost:3001/api/blockers/1/2 \
    -H 'Authorization: Bearer <JWT-with-project>'


Notifications
1) GET /notifications
- Query (optional): cursorCreatedAt (ISO8601), cursorId (number)
- Example:
  curl 'http://localhost:3001/api/notifications' \
    -H 'Authorization: Bearer <JWT-with-project>'

2) PUT /notifications/:id/read
- Example:
  curl -X PUT http://localhost:3001/api/notifications/99/read \
    -H 'Authorization: Bearer <JWT-with-project>'

3) GET /notifications/count
- Returns 0 when no project selected
- Example:
  curl http://localhost:3001/api/notifications/count \
    -H 'Authorization: Bearer <JWT>'


Project Notes
1) POST /project-notes
- Body: { "title": "string", "detail": "string" }
- Example:
  curl -X POST http://localhost:3001/api/project-notes \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"title":"Note","detail":"Some detail"}'

2) GET /project-notes/:id
- Example:
  curl http://localhost:3001/api/project-notes/5 \
    -H 'Authorization: Bearer <JWT-with-project>'

3) GET /project-notes/project
- Get the project note(s) for current project
- Example:
  curl http://localhost:3001/api/project-notes/project \
    -H 'Authorization: Bearer <JWT-with-project>'

4) PUT /project-notes/:id
- Body: { "title"?: "string", "detail"?: "string" }
- Example:
  curl -X PUT http://localhost:3001/api/project-notes/5 \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"detail":"Updated"}'

5) DELETE /project-notes/:id
- Example:
  curl -X DELETE http://localhost:3001/api/project-notes/5 \
    -H 'Authorization: Bearer <JWT-with-project>'


Import/Export
1) GET /export
- Exports all data as JSON
- Example:
  curl http://localhost:3001/api/export \
    -H 'Authorization: Bearer <JWT-with-project>'

2) POST /import
- Body: JSON object of arrays keyed by table/entity
- Example:
  curl -X POST http://localhost:3001/api/import \
    -H 'Authorization: Bearer <JWT-with-project>' \
    -H 'Content-Type: application/json' \
    -d '{"users":[],"projects":[]}'


History
1) GET /history/issue/:id
- Example:
  curl http://localhost:3001/api/history/issue/55 \
    -H 'Authorization: Bearer <JWT-with-project>'


WebSocket
- Path: /ws
- Query: token=Bearer <JWT> (URL-encode the space as %20)
- Example (wscat):
  wscat -c 'ws://localhost:3001/ws?token=Bearer%20<JWT>'

- Commands (JSON text frames):
  {"command":"subscribe","project_id":123}
  {"command":"unsubscribe","project_id":123}

Notes
- JSON field names in requests use camelCase as indicated by serde(rename_all = "camelCase").
- Many endpoints require a project to be selected. Use /auth/switch-project to receive a token bound to a project_id.
- Some list endpoints return empty when no project is selected instead of 400.

