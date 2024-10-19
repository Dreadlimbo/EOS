import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { Document } from './interfaces/document.interface';
import { CreateDocumentDto } from './dto/create-document.dto';
import { RedisService } from './redis/redis.service';
import { S3Service } from './s3/s3.service';

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly s3Service: S3Service,
  ) {}

  // Validating the user session and roles
  private async validateUserSession(
    userId: string,
    requiredRoles: string[] = [],
  ): Promise<any> {
    const userSession = await this.redisService.getUserSession(userId);
    if (!userSession) {
      throw new UnauthorizedException(`Session Expired for userId ${userId}`);
    }

    let userInfo;
    try {
      userInfo = JSON.parse(await this.redisService.getUserInfo(userId));
    } catch (error) {
      throw new InternalServerErrorException(
        'Error parsing user info from Redis',
      );
    }

    if (!userInfo) {
      throw new UnauthorizedException(`User not found for userId ${userId}`);
    }

    /* If specific roles are required for an action, check user's role
    if (requiredRoles.length > 0 && !requiredRoles.includes(userInfo.role)) {
      throw new UnauthorizedException(
        `User with role ${userInfo.role} is not authorized to perform this action.`,
      );
    }*/
    

    return userInfo; // Return user info for further use
  }

  // Create Document
  async createDocument(
    createDocumentDto: CreateDocumentDto,
    userId: string,
    file: Express.Multer.File,
  ): Promise<Document> {
    const userInfo = await this.validateUserSession(userId);

    // Upload the file to S3 and get the URL
    const fileUrl = await this.s3Service.uploadFile(file);

    const document = await this.prisma.document.create({
      data: {
        title: createDocumentDto.title,
        content: createDocumentDto.content,
        userId: userInfo.id,
        fileUrl: fileUrl, // Store the S3 URL in the document
        status: 'pending', // Default status
        createdBy: userInfo.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Send notification on document creation asynchronously
    this.notifyUser(userInfo.id, 'Document created successfully');

    return this.mapToDocument(document);
  }

  // Delete Document
  async deleteDocument(id: string, userId: string): Promise<Document> {
    const userInfo = await this.validateUserSession(userId);
  
    const existingDocument = await this.prisma.document.findUnique({
      where: { id },
    });
  
    if (!existingDocument) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }
  
    if (existingDocument.createdBy !== userInfo.id && userInfo.roles !== 'HR') {
      throw new UnauthorizedException('Only the document creator or HR can delete this document');
    }
  
    // Delete the file from S3 before deleting the document from Prisma
    await this.s3Service.deleteFile(existingDocument.fileUrl);
  
    const deletedDocument = await this.prisma.document.delete({
      where: { id },
    });
  
    // Notify the user about document deletion asynchronously
    this.notifyUser(existingDocument.createdBy, 'Your document has been deleted');
  
    return this.mapToDocument(deletedDocument);
  }
  
  // Fetch user role from Redis
  async getUserRole(userId: string): Promise<string> {
    const userInfo = JSON.parse(await this.redisService.getUserInfo(userId));
    console.log(userInfo.roles)
    if (!userInfo || !userInfo.roles) {
      throw new UnauthorizedException('User info not found or role is missing');
    }

    return userInfo.roles; // Assuming roles is a string or array of roles
  }

  // Update Document
  async updateDocument(
    id: string,
    updateData: Partial<Omit<Document, 'id' | 'createdAt' | 'updatedAt'>>,
    userId: string,
    file?: Express.Multer.File // Added file parameter
  ): Promise<Document> {
    const userInfo = await this.validateUserSession(userId);

    const existingDocument = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!existingDocument) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    // Validate status transition
    if (
      updateData.status &&
      !this.isValidStatusTransition(existingDocument.status, updateData.status)
    ) {
      throw new BadRequestException(
        `Invalid status transition from ${existingDocument.status} to ${updateData.status}`,
      );
    }

    // If a new file is uploaded, handle it
    if (file) {
      // Delete the old file from S3
      await this.s3Service.deleteFile(existingDocument.fileUrl);

      // Upload the new file to S3
      const newFileUrl = await this.s3Service.uploadFile(file);
      updateData.fileUrl = newFileUrl; // Update the fileUrl in updateData
    }

    const updatedDocument = await this.prisma.document.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    // Notify on document update asynchronously
    this.notifyUser(
      userId,
      `Document updated: ${updateData.status || 'no status change'}`,
    );

    return this.mapToDocument(updatedDocument);
  }


  // Get All Documents for a Specific User
  async getAllDocuments(userId: string): Promise<Document[]> {
    await this.validateUserSession(userId);

    const documents = await this.prisma.document.findMany({
      where: { userId },
    });

    return documents.map(this.mapToDocument); // Map to the desired format
  }

  // Fetch Document by ID
  async getDocumentById(id: string, userId: string): Promise<Document> {
    await this.validateUserSession(userId);

    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    return this.mapToDocument(document);
  }

  // Approve Document
  async approveDocument(id: string, userId: string): Promise<Document> {
    const userInfo = await this.validateUserSession(userId, ['HR']); // Only admin can approve

    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    if (document.status !== 'pending') {
      throw new BadRequestException('Only pending documents can be approved');
    }

    const approvedDocument = await this.prisma.document.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: userId,
        updatedAt: new Date(),
      },
    });

    await this.notifyUser(
      document.createdBy,
      'Your document has been approved',
    );

    return this.mapToDocument(approvedDocument);
  }

  // Helper to map Prisma Document to the Document interface
  private mapToDocument(doc: any): Document {
    return {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      userId: doc.userId,
      fileUrl: doc.fileUrl, // Ensure fileUrl is included
      status: doc.status,
      createdBy: doc.createdBy,
      approvedBy: doc.approvedBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  // Notification Logic (Placeholder)
  private async notifyUser(userId: string, message: string) {
    console.log(`Notification to user ${userId}: ${message}`);
    // Implement actual notification logic here
  }

  // Validate status transitions (e.g., pending -> approved)
  private isValidStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): boolean {
    const validTransitions = {
      pending: ['approved', 'rejected', 'pending'],
      approved: ['archived'],
      rejected: ['archived'],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}
