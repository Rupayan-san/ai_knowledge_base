import express from "express";
import upload from "./src/middlewares/upload.middleware.ts";

const app = express();
const PORT = 3000;


app.get("/", (req, res) => {
    console.log("hello world")
    res.send("bienvenido")
});

app.post("/upload", upload.single('avatar'), (req, res) => {
    console.log('uploaded');
    res.status(200).json({ 
        message: "File uploaded successfully!",
        file: req.file 
    });
}
    
)

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});