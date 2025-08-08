import { ErrorResponse, HttpValidationError } from './api/types.gen';

export const getErrorMessageFromResponse = (
  error: ErrorResponse | HttpValidationError
) => {
  if ('message' in error) {
    return error.message;
  } else if ('detail' in error) {
    return `Validation error: \n${error.detail
      ?.map(
        (d) =>
          `Type: ${d.type}\nMessage: ${d.msg}\nLocation: ${d.loc?.join('.')}`
      )
      .join('\n\n')}`;
  }

  return 'Unknown error';
};
