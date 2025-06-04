export interface JwtClaims {
  user_id: number;
  project_id?: number;
  exp: number;
  iat: number;
}

export class JwtUtils {
  /**
   * Parse JWT token and extract claims
   */
  static parseToken(token: string): JwtClaims | null {
    try {
      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace("Bearer ", "");

      const base64Url = cleanToken.split(".")[1];
      if (!base64Url) return null;

      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );

      return JSON.parse(jsonPayload) as JwtClaims;
    } catch (error) {
      console.error("Failed to parse JWT token:", error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const claims = this.parseToken(token);
    if (!claims) return true;

    const now = Math.floor(Date.now() / 1000);
    return claims.exp < now;
  }

  /**
   * Check if token has project access
   */
  static hasProjectAccess(token: string): boolean {
    const claims = this.parseToken(token);
    return !!claims?.project_id;
  }

  /**
   * Get user ID from token
   */
  static getUserId(token: string): number | null {
    const claims = this.parseToken(token);
    return claims?.user_id || null;
  }

  /**
   * Get project ID from token
   */
  static getProjectId(token: string): number | null {
    const claims = this.parseToken(token);
    return claims?.project_id || null;
  }

  /**
   * Validate token format and structure
   */
  static isValidTokenFormat(token: string): boolean {
    if (!token) return false;

    const cleanToken = token.replace("Bearer ", "");
    const parts = cleanToken.split(".");

    return parts.length === 3;
  }

  /**
   * Get token expiration date
   */
  static getExpirationDate(token: string): Date | null {
    const claims = this.parseToken(token);
    if (!claims) return null;

    return new Date(claims.exp * 1000);
  }

  /**
   * Check if token will expire soon (within given minutes)
   */
  static willExpireSoon(token: string, minutesThreshold: number = 15): boolean {
    const expirationDate = this.getExpirationDate(token);
    if (!expirationDate) return true;

    const now = new Date();
    const thresholdTime = new Date(
      now.getTime() + minutesThreshold * 60 * 1000,
    );

    return expirationDate <= thresholdTime;
  }
}
