/**
 * Unit Tests — src/middlewares/asyncHandler.js
 * Tests the wrapper that converts async route handlers into Express-compatible functions.
 */

const asyncHandler = require('../../src/middlewares/asyncHandler');

function makeReqRes() {
  const req = {};
  const res = { json: jest.fn() };
  const next = jest.fn();
  return { req, res, next };
}

describe('asyncHandler middleware', () => {

  it('wraps the given async function and returns a new function', () => {
    const fn = jest.fn().mockResolvedValue();
    const wrapped = asyncHandler(fn);
    expect(typeof wrapped).toBe('function');
  });

  it('calls the inner function with req, res, next', async () => {
    const { req, res, next } = makeReqRes();
    const fn = jest.fn().mockResolvedValue();
    const wrapped = asyncHandler(fn);
    await wrapped(req, res, next);
    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('calls next(err) when the inner async function throws', async () => {
    const { req, res, next } = makeReqRes();
    const err = new Error('something went wrong');
    const fn = jest.fn().mockRejectedValue(err);
    const wrapped = asyncHandler(fn);
    await wrapped(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('does NOT call next when the function resolves successfully', async () => {
    const { req, res, next } = makeReqRes();
    const fn = jest.fn().mockResolvedValue();
    const wrapped = asyncHandler(fn);
    await wrapped(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

});
