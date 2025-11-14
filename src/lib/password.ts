/**
 * Genera una contraseña temporal segura
 */
export function generateTemporaryPassword(length: number = 12): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*";

  const allChars = uppercase + lowercase + numbers + symbols;

  let password = "";

  // Asegurar al menos uno de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Llenar el resto
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Mezclar los caracteres
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/**
 * Genera un número de empleado único y secuencial
 * @param prefix - Prefijo de la organización (ej: "EMP", "TMNW")
 * @param counter - Contador secuencial de la organización
 * @returns Número de empleado formateado (ej: "EMP00001", "TMNW00042")
 */
export function generateEmployeeNumber(prefix: string = "EMP", counter: number = 1): string {
  // Formatear el contador con 5 dígitos (máximo 99,999 empleados)
  const formattedCounter = counter.toString().padStart(5, "0");
  return `${prefix}${formattedCounter}`;
}
