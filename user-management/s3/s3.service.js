"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
let S3Service = class S3Service {
    constructor() {
        this.s3Client = new client_s3_1.S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
    }
    async uploadFile(file) {
        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: file.originalname, // Consider using a unique key (e.g., userId + timestamp)
            Body: file.buffer, // Use buffer for in-memory files
            ContentType: file.mimetype, // Set the content type
        };
        try {
            const uploadResult = await this.s3Client.send(new client_s3_1.PutObjectCommand(uploadParams));
            const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${uploadParams.Key}`;
            return fileUrl; // Return the file URL after a successful upload
        }
        catch (error) {
            throw new common_1.InternalServerErrorException('Could not upload file to S3', error);
        }
    }
    async deleteFile(fileUrl) {
        // Extract the bucket name and key from the file URL
        const bucketName = process.env.AWS_S3_BUCKET_NAME; // Or pass it in dynamically
        console.log(bucketName);
        const fileKey = this.getFileKeyFromUrl(fileUrl); // You need to implement this method to extract the file key from the URL
        console.log(fileKey);
        try {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: bucketName,
                Key: fileKey,
            });
            // Send the command to delete the object
            await this.s3Client.send(command);
            console.log(`File ${fileKey} deleted successfully from S3`);
        }
        catch (error) {
            console.error(`Error deleting file from S3: ${error.message}`);
            throw new Error('Failed to delete file from S3');
        }
    }
    // Helper function to extract the key from the file URL
    getFileKeyFromUrl(fileUrl) {
        // Assuming the URL format is https://bucket-name.s3.amazonaws.com/key
        const urlParts = fileUrl.split('/');
        return urlParts.slice(3).join('/'); // This gets the key part of the URL
    }
};
exports.S3Service = S3Service;
exports.S3Service = S3Service = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], S3Service);
