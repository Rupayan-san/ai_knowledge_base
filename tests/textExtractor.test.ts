import fs from "fs";
import path from "path";
import { extractText, extractTextFromTxt, extractTextFromDoc, extractTextFromPdf } from "../utils/textExtractor.utils.ts";
import type { ValidatedFile } from "../utils/fileValidator.utils.ts";
import { ApiError } from "../utils/apiError.utils.ts";

const TEMP_DIR = path.resolve("./public/temp");

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const createMockValidatedFile = (
    fileName: string,
    fileType: string,
    content: Buffer | string
): ValidatedFile => {
    const filePath = path.join(TEMP_DIR, fileName);
    fs.writeFileSync(filePath, content);

    return {
        fieldname: "avatar",
        originalname: fileName,
        encoding: "7bit",
        mimetype: fileType,
        destination: TEMP_DIR,
        filename: fileName,
        path: filePath,
        size: Buffer.byteLength(content),
        stream: null as any,
        buffer: Buffer.isBuffer(content) ? content : Buffer.from(content),
        fileType,
    };
};

let passed = 0;
let failed = 0;

const runTest = async (testName: string, fn: () => Promise<void>) => {
    try {
        await fn();
        console.log(`  PASSED: ${testName}`);
        passed++;
    } catch (err: any) {
        console.error(`  FAILED: ${testName}`);
        console.error(`     Error: ${err.message || err}`);
        failed++;
    }
};

const main = async () => {
    console.log("\n=================================");
    console.log("  Running Text Extractor Tests   ");
    console.log("=================================\n");

    // Test 1: Extract from TXT via fs
    await runTest("1. Extract text from .txt file", async () => {
        const textContent = "Hello from knowledge base text file!";
        const file = createMockValidatedFile("sample.txt", "text/plain", textContent);
        const result = await extractText(file);

        if (result !== textContent) {
            throw new Error(`Expected '${textContent}', got '${result}'`);
        }
    });

    // Test 2: Extract from DOCX via mammoth
    await runTest("2. Extract text from .docx file via mammoth", async () => {
        const sampleDocxPath = path.resolve("node_modules/mammoth/test/test-data/single-paragraph.docx");
        const docxBuffer = fs.readFileSync(sampleDocxPath);
        const file = createMockValidatedFile(
            "sample.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            docxBuffer
        );
        const result = await extractText(file);

        if (!result.includes("Walking on imported air")) {
            throw new Error(`Expected text to include 'Walking on imported air', got '${result}'`);
        }
    });

    // Test 3: Extract from PDF via pdf-parse
    await runTest("3. Extract text from .pdf file via pdf-parse", async () => {
        const minimalPdf =
            "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n4 0 obj<</Length 44>>stream\nBT\n/F1 12 Tf\n100 700 Td\n(Knowledge Base PDF Document) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n310\n%%EOF";

        const file = createMockValidatedFile("document.pdf", "application/pdf", Buffer.from(minimalPdf));
        const result = await extractText(file);

        if (!result.includes("Knowledge Base PDF Document")) {
            throw new Error(`Expected text to include 'Knowledge Base PDF Document', got '${result}'`);
        }
    });

    // Test 4: Unsupported file type throws ApiError 400
    await runTest("4. Unsupported file type throws ApiError 400", async () => {
        const file = createMockValidatedFile("photo.jpg", "image/jpeg", "fake-jpeg-bytes");
        let threw = false;
        try {
            await extractText(file);
        } catch (err: any) {
            threw = true;
            if (!(err instanceof ApiError) || err.statusCode !== 400) {
                throw new Error(`Expected ApiError 400, got: ${err}`);
            }
        }
        if (!threw) {
            throw new Error("Expected unsupported file type to throw 400, but it did not!");
        }
    });

    // Test 5: Missing file throws ApiError 400
    await runTest("5. Undefined file throws ApiError 400", async () => {
        let threw = false;
        try {
            await extractText(undefined as any);
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

    console.log("\n=================================");
    console.log(`  Summary: ${passed} passed, ${failed} failed`);
    console.log("=================================\n");

    if (failed > 0) {
        process.exit(1);
    }
};

main();
