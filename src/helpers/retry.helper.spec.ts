import { retry } from './retry.helper';

class MyError extends Error {}

describe('RetryHelper', () => {
  it('retries operations after given spec', async () => {
    const failOperation = jest.fn().mockRejectedValue(new MyError());
    const successOperation = jest.fn().mockResolvedValue(true);

    const result = await retry(successOperation, 0.001, 3);
    expect(result).toEqual(true);
    expect(successOperation).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    await expect(retry(failOperation, 0.001, 3)).rejects.toThrow(MyError);
    expect(failOperation).toHaveBeenCalledTimes(4);
  });
});
