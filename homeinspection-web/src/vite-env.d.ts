/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_AUTH_MODE: string;
  readonly VITE_MOCK_AUTH_HEADER_NAME: string;
  readonly VITE_MOCK_AUTH_HEADER_VALUE: string;
  readonly VITE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
