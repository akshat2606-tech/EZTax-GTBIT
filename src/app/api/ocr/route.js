import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { cwd } from 'process';
import { spawn } from "child_process";
import jwt from "jsonwebtoken";
import connectDB from "../../../lib/mongoDb";
 
export async function POST(req) {
  try {
    await connectDB();
 
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }
 
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
 
    const formData = await req.formData();
    const file = formData.get("file");
    const documentType = formData.get("documentType");
 
    if (!file || !documentType) {
      return NextResponse.json(
        { error: "Missing file or document type" },
        { status: 400 }
      );
    }
 
    const fileBuffer = await file.arrayBuffer();
    const filePath = path.join(process.cwd(), "public/uploads", file.name);
    fs.writeFileSync(filePath, Buffer.from(fileBuffer));
 
    const pythonScriptPath = path.join(cwd(), 'OCR', 'ocr.py');
 
    return new Promise((resolve) => {
      // Using spawn without pipe, passing the file path as an argument instead
      const pythonProcess = spawn("python", [pythonScriptPath, filePath]);
 
      let output = "";
      pythonProcess.stdout.on("data", (data) => {
        output += data.toString();
      });
 
      pythonProcess.stderr.on("data", (data) => {
        console.error("❌ OCR Script Error:", data.toString());
      });
 
      pythonProcess.on("close", async (code) => {
        // Log the raw output without any parsing
        console.log("Python script output:", output);
       
        // Just respond with success, regardless of output
        resolve(NextResponse.json({ success: true }, { status: 200 }));
      });
    });
  } catch (error) {
    console.error("❌ API Route Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
 