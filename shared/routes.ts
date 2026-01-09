
import { z } from 'zod';

// Note: Since we are using Supabase Client directly on the frontend for most operations,
// this file defines the shared types and structures but might not be used for 
// traditional API routing.

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// Define minimal API shapes if needed for any backend-specific logic
export const api = {
  // Placeholder for potential future backend routes
  health: {
    method: 'GET' as const,
    path: '/api/health',
    responses: {
      200: z.object({ status: z.string() }),
    },
  },
};
