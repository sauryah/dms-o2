export const DIE_TYPES = ['ROUND', 'FLAT'] as const
export type DieType = typeof DIE_TYPES[number]

export const DIE_STATUSES = [
  'AVAILABLE',
  'RUNNING',
  'CLEANING',
  'POLISHING',
  'DAMAGED',
  'SCRAPPED',
  'MISSING',
  'MAINTENANCE',
] as const
export type DieStatus = typeof DIE_STATUSES[number]

export const DIE_ACTIVE_STATUSES = [
  'AVAILABLE',
  'RUNNING',
  'CLEANING',
  'POLISHING',
] as const

export const DIE_WORKFLOW_EVENT_TYPES = [
  'die_update',
  'set_update',
  'machine_update',
  'backup_update',
] as const
export type DieWorkflowEventType = typeof DIE_WORKFLOW_EVENT_TYPES[number]

export const DIE_UPDATE_EVENT = DIE_WORKFLOW_EVENT_TYPES[0]
export const SET_UPDATE_EVENT = DIE_WORKFLOW_EVENT_TYPES[1]
export const MACHINE_UPDATE_EVENT = DIE_WORKFLOW_EVENT_TYPES[2]
export const BACKUP_UPDATE_EVENT = DIE_WORKFLOW_EVENT_TYPES[3]

export const DIE_WORKFLOW_ACTIONS = [
  'save',
  'delete',
  'bulk_import',
  'backup',
  'restore',
  'upload',
] as const

export const DIE_SAVE_ACTION = DIE_WORKFLOW_ACTIONS[0]
export const DIE_DELETE_ACTION = DIE_WORKFLOW_ACTIONS[1]
export const DIE_BULK_IMPORT_ACTION = DIE_WORKFLOW_ACTIONS[2]
export const BACKUP_CREATE_ACTION = DIE_WORKFLOW_ACTIONS[3]
export const BACKUP_RESTORE_ACTION = DIE_WORKFLOW_ACTIONS[4]
export const BACKUP_UPLOAD_ACTION = DIE_WORKFLOW_ACTIONS[5]
