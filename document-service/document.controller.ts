import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UnauthorizedException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { Document } from './interfaces/document.interface';
import { CreateDocumentDto } from './dto/create-document.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('documents')
export class DocumentController {
  getHello(): any {
    throw new Error('Method not implemented.');
  }
  constructor(private readonly documentService: DocumentService) {}

  // Create a new document for a specific user
  @Post(':userId')
  @UseInterceptors(FileInterceptor('file')) // Use multer to handle file upload
  async createDocument(
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File, // Get the uploaded file
    @Body() createDocumentDto: CreateDocumentDto,
  ): Promise<Document> {
    console.log("hiiiiiii")
    return this.documentService.createDocument(createDocumentDto, userId, file);
  }

  // Get a specific document by document ID and user ID
  @Get(':id/user/:userId')
  async findOne(@Param('id') id: string, @Param('userId') userId: string): Promise<Document> {
    return this.documentService.getDocumentById(id, userId);
  }

  // Update a document for a specific user by document ID
  @Put(':id/user/:userId')
  @UseInterceptors(FileInterceptor('file')) // Interceptor for handling file uploads
  async update(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateData: Partial<Omit<Document, 'id' | 'createdAt' | 'updatedAt'>>,
    @UploadedFile() file?: Express.Multer.File // Include the uploaded file parameter
  ): Promise<Document> {
    return this.documentService.updateDocument(id, updateData, userId, file);
  }
  // Delete a document for a specific user (admin only)
  @Delete(':id/user/:userId')
  async remove(@Param('id') id: string, @Param('userId') userId: string): Promise<Document> {
    return this.documentService.deleteDocument(id, userId);
  }

  // Get all documents for a specific user
  @Get('user/:userId')
  async findAll(@Param('userId') userId: string): Promise<Document[]> {
    return this.documentService.getAllDocuments(userId);
  }

  // Approve a document (admin only)
  @Put(':id/approve/user/:userId')
  async approveDocument(@Param('id') id: string, @Param('userId') userId: string): Promise<Document> {
    console.log('hi from approval')
    // Only admin should be able to approve a document
    const userRole = await this.documentService.getUserRole(userId);
    console.log(userRole)
    
    if (userRole !== 'HR') {
      throw new UnauthorizedException('Only admins can approve documents');
    }
    return this.documentService.approveDocument(id, userId);
  }
}
