"""Clinical Note Templates

Defines templates for SOAP, H&P, and discharge summary notes
with fill points for diagnosis, medications, and lab results.
"""

from typing import Final

SOAP_TEMPLATE = """Subjective:
Patient presents with {chief_complaint}. Reports {symptoms}. Denies {negative_symptoms}. 
Pain level reported as {pain_level}/10.

Objective:
Vital Signs: {vitals}
Physical Exam: {physical_exam}
Labs: {labs_summary}

Assessment:
{assessment_text}

Plan:
{plan_text}
Medications: {medications}
Follow-up: {follow_up}
"""

HANDP_TEMPLATE = """HISTORY OF PRESENT ILLNESS
{chief_complaint}
{history_detail}

PAST MEDICAL HISTORY
{past_medical_history}

MEDICATIONS
{medications_list}

ALLERGIES
{allergies}

FAMILY HISTORY
{family_history}

SOCIAL HISTORY
{social_history}

REVIEW OF SYSTEMS
{review_of_systems}

PHYSICAL EXAMINATION
Vitals: {vitals}
General: {general_exam}
CV: {cv_exam}
Pulmonary: {pulm_exam}
Abdomen: {abdomen_exam}
Neuro: {neuro_exam}
Ext: {extremity_exam}

ASSESSMENT AND PLAN
Primary Diagnosis: {primary_diagnosis}
Secondary Diagnoses: {secondary_diagnoses}

{assessment_detail}

Plan:
{plan_detail}
"""

DISCHARGE_TEMPLATE = """DISCHARGE SUMMARY

Patient: {patient_name}
DOB: {dob}
MRN: {mrn}
Admission Date: {admission_date}
Discharge Date: {discharge_date}

PRINCIPAL DIAGNOSIS
{principal_diagnosis}

SECONDARY DIAGNOSES
{secondary_diagnoses}

HOSPITAL COURSE
{hospital_course}

DISCHARGE MEDICATIONS
{medications}

LABORATORY RESULTS
{labs}

DISCHARGE INSTRUCTIONS
{discharge_instructions}

FOLLOW-UP
{follow_up}

DISCHARGE CONDITION
{discharge_condition}
"""

PROGRESS_TEMPLATE = """DAILY PROGRESS NOTE - {date}

S: {subjective}
O: {objective}

Labs: {labs}
Vitals: {vitals}

A: {assessment}
P: {plan}

Code Status: {code_status}
Activity: {activity}
Diet: {diet}
"""

CONSULT_TEMPLATE = """CONSULTATION NOTE

Referring Physician: {referring_md}
Consult Date: {consult_date}
Patient: {patient_name}

REASON FOR CONSULTATION
{reason}

HISTORY OF PRESENT ILLNESS
{history}

PAST MEDICAL/SURGICAL HISTORY
{history_detail}

CURRENT MEDICATIONS
{medications}

REVIEW OF SYSTEMS
{review_of_systems}

PHYSICAL EXAMINATION
{physical_exam}

DIAGNOSTIC DATA
{diagnostic_data}

ASSESSMENT AND RECOMMENDATIONS
{assessment}

{recommendations}

Thank you for this consultation.

{consulting_physician}
{consult_date}
"""

NOTE_TEMPLATES: Final[dict] = {
    "SOAP": {
        "template": SOAP_TEMPLATE,
        "description": "Subjective-Objective-Assessment-Plan note for daily rounds",
        "typical_length": "medium",
        "requires": [
            "chief_complaint",
            "symptoms",
            "vitals",
            "labs",
            "assessment",
            "plan",
        ],
    },
    "H&P": {
        "template": HANDP_TEMPLATE,
        "description": "Comprehensive History and Physical for admission",
        "typical_length": "long",
        "requires": [
            "chief_complaint",
            "history_detail",
            "past_medical_history",
            "medications_list",
            "vitals",
            "primary_diagnosis",
            "assessment_detail",
            "plan_detail",
        ],
    },
    "Discharge": {
        "template": DISCHARGE_TEMPLATE,
        "description": "Discharge summary with hospital course and instructions",
        "typical_length": "long",
        "requires": [
            "patient_name",
            "dob",
            "mrn",
            "admission_date",
            "discharge_date",
            "principal_diagnosis",
            "hospital_course",
            "medications",
            "labs",
            "discharge_instructions",
            "follow_up",
        ],
    },
    "Progress": {
        "template": PROGRESS_TEMPLATE,
        "description": "Daily progress note for ongoing hospitalization",
        "typical_length": "short",
        "requires": [
            "date",
            "subjective",
            "objective",
            "labs",
            "vitals",
            "assessment",
            "plan",
        ],
    },
    "Consult": {
        "template": CONSULT_TEMPLATE,
        "description": "Specialty consultation note",
        "typical_length": "medium",
        "requires": [
            "referring_md",
            "consult_date",
            "patient_name",
            "reason",
            "history",
            "medications",
            "physical_exam",
            "assessment",
            "recommendations",
        ],
    },
}

NOTE_TYPE_ORDER = {
    "SOAP": 1,
    "H&P": 2,
    "Progress": 3,
    "Discharge": 4,
    "Consult": 5,
}


def get_template(template_type: str) -> str:
    """Get template string by type.

    Args:
        template_type: One of SOAP, H&P, Discharge, Progress, Consult

    Returns:
        Template string with fill points
    """
    return NOTE_TEMPLATES.get(template_type, {}).get("template", "")


def get_template_info(template_type: str) -> dict:
    """Get template metadata.

    Args:
        template_type: One of SOAP, H&P, Discharge, Progress, Consult

    Returns:
        Dictionary with template info
    """
    return NOTE_TEMPLATES.get(template_type, {})


def format_medications_for_note(medications: list[dict]) -> str:
    """Format medication list for note insertion.

    Args:
        medications: List of medication dicts with name, dosage, frequency, route

    Returns:
        Formatted medication string
    """
    if not medications:
        return "No medications"

    lines = []
    for med in medications:
        line = f"- {med.get('name', 'Unknown')} {med.get('dosage', '')} {med.get('frequency', '')} {med.get('route', '')}"
        lines.append(line)
    return "\n".join(lines)


def format_labs_for_note(labs: list[dict]) -> str:
    """Format lab results for note insertion.

    Args:
        labs: List of lab result dicts

    Returns:
        Formatted lab string with values and flags
    """
    if not labs:
        return "Labs pending"

    formatted = []
    seen = set()
    for lab in labs[:12]:
        name = lab.get("name", "")
        if name in seen:
            continue
        seen.add(name)

        value = lab.get("value", "")
        unit = lab.get("unit", "")
        flag = lab.get("flag", "normal")
        ref_low, ref_high = lab.get("reference_range", (None, None))

        flag_marker = ""
        if flag == "high":
            flag_marker = " (H)"
        elif flag == "low":
            flag_marker = " (L)"
        elif flag == "critical":
            flag_marker = " (***)"

        if ref_low is not None and ref_high is not None:
            ref_str = f" ({ref_low}-{ref_high})"
        else:
            ref_str = ""

        line = f"{name}: {value} {unit}{ref_str}{flag_marker}"
        formatted.append(line)

    return "\n".join(formatted)


def format_diagnoses_for_note(diagnoses: list[dict]) -> tuple[str, str, str]:
    """Format diagnoses for note insertion.

    Args:
        diagnoses: List of diagnosis dicts

    Returns:
        Tuple of (primary_diagnosis, secondary_diagnoses, assessment_text)
    """
    if not diagnoses:
        return "Unknown", "", ""

    primary = diagnoses[0]
    primary_str = (
        f"{primary.get('icd10', '')} - {primary.get('description', 'Unknown')}"
    )

    secondary_list = []
    for d in diagnoses[1:]:
        secondary_list.append(
            f"{d.get('icd10', '')} - {d.get('description', 'Unknown')}"
        )
    secondary_str = "\n".join(secondary_list) if secondary_list else "None"

    assessment_parts = []
    for d in diagnoses:
        desc = d.get("description", "Unknown")
        assessment_parts.append(desc)

    assessment_str = "; ".join(assessment_parts)

    return primary_str, secondary_str, assessment_str
