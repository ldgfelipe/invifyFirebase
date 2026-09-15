// ============================================================================
// CONFIGURACIÓN GLOBAL - ajustes del sitio que pueden variar por entorno.
// ============================================================================

// Emails con privilegio de "bootstrap admin": al crear su perfil (o al
// autopromoverse la primera vez) obtienen rol "admin". Ideal para dar de alta
// al primer administrador sin cuenta de servicio. La validación de este
// privilegio se refuerza también en las reglas de Firestore.
export const OWNER_ADMIN_EMAILS: string[] = [
  "ldgfelipecarrera@gmail.com",
];

export function isOwnerAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return OWNER_ADMIN_EMAILS.includes(email.toLowerCase());
}