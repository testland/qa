export const allowedOrigins = [
  'https://parcelly.com',
  'https://admin.parcelly.com',
];

export const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['content-type', 'authorization'],
};
