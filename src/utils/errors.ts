export class ResultBoardError extends Error {
  override readonly name = 'ResultBoardError';
  constructor(message: string, readonly code: 'VALIDATION' | 'LIMIT' | 'NOT_FOUND' | 'STORAGE' | 'NETWORK' | 'AUTH' | 'UNKNOWN') {
    super(message);
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
