import 'dotenv/config';
import app from '../src/app';

// Vercel serverless — export app directly, do NOT call app.listen()
export default app;
