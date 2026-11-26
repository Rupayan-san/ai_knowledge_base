import { generateEmbeddings } from "../src/services/embedding.service.ts";

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

// Helper: Cosine similarity between two vectors
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

const main = async () => {
    console.log("\n=================================");
    console.log("    Running Embedding Tests      ");
    console.log("=================================\n");

    // Test 1: Vector generation and dimensionality
    await runTest("1. Generates 1536-dimensional embedding vector", async () => {
        const text = "Artificial intelligence knowledge base system.";
        const embedding = await generateEmbeddings(text);

        if (!Array.isArray(embedding)) {
            throw new Error(`Expected array, got ${typeof embedding}`);
        }
        if (embedding.length !== 1536) {
            throw new Error(`Expected vector dimension of 1536, got ${embedding.length}`);
        }
    });

    // Test 2: Valid numeric values (no NaN or undefined)
    await runTest("2. Vector contains valid floating point numbers", async () => {
        const text = "Validating embedding numerical values.";
        const embedding = await generateEmbeddings(text);

        const hasInvalid = embedding.some((val) => typeof val !== "number" || isNaN(val));
        if (hasInvalid) {
            throw new Error("Vector contains NaN or non-number elements");
        }
    });

    // Test 3: Semantic similarity consistency
    await runTest("3. Semantic cosine similarity check (related > unrelated)", async () => {
        const query1 = "The dog chased the cat across the yard.";
        const query2 = "A canine ran after a feline in the garden.";
        const query3 = "Quantum computing uses superposition and entanglement.";

        const [emb1, emb2, emb3] = await Promise.all([
            generateEmbeddings(query1),
            generateEmbeddings(query2),
            generateEmbeddings(query3),
        ]);

        const simRelated = cosineSimilarity(emb1, emb2);
        const simUnrelated = cosineSimilarity(emb1, emb3);

        if (simRelated <= simUnrelated) {
            throw new Error(
                `Expected related similarity (${simRelated.toFixed(4)}) > unrelated similarity (${simUnrelated.toFixed(4)})`
            );
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
