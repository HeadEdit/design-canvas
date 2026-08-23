export interface AutosaveScheduler {
  schedule(): void;
  flush(): Promise<void>;
  cancel(): void;
}

export function createAutosaveScheduler(
  save: () => Promise<void>,
  delay = 300,
): AutosaveScheduler {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let requestedGeneration = 0;
  let savedGeneration = 0;
  let active: Promise<void> | undefined;

  const clearTimer = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const startDrain = (): Promise<void> => {
    let failed = false;
    const operation = (async () => {
      try {
        while (savedGeneration < requestedGeneration) {
          const savingGeneration = requestedGeneration;
          await save();
          savedGeneration = Math.max(savedGeneration, savingGeneration);
        }
      } catch (error) {
        failed = true;
        throw error;
      }
    })();
    const wrapped = operation.finally(() => {
      active = undefined;
      if (!failed && savedGeneration < requestedGeneration) {
        return startDrain();
      }
    });
    active = wrapped;
    return wrapped;
  };

  const flush = (): Promise<void> => {
    clearTimer();

    if (active) {
      return active;
    }
    if (savedGeneration >= requestedGeneration) {
      return Promise.resolve();
    }

    return startDrain();
  };

  return {
    schedule() {
      requestedGeneration += 1;
      clearTimer();
      timer = setTimeout(() => {
        timer = undefined;
        void flush().catch(() => undefined);
      }, delay);
    },
    flush,
    cancel() {
      clearTimer();
      savedGeneration = requestedGeneration;
    },
  };
}
