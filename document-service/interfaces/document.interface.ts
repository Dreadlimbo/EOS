// src/document/interfaces/document.interface.ts

export interface Document {
    id: string;
    title: string;
    content: string;
    userId: string;        // Ensure userId is included here
    fileUrl: string;       // URL for the uploaded file in S3
    status: DocumentStatus; // Use enum for status
    createdBy: string;     // Assuming you have a field to track who created it
    approvedBy?: string;   // Optional field for who approved it
    createdAt: Date;       // Date when the document was created
    updatedAt: Date;       // Date when the document was last updated
}

// Enum for Document Status
export enum DocumentStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    ARCHIVED = 'archived'  // Additional status if needed
}
