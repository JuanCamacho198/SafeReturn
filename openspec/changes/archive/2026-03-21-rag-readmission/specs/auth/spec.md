# Auth Specification

## Purpose

Defines local authentication, session management, and access logging for the RAG readmission application. Ensures only authorized users can access patient data and clinical information. All authentication operates entirely offline with credentials stored locally in SQLite.

## Requirements

### Requirement: AUTH-001: Local Account Creation

The system SHALL provide a mechanism for creating a local user account with a username and password. Passwords MUST be hashed using a secure one-way function (bcrypt/argon2) before storage. The system SHALL store accounts in the `auth_users` SQLite table.

#### Scenario: Successful account creation

- GIVEN no existing account with the provided username
- WHEN a user submits a new username and password meeting minimum requirements
- THEN the system SHALL create the account with a hashed password
- AND the system SHALL return a success confirmation
- AND the user record SHALL be stored with a unique ID and creation timestamp

#### Scenario: Account creation with duplicate username

- GIVEN an existing account with username "clinician1"
- WHEN a new user attempts to create an account with the same username
- THEN the system SHALL reject the creation request
- AND the system SHALL return an error indicating username already exists
- AND no new account SHALL be created

### Requirement: AUTH-002: Account Creation Password Strength

Passwords MUST be at least 8 characters long. Passwords SHOULD contain at least one uppercase letter, one lowercase letter, one digit, and one special character. The system SHALL enforce minimum length but SHOULD warn on weak composition.

#### Scenario: Password meets minimum length only

- GIVEN the registration form is open
- WHEN a user enters a password of exactly 8 characters with no special characters
- THEN the system SHALL accept the password
- AND the system SHOULD display a warning about weak password composition
- AND the account SHALL be created

#### Scenario: Password too short

- GIVEN the registration form is open
- WHEN a user enters a password of 7 characters
- THEN the system SHALL reject the password
- AND the system SHALL display an error indicating minimum 8 characters required
- AND no account SHALL be created

### Requirement: AUTH-003: Login Authentication

The system SHALL authenticate users by verifying their username and password against stored hashes. On successful authentication, the system SHALL create a session and return a session token. Sessions MUST expire after a configurable inactivity timeout (default 30 minutes).

#### Scenario: Successful login with valid credentials

- GIVEN an existing account with username "clinician1" and correct password
- WHEN the user enters valid credentials and submits the login form
- THEN the system SHALL verify the password hash matches
- AND the system SHALL create a new session record in `auth_sessions`
- AND the system SHALL return a valid session token
- AND the system SHALL log the successful login in `auth_access_logs`

#### Scenario: Login with incorrect password

- GIVEN an existing account with username "clinician1" and password "correctPassword123"
- WHEN the user enters the correct username but wrong password "wrongPassword456"
- THEN the system SHALL reject the authentication attempt
- AND the system SHALL return an error indicating invalid credentials
- AND the system SHALL log the failed attempt in `auth_access_logs`
- AND no session SHALL be created

### Requirement: AUTH-004: Session Management

The system MUST maintain session state for authenticated users. Each session SHALL have a unique token, an associated user ID, creation timestamp, and last activity timestamp. Sessions with no activity exceeding the inactivity timeout SHALL be automatically invalidated.

#### Scenario: Session remains valid during active use

- GIVEN an authenticated session with last activity timestamp T1
- WHEN the user performs an action (e.g., views a patient) within the inactivity timeout
- THEN the system SHALL update the last activity timestamp to the current time
- AND the session SHALL remain valid
- AND the user SHALL not be prompted to re-authenticate

#### Scenario: Session expires after inactivity

- GIVEN an authenticated session where last activity was more than 30 minutes ago
- WHEN the user attempts any authenticated action
- THEN the system SHALL invalidate the session
- AND the system SHALL return an unauthorized error
- AND the user SHALL be redirected to the login page

### Requirement: AUTH-005: Logout

Authenticated users SHALL be able to terminate their session. The system MUST immediately invalidate the session token upon logout request and log the event.

#### Scenario: Successful logout

- GIVEN an authenticated session with valid token "abc123"
- WHEN the user clicks the logout button
- THEN the system SHALL mark the session as invalidated in the database
- AND the system SHALL log the logout event in `auth_access_logs`
- AND the session token SHALL no longer grant access
- AND the user SHALL be redirected to the login page

#### Scenario: Logout with already-invalid session

- GIVEN a session token that was previously invalidated
- WHEN the user attempts to logout with that token
- THEN the system SHALL return a success response (idempotent operation)
- AND no error SHALL be returned to the client

### Requirement: AUTH-006: Access Logging

The system MUST log all authentication-related events including login attempts (success and failure), logout events, and session expirations. Logs MUST include user ID (or null for unknown), event type, IP address (127.0.0.1 for local), timestamp, and success/failure indicator. Access logs SHALL be stored in `auth_access_logs` SQLite table and SHALL be append-only.

#### Scenario: Failed login logged correctly

- GIVEN an attacker attempts to log in with wrong password
- WHEN the authentication fails
- THEN the system SHALL write a log entry with event type "login_failed"
- AND the log SHALL include the attempted username (even if not found)
- AND the log SHALL include the timestamp and source address

#### Scenario: Session timeout logged correctly

- GIVEN an authenticated session that expires due to inactivity
- WHEN the timeout occurs and the user next attempts an action
- THEN the system SHALL log a "session_expired" event before returning the unauthorized error
- AND the log SHALL include the user ID of the expired session

### Requirement: AUTH-007: Password Change

Authenticated users SHALL be able to change their password. The system MUST verify the current password before accepting the new password. The new password MUST meet the same strength requirements as initial creation.

#### Scenario: Password changed successfully

- GIVEN an authenticated user with current password "oldPass123"
- WHEN the user submits current password "oldPass123" and new password "newPass456!"
- THEN the system SHALL verify current password is correct
- AND the system SHALL update the stored hash to the new password
- AND the system SHALL return a success confirmation

#### Scenario: Password change with incorrect current password

- GIVEN an authenticated user with current password "oldPass123"
- WHEN the user submits current password "wrongPass999" and new password "newPass456!"
- THEN the system SHALL reject the request
- AND the system SHALL return an error indicating current password is incorrect
- AND the stored password SHALL remain unchanged

### Requirement: AUTH-008: Protected Routes

All routes that display patient data, risk scores, or clinical notes MUST require a valid authenticated session. Unauthenticated requests to protected routes SHALL be rejected with HTTP 401 and the user redirected to the login page.

#### Scenario: Protected route accessed with valid session

- GIVEN an authenticated session with valid token
- WHEN the user navigates to the patient dashboard at `/patients`
- THEN the system SHALL validate the session token
- AND the patient list SHALL be displayed
- AND no redirect SHALL occur

#### Scenario: Protected route accessed without session

- GIVEN no active session token
- WHEN the user attempts to access `/patients`
- THEN the system SHALL return HTTP 401
- AND the user SHALL be redirected to `/login`
