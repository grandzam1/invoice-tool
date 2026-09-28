import localConfig from '../../firebase-applet-config.json';

// Safe environment accessor for Vite (import.meta.env) and Node (process.env)
function getEnvVar(key: string, viteKey?: string): string | undefined {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      if (viteKey && typeof import.meta.env[viteKey] === 'string' && import.meta.env[viteKey]) {
        return import.meta.env[viteKey];
      }
      if (typeof import.meta.env[key] === 'string' && import.meta.env[key]) {
        return import.meta.env[key];
      }
      const prefixed = `VITE_${key}`;
      if (typeof import.meta.env[prefixed] === 'string' && import.meta.env[prefixed]) {
        return import.meta.env[prefixed];
      }
    }
  } catch {
    // Ignore access error
  }

  try {
    if (typeof process !== 'undefined' && process.env) {
      if (viteKey && process.env[viteKey]) {
        return process.env[viteKey];
      }
      if (process.env[key]) {
        return process.env[key];
      }
      const prefixed = `VITE_${key}`;
      if (process.env[prefixed]) {
        return process.env[prefixed];
      }
    }
  } catch {
    // Ignore access error
  }

  return undefined;
}

export interface FirebaseResolvedConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId: string;
  oAuthClientId?: string;
}

// Phase 1: Dynamic Firebase configuration resolver
// Resolves from import.meta.env, process.env, local firebase-applet-config.json, or safe fallbacks
export const firebaseConfig: FirebaseResolvedConfig = {
  apiKey:
    getEnvVar('FIREBASE_API_KEY', 'VITE_FIREBASE_API_KEY') ||
    localConfig?.apiKey ||
    '',
  authDomain:
    getEnvVar('FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_AUTH_DOMAIN') ||
    localConfig?.authDomain ||
    `${localConfig?.projectId || 'gen-lang-client-0852371436'}.firebaseapp.com`,
  projectId:
    getEnvVar('FIREBASE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID') ||
    getEnvVar('PROJECT_ID', 'VITE_PROJECT_ID') ||
    localConfig?.projectId ||
    'gen-lang-client-0852371436',
  storageBucket:
    getEnvVar('FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_STORAGE_BUCKET') ||
    localConfig?.storageBucket ||
    `${localConfig?.projectId || 'gen-lang-client-0852371436'}.firebasestorage.app`,
  messagingSenderId:
    getEnvVar('FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_MESSAGING_SENDER_ID') ||
    localConfig?.messagingSenderId ||
    '',
  appId:
    getEnvVar('FIREBASE_APP_ID', 'VITE_FIREBASE_APP_ID') ||
    localConfig?.appId ||
    '',
  measurementId:
    getEnvVar('FIREBASE_MEASUREMENT_ID', 'VITE_FIREBASE_MEASUREMENT_ID') ||
    localConfig?.measurementId ||
    '',
  firestoreDatabaseId:
    getEnvVar('FIRESTORE_DATABASE_ID', 'VITE_FIRESTORE_DATABASE_ID') ||
    localConfig?.firestoreDatabaseId ||
    'ai-studio-753b1d07-1b3b-4094-a920-12aa553ef5c5',
  oAuthClientId:
    getEnvVar('OAUTH_CLIENT_ID', 'VITE_OAUTH_CLIENT_ID') ||
    localConfig?.oAuthClientId ||
    '',
};

// Phase 1.2: Ensure GEMINI_API_KEY and APP_URL resolve cleanly with safe fallback defaults
export const GEMINI_API_KEY: string =
  getEnvVar('GEMINI_API_KEY', 'VITE_GEMINI_API_KEY') ||
  '';

export const APP_URL: string =
  getEnvVar('APP_URL', 'VITE_APP_URL') ||
  (typeof window !== 'undefined' && window.location ? window.location.origin : 'https://localhost:3000');
