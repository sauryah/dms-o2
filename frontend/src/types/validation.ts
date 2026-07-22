import { z } from 'zod'
import { DIE_STATUSES } from '../contracts/dieContracts'

// Validation schema for die creation
export const DieCreateSchema = z.discriminatedUnion('die_type', [
  z.object({
    die_id: z.string()
      .min(1, 'Die ID is required')
      .max(50, 'Die ID must be 50 characters or less')
      .regex(/^[a-zA-Z0-9_\-./]+$/, 'Die ID can only contain alphanumeric characters, hyphens, underscores, dots, and slashes'),
    die_type: z.literal('ROUND'),
    casing: z.string().min(1, 'Casing is required'),
    status: z.enum(DIE_STATUSES),
    current_set: z.number().nullable().optional(),
    rack: z.number().nullable().optional(),
    shelf: z.number().nullable().optional(),
    remarks: z.string().optional().default(''),
    
    // ROUND die specific fields
    punched_size: z.coerce.number().positive('Punched size must be positive'),
    current_size: z.coerce.number().positive('Current size must be positive'),
  }),
  z.object({
    die_id: z.string()
      .min(1, 'Die ID is required')
      .max(50, 'Die ID must be 50 characters or less')
      .regex(/^[a-zA-Z0-9_\-./]+$/, 'Die ID can only contain alphanumeric characters, hyphens, underscores, dots, and slashes'),
    die_type: z.literal('FLAT'),
    casing: z.string().min(1, 'Casing is required'),
    status: z.enum(DIE_STATUSES),
    current_set: z.number().nullable().optional(),
    rack: z.number().nullable().optional(),
    shelf: z.number().nullable().optional(),
    remarks: z.string().optional().default(''),
    
    // FLAT die specific fields
    punched_width: z.coerce.number().positive('Punched width must be positive'),
    current_width: z.coerce.number().positive('Current width must be positive'),
    punched_thickness: z.coerce.number().positive('Punched thickness must be positive'),
    current_thickness: z.coerce.number().positive('Current thickness must be positive'),
    radius: z.coerce.number().positive('Radius must be positive'),
  })
])

export type DieCreateFormData = z.infer<typeof DieCreateSchema>

/**
 * Validates die creation payload against schema
 * @param data - Form data to validate
 * @returns { success: boolean, errors?: Record<string, string> }
 */
export function validateDieCreate(data: unknown) {
  const result = DieCreateSchema.safeParse(data)
  
  if (!result.success) {
    const errors: Record<string, string> = {}
    result.error.issues.forEach(err => {
      const path = err.path.join('.')
      errors[path] = err.message
    })
    return { success: false, errors }
  }
  
  return { success: true, data: result.data }
}
