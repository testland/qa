export function smtpConfig(env = process.env) {
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASSWORD;

  return {
    host: env.SMTP_HOST ?? 'localhost',
    port: Number(env.SMTP_PORT ?? 1025),
    secure: false,
    // Local capture does not need credentials, so fall through when they are absent.
    auth: user && pass ? { user, pass } : undefined,
  };
}
