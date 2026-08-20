/**
 * Unit Tests — src/utils/apiError.js
 * Tests the ApiError class constructor and inheritance.
 */

const ApiError = require('../../src/utils/apiError');

describe('ApiError class', () => {

  it('is an instance of Error', () => {
    const err = new ApiError(400, 'Bad request');
    expect(err).toBeInstanceOf(Error);
  });

  it('sets statusCode from constructor argument', () => {
    const err = new ApiError(404, 'Not found');
    expect(err.statusCode).toBe(404);
  });

  it('sets message from constructor argument', () => {
    const err = new ApiError(422, 'Validation failed');
    expect(err.message).toBe('Validation failed');
  });

  it('sets details when provided', () => {
    const details = { field: 'email', issue: 'invalid format' };
    const err = new ApiError(400, 'Invalid input', details);
    expect(err.details).toEqual(details);
  });

  it('details is undefined when not provided', () => {
    const err = new ApiError(500, 'Server error');
    expect(err.details).toBeUndefined();
  });

  it('defaults statusCode to 500 when undefined is passed', () => {
    const err = new ApiError(undefined, 'Oops');
    expect(err.statusCode).toBe(500);
  });

  it('name is Error (inherited from Error class)', () => {
    const err = new ApiError(400, 'Bad');
    expect(err).toBeInstanceOf(Error);
  });

  it('can be thrown and caught as an Error', () => {
    expect(() => {
      throw new ApiError(401, 'Unauthorized');
    }).toThrow('Unauthorized');
  });

  it('instanceof check works for conditional handling', () => {
    const err = new ApiError(403, 'Forbidden');
    expect(err instanceof ApiError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

});
