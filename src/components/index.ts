/**
 * Components barrel exports
 */

// Feature components
export { AuthProvider } from './AuthProvider'
export { default as BookRecommendations } from './BookRecommendations'
export { default as Navbar } from './Navbar'
export { SearchProvider, useSearchContext } from './SearchProvider'
export { default as SemanticSearch } from './SemanticSearch'

// UI components (re-export from ui barrel)
export {
  Badge,
  Button,
  Card,
  Input,
  Modal
} from './ui'

// Complex feature components
export { default as ManuscriptEditor } from './ManuscriptEditor/ManuscriptEditor'
export { BookReader } from './BookReader'

// Re-export types
export type {
  SearchContextType,
  AuthContextType,
  SemanticSearchProps,
  BookRecommendationsProps
} from '@/types'