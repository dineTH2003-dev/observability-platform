export const PASSWORD_RULES = [
  {
    key: "minLength",
    label: "At least 8 characters",
    test: (password: string) => password.length >= 8,
  },
  {
    key: "maxLength",
    label: "No more than 64 characters",
    test: (password: string) => password.length <= 64,
  },
  {
    key: "uppercase",
    label: "At least one uppercase letter",
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    key: "lowercase",
    label: "At least one lowercase letter",
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    key: "number",
    label: "At least one number",
    test: (password: string) => /\d/.test(password),
  },
  {
    key: "special",
    label: "At least one special character",
    test: (password: string) => /[!@#$%^&*(),.?":{}|<>_\-\\[\];'`~+=/]/.test(password),
  },
  {
    key: "noSpaces",
    label: "No spaces",
    test: (password: string) => !/\s/.test(password),
  },
] as const;

export const PASSWORD_VALIDATION_MESSAGE =
  "Password must be 8 to 64 characters and contain uppercase, lowercase, number, and special character with no spaces.";

export function getPasswordValidation(password: string) {
  const results = PASSWORD_RULES.map((rule) => ({
    key: rule.key,
    label: rule.label,
    isValid: rule.test(password),
  }));

  return {
    results,
    errors: results.filter((result) => !result.isValid).map((result) => result.label),
    isValid: results.every((result) => result.isValid),
  };
}
