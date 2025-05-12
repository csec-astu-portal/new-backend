import smtpService from "./smtp.service";

/**
 * Service for handling password reset functionality
 */
class PasswordResetService {
  /**
   * Sends a password reset email with OTP
   * @param email User's email address
   * @param name User's name
   * @param otp One-time password for verification
   * @returns Promise<boolean> Success status
   */
  public async sendPasswordResetEmail(email: string, name: string, otp: string): Promise<boolean> {
    try {
      console.log(`📧 Sending password reset email to ${email} with OTP: ${otp}`);
      
      // Get the email transporter
      const transporter = await smtpService.getTransporter();
      
      // Create email content with a professional template
      const html = this.createPasswordResetTemplate(name, otp);
      
      // Send the email
      const result = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"CSEC ASTU Portal" <temkinabdulmelik@gmail.com>',
        to: email,
        subject: 'CSEC ASTU Portal - Password Reset',
        html
      });
      
      console.log(`📧 Password reset email sent to ${email}: ${result.response}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      return false;
    }
  }
  
  /**
   * Creates a professional password reset email template
   * @param name User's name
   * @param otp One-time password
   * @returns HTML email template
   */
  private createPasswordResetTemplate(name: string, otp: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2c3e50; margin-bottom: 5px;">CSEC ASTU Portal</h1>
          <p style="color: #7f8c8d;">Password Reset</p>
          <div style="height: 3px; background: linear-gradient(to right, #3498db, #e74c3c); width: 100px; margin: 15px auto;"></div>
        </div>
        
        <h2 style="color: #2c3e50; text-align: center;">🔐 Reset Your Password</h2>
        
        <p>Hello <b>${name}</b>,</p>
        
        <p>We received a request to reset your password for the CSEC ASTU Portal. Use the verification code below to reset your password:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Password Reset Code</h3>
          <div style="font-family: monospace; font-size: 24px; background-color: #ffffff; padding: 10px; border-radius: 4px; display: inline-block; margin: 10px 0; color: #2c3e50; font-weight: bold;">${otp}</div>
          <p style="margin: 10px 0 0 0; font-size: 14px;">This code will expire in 60 minutes</p>
        </div>
        
        <p>If you did not request a password reset, please ignore this email or contact the administrator if you have concerns.</p>
        
        <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
          <p style="color: #7f8c8d; font-size: 14px;">CSEC ASTU Team</p>
          <p style="color: #7f8c8d; font-size: 12px;">Adama Science and Technology University</p>
        </div>
      </div>
    `;
  }
}

// Export as singleton
export const passwordResetService = new PasswordResetService();
export default passwordResetService;
