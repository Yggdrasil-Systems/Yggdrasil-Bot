export function safeLog(logPromiseFactory, { guildId = null, action = 'unknown' } = {}) {
  try {
    const promise = typeof logPromiseFactory === 'function'
      ? logPromiseFactory()
      : logPromiseFactory;

    Promise.resolve(promise).catch((err) => {
      console.error('[ModLog] Failed to post mod-log entry', {
        guildId,
        action,
        err,
        message: err?.message
      });
    });
  } catch (err) {
    console.error('[ModLog] Failed to post mod-log entry', {
      guildId,
      action,
      err,
      message: err?.message
    });
  }
}
