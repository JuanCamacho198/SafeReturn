# Spec: enrich-patient-data

## Summary
Enhance patient detail view with comprehensive clinical data (medications, labs, outcomes) and diversify synthetic patient identities.

## New Type Definitions

### Medication Interface
```typescript
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
}
```

### LabResult Interface
```typescript
export interface LabResult {
  name: string;
  value: number;
  unit: string;
  reference_range: [number, number];
  flag: 'normal' | 'high' | 'low';
  panel: string;
}
```

### Outcome Interface
```typescript
export interface Outcome {
  readmitted: boolean;
  days_to_readmission: number | null;
  discharge_disposition: string;
}
```

### Updated Patient Interface (ipc.ts)
```typescript
export interface Patient {
  // Existing fields...
  id: string;
  mrn?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  age?: number;
  gender?: string;
  condition?: string;
  riskScore?: number;
  encounters?: Encounter[];
  diagnoses?: any[];
  
  // NEW FIELDS
  medications?: Medication[];
  lab_results?: LabResult[];
  outcomes?: Outcome;
}
```

## Data Mapping (client.ts)

### Name Generation Logic
```typescript
// Map ethnicity to appropriate name arrays
const ethnicityNames: Record<string, { first: string[], last: string[] }> = {
  'Hispanic': { first: ['Carlos', 'Maria', 'Juan', 'Ana', ...], last: ['Garcia', 'Rodriguez', 'Martinez', ...] },
  'Asian': { first: ['Wei', 'Yuki', 'Raj', 'Priya', ...], last: ['Chen', 'Tanaka', 'Patel', ...] },
  'African': { first: ['Kwame', 'Amara', 'DeShawn', 'LaToya', ...], last: ['Okonkwo', 'Mensah', 'Johnson', ...] },
  // Fallback to diverse mixed names
};

// Generate name based on ethnicity in demographics
const ethnicity = patient.demographics?.ethnicity || 'Other';
const { firstName, lastName } = getNameFromEthnicity(ethnicity, index);
```

### Field Mapping in getPatient Fallback
```typescript
return {
  // ... existing fields ...
  
  // NEW: Map medications, lab_results, outcomes directly
  medications: patient.medications || [],
  lab_results: patient.lab_results || [],
  outcomes: patient.outcomes || null
};
```

## UI Implementation (patient detail page)

### Medications Section
- Display below "Clinical History" section
- Grid layout with medication cards
- Each card shows: Name (bold), Dosage, Frequency, Route (as badge)
- Color: Use slate/gray theme matching existing UI

### Lab Results Section
- Table format with columns: Test Name | Value | Reference Range | Flag
- Conditional styling:
  - "normal" flag: green text
  - "high"/"low" flag: red text with warning badge
- Grouped by panel (BMP, CBC, LFT, Special)
- Collapsible panels for long lists

### Outcomes Section
- Card format at the top or with demographics
- Display: Readmission status (Yes/No badge), Discharge disposition
- If readmitted: show days to readmission

## Acceptance Criteria

1. Patient interface has medications, lab_results, outcomes fields
2. Patient detail page shows medications list
3. Patient detail page shows lab results table with proper formatting
4. Patient detail page shows outcomes (readmission, discharge)
5. Names are diverse (at least 50 first + 50 last names)
6. Names match ethnicity from demographics when possible
7. App builds without errors
8. Fallback mode shows complete data from synthetic_patients.json