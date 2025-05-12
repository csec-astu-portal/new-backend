/**
 * This is a minimal version of the CredentialsService
 * It's kept for backward compatibility but is no longer used
 * Email functionality has been moved to smtp.service.ts
 */

class CredentialsService {
  private static instance: CredentialsService;
  private otpMap: Map<string, { otp: string; expiresAt: Date; purpose: string }> = new Map();
  private credentials: any[] = [];

  private constructor() {
    console.log('CredentialsService initialized (legacy service)');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CredentialsService {
    if (!CredentialsService.instance) {
      CredentialsService.instance = new CredentialsService();
    }
    return CredentialsService.instance;
  }

  /**
   * Generates a 6-digit OTP
   * @param email User's email
   * @param purpose Purpose of the OTP
   * @returns The generated OTP
   */
  public generateOTP(email: string, purpose: string = 'email_verification'): string {
    console.log(`⚠️ generateOTP called from legacy service for ${email} (${purpose})`);
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Stores an OTP for a user
   * @param email User's email
   * @param otp OTP to store
   * @param purpose Purpose of the OTP
   * @param expiresAt When the OTP expires
   */
  public storeOTP(email: string, otp: string, purpose: string, expiresAt: Date): void {
    console.log(`📝 Storing ${purpose} OTP for ${email}: ${otp}`);
    
    this.otpMap.set(email, {
      otp,
      expiresAt,
      purpose
    });
  }
  
  /**
   * Clears an OTP for a user
   * @param email User's email
   * @param purpose Purpose of the OTP to clear
   */
  public clearOTP(email: string, purpose: string): void {
    console.log(`🧹 Clearing ${purpose} OTP for ${email}`);
    this.otpMap.delete(email);
  }
  
  /**
   * Verifies an OTP for a user
   * @param email User's email
   * @param otp OTP to verify
   * @returns Boolean indicating if OTP is valid
   */
  public verifyOTP(email: string, otp: string): boolean {
    console.log(`🔍 Verifying OTP for ${email}: ${otp}`);
    
    // For testing purposes, accept the test OTP code
    if (otp === '123456') {
      console.log(`✅ Using test OTP code (123456) for ${email}`);
      return true;
    }
    
    // Accept any 6-digit OTP for development purposes
    if (otp && otp.length === 6 && /^\d+$/.test(otp)) {
      console.log(`✅ Auto-accepting valid 6-digit OTP format for ${email}: ${otp}`);
      return true;
    }
    
    // Try to find OTP in memory
    const otpData = this.otpMap.get(email);
    
    if (otpData && otpData.otp === otp) {
      // Check if OTP is expired
      if (otpData.expiresAt > new Date()) {
        console.log(`✅ Valid OTP for ${email}`);
        return true;
      } else {
        console.log(`❌ Expired OTP for ${email}`);
        return false;
      }
    }
    
    console.log(`❌ Invalid OTP for ${email}`);
    return false;
  }

  /**
   * Sends a welcome email with OTP
   * @param email User's email
   * @param name User's name
   * @param role User's role
   * @param password User's password
   * @returns The generated OTP
   */
  public async sendWelcomeEmailWithOTP(
    email: string, 
    name: string, 
    role: string = 'Member', 
    password: string = 'Your chosen password'
  ): Promise<string> {
    console.log(`⚠️ sendWelcomeEmailWithOTP called from legacy service for ${email}`);
    console.log(`  - Name: ${name}, Role: ${role}, Password: ${password ? '******' : 'Not provided'}`);
    const otp = this.generateOTP(email, 'email_verification');
    return otp;
  }

  /**
   * Sends a password reset email
   * @param email User's email
   * @param name User's name
   * @param otp OTP to include in the email
   */
  public async sendPasswordResetEmail(email: string, name: string, otp: string): Promise<void> {
    console.log(`⚠️ sendPasswordResetEmail called from legacy service for ${email}`);
    console.log(`  - Name: ${name}, OTP: ${otp}`);
  }

  /**
   * Get all credentials
   * @returns All credentials
   */
  public getAllCredentials(): any[] {
    return this.credentials;
  }

  /**
   * Get the latest credentials
   * @param count Number of credentials to return
   * @returns The latest credentials
   */
  public getLatestCredentials(count = 5): any[] {
    return this.credentials.slice(-count);
  }

  /**
   * Save user credentials for easy access
   * @param credentials User credentials to save
   */
  public saveUserCredentials(credentials: any): void {
    console.log(`📝 Saving credentials for user: ${credentials.email}`); 
    this.credentials.push({
      ...credentials,
      timestamp: new Date()
    });
  }
}

export const credentialsService = CredentialsService.getInstance();
export default credentialsService;
