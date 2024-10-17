import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service'; // Assuming Prisma is used for the database
import { CreateUserDto } from './dto/create-user.dto'; // DTO for user creation
import { UpdateUserDto } from './dto/update-user.dto'; // DTO for updating user
import { HttpService } from '@nestjs/axios';

@Injectable()
export class UserManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {
    // Removed the https agent configuration
  }

  // Get user by email
  async getUserByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // Create a new user
  async createUser(createUserDto: CreateUserDto) {
    const { email, username, password, role } = createUserDto;

    // Check if the email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    return this.prisma.user.create({
      data: {
        username,
        email,
        password,
        role,
      },
    });
  }

  // Update user details (e.g. role, name)
  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: updateUserDto,
    });
  }

  // Delete a user by ID
  async deleteUser(userId: string) {
    return this.prisma.user.delete({
      where: { id: userId },
    });
  }
}
