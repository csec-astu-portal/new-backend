interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

interface ErrorResponse {
  success: false;
  error: string;
}

export const successResponse = <T>(data: T, message?: string): SuccessResponse<T> => ({
  success: true,
  data,
  message
});

export const errorResponse = (message: string): ErrorResponse => ({
  success: false,
  error: message
}); 