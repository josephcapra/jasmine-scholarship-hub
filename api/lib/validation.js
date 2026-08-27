/**
 * Input Validation Schemas
 * Using Zod for runtime validation
 */

import { z } from 'zod';

export const aiAssistSchema = z.object({
  action: z.enum(['tips', 'improve', 'expand', 'check']).optional(),
  essayType: z.string().max(100).optional(),
  content: z.string().max(15000).optional()
});

export const essayBuilderSchema = z.object({
  action: z.enum(['generate', 'outline', 'expand', 'edit', 'feedback']),
  prompt: z.string().max(2000).optional(),
  content: z.string().max(15000).optional(),
  scholarshipName: z.string().max(200).optional(),
  wordLimit: z.number().int().min(50).max(5000).optional()
});

export const extractProfileSchema = z.object({
  fileData: z.string().max(10000000), // ~10MB base64
  fileName: z.string().max(255),
  fileType: z.string().max(100).optional()
});

export const scholarshipSearchSchema = z.object({
  query: z.string().max(500).optional(),
  filters: z.object({
    minAmount: z.number().min(0).max(1000000).optional(),
    maxAmount: z.number().min(0).max(1000000).optional(),
    deadline: z.string().optional(),
    category: z.string().max(100).optional()
  }).optional()
});

export const writingGuideSchema = z.object({
  action: z.enum(['questions', 'authenticity', 'feedback']),
  prompt: z.string().max(2000).optional(),
  content: z.string().max(15000).optional(),
  profile: z.record(z.unknown()).optional()
});

export const emailSchema = z.object({
  to: z.string().email().max(255),
  subject: z.string().max(200),
  body: z.string().max(50000),
  replyTo: z.string().email().max(255).optional()
});

export function validateRequest(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    return { valid: false, errors };
  }
  return { valid: true, data: result.data };
}

export function createValidatedHandler(schema, handler) {
  return async (req, res) => {
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON' });
      }
    }

    const validation = validateRequest(schema, body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    req.validatedBody = validation.data;
    return handler(req, res);
  };
}
