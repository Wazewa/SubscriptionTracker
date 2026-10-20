export type PasswordValues = { currentPassword: string; newPassword: string; confirmNewPassword: string };
export function validatePasswordChange(values: PasswordValues): Partial<Record<keyof PasswordValues, string>> {
  const errors: Partial<Record<keyof PasswordValues, string>> = {};
  if (!values.currentPassword.trim()) errors.currentPassword = 'Введите текущий пароль.';
  if (!values.newPassword.trim() || values.newPassword.length < 8 || values.newPassword.length > 72 || new TextEncoder().encode(values.newPassword).length > 72) errors.newPassword = 'Новый пароль — от 8 до 72 символов, не более 72 байт UTF-8.';
  else if (values.newPassword === values.currentPassword) errors.newPassword = 'Новый пароль должен отличаться от текущего.';
  if (!values.confirmNewPassword || values.newPassword !== values.confirmNewPassword) errors.confirmNewPassword = 'Пароли не совпадают.';
  return errors;
}
