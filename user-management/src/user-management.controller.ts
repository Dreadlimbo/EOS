import { Controller, Get, Param, Post, Body, Patch, Delete, HttpStatus, HttpException } from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UserManagementController {
  getHello(): any {
    throw new Error('Method not implemented.');
  }
  constructor(private readonly userManagementService: UserManagementService) {}

  // Get user by email (for Auth MS to check user existence)
  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string) {
    console
    try {
      return await this.userManagementService.getUserByEmail(email);
    } catch (error) {
      // If the error is an instance of HttpException, check its status
      if (error instanceof HttpException) {
        throw error; // Rethrow the original error
      }
      // For other types of errors
      throw new HttpException('Error fetching user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Create a new user (called by Auth MS when signing up)
  
  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    try {
      return await this.userManagementService.createUser(createUserDto);
    } catch (error) {
      // Check if the error is an instance of HttpException
      if (error instanceof HttpException) {
        throw error; // Rethrow the original error to preserve status and message
      }
      // Handle other types of errors, e.g., if user already exists
      throw new HttpException('Error creating user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Update a user's details
  @Patch(':id')
  async updateUser(@Param('id') userId: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.userManagementService.updateUser(userId, updateUserDto);
  }

  // Delete a user
  @Delete(':id')
  async deleteUser(@Param('id') userId: string) {
    return await this.userManagementService.deleteUser(userId);
  }
}
