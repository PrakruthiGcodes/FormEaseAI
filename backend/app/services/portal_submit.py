"""Standards-based portal submission dispatch service.

Transforms validated, normalized English form data into domain-specific external
integration payloads:
  * Medical: HL7 FHIR R4 Bundle with Patient, Encounter, Observation, and Condition resources.
  * Education: University / National Scholarship Portal (NSP) Intake JSON schema.
  * Government: e-Governance DBT / Karnataka Seva Sindhu Scheme Intake JSON schema.
  * General: Universal Citizen Profile JSON schema.
"""

import logging
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger("formease.submit")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _format_fhir_gender(gender_val: Optional[str]) -> str:
    if not gender_val:
        return "unknown"
    g = gender_val.strip().lower()
    if "female" in g or "woman" in g or "girl" in g:
        return "female"
    if "male" in g or "man" in g or "boy" in g:
        return "male"
    if "other" in g:
        return "other"
    return "unknown"


def _format_fhir_dob(dob_str: Optional[str]) -> Optional[str]:
    """Convert DD-MM-YYYY to YYYY-MM-DD for FHIR compliance."""
    if not dob_str:
        return None
    parts = dob_str.strip().split("-")
    if len(parts) == 3 and len(parts[2]) == 4:
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    return dob_str


def build_medical_fhir_bundle(
    form_data: dict[str, Any],
    extra_fields: dict[str, Any],
    token: str,
    timestamp: str,
) -> dict[str, Any]:
    """Construct a clean, valid HL7 FHIR R4 collection bundle."""
    patient_id = f"urn:uuid:{uuid.uuid4()}"
    encounter_id = f"urn:uuid:{uuid.uuid4()}"
    obs_id = f"urn:uuid:{uuid.uuid4()}"
    condition_id = f"urn:uuid:{uuid.uuid4()}"

    telecom = []
    if form_data.get("mobile_number"):
        telecom.append({"system": "phone", "value": form_data["mobile_number"], "use": "mobile"})
    if form_data.get("email"):
        telecom.append({"system": "email", "value": form_data["email"]})

    contacts = []
    if extra_fields.get("emergency_contact"):
        contacts.append({
            "relationship": [{"text": "Emergency Contact"}],
            "name": {"text": extra_fields["emergency_contact"]},
        })

    patient_resource = {
        "resourceType": "Patient",
        "identifier": [{"system": "https://abdm.gov.in/patient-id", "value": token}],
        "active": True,
        "name": [{"use": "official", "text": form_data.get("full_name") or "Anonymous"}],
        "telecom": telecom,
        "gender": _format_fhir_gender(form_data.get("gender")),
        "birthDate": _format_fhir_dob(form_data.get("date_of_birth")),
        "address": [{
            "use": "home",
            "line": [form_data.get("address")] if form_data.get("address") else [],
            "city": form_data.get("city"),
            "state": form_data.get("state"),
            "postalCode": form_data.get("pin_code"),
            "country": "IND",
        }],
        "contact": contacts,
    }

    encounter_resource = {
        "resourceType": "Encounter",
        "status": "planned",
        "class": {
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            "code": "AMB",
            "display": "ambulatory",
        },
        "subject": {"reference": patient_id},
        "reasonCode": [{
            "text": extra_fields.get("symptoms_or_reason") or "OPD Consultation",
        }],
    }

    observation_resource = {
        "resourceType": "Observation",
        "status": "final",
        "code": {"text": "Blood Group"},
        "subject": {"reference": patient_id},
        "valueString": extra_fields.get("blood_group") or "Unknown",
    }

    condition_resource = {
        "resourceType": "Condition",
        "clinicalStatus": {
            "coding": [{
                "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                "code": "active",
            }],
        },
        "subject": {"reference": patient_id},
        "note": [{
            "text": extra_fields.get("medical_history") or "None reported",
        }],
    }

    return {
        "resourceType": "Bundle",
        "type": "collection",
        "timestamp": timestamp,
        "identifier": {
            "system": "https://abdm.gov.in/fhir/tokens",
            "value": token,
        },
        "entry": [
            {"fullUrl": patient_id, "resource": patient_resource},
            {"fullUrl": encounter_id, "resource": encounter_resource},
            {"fullUrl": obs_id, "resource": observation_resource},
            {"fullUrl": condition_id, "resource": condition_resource},
        ],
    }


def build_education_portal_payload(
    form_data: dict[str, Any],
    extra_fields: dict[str, Any],
    registration_id: str,
    timestamp: str,
) -> dict[str, Any]:
    """Construct a University / NSP Scholarship Intake JSON schema."""
    return {
        "registration_id": registration_id,
        "submission_timestamp": timestamp,
        "portal_name": "National Scholarship Portal & Unified University Admissions",
        "student_profile": {
            "full_name": form_data.get("full_name"),
            "age": form_data.get("age"),
            "date_of_birth": form_data.get("date_of_birth"),
            "gender": form_data.get("gender"),
            "mobile_number": form_data.get("mobile_number"),
            "email": form_data.get("email"),
            "permanent_address": {
                "address_line": form_data.get("address"),
                "city": form_data.get("city"),
                "state": form_data.get("state"),
                "pin_code": form_data.get("pin_code"),
            },
        },
        "academic_intake_details": {
            "previous_institution": extra_fields.get("previous_institution"),
            "course_or_degree": extra_fields.get("course_or_degree"),
            "passed_out_year": extra_fields.get("passed_out_year"),
            "percentage_or_grade": extra_fields.get("percentage_or_grade"),
            "highest_qualification": form_data.get("education"),
        },
    }


def build_government_scheme_payload(
    form_data: dict[str, Any],
    extra_fields: dict[str, Any],
    acknowledgement_id: str,
    timestamp: str,
) -> dict[str, Any]:
    """Construct an e-Governance Seva Sindhu / DBT Citizen Scheme JSON schema."""
    return {
        "application_acknowledgement_no": acknowledgement_id,
        "submission_timestamp": timestamp,
        "portal_name": "Karnataka Seva Sindhu / DBT Citizen Welfare Portal",
        "applicant_profile": {
            "name": form_data.get("full_name"),
            "age": form_data.get("age"),
            "gender": form_data.get("gender"),
            "mobile": form_data.get("mobile_number"),
            "email": form_data.get("email"),
            "occupation": form_data.get("occupation"),
            "residential_address": {
                "address_line": form_data.get("address"),
                "city_village": form_data.get("city"),
                "district_state": form_data.get("state"),
                "postal_code": form_data.get("pin_code"),
            },
        },
        "scheme_application_details": {
            "target_scheme_name": extra_fields.get("scheme_name"),
            "annual_family_income_inr": extra_fields.get("annual_family_income"),
            "ration_card_or_id_type": extra_fields.get("ration_or_id_type"),
        },
    }


def build_general_profile_payload(
    form_data: dict[str, Any],
    extra_fields: dict[str, Any],
    reference_id: str,
    timestamp: str,
) -> dict[str, Any]:
    """Construct a Universal Citizen Profile JSON schema."""
    return {
        "citizen_reference_no": reference_id,
        "submission_timestamp": timestamp,
        "portal_name": "Universal Citizen Directory & Application Registry",
        "personal_demographics": {
            "full_name": form_data.get("full_name"),
            "age": form_data.get("age"),
            "date_of_birth": form_data.get("date_of_birth"),
            "gender": form_data.get("gender"),
            "mobile_number": form_data.get("mobile_number"),
            "email": form_data.get("email"),
            "address": form_data.get("address"),
            "city": form_data.get("city"),
            "state": form_data.get("state"),
            "pin_code": form_data.get("pin_code"),
            "occupation": form_data.get("occupation"),
            "education": form_data.get("education"),
        },
        "additional_attributes": extra_fields,
    }


def dispatch_portal_submission(
    form_type: str,
    english_form_data: dict[str, Any],
    english_extra_fields: dict[str, Any],
    form_id: Optional[str] = None,
) -> dict[str, Any]:
    """Generate and dispatch the standards-based payload for the appropriate portal."""
    timestamp = _now_iso()
    random_suffix = f"{secrets.randbelow(9000) + 1000}"

    if form_type == "medical":
        ack_id = f"OPD-KA-2026-{random_suffix}"
        target_portal = "Ayushman Bharat Digital Mission (ABDM) / Hospital HIMS"
        protocol_standard = "HL7 FHIR R4"
        payload = build_medical_fhir_bundle(english_form_data, english_extra_fields, ack_id, timestamp)
    elif form_type == "education":
        ack_id = f"EDU-2026-{random_suffix}"
        target_portal = "National Scholarship Portal & Unified University Admissions"
        protocol_standard = "National Scholarship Portal (NSP) / AISHE Intake API v2"
        payload = build_education_portal_payload(english_form_data, english_extra_fields, ack_id, timestamp)
    elif form_type == "government":
        ack_id = f"GOV-KA-2026-{random_suffix}"
        target_portal = "Karnataka Seva Sindhu / DBT Citizen Welfare Portal"
        protocol_standard = "e-Governance DBT v3 / Seva Sindhu Standard"
        payload = build_government_scheme_payload(english_form_data, english_extra_fields, ack_id, timestamp)
    else:
        ack_id = f"CIT-2026-{random_suffix}"
        target_portal = "Universal Citizen Directory & Application Registry"
        protocol_standard = "National Citizen Registry Standard v1.2"
        payload = build_general_profile_payload(english_form_data, english_extra_fields, ack_id, timestamp)

    # PII-Safe Logging: Only structural events, NO names, medical history, phone numbers, or payloads
    logger.info(
        "Portal submission dispatched: form_type=%s ack_id=%s standard=%s form_id=%s",
        form_type,
        ack_id,
        protocol_standard,
        form_id or "session",
    )

    return {
        "status": "submitted",
        "acknowledgement_id": ack_id,
        "target_portal": target_portal,
        "protocol_standard": protocol_standard,
        "submitted_at": timestamp,
        "dispatched_payload": payload,
        "sandbox_mode": True,
    }
