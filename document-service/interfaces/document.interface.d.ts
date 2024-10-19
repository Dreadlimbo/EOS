export interface Document {
    id: string;
    title: string;
    content: string;
    userId: string;
    fileUrl: string;
    status: DocumentStatus;
    createdBy: string;
    approvedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare enum DocumentStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    ARCHIVED = "archived"
}
