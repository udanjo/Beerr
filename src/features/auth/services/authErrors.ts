/** Código técnico do erro (ex.: auth/network-request-failed), para diagnóstico. */
export function authErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) return String(error.code);
  return error instanceof Error ? error.message : 'desconhecido';
}

/** Traduz o código de erro do Firebase Auth em uma mensagem curta em português. */
export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  switch (code) {
    // Não diz qual dos dois campos está errado.
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E-mail ou senha incorretos.';
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos.';
    case 'auth/network-request-failed':
      return 'Sem conexão. Conecte-se à internet para entrar.';
    case 'auth/user-disabled':
      return 'Conta desativada. Fale com o responsável pelo app.';
    default:
      return 'Não foi possível entrar. Tente de novo.';
  }
}
