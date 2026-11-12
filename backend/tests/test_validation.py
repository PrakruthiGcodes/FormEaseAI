"""Field validation rules (offline)."""

import pytest

from app.services.validation import validate_field, validate_form


@pytest.mark.parametrize(
    "field,raw,expected",
    [
        ("full_name", "  Ananya   Rao ", "Ananya Rao"),
        ("age", "21", "21"),
        ("age", "I am 21 years old", "21"),
        ("date_of_birth", "15/08/1999", "15-08-1999"),
        ("date_of_birth", "1999-08-15", "15-08-1999"),
        ("gender", "female", "Female"),
        ("gender", "ಮಹಿಳೆ", "ಮಹಿಳೆ"),
        ("mobile_number", "+91 98765-43210", "9876543210"),
        ("mobile_number", "09876543210", "9876543210"),
        ("email", "Ananya@Example.COM", "ananya@example.com"),
        ("pin_code", "560 001", "560001"),
        ("city", "Bengaluru", "Bengaluru"),
    ],
)
def test_valid_values_are_normalised(field, raw, expected):
    value, error = validate_field(field, raw)
    assert error is None, error
    assert value == expected


@pytest.mark.parametrize(
    "field,raw",
    [
        ("age", "abc"),
        ("age", "200"),
        ("age", "21 or 22"),
        ("date_of_birth", "31/02/1999"),
        ("date_of_birth", "2999-01-01"),
        ("date_of_birth", "yesterday"),
        ("mobile_number", "12345"),
        ("mobile_number", "1234567890"),  # does not start with 6-9
        ("email", "not-an-email"),
        ("pin_code", "012345"),
        ("pin_code", "56000"),
        ("full_name", "A"),
        ("full_name", "Ananya123"),
    ],
)
def test_invalid_values_are_rejected(field, raw):
    value, error = validate_field(field, raw)
    assert value is None
    assert error


@pytest.mark.parametrize("name", ["अनन्या राव", "ಅನನ್ಯ ರಾವ್", "అనన్య రావు", "Ananya Rao", "Mary-Jane O'Neil"])
def test_names_in_indian_scripts_and_with_punctuation_are_accepted(name):
    value, error = validate_field("full_name", name)
    assert error is None, error
    assert value == name


@pytest.mark.parametrize("name", ["Ananya 2", "Ananya@Rao", "*Ananya", "अनन्या 1"])
def test_names_with_digits_or_symbols_are_still_rejected(name):
    value, error = validate_field("full_name", name)
    assert value is None
    assert error


def test_empty_values_mean_not_provided_not_error():
    assert validate_field("email", "   ") == (None, None)
    assert validate_field("email", None) == (None, None)


def test_validate_form_reports_only_bad_fields():
    normalised, errors = validate_form({"full_name": "Ananya Rao", "mobile_number": "123", "age": "21"})
    assert normalised["full_name"] == "Ananya Rao"
    assert normalised["age"] == "21"
    assert normalised["mobile_number"] is None
    assert list(errors) == ["mobile_number"]
