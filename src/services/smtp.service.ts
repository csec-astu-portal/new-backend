import nodemailer from 'nodemailer';

class SMTPError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'SMTPError';
  }
}

class SMTPService {
  private static instance: SMTPService;
  private transporter: nodemailer.Transporter | null = null;
  private isInitialized = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastChecked: Date | null = null;
  private lastError: string | null = null;
  private retryCount = 0;
  private maxRetries = 3;

  private constructor() {}

  public static getInstance(): SMTPService {
    if (!SMTPService.instance) {
      SMTPService.instance = new SMTPService();
    }
    return SMTPService.instance;
  }

  public async getTransporter(): Promise<nodemailer.Transporter> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    if (!this.transporter) {
      throw new SMTPError('SMTP transporter not initialized');
    }
    return this.transporter;
  }

  public getStatus() {
    return {
      isValid: this.isInitialized,
      lastChecked: this.lastChecked,
      lastError: this.lastError
    };
  }

  public async startMonitoring(): Promise<void> {
    if (this.monitoringInterval) return;
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.initialize();
        this.lastChecked = new Date();
        this.lastError = null;
        console.log('📧 SMTP service health check passed');
      } catch (e: any) {
        this.lastChecked = new Date();
        this.lastError = e.message;
        console.error(`📧 SMTP service health check failed: ${e.message}`);
      }
    }, 5 * 60 * 1000); // 5 minutes
    console.log('📧 SMTP monitoring started');
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('📧 SMTP monitoring stopped');
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized && this.transporter) {
      console.log('📧 SMTP service already initialized');
      return;
    }

    try {
      // Log email configuration (without password)
      console.log(`📧 Email Configuration: 
        - HOST: ${process.env.EMAIL_HOST || 'smtp.gmail.com'}
        - PORT: ${process.env.EMAIL_PORT || '465'}
        - USER: ${process.env.EMAIL_USER || 'temkinabdulmelik@gmail.com'}
        - FROM: ${process.env.EMAIL_FROM || 'CSEC ASTU <temkinabdulmelik@gmail.com>'}
      `);
      
      // Get email credentials from environment variables
      const email = process.env.EMAIL_USER || 'temkinabdulmelik@gmail.com';
      const password = process.env.EMAIL_PASS;
      
      if (!password) {
        console.error('❌ EMAIL_PASS is not set in environment variables');
        throw new SMTPError('EMAIL_PASS is not set');
      }
      
      console.log(`📧 Creating SMTP transport for: ${email}`);
      
      // Always use Gmail configuration for reliability
      console.log('📧 Using Gmail service configuration');
      
      // Use Gmail for sending emails
      console.log(`📧 Using Gmail service for sending emails`);
      
      // Create Gmail transporter with optimized anti-spam settings
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: email,
          pass: password
        },
        tls: {
          rejectUnauthorized: false
        },
        debug: true, // Enable debug output
        logger: true, // Log information to the console
        pool: true,   // Use connection pooling for better performance
        maxConnections: 3, // Limit to 3 simultaneous connections
        maxMessages: 50    // Limit to 50 messages per connection
      });
      
      // Apply rate limiting if possible
      if (this.transporter && typeof this.transporter.set === 'function') {
        try {
          // Set rate limiting to prevent triggering spam filters
          this.transporter.set('rate', {
            limit: 3,           // 3 messages per interval
            interval: 30 * 1000 // 30 seconds
          });
        } catch (error) {
          console.log('Could not set rate limiting, but continuing anyway');
        }
      }
      
      // Log detailed configuration for debugging
      console.log(`📧 SMTP Configuration Details:`);
      console.log(`- Service: Gmail`);
      console.log(`- Host: smtp.gmail.com`);
      console.log(`- Port: 587`);
      console.log(`- Auth User: ${email}`);
      console.log(`- Auth Pass: ${'*'.repeat(8)} (hidden for security)`);
      console.log(`- TLS: Enabled`);
      console.log(`- Self-Signed Certs: Accepted`);
      console.log(`- Debug: Enabled`);
      console.log(`- Logger: Enabled`);
      console.log(`- Connection Pooling: Enabled`);
      console.log(`- Max Connections: 3`);
      console.log(`- Max Messages Per Connection: 50`);
      console.log(`- Socket Timeout: 60000ms`);
      console.log(`- From Address: ${process.env.EMAIL_FROM || 'CSEC ASTU Portal <temkinabdulmelik@gmail.com>'}`);
      
      // Define the from address using the email
      const from = `"CSEC ASTU" <${email}>`;
      
      // Log the email configuration
      console.log(`📧 Gmail configuration: ${email}`);
      console.log(`📧 Using port: 587 (TLS enabled)`);
      
      // Set default options for all emails with improved anti-spam settings
      this.transporter.use('compile', (mail, callback) => {
        mail.data.from = from;
        
        // Initialize headers if undefined
        if (!mail.data.headers) {
          mail.data.headers = {};
        }
        
        // Generate a unique message ID to prevent duplicates
        const messageId = `${Date.now()}.${Math.random().toString(36).substring(2, 15)}@gmail.com`;
        
        // Set message ID
        mail.data.messageId = `<${messageId}>`;
        
        // Add anti-spam headers that improve deliverability
        if (mail.data.headers) {
          // Add minimal headers that don't trigger spam filters
          // Use type assertion to avoid TypeScript errors
          const headers = mail.data.headers as Record<string, string>;
          headers['X-Mailer'] = 'CSEC ASTU Portal';
          headers['List-Unsubscribe'] = '<mailto:unsubscribe@gmail.com>';
          headers['X-Entity-Ref-ID'] = messageId;
        }
        
        // Set normal priority (high priority can trigger spam filters)
        mail.data.priority = 'normal';
        
        // Always include plain text version
        if (mail.data.html && !mail.data.text) {
          if (typeof mail.data.html === 'string') {
            mail.data.text = mail.data.html
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          }
        }
        
        callback();
      });
      
      console.log(`📧 Gmail configuration: ${email}`);
      console.log(`📧 Using port: 465 (SSL enabled)`);
      
      // Verify connection
      console.log('📧 Verifying SMTP connection...');
      await this.transporter.verify();
      console.log('✅ SMTP connection verified successfully');
      
      this.isInitialized = true;
      this.retryCount = 0;
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ SMTP Initialization Error: ${message}`);
      
      if (error.code) {
        console.error(`❌ Error Code: ${error.code}`);
      }
      
      this.isInitialized = false;
      this.transporter = null;
      
      // Try to provide helpful troubleshooting information
      if (error.code === 'EAUTH') {
        console.error('❌ Authentication failed. Check your email and password.');
      } else if (error.code === 'ESOCKET') {
        console.error('❌ Socket error. Check your host and port settings.');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('❌ Connection refused. The mail server is not accepting connections.');
      }
      
      throw new SMTPError(`Failed to initialize SMTP service: ${message}`, error.code);
    }
  }

  public async sendMail(mailOptions: nodemailer.SendMailOptions): Promise<any> {
    // Add anti-spam measures to all outgoing emails
    if (!mailOptions.headers) {
      mailOptions.headers = {};
    }
    
    // Add text version if only HTML is provided (improves deliverability)
    if (mailOptions.html && !mailOptions.text) {
      // Create a simple text version by stripping HTML tags
      if (typeof mailOptions.html === 'string') {
        mailOptions.text = mailOptions.html.replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      } else {
        // If html is not a string, set a default text version
        mailOptions.text = 'Please view this email in an HTML-capable email client.';
      }
    }
    
    // Add a proper subject if missing
    if (!mailOptions.subject) {
      mailOptions.subject = 'Important Information from CSEC ASTU Portal';
    }
    
    // Ensure proper encoding
    mailOptions.encoding = 'utf-8';
    
    if (!this.isInitialized || !this.transporter) {
      console.log('📧 SMTP service not initialized, attempting to initialize...');
      try {
        await this.initialize();
      } catch (error: any) {
        console.error(`❌ Failed to initialize SMTP service: ${error.message}`);
        throw new SMTPError('SMTP service initialization failed');
      }
    }

    try {
      console.log(`📧 Sending email to: ${mailOptions.to}`);
      console.log(`📧 Email subject: ${mailOptions.subject || 'No subject'}`);
      
      // Make sure we have a from address
      if (!mailOptions.from) {
        mailOptions.from = process.env.EMAIL_FROM || `CSEC ASTU <${process.env.EMAIL_USER}>`;
        console.log(`📧 Using default from address: ${mailOptions.from}`);
      }
      
      const info = await this.transporter!.sendMail(mailOptions);
      console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);
      return info;
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to send email: ${message}`);
      
      // Log more detailed error information
      if (error.code) {
        console.error(`❌ Error Code: ${error.code}`);
      }
      
      if (error.response) {
        console.error(`❌ SMTP Response: ${error.response}`);
      }
      
      // Try to reinitialize and retry if we haven't exceeded max retries
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`📧 Retrying email send (attempt ${this.retryCount} of ${this.maxRetries})...`);
        this.isInitialized = false;
        this.transporter = null;
        await this.initialize();
        return this.sendMail(mailOptions);
      }
      
      throw new SMTPError(`Failed to send email: ${message}`, error.code);
    }
  }

  public async reload(): Promise<void> {
    console.log('📧 Reloading SMTP service...');
    this.isInitialized = false;
    this.transporter = null;
    this.retryCount = 0;
    await this.initialize();
    console.log('📧 SMTP service reloaded successfully');
  }
}

export const smtpService = SMTPService.getInstance(); 
export default smtpService;