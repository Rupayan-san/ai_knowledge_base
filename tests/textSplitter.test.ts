import { splitText } from "../utils/textSplitter.utils.ts";

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
    console.log("   Running Text Splitter Tests   ");
    console.log("=================================\n");

    // Test 1: Short text should return a single chunk
    await runTest("1. Short text (< chunkSize) returns single chunk", async () => {
        const text = "Antigravity AI Knowledge Base system.";
        const chunks = await splitText(text);

        if (!Array.isArray(chunks)) {
            throw new Error(`Expected array, got ${typeof chunks}`);
        }
        if (chunks.length !== 1) {
            throw new Error(`Expected 1 chunk, got ${chunks.length}`);
        }
        if (chunks[0] !== text) {
            throw new Error(`Expected chunk to equal input, got "${chunks[0]}"`);
        }
    });

    // Test 2: Empty text returns empty array
    await runTest("2. Empty string returns empty array", async () => {
        const chunks = await splitText("");

        if (!Array.isArray(chunks) || chunks.length !== 0) {
            throw new Error(`Expected empty array, got ${JSON.stringify(chunks)}`);
        }
    });

    // Test 3: Long text exceeding chunkSize splits into multiple chunks
    await runTest("3. Long text (> 1000 characters) splits into multiple chunks", async () => {
        const paragraph = "Artificial intelligence and machine learning enable automated knowledge base processing. ";
        // 90 chars * 30 = 2700 chars
        const longText = paragraph.repeat(30);

        const chunks = await splitText(longText);

        if (chunks.length <= 1) {
            throw new Error(`Expected multiple chunks, got ${chunks.length}`);
        }

        for (let i = 0; i < chunks.length; i++) {
            if (chunks[i].length > 1000) {
                throw new Error(`Chunk ${i} exceeded max chunkSize (1000 chars): ${chunks[i].length}`);
            }
        }
    });

    // Test 4: Overlap verification between consecutive chunks
    await runTest("4. Consecutive chunks exhibit overlap (~200 characters)", async () => {
        // Create distinct sentences so overlap is easy to identify
        const sentences = Array.from({ length: 40 }, (_, i) => `Sentence number ${i + 1} contains important context information.`);
        const longText = sentences.join(" ");

        const chunks = await splitText(longText);

        if (chunks.length < 2) {
            throw new Error(`Expected at least 2 chunks to test overlap, got ${chunks.length}`);
        }

        // Take the last sentence of chunk 0, it should be present in chunk 1 due to overlap
        const chunk0Sentences = chunks[0].split(". ").map(s => s.trim()).filter(Boolean);
        const lastSentenceOfChunk0 = chunk0Sentences[chunk0Sentences.length - 1];

        if (!chunks[1].includes(lastSentenceOfChunk0)) {
            throw new Error(`Expected chunk 1 to include overlapping content from chunk 0 ("${lastSentenceOfChunk0}")`);
        }
    });

    // Test 5: Natural boundary preservation (splits on paragraphs \n\n)
    await runTest("5. Respects natural paragraph boundaries (\\n\\n)", async () => {
        const para1 = "Paragraph one with detailed background knowledge. ".repeat(12); // ~600 chars
        const para2 = "Paragraph two with additional relevant details. ".repeat(12);   // ~580 chars
        const combined = `${para1}\n\n${para2}`;

        const chunks = await splitText(combined);

        if (chunks.length !== 2) {
            throw new Error(`Expected exactly 2 chunks splitting at paragraph break, got ${chunks.length}`);
        }
        if (!chunks[0].includes("Paragraph one")) {
            throw new Error("Chunk 0 missing expected paragraph 1 content");
        }
        if (!chunks[1].includes("Paragraph two")) {
            throw new Error("Chunk 1 missing expected paragraph 2 content");
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
