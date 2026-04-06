function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatRussianPhoneInput(value: string): string {
  let digits = digitsOnly(value);

  if (!digits) return "";

  if (digits.length === 1 && digits[0] === "8") {
    digits = "7";
  } else if (digits[0] !== "7") {
    digits = `7${digits}`;
  }

  digits = digits.slice(0, 11);

  const code = digits.slice(1, 4);
  const part1 = digits.slice(4, 7);
  const part2 = digits.slice(7, 9);
  const part3 = digits.slice(9, 11);

  let result = "+7";

  if (code) result += ` (${code}`;
  if (code.length === 3) result += ")";
  if (part1) result += ` ${part1}`;
  if (part2) result += `-${part2}`;
  if (part3) result += `-${part3}`;

  return result;
}

export function normalizeRussianPhoneForApi(value: string): string | null {
  let digits = digitsOnly(value);

  if (!digits) return null;

  if (digits.length === 10) {
    digits = `7${digits}`;
  }

  if (digits.length === 11 && digits[0] === "8") {
    digits = `7${digits.slice(1)}`;
  }

  if (!/^7\d{10}$/.test(digits)) {
    return null;
  }

  return `+${digits}`;
}

export function getRussianPhoneError(value: string): string | null {
  if (!value.trim()) return null;

  let digits = digitsOnly(value);

  if (digits.length === 10) {
    digits = `7${digits}`;
  }

  if (digits.length === 11 && digits[0] === "8") {
    digits = `7${digits.slice(1)}`;
  }

  if (!/^7\d{0,10}$/.test(digits)) {
    return "Поддерживаются только российские номера";
  }

  if (digits.length < 11) {
    return "Номер должен быть в формате +7 и 10 цифр";
  }

  return null;
}