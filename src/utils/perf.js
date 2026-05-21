const DEFAULT_THRESHOLD_MS = 1500;

function nowMs() {
  if (!process.hrtime?.bigint) {
    return Date.now();
  }

  return Number(process.hrtime.bigint()) / 1_000_000;
}

function getThreshold() {
  const threshold = Number(process.env.PERF_LOG_THRESHOLD_MS);
  return Number.isFinite(threshold) ? threshold : DEFAULT_THRESHOLD_MS;
}

/**
 * Creates a named performance timer.
 * @param {string} label
 * @returns {{ mark: (stage: string) => void, finish: () => Record<string, number> }}
 */
export function createTimer(label) {
  try {
    let last = nowMs();
    const start = last;
    const stages = {};

    return {
      mark(stage) {
        try {
          const current = nowMs();
          stages[stage] = Math.max(0, current - last);
          last = current;
        } catch {
          // Instrumentation must never affect command behavior.
        }
      },
      finish() {
        try {
          const total = Math.max(0, nowMs() - start);
          const breakdown = { ...stages };
          const shouldLog = process.env.NODE_ENV !== 'production' || total > getThreshold();

          if (shouldLog) {
            console.debug?.(`[Perf] ${label}`, { ...breakdown, total });
          }

          return breakdown;
        } catch {
          return {};
        }
      }
    };
  } catch {
    return {
      mark() {},
      finish() {
        return {};
      }
    };
  }
}
