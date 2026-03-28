export interface AuthUser {
  email: string;
  name: string;
  picture?: string;
}

export interface BackendAuthResponse {
  accessToken: string;
  user: AuthUser;
}
