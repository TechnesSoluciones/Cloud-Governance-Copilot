export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  tenantName?: string; // For first user (creates tenant)
}

export interface LoginDto {
  email: string;
  password: string;
  mfaToken?: string; // Optional MFA token for two-factor authentication
}

export interface JwtPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
    tenantId: string;
    emailVerified?: boolean;
    mfaEnabled?: boolean;
  };
  tokens: AuthTokens;
  requiresMFA?: boolean; // Indicates MFA token is required for login
}

export interface RefreshTokenDto {
  refreshToken: string;
}
