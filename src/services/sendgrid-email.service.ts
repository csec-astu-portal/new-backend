import axios from 'axios';

/**
 * SendGrid Email Service
 * Uses SendGrid API for professional emails with high deliverability
 * SendGrid specializes in ensuring emails don't go to spam
 */
export class SendGridEmailService {
  private static instance: SendGridEmailService;
  private initialized = false;
  private readonly apiKey: string;
  private readonly fromEmail: string;
  
  private constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || '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';
    this.fromEmail = process.env.EMAIL_FROM || 'temkinabdulmelik@gmail.com';
  }

  public static getInstance(): SendGridEmailService {
    if (!SendGridEmailService.instance) {
      SendGridEmailService.instance = new SendGridEmailService();
    }
    return SendGridEmailService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('📧 Initializing SendGrid email service...');
      // No need for connection verification with SendGrid API
      this.initialized = true;
      console.log('✅ SendGrid email service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SendGrid email service:', error);
      throw error;
    }
  }

  public async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Create plain text version if not provided
      if (!options.text && typeof options.html === 'string') {
        options.text = options.html
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      console.log(`📧 Sending email to ${options.to}`);
      
      // Use SendGrid API for better deliverability
      await axios.post('https://api.sendgrid.com/v3/mail/send', {
        personalizations: [
          {
            to: [{ email: options.to }],
            subject: options.subject,
          },
        ],
        from: { email: this.fromEmail, name: 'CSEC ASTU Portal' },
        content: [
          {
            type: 'text/plain',
            value: options.text,
          },
          {
            type: 'text/html',
            value: options.html,
          },
        ],
        tracking_settings: {
          click_tracking: { enable: true },
          open_tracking: { enable: true },
        },
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`✅ Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      console.error('Error details:', error.response?.data || error.message);
      return false;
    }
  }

  // Helper method for welcome emails
  public async sendWelcomeEmail(
    email: string,
    name: string,
    role: string,
    password: string,
    memberId: string,
    otp: string,
    studentId: string
  ): Promise<boolean> {
    const subject = 'Welcome to CSEC ASTU Portal';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to CSEC ASTU Portal</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #2c3e50; margin-bottom: 5px; font-size: 24px;">CSEC ASTU</h1>
              <p style="color: #7f8c8d; font-size: 14px; margin-top: 0;">Computer Science and Engineering Club</p>
              <div style="height: 3px; background: linear-gradient(to right, #3498db, #2ecc71); width: 100px; margin: 15px auto;"></div>
            </div>
            
            <div style="text-align: center; margin-bottom: 25px;">
              <span style="font-size: 60px;">🎉</span>
              <h2 style="color: #2c3e50; text-align: center; font-size: 24px; margin-top: 10px;">WELCOME TO CSEC ASTU!</h2>
              <p style="color: #2c3e50; font-size: 18px; font-weight: bold;">Your tech journey begins here! 🚀</p>
            </div>
            
            <p style="color: #34495e; font-size: 16px;">Hello <b>${name}</b>,</p>
            
            <p style="color: #34495e; line-height: 1.8;">We're thrilled to welcome you to the Computer Science and Engineering Club at Adama Science and Technology University! You have been registered as a <b>${role}</b> in our amazing community. Get ready for an exciting journey! ✨</p>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 25px; margin: 25px 0; color: #fff; text-align: center;">
              <p style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">“The only way to do great work is to love what you do.”</p>
              <p style="font-size: 14px; margin: 0;">- Steve Jobs</p>
            </div>
            
            <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0;">
              <h3 style="color: #2c3e50; margin-top: 0; font-size: 20px; text-align: center; margin-bottom: 20px;">🔑 Your Account Credentials 🔑</h3>
              <p style="margin: 10px 0; font-size: 16px;"><strong>📧 Email:</strong> ${email}</p>
              <p style="margin: 10px 0; font-size: 16px;"><strong>🔐 Password:</strong> ${password}</p>
              <p style="margin: 10px 0; font-size: 16px;"><strong>🎓 Student ID:</strong> ${studentId}</p>
              <p style="margin: 10px 0; font-size: 16px;"><strong>💻 Member ID:</strong> ${memberId}</p>
            </div>
            
            <div style="background-color: #ebf5fb; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
              <h3 style="color: #2980b9; margin-top: 0; font-size: 22px;">🔒 Your Verification Code 🔒</h3>
              <div style="font-family: monospace; font-size: 32px; background-color: #ffffff; padding: 20px; border-radius: 8px; display: inline-block; margin: 15px 0; color: #2c3e50; font-weight: bold; letter-spacing: 5px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">${otp}</div>
              <p style="color: #34495e; margin: 15px 0 0 0; font-size: 16px;">Use this code to verify your account during first login 🔓</p>
            </div>
            
            <p style="color: #34495e; line-height: 1.8; text-align: center;">Please save these credentials and change your password after your first login. We're excited to have you join our community of tech enthusiasts! 💪</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 18px; font-weight: bold; color: #3498db; margin-bottom: 10px;">“The best way to predict the future is to create it.”</p>
              <p style="color: #7f8c8d; font-size: 14px;">- Abraham Lincoln</p>
            </div>
            
            <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
              <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 5px;">CSEC ASTU Team 💻</p>
              <p style="color: #7f8c8d; font-size: 12px; margin-top: 5px;">Adama Science and Technology University</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  // Helper method for division head emails
  public async sendDivisionHeadEmail(
    email: string,
    name: string,
    division: string
  ): Promise<boolean> {
    // Get division-specific content
    let divisionSpecificContent = '';
    switch(division.toUpperCase()) {
      case 'CPD':
      case 'COMPETITIVE PROGRAMMING':
        divisionSpecificContent = 'Lead the competitive programming initiatives and help members excel in problem-solving competitions.';
        break;
      case 'DEV':
      case 'DEVELOPMENT':
        divisionSpecificContent = 'Guide the development of innovative software solutions and mentor members in modern development practices.';
        break;
      case 'CYBER':
      case 'CYBERSECURITY':
        divisionSpecificContent = 'Oversee cybersecurity training, organize CTF competitions, and build a strong security-focused community.';
        break;
      case 'CBD':
      case 'CAPACITY BUILDING':
        divisionSpecificContent = 'Coordinate workshops, training sessions, and skill development programs for all CSEC members.';
        break;
      case 'DATA_SCIENCE':
      case 'DATA SCIENCE':
        divisionSpecificContent = 'Lead data science initiatives, organize machine learning projects, and foster a data-driven culture.';
        break;
      default:
        divisionSpecificContent = 'Lead your division with excellence and help members achieve their full potential.';
    }
    
    const subject = `Congratulations! You're now the Head of ${division} Division`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Congratulations on Your Division Head Appointment</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #2c3e50; margin-bottom: 5px; font-size: 24px;">CSEC ASTU</h1>
              <p style="color: #7f8c8d; font-size: 14px; margin-top: 0;">Computer Science and Engineering Club</p>
              <div style="height: 3px; background: linear-gradient(to right, #3498db, #9b59b6); width: 100px; margin: 15px auto;"></div>
            </div>
            
            <div style="text-align: center; margin-bottom: 25px;">
              <span style="font-size: 60px;">🎉</span>
              <h2 style="color: #2c3e50; text-align: center; font-size: 24px; margin-top: 10px;">CONGRATULATIONS!</h2>
              <p style="color: #2c3e50; font-size: 18px; font-weight: bold;">You're now a Division Head! 🚀</p>
            </div>
            
            <p style="color: #34495e; font-size: 16px;">Dear <b>${name}</b>,</p>
            
            <p style="color: #34495e; line-height: 1.8;">You have been officially appointed as the <b>Head of the ${division} Division</b> at CSEC ASTU! This is a recognition of your exceptional skills, dedication, and leadership potential. We believe in you! ✨</p>
            
            <p style="color: #34495e; line-height: 1.8;">${divisionSpecificContent}</p>
            
            <div style="background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); border-radius: 12px; padding: 25px; margin: 25px 0; color: #fff; text-align: center;">
              <p style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">"Leadership is not about being in charge. It's about taking care of those in your charge."</p>
              <p style="font-size: 14px; margin: 0;">- Simon Sinek</p>
            </div>
            
            <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0;">
              <h3 style="color: #2c3e50; margin-top: 0; font-size: 20px; text-align: center; margin-bottom: 20px;">Your Exciting Responsibilities:</h3>
              <ul style="color: #34495e; line-height: 1.8; padding-left: 15px;">
                <li><b>🚀 Team Management:</b> Lead and inspire your division members</li>
                <li><b>📊 Project Oversight:</b> Coordinate division projects and initiatives</li>
                <li><b>🗣️ Communication:</b> Represent your division in club meetings</li>
                <li><b>🌱 Mentorship:</b> Guide and develop the skills of your team members</li>
                <li><b>🎯 Strategic Planning:</b> Set goals and direction for your division</li>
                <li><b>🔄 Collaboration:</b> Work with other division heads on cross-division initiatives</li>
              </ul>
            </div>

            <p style="color: #34495e; line-height: 1.8;">The President and the entire CSEC community have confidence in your ability to lead this division to new heights. We're excited to see what you'll accomplish! 💫</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 18px; font-weight: bold; color: #3498db; margin-bottom: 10px;">"The future belongs to those who believe in the beauty of their dreams."</p>
              <p style="color: #7f8c8d; font-size: 14px;">- Eleanor Roosevelt</p>
            </div>
            
            <p style="color: #34495e; line-height: 1.8;">Please log in to the CSEC ASTU Portal to access your division management dashboard and start your leadership journey. We're with you every step of the way! 🌟</p>
            
            <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
              <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 5px;">CSEC ASTU Team 💻</p>
              <p style="color: #7f8c8d; font-size: 12px; margin-top: 5px;">Adama Science and Technology University</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  // Helper method for division member emails
  public async sendDivisionMemberEmail(
    email: string,
    name: string,
    division: string,
    divisionHead: string = 'Division Head'
  ): Promise<boolean> {
    // Get division-specific content
    let divisionSpecificContent = '';
    switch(division.toUpperCase()) {
      case 'CPD':
      case 'COMPETITIVE PROGRAMMING':
        divisionSpecificContent = 'You\'ll be part of a team focused on algorithmic problem-solving, competitive programming contests, and developing efficient coding skills.';
        break;
      case 'DEV':
      case 'DEVELOPMENT':
        divisionSpecificContent = 'You\'ll be working on real-world software development projects, learning modern frameworks, and building practical applications.';
        break;
      case 'CYBER':
      case 'CYBERSECURITY':
        divisionSpecificContent = 'You\'ll explore cybersecurity concepts, participate in CTF competitions, and learn about ethical hacking and security practices.';
        break;
      case 'CBD':
      case 'CAPACITY BUILDING':
        divisionSpecificContent = 'You\'ll help organize training sessions, workshops, and skill development programs for all CSEC members.';
        break;
      case 'DATA_SCIENCE':
      case 'DATA SCIENCE':
        divisionSpecificContent = 'You\'ll work with data analysis, machine learning, and AI projects to solve real-world problems using data-driven approaches.';
        break;
      default:
        divisionSpecificContent = 'You\'ll be part of an exciting team working on innovative projects and developing valuable skills.';
    }
    
    const subject = `Welcome to the ${division} Division at CSEC ASTU`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to the ${division} Division</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #2c3e50; margin-bottom: 5px; font-size: 24px;">CSEC ASTU</h1>
              <p style="color: #7f8c8d; font-size: 14px; margin-top: 0;">Computer Science and Engineering Club</p>
              <div style="height: 3px; background: linear-gradient(to right, #2ecc71, #3498db); width: 100px; margin: 15px auto;"></div>
            </div>
            
            <div style="text-align: center; margin-bottom: 25px;">
              <span style="font-size: 60px;">🌟</span>
              <h2 style="color: #2c3e50; text-align: center; font-size: 24px; margin-top: 10px;">WELCOME ABOARD!</h2>
              <p style="color: #2c3e50; font-size: 18px; font-weight: bold;">You're now part of the ${division} Division! 🚀</p>
            </div>
            
            <p style="color: #34495e; font-size: 16px;">Hello <b>${name}</b>,</p>
            
            <p style="color: #34495e; line-height: 1.8;">You have been added to the <b>${division} Division</b> at CSEC ASTU! We're thrilled to have you join our amazing team! 🎉</p>
            
            <div style="background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%); border-radius: 12px; padding: 25px; margin: 25px 0; color: #333; text-align: center;">
              <p style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">“Talent wins games, but teamwork and intelligence win championships.”</p>
              <p style="font-size: 14px; margin: 0;">- Michael Jordan</p>
            </div>
            
            <p style="color: #34495e; line-height: 1.8;">${divisionSpecificContent}</p>
            
            <p style="color: #34495e; line-height: 1.8;">Your division head is <b>${divisionHead}</b>, who will guide you through division activities and projects. They're excited to work with you! 💪</p>
            
            <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0;">
              <h3 style="color: #2c3e50; margin-top: 0; font-size: 20px; text-align: center; margin-bottom: 20px;">Amazing Benefits You'll Enjoy:</h3>
              <ul style="color: #34495e; line-height: 1.8; padding-left: 15px;">
                <li><b>👋 Specialized Training:</b> Access to focused workshops and learning resources</li>
                <li><b>🚀 Hands-on Projects:</b> Work on real-world projects in your area of interest</li>
                <li><b>📚 Skill Development:</b> Build technical and soft skills relevant to your division</li>
                <li><b>👥 Networking:</b> Connect with like-minded peers and industry professionals</li>
                <li><b>🌱 Growth Opportunities:</b> Potential for leadership roles within your division</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 18px; font-weight: bold; color: #2ecc71; margin-bottom: 10px;">“The beginning is the most important part of the work.”</p>
              <p style="color: #7f8c8d; font-size: 14px;">- Plato</p>
            </div>

            <p style="color: #34495e; line-height: 1.8;">We're super excited to have you as part of the team! Please log in to the CSEC ASTU Portal to access division resources and upcoming activities. Your journey to greatness starts now! ✨</p>
            
            <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
              <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 5px;">CSEC ASTU Team 💻</p>
              <p style="color: #7f8c8d; font-size: 12px; margin-top: 5px;">Adama Science and Technology University</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  // Helper method for verification emails
  public async sendVerificationEmail(email: string, otp: string): Promise<boolean> {
    const subject = 'CSEC ASTU Portal - Email Verification';
    // Create HTML email template
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CSEC ASTU Portal - Email Verification</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #2c3e50; margin-bottom: 5px; font-size: 24px;">CSEC ASTU</h1>
              <p style="color: #7f8c8d; font-size: 14px; margin-top: 0;">Computer Science and Engineering Club</p>
              <div style="height: 3px; background: linear-gradient(to right, #e74c3c, #f39c12); width: 100px; margin: 15px auto;"></div>
            </div>
            
            <div style="text-align: center; margin-bottom: 25px;">
              <span style="font-size: 60px;">🔒</span>
              <h2 style="color: #2c3e50; text-align: center; font-size: 24px; margin-top: 10px;">VERIFY YOUR EMAIL</h2>
              <p style="color: #2c3e50; font-size: 18px; font-weight: bold;">You're almost there! 🚀</p>
            </div>
            
            <p style="color: #34495e; line-height: 1.8;">You've requested to verify your email for the CSEC ASTU Portal. One quick step and you'll be ready to explore all the amazing opportunities waiting for you! ✨</p>
            
            <div style="background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); border-radius: 12px; padding: 25px; margin: 25px 0; color: #fff; text-align: center;">
              <p style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">“The future belongs to those who prepare for it today.”</p>
              <p style="font-size: 14px; margin: 0;">- Malcolm X</p>
            </div>
            
            <div style="background-color: #ebf5fb; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
              <h3 style="color: #2980b9; margin-top: 0; font-size: 22px;">🔑 Your Verification Code 🔑</h3>
              <div style="font-family: monospace; font-size: 32px; background-color: #ffffff; padding: 20px; border-radius: 8px; display: inline-block; margin: 15px 0; color: #2c3e50; font-weight: bold; letter-spacing: 5px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">${otp}</div>
              <p style="color: #34495e; margin: 15px 0 0 0; font-size: 16px;">Enter this code to activate your account 🚀</p>
            </div>
            
            <p style="color: #34495e; line-height: 1.8; text-align: center;">By verifying your email, you're taking the first step in your journey with CSEC ASTU. We can't wait to see what you'll accomplish! 🌟</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 16px; color: #7f8c8d;">If you did not request this verification, please ignore this email.</p>
            </div>
            
            <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
              <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 5px;">CSEC ASTU Team 💻</p>
              <p style="color: #7f8c8d; font-size: 12px; margin-top: 5px;">Adama Science and Technology University</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

  /**
   * Helper method for password reset emails
   * @param email User's email address
   * @param name User's name
   * @param otp One-time password for resetting password
   * @returns Promise resolving to boolean indicating success
   */
  public async sendPasswordResetEmail(email: string, name: string, otp: string): Promise<boolean> {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?otp=${otp}&email=${encodeURIComponent(email)}`;
    const subject = 'CSEC ASTU Portal - Password Reset';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CSEC ASTU Portal - Password Reset</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #2c3e50; margin-bottom: 5px; font-size: 24px;">CSEC ASTU</h1>
              <p style="color: #7f8c8d; font-size: 14px; margin-top: 0;">Computer Science and Engineering Club</p>
              <div style="height: 3px; background: linear-gradient(to right, #3498db, #e74c3c); width: 100px; margin: 15px auto;"></div>
            </div>
            
            <div style="text-align: center; margin-bottom: 25px;">
              <span style="font-size: 60px;">🔐</span>
              <h2 style="color: #2c3e50; text-align: center; font-size: 24px; margin-top: 10px;">PASSWORD RESET</h2>
              <p style="color: #2c3e50; font-size: 18px; font-weight: bold;">We've got you covered! 🛡️</p>
            </div>
            
            <p style="color: #34495e; font-size: 16px;">Hello <b>${name}</b>,</p>
            
            <p style="color: #34495e; line-height: 1.8;">We received a request to reset your password for the CSEC ASTU Portal. If you didn't make this request, you can safely ignore this email. ✨</p>
            
            <div style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); border-radius: 12px; padding: 25px; margin: 25px 0; color: #fff; text-align: center;">
              <p style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">"Security is not something you buy, it's something you do."</p>
              <p style="font-size: 14px; margin: 0;">- Bruce Schneier</p>
            </div>
            
            <p style="color: #34495e; line-height: 1.8; text-align: center;">To reset your password, click the button below. This link is valid for 1 hour.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">Reset My Password 🔑</a>
            </div>
            
            <p style="color: #34495e; line-height: 1.8;">If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="background-color: #f8f9fa; padding: 12px; border-radius: 5px; word-break: break-all; font-size: 14px;">${resetLink}</p>
            
            <p style="color: #34495e; line-height: 1.8; text-align: center; margin-top: 30px;">For security reasons, this password reset link will expire in 1 hour. If you need assistance, please contact the CSEC ASTU admin team.</p>
            
            <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
              <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 5px;">CSEC ASTU Team 💻</p>
              <p style="color: #7f8c8d; font-size: 12px; margin-top: 5px;">Adama Science and Technology University</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html
    });
  }

}

// Export singleton instance
export const sendGridEmailService = SendGridEmailService.getInstance();
