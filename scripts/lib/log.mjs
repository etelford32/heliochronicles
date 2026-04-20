const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (color, text) => (useColor ? `${colors[color]}${text}${colors.reset}` : text);

const stamp = () => new Date().toISOString().slice(11, 19);

export const log = {
  info: (msg) => console.log(`${paint('dim', stamp())} ${msg}`),
  step: (msg) => console.log(`${paint('dim', stamp())} ${paint('cyan', '→')} ${msg}`),
  ok: (msg) => console.log(`${paint('dim', stamp())} ${paint('green', '✓')} ${msg}`),
  warn: (msg) => console.warn(`${paint('dim', stamp())} ${paint('yellow', '!')} ${msg}`),
  fail: (msg) => console.error(`${paint('dim', stamp())} ${paint('red', '✗')} ${msg}`)
};
