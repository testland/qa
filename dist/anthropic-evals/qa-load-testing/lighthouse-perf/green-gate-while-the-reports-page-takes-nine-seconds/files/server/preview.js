import express from 'express';
import cookieParser from 'cookie-parser';
import { join } from 'node:path';

const app = express();
app.use(cookieParser());

app.use('/app', (req, res, next) => {
  if (req.cookies.sb_session !== process.env.PREVIEW_SESSION) {
    return res.redirect(302, '/login');
  }
  next();
});

app.use(express.static(join(process.cwd(), 'dist')));

app.listen(3000, () => console.log('preview listening on http://localhost:3000'));
