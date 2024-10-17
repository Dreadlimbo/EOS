// src/document/dto/update-document-status.dto.ts

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateDocumentDto {
    @IsOptional()
    @IsString()
    title?: string;
  
    @IsOptional()
    @IsString()
    content?: string;
  
    @IsOptional()
    userId?: string;
  
    @IsOptional()
    @IsString()
    status?: string;
  
    @IsOptional()
    approvedBy?: string;
  }
