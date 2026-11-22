import fs from "fs";
import path from "path";
import { fileValidator } from "../utils/fileValidator.utils.ts";
import { ApiError } from "../utils/apiError.utils.ts";

const TEMP_DIR = path.resolve("./public/temp");

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Helper to create a fake Multer file on disk
const createMockFile = (
    fileName: string,
    mimetype: string,
    content: Buffer | string
): Express.Multer.File => {
    const filePath = path.join(TEMP_DIR, fileName);
    fs.writeFileSync(filePath, content);

    return {
        fieldname: "avatar",
        originalname: fileName,
        encoding: "7bit",
        mimetype,
        destination: TEMP_DIR,
        filename: fileName,
        path: filePath,
        size: Buffer.byteLength(content),
        stream: null as any,
        buffer: null as any,
    };
};

let passed = 0;
let failed = 0;

const runTest = (testName: string, fn: () => void) => {
    try {
        fn();
        console.log(`  PASSED: ${testName}`);
        passed++;
    } catch (err: any) {
        console.error(`  FAILED: ${testName}`);
        console.error(`     Error: ${err.message || err}`);
        failed++;
    }
};

console.log("\n=================================");
console.log("  Running File Validator Tests   ");
console.log("=================================\n");

// Test 1: Valid PDF
runTest("1. Valid PDF file", () => {
    // Magic bytes %PDF-1.5: 25 50 44 46
    const pdfBuffer = Buffer.concat([
        Buffer.from([0x25, 0x50, 0x44, 0x46]),
        Buffer.from("-1.5 sample content"),
    ]);
    const file = createMockFile("valid.pdf", "application/pdf", pdfBuffer);
    const result = fileValidator(file);

    if (result !== "application/pdf") {
        throw new Error(`Expected 'application/pdf', got '${result}'`);
    }
});

// Test 2: Valid DOCX
runTest("2. Valid DOCX file", () => {
    // Magic bytes PK..: 50 4B 03 04
    const docxBuffer = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        Buffer.from("sample docx openxml content"),
    ]);
    const file = createMockFile(
        "document.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        docxBuffer
    );
    const result = fileValidator(file);

    if (!result.includes("wordprocessingml") && !result.includes("zip")) {
        throw new Error(`Unexpected MIME result: '${result}'`);
    }
});

// Test 3: Valid normal text file
runTest("3. Valid normal .txt file", () => {
    const file = createMockFile("notes.txt", "text/plain", "This is a regular note.");
    const result = fileValidator(file);

    if (result !== "text/plain") {
        throw new Error(`Expected 'text/plain', got '${result}'`);
    }
});

// Test 4: Short text file (< 8 bytes)
runTest("4. Short .txt file (< 8 characters)", () => {
    const file = createMockFile("short.txt", "text/plain", "Hi");
    const result = fileValidator(file);

    if (result !== "text/plain") {
        throw new Error(`Expected 'text/plain', got '${result}'`);
    }
});

// Test 5: Spoofed PDF (image bytes disguised with .pdf extension)
runTest("5. Spoofed PDF (PNG file renamed to .pdf)", () => {
    // PNG magic bytes: 89 50 4E 47
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const file = createMockFile("fake.pdf", "application/pdf", pngBuffer);

    let threw = false;
    try {
        fileValidator(file);
    } catch (err: any) {
        threw = true;
        if (!(err instanceof ApiError) || err.statusCode !== 400) {
            throw new Error(`Expected ApiError 400, got: ${err}`);
        }
    }

    if (!threw) {
        throw new Error("Expected spoofed PDF to be rejected, but it passed!");
    }
});

// Test 6: Spoofed TXT with null bytes (binary disguised as text)
runTest("6. Binary disguised as .txt (contains 0x00 null bytes)", () => {
    const binaryBuffer = Buffer.from([0x4d, 0x5a, 0x00, 0x00]); // Starts like an executable with nulls
    const file = createMockFile("malware.txt", "text/plain", binaryBuffer);

    let threw = false;
    try {
        fileValidator(file);
    } catch (err: any) {
        threw = true;
        if (!(err instanceof ApiError)) {
            throw new Error(`Expected ApiError, got: ${err}`);
        }
    }

    if (!threw) {
        throw new Error("Expected binary disguised as .txt to be rejected, but it passed!");
    }
});

// Test 7: Disallowed file extension (.jpg)
runTest("7. Disallowed file extension (.jpg)", () => {
    const jpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const file = createMockFile("photo.jpg", "image/jpeg", jpgBuffer);

    let threw = false;
    try {
        fileValidator(file);
    } catch (err: any) {
        threw = true;
        if (!(err instanceof ApiError) || err.statusCode !== 400) {
            throw new Error(`Expected ApiError 400, got: ${err}`);
        }
    }

    if (!threw) {
        throw new Error("Expected .jpg file to be rejected, but it passed!");
    }
});

// Test 8: Mismatched MIME type
runTest("8. Mismatched MIME type (real PDF bytes but image/jpeg MIME)", () => {
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]);
    const file = createMockFile("mismatch.pdf", "image/jpeg", pdfBuffer);

    let threw = false;
    try {
        fileValidator(file);
    } catch (err: any) {
        threw = true;
        if (!(err instanceof ApiError)) {
            throw new Error(`Expected ApiError, got: ${err}`);
        }
    }

    if (!threw) {
        throw new Error("Expected MIME mismatch to be rejected, but it passed!");
    }
});

// Test 9: Missing file (undefined)
runTest("9. No file passed (undefined)", () => {
    let threw = false;
    try {
        fileValidator(undefined);
    } catch (err: any) {
        threw = true;
        if (!(err instanceof ApiError) || err.statusCode !== 400) {
            throw new Error(`Expected ApiError 400, got: ${err}`);
        }
    }

    if (!threw) {
        throw new Error("Expected undefined file to throw 400, but it did not!");
    }
});

// Test 10: Automatic cleanup of rejected files
runTest("10. Auto-deletion of rejected file from disk", () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const file = createMockFile("should-be-deleted.pdf", "application/pdf", pngBuffer);

    try {
        fileValidator(file);
    } catch {
        // Expected to fail validation
    }

    if (fs.existsSync(file.path)) {
        throw new Error("Rejected file was NOT deleted from temp directory!");
    }
});

console.log("\n=================================");
console.log(`  Summary: ${passed} passed, ${failed} failed`);
console.log("=================================\n");

if (failed > 0) {
    process.exit(1);
}
