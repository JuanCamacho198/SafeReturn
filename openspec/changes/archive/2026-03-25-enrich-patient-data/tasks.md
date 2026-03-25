# Tasks: enrich-patient-data

## Task List

### Phase 1: Type Definitions
- [ ] **1.1** Update `src/lib/types/ipc.ts` - Add `Medication` interface
- [ ] **1.2** Update `src/lib/types/ipc.ts` - Add `LabResult` interface  
- [ ] **1.3** Update `src/lib/types/ipc.ts` - Add `Outcome` interface
- [ ] **1.4** Update `src/lib/types/ipc.ts` - Add medications, lab_results, outcomes to Patient interface

### Phase 2: Data Mapping
- [ ] **2.1** Expand firstNames array in `client.ts` (add 50+ names, diverse ethnicities)
- [ ] **2.2** Expand lastNames array in `client.ts` (add 50+ names, diverse ethnicities)
- [ ] **2.3** Create ethnicity-based name mapping function in `client.ts`
- [ ] **2.4** Update `getPatient` fallback to map medications, lab_results, outcomes

### Phase 3: UI Implementation
- [ ] **3.1** Add Medications section to patient detail page (cards grid)
- [ ] **3.2** Add Lab Results section to patient detail page (table with flags)
- [ ] **3.3** Add Outcomes section to patient detail page (badge + disposition)

### Phase 4: Verification
- [ ] **4.1** Build application - verify no TypeScript errors
- [ ] **4.2** Test patient detail page displays all new sections correctly

---

## Implementation Order

1. **1.1-1.4**: Update ipc.ts types first (foundation)
2. **2.1-2.4**: Update client.ts (data layer)  
3. **3.1-3.3**: Update patient detail page (UI)
4. **4.1-4.2**: Verify everything works