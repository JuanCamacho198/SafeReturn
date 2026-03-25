# Proposal: enrich-patient-data

## Intent

The current patient detail view is limited to basic demographics and encounters, while the underlying synthetic data contains rich clinical information like medications, lab results, and outcomes. This change aims to surface this valuable data to the user, providing a more complete clinical picture. Additionally, the current name generation is limited and lacks diversity, which we will address to create a more realistic user experience.

## Scope

### In Scope
- Update `Patient` interface in `src/lib/types/ipc.ts` to include `medications`, `lab_results`, and `outcomes`.
- Update `getPatient` function in `src/lib/api/client.ts` to map these fields from `synthetic_patients.json`.
- Expand `firstNames` and `lastNames` arrays in `src/lib/api/client.ts` to include at least 50 names each, representing diverse nationalities (Hispanic, Asian, African, etc.).
- Update `src/routes/patients/[id]/+page.svelte` to display:
  - Medications list (Name, Dosage, Frequency, Route).
  - Lab Results table (Panel, Value, Unit, Ref Range, Flag).
  - Outcomes section (Readmission status, Days to readmission, Discharge disposition).

### Out of Scope
- Modifying the backend (Rust) implementation.
- Editing the `synthetic_patients.json` file content.
- Implementing write/update functionality for these new fields.

## Approach

1. **Type Definitions**: Extend the `Patient` interface in `ipc.ts` to reflect the structure of the synthetic data. Define new interfaces for `Medication`, `LabResult`, and `Outcome`.
2. **Data Mapping**: in `client.ts`, update the `getPatient` fallback logic to extract and map the additional fields from the JSON source to the new `Patient` properties.
3. **Name Generation**: Replace the small name arrays in `client.ts` with a larger, curated list of diverse names.
4. **UI Implementation**: In `+page.svelte`, add new sections below the "Clinical History" section. Use existing Tailwind CSS patterns (cards, tables, badges) to ensure design consistency.
   - **Medications**: A list or grid of cards.
   - **Lab Results**: A clean table with conditional formatting for "abnormal" flags.
   - **Outcomes**: A summary card or integrated into the header/demographics if appropriate, but likely a separate "Outcome Analysis" section.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/types/ipc.ts` | Modified | Add `Medication`, `LabResult`, `Outcome` interfaces and update `Patient`. |
| `src/lib/api/client.ts` | Modified | Update `getPatient` mapping logic and expand name arrays. |
| `src/routes/patients/[id]/+page.svelte` | Modified | Add UI sections for medications, labs, and outcomes. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| UI Clutter | Medium | Use clear section headers, consistent spacing, and perhaps collapsible sections if data is extensive. |
| Missing Data | Low | Use optional chaining and default values/ "N/A" placeholders for missing fields in synthetic data. |
| Build Errors | Low | Ensure all new types are correctly exported and imported. |

## Rollback Plan

Revert changes to `src/lib/types/ipc.ts`, `src/lib/api/client.ts`, and `src/routes/patients/[id]/+page.svelte` to their previous state.

## Dependencies

- None.

## Success Criteria

- [ ] `Patient` interface includes `medications`, `lab_results`, and `outcomes`.
- [ ] Patient detail page displays a list of medications.
- [ ] Patient detail page displays a table of lab results.
- [ ] Patient detail page shows outcome information (e.g., readmission risk).
- [ ] Generated patient names reflect a diverse set of nationalities.
- [ ] Application builds and runs without errors.