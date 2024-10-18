import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, PutObjectCommandOutput, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: file.originalname, // Consider using a unique key (e.g., userId + timestamp)
      Body: file.buffer, // Use buffer for in-memory files
      ContentType: file.mimetype, // Set the content type
    };

    try {
      const uploadResult: PutObjectCommandOutput = await this.s3Client.send(new PutObjectCommand(uploadParams));
      const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${uploadParams.Key}`;
      return fileUrl; // Return the file URL after a successful upload
    } catch (error) {
      throw new InternalServerErrorException('Could not upload file to S3', error);
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    // Extract the bucket name and key from the file URL
    const bucketName = process.env.AWS_S3_BUCKET_NAME; // Or pass it in dynamically
    console.log(bucketName)
    const fileKey = this.getFileKeyFromUrl(fileUrl); // You need to implement this method to extract the file key from the URL
    console.log(fileKey)

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });

      // Send the command to delete the object
      await this.s3Client.send(command);

      console.log(`File ${fileKey} deleted successfully from S3`);
    } catch (error) {
      console.error(`Error deleting file from S3: ${error.message}`);
      throw new Error('Failed to delete file from S3');
    }
  }

  // Helper function to extract the key from the file URL
  private getFileKeyFromUrl(fileUrl: string): string {
    // Assuming the URL format is https://bucket-name.s3.amazonaws.com/key
    const urlParts = fileUrl.split('/');
    return urlParts.slice(3).join('/'); // This gets the key part of the URL
  }
}


