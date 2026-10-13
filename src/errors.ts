export class ReaderError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}
export function safeError(error: unknown): { code: string; message: string } {
  return error instanceof ReaderError
    ? { code: error.code, message: error.message }
    : { code: 'INTERNAL_ERROR', message: 'The operation failed. No credentials or relay response bodies are included in diagnostics.' };
}
