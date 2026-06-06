// ─── App-wide TypeScript Type Definitions ────────────────────────────────────

// Navigation
export type RootParamList = {
  '(tabs)': undefined;
  '(auth)': undefined;
  '+not-found': undefined;
};

// Theme
export type ColorScheme = 'light' | 'dark';

// API
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// User
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// Auth
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Error
export interface AppError {
  message: string;
  code?: string;
  status?: number;
}
