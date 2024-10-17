"use strict";
// src/document/interfaces/document.interface.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentStatus = void 0;
// Enum for Document Status
var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["PENDING"] = "pending";
    DocumentStatus["APPROVED"] = "approved";
    DocumentStatus["REJECTED"] = "rejected";
    DocumentStatus["ARCHIVED"] = "archived"; // Additional status if needed
})(DocumentStatus || (exports.DocumentStatus = DocumentStatus = {}));
