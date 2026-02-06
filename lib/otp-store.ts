// Shared OTP store for registration
// In production, replace with Redis or database storage

interface OTPData {
  otp: string;
  expiresAt: number;
  attempts: number;
  firstName?: string;
  lastName?: string;
  password?: string;
}

class OTPStore {
  private store = new Map<string, OTPData>();

  set(email: string, data: OTPData): void {
    this.store.set(email.toLowerCase(), data);
  }

  get(email: string): OTPData | undefined {
    return this.store.get(email.toLowerCase());
  }

  delete(email: string): boolean {
    return this.store.delete(email.toLowerCase());
  }

  has(email: string): boolean {
    return this.store.has(email.toLowerCase());
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton instance
export const otpStore = new OTPStore();

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    otpStore.cleanup();
  }, 5 * 60 * 1000);
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_OTP_ATTEMPTS = 3;
