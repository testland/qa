import nodemailer from 'nodemailer';

export function createTransport(config) {
  const inner = nodemailer.createTransport(config);
  return {
    async send(message) {
      try {
        return await inner.sendMail(message);
      } catch (cause) {
        throw smtpError(cause);
      }
    },
  };
}

// Normalised in 2024 so callers never have to know which library raised.
function smtpError(cause) {
  const reply = String(cause.response ?? cause.message ?? '').trim();
  const err = new Error(reply || 'smtp failure');
  err.status = Number(reply.slice(0, 3)) || 0;
  err.smtpReply = reply;
  err.cause = cause;
  return err;
}
