"""Validation and normalisation of form fields.

Every value is checked before it is stored or shown as confirmed.
Invalid values are rejected with a clear message, never silently changed to
something the user did not say.

Each validator returns (normalised_value, error_message). Exactly one is None.
"""

import re
import unicodedata
from datetime import date

from app.schemas.chat import FORM_FIELDS

# Names may use letters from any script plus combining marks (vowel signs, viramas),
# which Indian scripts need: e.g. "अनन्या" or "ಅನನ್ಯ". Digits and symbols are rejected.
NAME_PUNCTUATION = " .'-"


def _is_name_char(char: str) -> bool:
    if char in NAME_PUNCTUATION:
        return True
    category = unicodedata.category(char)
    return category.startswith("L") or category.startswith("M")


def _is_valid_name(value: str) -> bool:
    return bool(value) and value[0] not in NAME_PUNCTUATION and all(_is_name_char(ch) for ch in value)
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
GENDER_SYNONYMS = {
    "male": "Male", "m": "Male", "man": "Male", "boy": "Male",
    "female": "Female", "f": "Female", "woman": "Female", "girl": "Female",
    "other": "Other", "transgender": "Other", "non-binary": "Other", "nonbinary": "Other",
    "prefer not to say": "Prefer not to say",
}


def _collapse(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _check_length(value: str, low: int, high: int, label: str):
    if len(value) < low:
        return f"{label} is too short."
    if len(value) > high:
        return f"{label} is too long."
    return None


def validate_name(value: str):
    value = _collapse(value)
    err = _check_length(value, 2, 100, "Full name")
    if err:
        return None, err
    if not _is_valid_name(value):
        return None, "Full name should contain letters only."
    return value, None


def validate_age(value: str):
    digits = re.findall(r"\d+", value)
    if len(digits) != 1:
        return None, "Age should be a single number, for example 21."
    age = int(digits[0])
    if not 1 <= age <= 120:
        return None, "Age should be between 1 and 120."
    return str(age), None


def validate_date_of_birth(value: str):
    text = value.strip()
    match = re.fullmatch(r"(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})", text) or None
    if match:
        year, month, day = (int(part) for part in match.groups())
    else:
        match = re.fullmatch(r"(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})", text)
        if not match:
            return None, "Date of birth should look like DD-MM-YYYY."
        day, month, year = (int(part) for part in match.groups())
    try:
        dob = date(year, month, day)
    except ValueError:
        return None, "Date of birth is not a real calendar date."
    today = date.today()
    if dob > today:
        return None, "Date of birth cannot be in the future."
    if today.year - dob.year > 120:
        return None, "Date of birth is too far in the past."
    return dob.strftime("%d-%m-%Y"), None


def validate_gender(value: str):
    key = _collapse(value).lower()
    if key in GENDER_SYNONYMS:
        return GENDER_SYNONYMS[key], None
    # Other languages: keep what the user wrote, as long as it is a sensible length.
    err = _check_length(_collapse(value), 1, 40, "Gender")
    if err:
        return None, err
    return _collapse(value), None


def validate_mobile(value: str):
    digits = re.sub(r"\D", "", value)
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    if len(digits) != 10 or digits[0] not in "6789":
        return None, "Mobile number should be 10 digits starting with 6, 7, 8 or 9."
    return digits, None


def validate_email(value: str):
    email = value.strip().lower()
    if not EMAIL_RE.match(email) or len(email) > 254:
        return None, "Email address does not look valid."
    return email, None


def validate_address(value: str):
    value = _collapse(value)
    err = _check_length(value, 5, 300, "Address")
    return (None, err) if err else (value, None)


def validate_city(value: str):
    value = _collapse(value)
    err = _check_length(value, 2, 60, "City")
    return (None, err) if err else (value, None)


def validate_state(value: str):
    value = _collapse(value)
    err = _check_length(value, 2, 60, "State")
    return (None, err) if err else (value, None)


def validate_pin_code(value: str):
    digits = re.sub(r"\D", "", value)
    if len(digits) != 6 or digits[0] == "0":
        return None, "PIN code should be 6 digits and cannot start with 0."
    return digits, None


def validate_text(label: str):
    def _validate(value: str):
        value = _collapse(value)
        err = _check_length(value, 2, 100, label)
        return (None, err) if err else (value, None)
    return _validate


VALIDATORS = {
    "full_name": validate_name,
    "age": validate_age,
    "date_of_birth": validate_date_of_birth,
    "gender": validate_gender,
    "mobile_number": validate_mobile,
    "email": validate_email,
    "address": validate_address,
    "city": validate_city,
    "state": validate_state,
    "pin_code": validate_pin_code,
    "occupation": validate_text("Occupation"),
    "education": validate_text("Education"),
}


def validate_field(field: str, value):
    """Validate one field. Empty values mean 'not provided' and are never an error."""
    if value is None or not str(value).strip():
        return None, None
    return VALIDATORS[field](str(value))


def validate_form(data: dict) -> tuple[dict, dict]:
    """Validate every field.

    Returns (normalised, errors):
      normalised: {field: value or None} for all form fields
      errors:     {field: message} only for fields that were given but are invalid
    """
    normalised: dict = {}
    errors: dict = {}
    for field in FORM_FIELDS:
        value, error = validate_field(field, data.get(field))
        normalised[field] = value
        if error:
            errors[field] = error
    return normalised, errors
