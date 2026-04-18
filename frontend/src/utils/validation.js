export const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@(lhr\.)?nu\.edu\.pk$/,
  rollNo: /^[0-9]{2}[A-Z]-[0-9]{4}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
  roomTopicCode: /^[a-zA-Z0-9]{8}$/,
};

export const validateEmail = (email) => patterns.email.test(email);
export const validateRollNo = (rollNo) => patterns.rollNo.test(rollNo);
export const validatePassword = (password) => patterns.password.test(password);
export const validateCode = (code) => patterns.roomTopicCode.test(code);

export const getPasswordStrength = (password) => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[@$!%*?&#]/.test(password)) strength++;
  return strength;
};

export const passwordStrengthText = (strength) => {
  if (strength < 2) return 'Weak';
  if (strength < 4) return 'Medium';
  return 'Strong';
};
