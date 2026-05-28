import express from 'express';
import { validationResult } from 'express-validator';

// Middleware to validate express-validator results
export const validate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Helper to safely get string param
export const getParam = (param: string | string[]): string => {
  return Array.isArray(param) ? param[0] : param;
};
