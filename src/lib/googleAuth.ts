const GOOGLE_OAUTH_SCOPE = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ');

let scriptLoadPromise: Promise<void> | null = null;

export function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('google-identity-services') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google OAuth script.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-identity-services';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google OAuth script.'));
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

export async function requestGoogleAccessToken({
  clientId,
  prompt,
}: {
  clientId: string;
  prompt?: string;
}): Promise<google.accounts.oauth2.TokenResponse> {
  await loadGoogleIdentityScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google OAuth is unavailable in this browser session.');
  }

  return new Promise((resolve, reject) => {
    const tokenClient = window.google!.accounts!.oauth2!.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_OAUTH_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        resolve(response);
      },
    });

    tokenClient.requestAccessToken(prompt !== undefined ? { prompt } : undefined);
  });
}

export async function fetchGoogleUserProfile(accessToken: string) {
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!profileRes.ok) {
    throw new Error('Failed to load Google profile.');
  }

  return (await profileRes.json()) as {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
  };
}