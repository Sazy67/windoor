import 'dotenv/config';
import app from '../backend/src/app';

// Vercel serverless handler — do NOT call app.listen()
export default app;
