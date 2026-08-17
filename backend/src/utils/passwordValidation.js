const PASSWORD_RULES = [
  {
    key: "minLength",
    message: "At least 8 characters",
    test: (password) => password.length >= 8,
  },
  {
    key: "maxLength",
    message: "No more than 64 characters",
    test: (password) => password.length <= 64,
  },
  {
    key: "uppercase",
    message: "At least one uppercase letter",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    key: "lowercase",
    message: "At least one lowercase letter",
    test: (password) => /[a-z]/.test(password),
  },
  {
    key: "number",
    message: "At least one number",
    test: (password) => /\d/.test(password),
  },
  {
    key: "special",
    message: "At least one special character",
    test: (password) => /[!@#$%^&*(),.?":{}|<>_\-\\[\];'`~+=/]/.test(password),
  },
  {
    key: "noSpaces",
    message: "No spaces",
    test: (password) => !/\s/.test(password),
  },
];

const PASSWORD_VALIDATION_MESSAGE =
  "Password must be 8 to 64 characters and contain uppercase, lowercase, number, and special character with no spaces.";

function validatePassword(password) {
  const value = typeof password === "string" ? password : "";
  const errors = PASSWORD_RULES.filter((rule) => !rule.test(value)).map((rule) => rule.message);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  PASSWORD_RULES,
  PASSWORD_VALIDATION_MESSAGE,
  validatePassword,
};
