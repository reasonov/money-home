export { supabase } from './supabase'
export type { Database, Json } from './database.types'
export {
  getErrorMessage,
  NETWORK_ERROR_MESSAGE,
  OFFLINE_NO_DATA_MESSAGE,
  isMissingCategoryFk,
  isUniqueViolation,
} from './errors'
