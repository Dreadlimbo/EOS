import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { HttpService } from '@nestjs/axios';
import { RedisService } from '../redis/redis.service';
import { getAppPort } from '../../main';
import { SigninDto, SignupDto } from './dto/auth.dto';
import { catchError, lastValueFrom } from 'rxjs';

// Transport layer for sending verification emails
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

@Injectable()
export class AuthService {
  private readonly userManagementUrl: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly httpService: HttpService,
  ) {
    // Removed the https agent configuration
  }

  // Check if the user exists in User Management Service
  private async userExistsInUserManagement(email: string): Promise<boolean> {
    try {
      console.log("inside ....")
      const response = await lastValueFrom(this.httpService.get(`${this.userManagementUrl}/users/email/${email}`));
      console.log(response)
      return response.data ? true : false;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return false; // User not found
      }
      throw new ConflictException('Error checking user existence in User Management service');
    }
  }

  // Signup method
  async signup(signUpDto: SignupDto) {
    const { email, username, password, role } = signUpDto;

    // Check if the email already exists
    const userExists = await this.userExistsInUserManagement(email);
    if (userExists) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Send a request to create the user in User Management Service
    try {
      const userCreationResponse = await lastValueFrom(
        this.httpService.post(`${this.userManagementUrl}/users`, {
          username,
          email,
          password: hashedPassword,
          role,
        }),
      );

      // Generate verification token (optional)
      const token = this.generateVerificationToken(userCreationResponse.data.email);
      await this.sendVerificationEmail(userCreationResponse.data.email, token);

      return { message: 'User created successfully. Verification email sent.' };
    } catch (error) {
      throw new ConflictException('Error creating user in User Management service');
    }
  }

  // SIGNIN
  async signin(email: string, password: string) {
    console.log("SIGNING IN");
    // Fetch the user by email from Prisma
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens (JWT or any other method)
    const tokens = this.generateTokens({ email: user.email, id: user.id });
    
    // REDIS Set Session for 1 hour
    const sessionKey = `user_session_${user.id}`;
    await this.redisService.set(sessionKey, JSON.stringify(tokens), 3600);
    
    // REDIS Set User Info for 24 hours
    const userKey = `user_info_${user.id}`;
    await this.redisService.set(userKey, JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.username,
        roles: user.role,
    }), 86400);

    return tokens;
  }

  async validateSession(userId: string) {
    const sessionKey = `user_session_${userId}`;
    const sessionData = await this.redisService.get(sessionKey);

    if (!sessionData) {
      throw new UnauthorizedException('Invalid session or session expired');
    }

    return JSON.parse(sessionData);
  }

  generateTokens(payload: any) {
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }

  private generateVerificationToken(email: string) {
    return this.jwtService.sign({ email }, { expiresIn: '1d' });
  }

  private async sendVerificationEmail(email: string, token: string) {
    const appPort = getAppPort(); 
    if (!appPort) {
      throw new Error('App port is not initialized');
    }
    const verificationLink = `http://localhost:${appPort}/auth/verify-email?token=${token}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Email Verification',
      text: `Click this link to verify your email: ${verificationLink}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully');
    } catch (e) {
      console.error('Error sending email:', e);
      throw new UnauthorizedException('Failed to send verification email');
    }
  }

  async verifyEmailToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      const storedToken = await this.redisService.get(`email_verify:${decoded.email}`);

      if (!storedToken || storedToken !== token) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      const user = await this.prisma.user.findUnique({ where: { email: decoded.email } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (user.isEmailVerified) {
        return { message: 'Email is already verified' };
      }

      await this.prisma.user.update({
        where: { email: decoded.email },
        data: { isEmailVerified: true },
      });

      await this.redisService.del(`email_verify:${decoded.email}`);

      return { message: 'Email verified successfully' };
    } catch (e) {
      console.error('Verification error:', e);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
