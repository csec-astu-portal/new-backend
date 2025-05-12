import smtpService from "./smtp.service";

// Get transporter from SMTP service
const getTransporter = async () => {
  return smtpService.getTransporter();
};

// Email templates
const emailTemplates = {
  welcome: (name: string, role: string, email: string, password: string, studentId: string, otp: string, memberId: string = 'Not Assigned') => `
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2c3e50; margin-bottom: 5px;">CSEC ASTU</h1>
          <p style="color: #7f8c8d; font-size: 14px; margin-top: 0;">Computer Science and Engineering Club</p>
          <div style="height: 3px; background: linear-gradient(to right, #3498db, #2ecc71); margin: 15px auto; width: 80%;"></div>
        </div>
        
        <h2 style="color: #2c3e50; text-align: center;">Welcome to CSEC ASTU! 🎉</h2>
        
        <p style="color: #34495e; font-size: 16px;">Hello <b>${name}</b>,</p>
        
        <p style="color: #34495e; line-height: 1.8;">We're excited to welcome you to the Computer Science and Engineering Club at Adama Science and Technology University! You have been registered as a <b>${role}</b> in our community of passionate tech enthusiasts, innovators, and future leaders.</p>
        
        <p style="color: #34495e; line-height: 1.8;">As a member, you'll have access to workshops, projects, competitions, and networking opportunities that will enhance your skills and open doors to exciting career possibilities.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
          <h3 style="color: #2c3e50; margin-top: 0; text-align: center; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">Your Account Credentials</h3>
          
          <div style="display: table; width: 100%; margin-top: 15px;">
            <div style="display: table-row;">
              <div style="display: table-cell; padding: 8px; color: #7f8c8d; font-weight: bold; width: 120px;">Email:</div>
              <div style="display: table-cell; padding: 8px; color: #34495e;">${email}</div>
            </div>
            <div style="display: table-row; background-color: #ffffff;">
              <div style="display: table-cell; padding: 8px; color: #7f8c8d; font-weight: bold;">Password:</div>
              <div style="display: table-cell; padding: 8px; color: #34495e;">${password}</div>
            </div>
            <div style="display: table-row;">
              <div style="display: table-cell; padding: 8px; color: #7f8c8d; font-weight: bold;">Student ID:</div>
              <div style="display: table-cell; padding: 8px; color: #34495e;">${studentId}</div>
            </div>
            <div style="display: table-row; background-color: #ffffff;">
              <div style="display: table-cell; padding: 8px; color: #7f8c8d; font-weight: bold;">Member ID:</div>
              <div style="display: table-cell; padding: 8px; color: #34495e;">${memberId}</div>
            </div>
          </div>
        </div>
        
        <div style="background-color: #ebf5fb; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
          <h3 style="color: #2980b9; margin-top: 0;">Your Verification Code</h3>
          <div style="font-family: 'Courier New', monospace; font-size: 32px; letter-spacing: 8px; background-color: #ffffff; padding: 15px; border-radius: 4px; display: inline-block; margin: 10px 0; color: #2c3e50; font-weight: bold; box-shadow: 0 2px 3px rgba(0,0,0,0.1);">${otp}</div>
          <p style="color: #34495e; margin: 10px 0 0 0; font-size: 14px;">Use this code to verify your account during first login</p>
        </div>
        
        <p style="color: #34495e; line-height: 1.8;">Please save these credentials and change your password after your first login. Your journey with CSEC ASTU begins now!</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:5500/login" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; box-shadow: 0 3px 6px rgba(0,0,0,0.1); transition: background-color 0.3s;">Access Your Account</a>
        </div>
        
        <p style="color: #34495e; line-height: 1.8;">If you have any questions or need assistance, our support team is here to help. Feel free to contact us at <a href="mailto:csec.astu@gmail.com" style="color: #3498db;">csec.astu@gmail.com</a>.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 5px;">CSEC ASTU Team</p>
          <p style="color: #7f8c8d; font-size: 12px; margin-top: 5px;">Adama Science and Technology University</p>
        </div>
      </div>
    </body>
    </html>
  `,
  divisionHead: (name: string, division: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 25px; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #2c3e50; margin-bottom: 5px;">🎓 CSEC ASTU</h1>
        <p style="color: #7f8c8d; font-size: 14px; margin-top: 0;">Computer Science and Engineering Club</p>
        <div style="height: 3px; background: linear-gradient(to right, #3498db, #2ecc71); margin: 15px auto; width: 80%;"></div>
      </div>
      
      <h2 style="color: #2c3e50; text-align: center;">🎉 Congratulations on Your New Leadership Role! 🎉</h2>
      
      <p style="color: #34495e; font-size: 1.1em; text-align: center;">Dear <b>${name}</b>,</p>
      
      <div style="background-color: #ebf5fb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <p style="color: #34495e; font-size: 16px;"><b>Great news!</b> You have been officially appointed as the <b>Head of the ${division} Division</b> at CSEC ASTU. This is a recognition of your skills, dedication, and leadership potential.</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
        <h3 style="color: #2c3e50; margin-top: 0;">Message from the President</h3>
        <p style="color: #34495e; font-style: italic;">
          "Leadership is not about being in charge. It's about taking care of those in your charge. As a Division Head, you now have the opportunity to inspire, guide, and empower your team members. Your division plays a crucial role in our club's mission, and I have full confidence in your ability to lead it to new heights."
        </p>
        <p style="color: #34495e; text-align: right; font-weight: bold;">- Temkin Abdulmelik, CSEC ASTU President</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #2c3e50; margin-top: 0;">Your Responsibilities as Division Head</h3>
        <ul style="color: #34495e;">
          <li><b>Team Management</b> - Lead and coordinate your division members</li>
          <li><b>Project Oversight</b> - Guide division projects and ensure quality</li>
          <li><b>Strategic Planning</b> - Set goals and direction for your division</li>
          <li><b>Mentorship</b> - Support the growth and development of your team</li>
          <li><b>Collaboration</b> - Work with other divisions and the executive team</li>
        </ul>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #2c3e50; margin-top: 0;">What's Next?</h3>
        <ul style="color: #34495e;">
          <li><b>Access your new dashboard</b> - You now have division head privileges</li>
          <li><b>Review your division members</b> - Get to know your team</li>
          <li><b>Schedule a kick-off meeting</b> - Connect with your division</li>
          <li><b>Develop a division strategy</b> - Plan your first initiatives</li>
          <li><b>Connect with other division heads</b> - Collaborate across the club</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://csec-astu.com/login" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Access Your Dashboard</a>
        <p style="color: #7f8c8d; font-size: 14px; margin-top: 20px;">If you have any questions, please contact us at <a href="mailto:president@csec-astu.com" style="color: #3498db;">president@csec-astu.com</a></p>
        <p style="color: #7f8c8d; font-size: 14px;">© ${new Date().getFullYear()} CSEC ASTU. All rights reserved.</p>
      </div>
    </div>
  `
};

// Send welcome email with improved deliverability and anti-spam measures
export const sendWelcomeEmail = async (
  email: string,
  fullName: string, // Changed from name to fullName for consistency
  role: string,
  password: string,
  memberId: string,
  otp: string,
  studentId: string,
  divisionName: string | null = null,
  divisionHeadName: string | null = null,
  divisionDescription: string | null = null
): Promise<void> => {
  const name = fullName; // For backward compatibility
  try {
    // Generate personalized email content
    let emailContent = `
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2c3e50; margin-bottom: 5px;">CSEC ASTU</h1>
          <p style="color: #7f8c8d; font-size: 14px; margin-top: 0;">Computer Science and Engineering Club</p>
          <div style="height: 3px; background: linear-gradient(to right, #3498db, #2ecc71); margin: 15px auto; width: 80%;"></div>
        </div>
        
        <h2 style="color: #2c3e50; text-align: center;">Welcome to CSEC ASTU! 🎉</h2>
        
        <p style="color: #34495e; font-size: 16px;">Hello <b>${name}</b>,</p>
        
        <p style="color: #34495e; line-height: 1.8;">We're excited to welcome you to the Computer Science and Engineering Club at Adama Science and Technology University! You have been registered as a <b>${role}</b> in our community of passionate tech enthusiasts, innovators, and future leaders.</p>
        
        <p style="color: #34495e; line-height: 1.8;">As a member, you'll have access to workshops, projects, competitions, and networking opportunities that will enhance your skills and open doors to exciting career possibilities.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
          <h3 style="color: #2c3e50; margin-top: 0; text-align: center; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">Your Account Credentials</h3>
          
          <div style="display: table; width: 100%; margin-top: 15px;">
            <div style="display: table-row;">
              <div style="display: table-cell; padding: 8px; color: #7f8c8d; font-weight: bold; width: 120px;">Email:</div>
              <div style="display: table-cell; padding: 8px; color: #34495e;">${email}</div>
            </div>
            <div style="display: table-row; background-color: #ffffff;">
              <div style="display: table-cell; padding: 8px; color: #7f8c8d; font-weight: bold;">Password:</div>
              <div style="display: table-cell; padding: 8px; color: #34495e;">${password}</div>
            </div>
            <div style="display: table-row;">
              <div style="display: table-cell; padding: 8px; color: #7f8c8d; font-weight: bold;">Student ID:</div>
              <div style="display: table-cell; padding: 8px; color: #34495e;">${studentId}</div>
            </div>
            <div style="display: table-row; background-color: #ffffff;">
              <div style="display: table-cell; padding: 8px; color: #7f8c8d; font-weight: bold;">Member ID:</div>
              <div style="display: table-cell; padding: 8px; color: #34495e;">${memberId}</div>
            </div>
          </div>
        </div>
        
        <div style="background-color: #ebf5fb; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
          <h3 style="color: #2980b9; margin-top: 0;">Your Verification Code</h3>
          <div style="font-family: 'Courier New', monospace; font-size: 32px; letter-spacing: 8px; background-color: #ffffff; padding: 15px; border-radius: 4px; display: inline-block; margin: 10px 0; color: #2c3e50; font-weight: bold; box-shadow: 0 2px 3px rgba(0,0,0,0.1);">${otp}</div>
          <p style="color: #34495e; margin: 10px 0 0 0; font-size: 14px;">Use this code to verify your account during first login</p>
        </div>
    `;
    
    // Add division information if available
    if (divisionName) {
      emailContent += `
        <div style="background-color: #f0f7fb; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
          <h3 style="color: #2980b9; margin-top: 0; text-align: center; border-bottom: 1px solid #d4e6f1; padding-bottom: 10px;">Your Division Assignment</h3>
          <p style="color: #34495e; text-align: center; font-size: 18px; margin: 15px 0;">You have been assigned to the <b>${divisionName}</b> Division</p>
          
          ${divisionDescription ? `<div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin-top: 15px;">
            <h4 style="color: #2c3e50; margin-top: 0;">About the Division:</h4>
            <p style="color: #34495e; line-height: 1.8;">${divisionDescription}</p>
          </div>` : ''}
          
          ${divisionHeadName ? `<div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #3498db;">
            <h4 style="color: #2c3e50; margin-top: 0;">Message from Division Head:</h4>
            <p style="color: #34495e; font-style: italic; margin: 0; line-height: 1.8;">
              "Welcome to our division! We're thrilled to have you join our team. Your skills and enthusiasm will be valuable assets as we work together on exciting projects. I look forward to collaborating with you and seeing your contributions to our division's success."
            </p>
            <p style="color: #7f8c8d; text-align: right; margin: 10px 0 0 0; font-size: 14px;">— ${divisionHeadName}, Division Head</p>
          </div>` : ''}
          
          <div style="margin-top: 20px;">
            <h4 style="color: #2c3e50; margin-bottom: 10px;">Next Steps:</h4>
            <div style="display: flex; margin-bottom: 15px; align-items: center;">
              <div style="background-color: #3498db; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">1</div>
              <div style="color: #34495e;">Attend the next division meeting on Friday at 4:00 PM</div>
            </div>
            <div style="display: flex; margin-bottom: 15px; align-items: center;">
              <div style="background-color: #3498db; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">2</div>
              <div style="color: #34495e;">Check out current projects on our division's GitHub repository</div>
            </div>
            <div style="display: flex; margin-bottom: 15px; align-items: center;">
              <div style="background-color: #3498db; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">3</div>
              <div style="color: #34495e;">Connect with other division members on our Telegram group</div>
            </div>
          </div>
        </div>
`;
    }
    
    // Add call-to-action and footer
    emailContent += `
        <p style="color: #34495e; line-height: 1.8;">Please save these credentials and change your password after your first login. Your journey with CSEC ASTU begins now!</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:5500/login" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; box-shadow: 0 3px 6px rgba(0,0,0,0.1); transition: background-color 0.3s;">Access Your Account</a>
        </div>
        
        <p style="color: #34495e; line-height: 1.8;">If you have any questions or need assistance, our support team is here to help. Feel free to contact us at <a href="mailto:csec.astu@gmail.com" style="color: #3498db;">csec.astu@gmail.com</a>.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 5px;">CSEC ASTU Team</p>
          <p style="color: #7f8c8d; font-size: 12px; margin-top: 5px;">Adama Science and Technology University</p>
        </div>
      </div>
    </body>
    </html>
    `;
    
    // Create text version for better deliverability (multipart emails are less likely to be marked as spam)
    let textContent = `
Welcome to CSEC ASTU, ${name}!

You've been registered as a ${role}.

Your login credentials:
Email: ${email}
Password: ${password}
Student ID: ${studentId}
Member ID: ${memberId}
OTP Code: ${otp}

`;
    
    // Add division information to text version if available
    if (divisionName) {
      textContent += `You have been assigned to the ${divisionName} Division.

`;
      if (divisionDescription) {
        textContent += `About the Division:
${divisionDescription}

`;
      }
      if (divisionHeadName) {
        textContent += `Message from ${divisionHeadName}, Division Head:
"Welcome to our division! We're thrilled to have you join our team."

`;
      }
    }
    
    textContent += `Please save these credentials and change your password after logging in.

Regards,
CSEC ASTU Team
`;
    
    // Log email sending attempt
    console.log(`📧 Sending welcome email to ${email} (${name})`);
    
    // Gmail-friendly mail options with better deliverability
    const mailOptions = {
      from: `"CSEC ASTU" <${process.env.EMAIL_USER || 'temkinabdulmelik@gmail.com'}>`,
      to: email,
      subject: `Welcome to CSEC ASTU, ${name}!`,
      text: textContent, // Plain text version
      html: emailContent, // HTML version
      headers: {
        'X-Priority': '3', // Normal priority (1=High, 3=Normal, 5=Low)
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'CSEC ASTU Portal',
        'X-Message-ID': `welcome-${Date.now()}`
      }
    };
    
    // Log detailed email information
    console.log(`📧 Sending email with the following details:`);
    console.log(`- From: ${process.env.EMAIL_USER || 'temkinabdulmelik@gmail.com'}`);
    console.log(`- To: ${email}`);
    console.log(`- Subject: Welcome to CSEC ASTU, ${name}!`);
    console.log(`- Priority: high`);
    console.log(`- DSN enabled: yes`);
    
    // Send the email
    const transporter = await getTransporter();
    try {
      const info = await transporter.sendMail(mailOptions);
      
      console.log(`✅ Welcome email sent successfully to ${email}`);
      if (info && info.messageId) {
        console.log(`📧 Message ID: ${info.messageId}`);
      }
    } catch (sendError) {
      console.error(`❌ Failed to send welcome email:`, sendError);
      throw sendError;
    }
  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
    throw error;
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email: string, resetToken: string, userId: string): Promise<void> => {
  try {
    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&id=${userId}`;
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 25px; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2c3e50; margin-bottom: 5px;">🎓 CSEC ASTU</h1>
          <p style="color: #7f8c8d; font-size: 14px; margin-top: 0;">Computer Science and Engineering Club</p>
          <div style="height: 3px; background: linear-gradient(to right, #3498db, #2ecc71); margin: 15px auto; width: 80%;"></div>
        </div>
        
        <h2 style="color: #2c3e50; text-align: center;">Password Reset Request</h2>
        
        <p style="color: #34495e; font-size: 1.1em;">We received a request to reset your password for your CSEC ASTU account. If you didn't make this request, you can safely ignore this email.</p>
        
        <p style="color: #34495e; font-size: 1.1em;">To reset your password, click the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        
        <p style="color: #34495e; font-size: 1.1em;">If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        
        <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 0.9em;">${resetUrl}</p>
        
        <p style="color: #34495e; font-size: 1.1em;">This link will expire in 1 hour for security reasons.</p>
        
        <div style="text-align: center; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
          <p style="color: #7f8c8d; font-size: 14px;">If you didn't request a password reset, please contact us at <a href="mailto:support@csec-astu.com" style="color: #3498db;">support@csec-astu.com</a></p>
          <p style="color: #7f8c8d; font-size: 14px;">© ${new Date().getFullYear()} CSEC ASTU. All rights reserved.</p>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"CSEC ASTU" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `[PASSWORD RESET] Reset Your CSEC ASTU Portal Password`,
      html: emailContent,
    };
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

// Send email to a new division head
export const sendDivisionHeadEmail = async (email: string, fullName: string, division: string): Promise<void> => {
  const name = fullName; // For backward compatibility
  try {
    console.log(`🚀 Starting division head email sending process to: ${email}`);
    
    // Format the division name for display
    let formattedDivision = division;
    const divisionNameUpper = division.toUpperCase().trim();
    
    // Map abbreviated division names to their full names for better display
    if (divisionNameUpper === "CPD" || divisionNameUpper.includes("CPD")) {
      formattedDivision = "Competitive Programming Division";
    } else if (divisionNameUpper === "CBD" || divisionNameUpper.includes("CBD")) {
      formattedDivision = "Capacity Building Division";
    } else if (divisionNameUpper === "CYBER" || divisionNameUpper.includes("CYBER")) {
      formattedDivision = "Cybersecurity Division";
    } else if (divisionNameUpper === "DEV" || divisionNameUpper.includes("DEV")) {
      formattedDivision = "Development Division";
    } else if (divisionNameUpper === "DATA_SCIENCE" || divisionNameUpper.includes("DATA")) {
      formattedDivision = "Data Science Division";
    }

    // Log the division name mapping for debugging
    console.log(`Division name mapping: ${division} -> ${formattedDivision}`);

    const emailContent = emailTemplates.divisionHead(name, formattedDivision);
    
    // Log email content for debugging
    console.log('===== DIVISION HEAD EMAIL CONTENT =====');
    console.log(`To: ${email}`);
    console.log(`Subject: [CONGRATULATIONS] You're Now the Head of the ${formattedDivision}!`);
    console.log('Content preview (first 300 chars):');
    console.log(emailContent.substring(0, 300) + '...');
    console.log('=====================================');
    
    // Get the email configuration from environment variables
    const emailUser = process.env.EMAIL_USER || 'temkinabdulmelik@gmail.com';
    
    // Create mail options with proper headers to avoid spam filters
    const mailOptions = {
      from: `"CSEC ASTU Portal" <${emailUser}>`,
      to: email,
      subject: `[CONGRATULATIONS] You're Now the Head of the ${formattedDivision}!`,
      html: emailContent,
      priority: "high" as "high", // Type assertion to match the expected literal type
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'High'
      }
    };
    
    console.log(`Attempting to send email to ${email} with subject: ${mailOptions.subject}`);
    
    // Get transporter and send email
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
    
    console.log(`✅ Division head email sent successfully to: ${email}`);
    console.log(`📧 Email details:`);
    console.log(`- To: ${email}`);
    console.log(`- Subject: ${mailOptions.subject}`);
    console.log(`- From: ${mailOptions.from}`);
    console.log(`- Time: ${new Date().toISOString()}`);
    
    
    return;
  } catch (error) {
    console.error("❌ Error sending division head email:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
};

// Send email to a new division member with improved deliverability
export const sendDivisionMemberEmail = async (
  email: string, 
  fullName: string, 
  division: string, 
  divisionHead: string = 'Division Head'
): Promise<boolean> => {
  const name = fullName; // For backward compatibility
  const transporter = await getTransporter();
  
  // Prepare division-specific content based on division name
  let divisionSpecificContent = 'You\'ll be working on exciting projects and initiatives with the CSEC ASTU team.';
  
  if (division.toLowerCase().includes('development')) {
    divisionSpecificContent = 'You\'ll be working on exciting software development projects, building web and mobile applications, and learning modern frameworks and technologies.';
  } else if (division.toLowerCase().includes('design')) {
    divisionSpecificContent = 'You\'ll be creating beautiful UI/UX designs, graphics, and visual content for our projects and events.';
  } else if (division.toLowerCase().includes('marketing')) {
    divisionSpecificContent = 'You\'ll be promoting our events, managing social media, and creating engaging content to reach our audience.';
  } else if (division.toLowerCase().includes('research')) {
    divisionSpecificContent = 'You\'ll be exploring cutting-edge technologies, conducting research, and publishing papers on innovative topics.';
  } else if (division.toLowerCase().includes('event')) {
    divisionSpecificContent = 'You\'ll be organizing workshops, hackathons, and other events to engage the CSEC community.';
  }
  
  // Create plain text version for better deliverability
  const textContent = `
Welcome to the ${division} at CSEC ASTU, ${name}!

Congratulations! You have been officially added to the ${division} by the division head. We're excited to have you join our team!

About the ${division}:
${divisionSpecificContent}

Message from the Division Head (${divisionHead}):
"Welcome to our division! We're thrilled to have you join our team. Your skills and enthusiasm will be valuable assets as we work together on exciting projects. I look forward to collaborating with you and seeing your contributions to our division's success."

Regards,
CSEC ASTU Team
`;

  // Log email sending attempt
  console.log(`📧 Sending division member email to ${email} (${name}) for ${division} division`);
  
  // Gmail-friendly mail options with better deliverability
  const mailOptions = {
    from: `"CSEC ASTU" <${process.env.EMAIL_USER || 'temkinabdulmelik@gmail.com'}>`,
    to: email,
    subject: `Welcome to the ${division} Division at CSEC ASTU!`,
    text: textContent, // Plain text version
    headers: {
      'X-Priority': '3', // Normal priority (1=High, 3=Normal, 5=Low)
      'X-MSMail-Priority': 'Normal',
      'X-Mailer': 'CSEC ASTU Portal',
      'X-Message-ID': `division-${Date.now()}`
    },
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #2c3e50; margin-bottom: 5px;">CSEC ASTU</h1>
              <p style="color: #7f8c8d; font-size: 14px; margin-top: 0;">Computer Science and Engineering Club</p>
              <div style="height: 3px; background: linear-gradient(to right, #3498db, #2ecc71); margin: 15px auto; width: 80%;"></div>
            </div>
            
            <h2 style="color: #2c3e50; text-align: center;">Welcome to the ${division} Division!</h2>
            
            <p style="color: #34495e; font-size: 16px;">Hello <b>${name}</b>,</p>
            
            <p style="color: #34495e;">You have been added to the <b>${division} Division</b> at CSEC ASTU.</p>
            
            <div style="background-color: #f0f7fb; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
              <h3 style="color: #2980b9; margin-top: 0; text-align: center; border-bottom: 1px solid #d4e6f1; padding-bottom: 10px;">Message from Division Head</h3>
              <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #3498db;">
                <p style="color: #34495e; font-style: italic; margin: 0; line-height: 1.8;">
                  "Welcome to our division! We're thrilled to have you join our team. Your skills and enthusiasm will be valuable assets as we work together on exciting projects. I look forward to collaborating with you and seeing your contributions to our division's success."
                </p>
                <p style="color: #7f8c8d; text-align: right; margin: 10px 0 0 0; font-size: 14px;">— ${divisionHead}, Division Head</p>
              </div>
            </div>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
              <h3 style="color: #2c3e50; margin-top: 0; text-align: center; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">About the ${division} Division</h3>
              <div style="color: #34495e; line-height: 1.8; padding: 10px;">${divisionSpecificContent}</div>
            </div>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
              <h3 style="color: #2c3e50; margin-top: 0; text-align: center; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">Next Steps</h3>
              <div style="margin-top: 15px;">
                <div style="display: flex; margin-bottom: 15px; align-items: center;">
                  <div style="background-color: #3498db; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">1</div>
                  <div style="color: #34495e;">Attend the next division meeting on Friday at 4:00 PM</div>
                </div>
                <div style="display: flex; margin-bottom: 15px; align-items: center;">
                  <div style="background-color: #3498db; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">2</div>
                  <div style="color: #34495e;">Check out current projects on our division's GitHub repository</div>
                </div>
                <div style="display: flex; margin-bottom: 15px; align-items: center;">
                  <div style="background-color: #3498db; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">3</div>
                  <div style="color: #34495e;">Connect with other division members on our Telegram group</div>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:5500/login" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; box-shadow: 0 3px 6px rgba(0,0,0,0.1); transition: background-color 0.3s;">Access Division Portal</a>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #7f8c8d; font-size: 14px; margin-bottom: 5px;">CSEC ASTU Team</p>
              <p style="color: #7f8c8d; font-size: 12px; margin-top: 5px;">Adama Science and Technology University</p>
            </div>
          </div>
        </body>
      </html>
    `
  };

  try {
    // Send the email
    try {
      const info = await transporter.sendMail(mailOptions);
      
      // Log success
      console.log(`✅ Division member email sent successfully to ${email}`);
      if (info && info.messageId) {
        console.log(`📧 Message ID: ${info.messageId}`);
      }
      
      // Log detailed email information
      console.log(`📧 Email details:`);
      console.log(`- From: ${process.env.EMAIL_USER || 'temkinabdulmelik@gmail.com'}`);
      console.log(`- To: ${email}`);
      console.log(`- Subject: Welcome to the ${division} Division at CSEC ASTU!`);
      
      return true;
    } catch (sendError) {
      console.error(`❌ Failed to send division member email:`, sendError);
      
      // Log specific SMTP error codes if available
      if (sendError.code) {
        console.error(`❌ SMTP Error Code: ${sendError.code}`);
      }
      
      // Log response code if available
      if (sendError.responseCode) {
        console.error(`❌ SMTP Response Code: ${sendError.responseCode}`);
      }
      
      return false;
    }
  } catch (error) {
    // Log detailed error information
    console.error(`❌ Error preparing division member email to ${email}:`, error);
    return false;
  }
};

// Send reminder email
export const sendReminderEmail = async (email: string, fullName: string, reminderType: string, details: string): Promise<boolean> => {
  const name = fullName; // For backward compatibility
  const transporter = await getTransporter();
  
  // Include the details in the email content
  const reminderDetails = details || 'No additional details provided.';
  
  const emailContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h1 style="color: #4a6ee0; margin-bottom: 10px;">CSEC ASTU Reminder</h1>
    <p style="font-size: 18px; color: #333;">Hello ${name},</p>
  </div>
  
  <div style="margin-bottom: 25px; line-height: 1.6;">
    <p><strong>Reminder: ${reminderType}</strong></p>
    <p>${reminderDetails}</p>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 15px; margin-bottom: 25px;">
    <h2 style="color: #4a6ee0; margin-top: 0;">Next Steps</h2>
    <ul style="padding-left: 20px;">
      <li>Watch for emails about upcoming events</li>
      <li>Join our Telegram group for discussions</li>
      <li>Explore divisions based on your interests</li>
      <li>Participate in our learning activities</li>
    </ul>
  </div>
  
  <div style="margin-bottom: 25px;">
    <p>If you have questions, please contact us at <a href="mailto:csec.astu@gmail.com" style="color: #4a6ee0;">csec.astu@gmail.com</a>.</p>
  </div>
  
  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
    <p style="color: #777; font-size: 14px;">&copy; ${new Date().getFullYear()} CSEC ASTU</p>
    <p style="color: #777; font-size: 12px;">This is an automated message from CSEC ASTU. Please do not reply directly to this email.</p>
    <p style="color: #777; font-size: 12px;">To unsubscribe from these notifications, please contact the club administrator.</p>
  </div>
</div>
`;

  const mailOptions = {
    from: `"CSEC ASTU" <${process.env.EMAIL_USER || 'temkinabdulmelik@gmail.com'}>`,
    to: email,
    subject: `CSEC ASTU: ${reminderType} Reminder`,
    html: emailContent,
    text: `CSEC ASTU Reminder

Hello ${name},

Reminder: ${reminderType}

${reminderDetails}

If you have questions, please contact us at csec.astu@gmail.com.

© ${new Date().getFullYear()} CSEC ASTU
This is an automated message. Please do not reply directly to this email.
To unsubscribe from these notifications, please contact the club administrator.`,
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'High',
      'X-Message-ID': `reminder-${Date.now()}`
    }
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending reminder email:', error);
    return false;
  }
};
