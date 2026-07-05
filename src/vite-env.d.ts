/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLUB_SLUG: string;
  readonly VITE_BOOKING_API_URL: string;
  readonly VITE_BOOKING_APP_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
