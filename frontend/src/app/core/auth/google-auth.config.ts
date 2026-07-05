import { AuthConfig } from 'angular-oauth2-oidc';
import { environment } from '../../../environments/environment';

export function getGoogleAuthConfig(): AuthConfig {
  return {
    issuer: 'https://accounts.google.com',
    strictDiscoveryDocumentValidation: false,

    clientId: environment.googleClientId,
    redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/popup-callback` : '',
    scope: 'openid profile email',

    customQueryParams: {
      prompt: 'select_account',
    },

    responseType: 'token id_token',
    showDebugInformation: true,
  };
}
