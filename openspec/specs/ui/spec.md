# UI Specification

## Purpose

Defines the user interface components and user experience for the RAG readmission application. Covers the dashboard, patient list, risk score visualization, and clinical fragment display. Built with Svelte for the frontend.

## Requirements

### Requirement: UI-001: Application Layout

The application MUST provide a consistent layout with: a top navigation bar showing application name and user menu, a sidebar with navigation links (Dashboard, Patients, Export), and a main content area. The layout SHALL be responsive and work on screens 1024px wide and larger.

#### Scenario: Navigation bar displays correctly

- GIVEN the application is loaded
- WHEN the page renders
- THEN the top navigation bar SHALL show "Readmission Risk" application title
- AND the navigation bar SHALL include the logged-in username and logout button
- AND the sidebar SHALL show Dashboard, Patients, and Export links

#### Scenario: Sidebar navigation works

- GIVEN the user is on the Dashboard page
- WHEN the user clicks "Patients" in the sidebar
- THEN the application SHALL navigate to the Patients list view
- AND the Patients link SHALL be highlighted as active

### Requirement: UI-002: Login Page

The application MUST provide a login page at the root URL ("/") when not authenticated. The login page SHALL include: username input field, password input field, login button, and a link to registration. The page SHALL display validation errors inline below the relevant fields.

#### Scenario: Login page renders for unauthenticated user

- GIVEN the user is not authenticated
- WHEN the user navigates to the application root URL
- THEN the login page SHALL be displayed
- AND the page SHALL include username and password fields
- AND no patient data SHALL be visible

#### Scenario: Login validation errors displayed

- GIVEN the user enters invalid credentials and clicks login
- WHEN the authentication fails
- THEN the page SHALL display "Invalid username or password" below the form
- AND the form SHALL remain populated with the username (not password)
- AND the user SHALL be able to retry without re-entering username

### Requirement: UI-003: Registration Page

The application MUST provide a registration page accessible from the login page. The registration form SHALL include: username field, password field, confirm password field, and register button. Password strength indicators SHALL be displayed as the user types.

#### Scenario: Registration form with password strength indicator

- GIVEN the registration page is displayed
- WHEN the user types "weak"
- THEN a password strength indicator SHALL show "Weak" in red
- AND the register button SHALL be disabled

#### Scenario: Successful registration redirects to login

- GIVEN the registration form is filled with valid data
- WHEN the user clicks register
- THEN the system SHALL create the account
- AND the user SHALL be redirected to the login page
- AND a success message SHALL be displayed: "Account created. Please log in."

### Requirement: UI-004: Patient Dashboard

The dashboard SHALL display a summary overview including: total patient count, risk distribution chart (low/medium/high bars), and a list of the 5 highest-risk patients. The dashboard SHALL auto-refresh every 60 seconds when visible.

#### Scenario: Dashboard displays risk distribution

- GIVEN 100 patients with various risk levels
- WHEN the dashboard loads
- THEN a bar chart SHALL show counts of low, medium, and high risk patients
- AND the chart SHALL be color-coded (green/yellow/red)
- AND the chart SHALL update when patient data changes

#### Scenario: Top 5 high-risk patients listed

- GIVEN patients with risk scores exist
- WHEN the dashboard loads
- THEN a list SHALL show the 5 patients with highest risk_score
- AND each entry SHALL show patient name, risk level badge, and risk score

### Requirement: UI-005: Patient List View

The patient list SHALL display patients in a table with columns: Name, Admission Date, Diagnosis, Risk Score, Risk Level. Each row SHALL be clickable to navigate to the patient detail view. The list SHALL support client-side search by name and server-side filtering by diagnosis.

#### Scenario: Patient list with search

- GIVEN 50 patients in the database
- WHEN the user types "john" in the search box
- THEN only patients with "john" in first or last name SHALL be displayed
- AND the list SHALL update as the user types (debounced 300ms)

#### Scenario: Risk level color coding in list

- GIVEN patients with various risk levels
- WHEN the patient list renders
- THEN high risk SHALL display with red background/badge
- AND medium risk SHALL display with yellow background/badge
- AND low risk SHALL display with green background/badge

### Requirement: UI-006: Patient Detail View

The patient detail view SHALL display: patient demographics, clinical notes list, current risk assessment, and retrieved fragments that informed the risk score. The risk score SHALL be displayed prominently with a gauge/meter visualization.

#### Scenario: Risk score gauge display

- GIVEN a patient with risk_score of 0.75
- WHEN the patient detail view renders
- THEN a gauge SHALL display showing 75% filled
- AND the gauge SHALL be colored red for high risk
- AND the numeric score "0.75 (75%)" SHALL be displayed

#### Scenario: Retrieved fragments section

- GIVEN a patient with retrieved fragments from RAG query
- WHEN the patient detail view renders
- THEN a section SHALL display each retrieved fragment
- AND each fragment SHALL show note_type, note_date, preview text, and similarity score
- AND fragments with query terms highlighted SHALL be displayed

### Requirement: UI-007: Fragment Expansion

Retrieved fragments SHALL be expandable to show full note text. Clicking a fragment SHALL toggle between collapsed (preview) and expanded (full text) states. An indicator SHALL show which fragments were used for risk scoring.

#### Scenario: Fragment collapsed by default

- GIVEN a patient detail view with retrieved fragments
- WHEN the page loads
- THEN all fragments SHALL display in collapsed state
- AND each SHALL show first 200 characters with "..." truncation
- AND a "Show more" button SHALL be visible

#### Scenario: Fragment expanded on click

- GIVEN a fragment is displayed in collapsed state
- WHEN the user clicks "Show more" on that fragment
- THEN the fragment SHALL expand to show full note text
- AND the button SHALL change to "Show less"
- AND clicking SHALL collapse the fragment

### Requirement: UI-008: Loading States

All data-fetching operations SHALL show a loading indicator (spinner or skeleton) during the request. Loading states SHALL be displayed within the relevant UI section, not covering the entire page. Error states SHALL display a message with a retry button.

#### Scenario: Patient list loading state

- GIVEN the patient list page is navigated to
- WHEN the patient data is being fetched
- THEN skeleton rows SHALL be displayed in place of patient rows
- AND the skeleton SHALL have 10 placeholder rows with shimmer animation

#### Scenario: Error state with retry

- GIVEN the patient list fetch fails due to server error
- WHEN the error is received
- THEN an error message SHALL be displayed: "Failed to load patients"
- AND a "Retry" button SHALL be displayed
- AND clicking retry SHALL re-fetch the patient list

### Requirement: UI-009: Export Interface

The UI SHALL provide export functionality accessible from the sidebar. The export page SHALL offer format selection (CSV or JSON), patient selection (all or filtered), and include/exclude options for data fields. Export SHALL trigger a file download.

#### Scenario: Export page format selection

- GIVEN the user navigates to the Export page
- WHEN the page loads
- THEN radio buttons SHALL allow selection of "CSV" or "JSON" format
- AND checkbox options SHALL allow selecting which fields to include
- AND a "Download" button SHALL be displayed

#### Scenario: Export generates and downloads file

- GIVEN the Export page is configured with CSV format and "All patients" selected
- WHEN the user clicks "Download"
- THEN the system SHALL generate a CSV file
- AND the browser SHALL download the file as "patients_export_YYYYMMDD.csv"

### Requirement: UI-010: Offline Indicator

The application SHALL display a connectivity status indicator. Since the application is fully offline, the indicator SHALL always show "Offline Mode" with a persistent badge. The indicator SHALL be in the top navigation bar.

#### Scenario: Offline indicator always visible

- GIVEN the application is running
- WHEN any page is displayed
- THEN an offline indicator badge SHALL be visible in the navigation bar
- AND the badge SHALL display "Offline Mode"
- AND the badge SHALL be colored blue/gray to indicate local operation

### Requirement: UI-011: Session Timeout Warning

When an authenticated session is within 2 minutes of expiration due to inactivity, the system SHALL display a warning modal. The modal SHALL show remaining time and offer "Stay Logged In" and "Logout" buttons. Clicking "Stay Logged In" SHALL refresh the session.

#### Scenario: Session timeout warning appears

- GIVEN an authenticated session with less than 2 minutes until expiration
- WHEN the user interacts with the application
- THEN a modal SHALL appear with "Session expiring in X minutes"
- AND "Stay Logged In" and "Logout" buttons SHALL be displayed

#### Scenario: Stay logged in refreshes session

- GIVEN the session timeout warning modal is displayed
- WHEN the user clicks "Stay Logged In"
- THEN the session SHALL be refreshed with a new timeout
- AND the modal SHALL close
- AND the user SHALL continue without interruption
