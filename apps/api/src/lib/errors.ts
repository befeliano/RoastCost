export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new AppError(400, code, message, details);
export const unauthorized = (code = 'unauthorized', message = 'Oturum açmanız gerekiyor.') =>
  new AppError(401, code, message);
export const forbidden = (code = 'forbidden', message = 'Bu işlem için yetkiniz yok.') =>
  new AppError(403, code, message);
export const notFound = (code = 'not_found', message = 'Kayıt bulunamadı.') =>
  new AppError(404, code, message);
export const conflict = (code: string, message: string) => new AppError(409, code, message);
