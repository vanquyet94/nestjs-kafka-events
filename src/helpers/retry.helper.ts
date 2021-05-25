/**
 * Typed timeout helper
 * @param seconds
 */
const waitFor = <T>(seconds: number): Promise<T> =>
  new Promise(
    (r) => setTimeout(r, process.env?.JEST_WORKER_ID ? 1 : seconds * 1000), // makes it easier to test
  );

/**
 * Retries Promises
 * @param operation
 * @param delay (seconds!)
 * @param retries
 * @param onError
 */
export const retry = <T>(
  operation: () => Promise<T>,
  delay = 2,
  retries = 3,
  onError?: (reason: any, retriesLeft: number) => void,
) => {
  return new Promise<T>((resolve, reject) => {
    return operation()
      .then(resolve)
      .catch((reason) => {
        if (onError) {
          onError(reason, retries);
        }
        if (retries > 0) {
          return waitFor<T>(delay)
            .then(retry.bind(null, operation, delay, retries - 1, onError))
            .then(resolve)
            .catch(reject);
        }
        return reject(reason);
      });
  });
};
