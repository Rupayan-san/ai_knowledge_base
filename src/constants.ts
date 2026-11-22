export const ALLOWED_FILE_EXTENSIONS = ["pdf", "txt", "docx"];

export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
    pdf: ["application/pdf"],
    txt: ["text/plain"],
    docx: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/msword",
        "application/octet-stream"
    ],
};

export const FILE_SIGNATURES: Record<string, string[]> = {
    pdf: ["25504446"],       // %PDF
    docx: ["504b0304"],      // PK.. (ZIP archive)
};
