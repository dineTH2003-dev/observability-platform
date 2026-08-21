import type { ProfileFormValues } from "../types/user";

export const NAME_REGEX = /^[a-zA-Z\s'-]+$/;
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const ALLOWED_ROLES = ["Admin", "Engineer"];

/**
 * Validates phone numbers:
 * - Allows blank/empty if optional
 * - Allows valid formatting characters: numbers, spaces, hyphens, parentheses, and optional leading '+'
 * - Local numbers starting with '0': must contain exactly 10 digits total (e.g., 0764678547)
 * - International numbers starting with '+': must contain between 7 and 15 digits total (E.164)
 * - Standard un-prefixed numbers: must contain between 7 and 14 digits total
 */
export function validatePhone(phone: string): string | undefined {
  const trimmed = phone.trim();
  if (!trimmed) return undefined;

  if (!/^\+?[0-9()\-\s]+$/.test(trimmed)) {
    return "Phone number can only contain numbers, spaces, hyphens, parentheses, and leading '+'";
  }

  const digitsOnly = trimmed.replace(/[^0-9]/g, "");

  if (trimmed.startsWith("0")) {
    if (digitsOnly.length !== 10) {
      return "Local phone numbers starting with 0 must be 10 digits (e.g., 0764678547)";
    }
  } else if (trimmed.startsWith("+")) {
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return "International phone numbers must be between 7 and 15 digits";
    }
  } else {
    if (digitsOnly.length < 7 || digitsOnly.length > 14) {
      return "Phone number must be between 7 and 14 digits";
    }
  }

  return undefined;
}

export function validateFirstName(firstName: string): string | undefined {
  const trimmed = firstName.trim();
  if (!trimmed) {
    return "First name is required";
  }
  if (trimmed.length < 2 || trimmed.length > 50) {
    return "First name must be between 2 and 50 characters";
  }
  if (!NAME_REGEX.test(trimmed)) {
    return "First name can only contain letters, spaces, hyphens, and apostrophes";
  }
  return undefined;
}

export function validateLastName(lastName: string): string | undefined {
  const trimmed = lastName.trim();
  if (!trimmed) {
    return "Last name is required";
  }
  if (trimmed.length < 2 || trimmed.length > 50) {
    return "Last name must be between 2 and 50 characters";
  }
  if (!NAME_REGEX.test(trimmed)) {
    return "Last name can only contain letters, spaces, hyphens, and apostrophes";
  }
  return undefined;
}

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) {
    return "Email address is required";
  }
  if (trimmed.length > 100) {
    return "Email address must be 100 characters or less";
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return "Enter a valid email address (e.g., user@example.com)";
  }
  return undefined;
}

export function validateRole(role: string): string | undefined {
  const trimmed = role.trim();
  if (!trimmed) {
    return "Role is required";
  }
  const isMatch = ALLOWED_ROLES.some(
    (allowed) => allowed.toLowerCase() === trimmed.toLowerCase()
  );
  if (!isMatch) {
    return "Please select a valid role (Admin or Engineer)";
  }
  return undefined;
}

export function validateBio(bio: string): string | undefined {
  if (bio.length > 300) {
    return "Bio must be 300 characters or less";
  }
  return undefined;
}

export function validateProfileForm(values: ProfileFormValues) {
  const errors: Partial<Record<keyof ProfileFormValues, string>> = {};

  const firstNameError = validateFirstName(values.firstName);
  if (firstNameError) errors.firstName = firstNameError;

  const lastNameError = validateLastName(values.lastName);
  if (lastNameError) errors.lastName = lastNameError;

  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;

  const phoneError = validatePhone(values.phone);
  if (phoneError) errors.phone = phoneError;

  const roleError = validateRole(values.role);
  if (roleError) errors.role = roleError;

  const bioError = validateBio(values.bio);
  if (bioError) errors.bio = bioError;

  return errors;
}
