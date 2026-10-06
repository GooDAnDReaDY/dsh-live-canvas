// dsh-live-canvas: logging abstraction conforming to Cordis ctx.logger

let customLogger = null;

export function setLogger(l) {
  if (l) customLogger = l;
}

export const logger = {
  info(...args) {
    if (customLogger?.info) customLogger.info(...args);
    else if (customLogger?.log) customLogger.log(...args);
    else console.info(...args);
  },
  warn(...args) {
    if (customLogger?.warn) customLogger.warn(...args);
    else console.warn(...args);
  },
  error(...args) {
    if (customLogger?.error) customLogger.error(...args);
    else console.error(...args);
  },
  debug(...args) {
    if (customLogger?.debug) customLogger.debug(...args);
    else if (customLogger?.log) customLogger.log(...args);
    else console.debug(...args);
  }
};
