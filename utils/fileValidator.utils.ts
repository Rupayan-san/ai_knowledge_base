import { ALLOWED_FILE_EXTENSIONS, ALLOWED_MIME_TYPES, FILE_SIGNATURES } from "../src/constants.ts";
import { ApiError } from "./apiError.utils.ts";
import path from "path";
import fs from "fs";

// Deletes the uploaded file from disk if validation fails
const deleteUploadedFile = (file: Express.Multer.File | undefined) => {
    if (file?.path && fs.existsSync(file.path)) {
        try {
            fs.unlinkSync(file.path);
        } catch {
            // ignore cleanup errors
        }
    }
};

const file_validator = (file: Express.Multer.File | undefined): string => {
    if (!file) {
        throw new ApiError(400, "No file uploaded");
    }

    try {
        if (!mime_validator(file)) {
            throw new ApiError(400, "Invalid file extension or MIME type");
        }

        if (!signature_validator(file)) {
            throw new ApiError(400, "File signature does not match its extension (corrupted or spoofed file)");
        }

        return file.mimetype;
    } catch (error) {
        // Clean up invalid file from temp storage so disk doesn't fill up
        deleteUploadedFile(file);
        throw error;
    }
};

const mime_validator = (file: Express.Multer.File): boolean => {
    const extension = path.extname(file.originalname).slice(1).toLowerCase();

    // Check extension
    if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
        return false;
    }

    // Check MIME type
    const expectedMimes = ALLOWED_MIME_TYPES[extension];
    if (expectedMimes && !expectedMimes.includes(file.mimetype)) {
        return false;
    }

    return true;
};

const signature_validator = (file: Express.Multer.File): boolean => {
    try {
        let buffer: Buffer;

        // Support memoryStorage (file.buffer) or diskStorage (file.path)
        if (file.buffer) {
            buffer = file.buffer.subarray(0, 8);
        } else if (file.path) {
            const fd = fs.openSync(file.path, "r");
            const tempBuffer = Buffer.alloc(8);
            const bytesRead = fs.readSync(fd, tempBuffer, 0, 8, 0);
            fs.closeSync(fd);
            
            // Only inspect the bytes that were actually read
            buffer = tempBuffer.subarray(0, bytesRead);
        } else {
            return false;
        }

        const extension = path.extname(file.originalname).slice(1).toLowerCase();

        // Plain text files do not have a fixed magic number; check for binary null bytes
        if (extension === "txt") {
            return !buffer.includes(0x00);
        }

        const validSignatures = FILE_SIGNATURES[extension];
        if (!validSignatures) {
            return false;
        }

        const hex = buffer.toString("hex").toLowerCase();
        return validSignatures.some((sig) => hex.startsWith(sig.toLowerCase()));
    } catch {
        return false;
    }
};

export { file_validator, file_validator as fileValidator, mime_validator, signature_validator };
