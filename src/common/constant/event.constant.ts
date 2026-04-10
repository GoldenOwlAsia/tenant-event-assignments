export const MAX_ATTEMPTS = 3;

export const QUEUE_CONFIG = {
  attempts: MAX_ATTEMPTS,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
};
