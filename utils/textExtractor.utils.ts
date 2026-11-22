import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { ApiError } from "./apiError.utils.ts";
import type { ValidatedFile } from "./fileValidator.utils.ts";

/**
 * Extracts plain text from a .txt file using Node's fs module
 */
const extractTextFromTxt = async (file: ValidatedFile | Express.Multer.File): Promise<string> => {
    try {
        if (file.path && fs.existsSync(file.path)) {
            return await fs.promises.readFile(file.path, "utf-8");
        } else if (file.buffer) {
            return file.buffer.toString("utf-8");
        } else {
            throw new ApiError(400, "File buffer or path is required for TXT text extraction");
        }
    } catch (error: any) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, `Failed to extract text from TXT: ${error.message || error}`);
    }
};

/**
 * Extracts raw text from a .docx / .doc file using Mammoth
 */
const extractTextFromDoc = async (file: ValidatedFile | Express.Multer.File): Promise<string> => {
    try {
        if (file.path && fs.existsSync(file.path)) {
            const result = await mammoth.extractRawText({ path: file.path });
            return result.value;
        } else if (file.buffer) {
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            return result.value;
        } else {
            throw new ApiError(400, "File buffer or path is required for DOC/DOCX text extraction");
        }
    } catch (error: any) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, `Failed to extract text from DOC/DOCX: ${error.message || error}`);
    }
};

/**
 * Extracts text from a .pdf file using PDF parser (pdf-parse)
 */
const extractTextFromPdf = async (file: ValidatedFile | Express.Multer.File): Promise<string> => {
    try {
        let buffer: Buffer;
        if (file.buffer) {
            buffer = file.buffer;
        } else if (file.path && fs.existsSync(file.path)) {
            buffer = await fs.promises.readFile(file.path);
        } else {
            throw new ApiError(400, "File buffer or path is required for PDF text extraction");
        }

        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        if (typeof parser.destroy === "function") {
            await parser.destroy();
        }
        return result.text;
    } catch (error: any) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, `Failed to extract text from PDF: ${error.message || error}`);
    }
};

/**
 * Main text extractor function.
 * Takes a ValidatedFile as input, inspects its fileType/extension,
 * and delegates text extraction to the appropriate parser:
 * - PDF: pdf-parse
 * - DOC/DOCX: mammoth
 * - TXT: fs
 */
const extractText = async (file: ValidatedFile): Promise<string> => {
    if (!file) {
        throw new ApiError(400, "No file provided for text extraction");
    }

    const extension = path.extname(file.originalname || "").slice(1).toLowerCase();
    const fileType = (file.fileType || file.mimetype || "").toLowerCase();

    let text = "";

    if (extension === "pdf" || fileType === "application/pdf") {
        text = await extractTextFromPdf(file);
    } else if (
        extension === "docx" ||
        extension === "doc" ||
        fileType.includes("wordprocessingml") ||
        fileType.includes("msword")
    ) {
        text = await extractTextFromDoc(file);
    } else if (extension === "txt" || fileType === "text/plain") {
        text = await extractTextFromTxt(file);
    } else {
        throw new ApiError(400, `Unsupported file type for text extraction: ${fileType || extension}`);
    }

    return text.trim();
};

export {
    extractText,
    extractText as textExtractor,
    extractText as extract_text,
    extractTextFromPdf,
    extractTextFromDoc,
    extractTextFromTxt,
};

export default extractText;
