import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ToolInputError } from './tool';

/** Turns raw input into a validated DTO. Unknown fields are refused, so the model cannot slip one in. */
export function parseInput<T extends object>(
  type: new () => T,
  input: unknown,
): T {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ToolInputError('The input must be an object');
  }
  const value = plainToInstance(type, input);
  const errors = validateSync(value, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length) {
    throw new ToolInputError(
      errors
        .flatMap((e) =>
          Object.values(e.constraints ?? { x: `${e.property} is not valid` }),
        )
        .join('; '),
    );
  }
  return value;
}
