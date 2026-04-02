/// <reference types="vite/client" />

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: google.accounts.oauth2.TokenClientConfig) => google.accounts.oauth2.TokenClient;
        };
      };
    };
  }

  namespace google.accounts.oauth2 {
    interface TokenResponse {
      access_token?: string;
      expires_in?: number;
      scope?: string;
      token_type?: string;
      error?: string;
      error_description?: string;
    }

    interface TokenClient {
      requestAccessToken: (options?: {
        prompt?: string;
        login_hint?: string;
        hint?: string;
      }) => void;
    }

    interface TokenClientConfig {
      client_id: string;
      scope: string;
      callback: (response: TokenResponse) => void;
    }
  }
}

export {};
