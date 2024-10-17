"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const nodemailer = __importStar(require("nodemailer"));
const redis_service_1 = require("../redis/redis.service"); // Adjust the import path as necessary
const main_1 = require("../../main");
// Transport layer
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
let AuthService = class AuthService {
    constructor(jwtService, prisma, redisService) {
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.redisService = redisService;
    }
    async signup(signUpDto) {
        // Step 1: Check if the email already exists
        const { email, username, password, role } = signUpDto;
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });
        // Step 2: If user exists, throw a ConflictException
        if (existingUser) {
            throw new common_1.ConflictException('User with this email already exists');
        }
        // Step 3: Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Step 4: Create the new user
        const user = await this.prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                role,
            },
        });
        // Step 5: Generate verification token
        const token = this.generateVerificationToken(user.email);
        // Step 6: Store the verification token in Redis with an expiration time (1 day)
        await this.redisService.set(`email_verify:${user.email}`, token, 120); // 86400 seconds = 1 day
        // Step 7: Send verification email
        await this.sendVerificationEmail(user.email, token);
        // Step 8: Return a success message
        return { message: 'Verification email sent' };
    }
    async signin(email, password) {
        console.log("SIGNININ");
        // Fetch the user by email from Prisma
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        console.log("user");
        // Generate tokens (JWT or any other method)
        const tokens = this.generateTokens({ email: user.email, id: user.id });
        console.log("generatetoken");
        // REDIS Set Session 1 hr
        const sessionKey = `user_session_${user.id}`;
        await this.redisService.set(sessionKey, JSON.stringify(tokens), 3600);
        //REDIS Set User Info 24 hrs
        const userKey = `user_info_${user.id}`;
        await this.redisService.set(userKey, JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.username,
            roles: user.role,
        }), 86400);
        return tokens;
    }
    async validateSession(userId) {
        // Retrieve session data using the get command
        const sessionKey = `user_session_${userId}`;
        const sessionData = await this.redisService.get(sessionKey);
        if (!sessionData) {
            throw new Error('Invalid session or session expired');
        }
        // Parse the session data (since it's stored as a JSON string)
        const parsedSessionData = JSON.parse(sessionData);
        // Optionally, check if the session is still valid based on your requirements
        // Return the parsed session data
        return parsedSessionData;
    }
    generateTokens(payload) {
        const accessToken = this.jwtService.sign(payload);
        console.log('accessToken');
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
        console.log('refreshToken');
        return { accessToken, refreshToken };
    }
    generateVerificationToken(email) {
        return this.jwtService.sign({ email }, { expiresIn: '1d' });
    }
    async sendVerificationEmail(email, token) {
        const appPort = (0, main_1.getAppPort)(); // Get the current app port
        if (!appPort) {
            throw new Error('App port is not initialized');
        }
        const verificationLink = `http://localhost:${appPort}/auth/verify-email?token=${token}`; // Further Pad the link to be sent
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Email Verification',
            text: `Click this link to verify your email: ${verificationLink}`,
        };
        try {
            await transporter.sendMail(mailOptions);
            console.log('Email sent successfully');
        }
        catch (e) {
            console.error('Error sending email:', e);
            throw new common_1.UnauthorizedException('Failed to send verification email');
        }
    }
    async verifyEmailToken(token) {
        try {
            // Verify the token
            const decoded = this.jwtService.verify(token);
            // Check Redis for the token
            const storedToken = await this.redisService.get(`email_verify:${decoded.email}`);
            if (!storedToken || storedToken !== token) {
                throw new common_1.UnauthorizedException('Invalid or expired token');
            }
            // Check that the user exists in the database
            const user = await this.prisma.user.findUnique({
                where: { email: decoded.email },
            });
            if (!user) {
                throw new common_1.UnauthorizedException('User not found');
            }
            // Check if the user's email is already verified
            if (user.isEmailVerified) {
                return { message: 'Email is already verified' };
            }
            // Mark the user's email as verified in the database
            await this.prisma.user.update({
                where: { email: decoded.email },
                data: { isEmailVerified: true },
            });
            // Optionally, remove the token from Redis after verification
            await this.redisService.del(`verify:${decoded.email}`);
            return { message: 'Email verified successfully' };
            console.log(this.redisService.get(`email_verify:${decoded.email}`) + "is verified !");
        }
        catch (e) {
            console.error('Verification error:', e); // Log error for debugging
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], AuthService);
