const SCOPE = 'World Tree';

function format(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${SCOPE}] [${level}] ${message}`;
}

const isProduction = process.env.NODE_ENV === 'production';

export const logger = Object.freeze({
  info(message) {
    console.log(format('info', message));
  },

  warn(message) {
    console.warn(format('warn', message));
  },

  error(message, error) {
    console.error(format('error', message));

    if (error) {
      console.error(error);
    }
  },

  debug(message) {
    if (!isProduction) {
      console.log(format('debug', message));
    }
  }
});
