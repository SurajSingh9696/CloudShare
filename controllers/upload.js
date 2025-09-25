const busboy = require("busboy");
const { MongoClient, ObjectId } = require('mongodb');
const { nanoid } = require("nanoid");
const { fileTypeFromBuffer } = require("file-type");

// MongoDB connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const dbName = "Small_Projects";

const uploadFile = async (req, res) => {
  let connection;
  try {
    await client.connect();
    connection = client.db(dbName);
    const filesCollection = connection.collection("CloudShare");

    const bb = busboy({ headers: req.headers });
    let fileProcessed = false;

    bb.on("file", async (fieldname, file, info) => {
      try {
        const { filename, mimeType } = info;
        console.log("Uploading:", filename, "(", mimeType, ")");

        // Collect file chunks into buffer
        const chunks = [];
        for await (const chunk of file) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);

        // Detect real file type
        const type = await fileTypeFromBuffer(buffer);
        const extension = type?.ext || filename.split(".").pop() || "bin";
        const finalFilename = filename || `file.${extension}`;

        // Generate unique ID
        const fileUuid = nanoid(6);

        fileProcessed = true;

        // Save file to MongoDB
        const fileDocument = {
          filename: finalFilename,
          id: fileUuid,
          mimeType: type?.mime || mimeType,
          fileData: buffer, // Store the actual file data
          size: buffer.length,
          uploadDate: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };

        const result = await filesCollection.insertOne(fileDocument);

        return res.status(200).json({
          success: true,
          id: fileUuid,
          message: "File uploaded successfully"
        });

      } catch (innerErr) {
        console.error("Upload processing error:", innerErr);
        return res.status(500).json({
          success: false,
          message: "Error processing file",
          error: innerErr.message,
        });
      }
    });

    bb.on("finish", () => {
      if (!fileProcessed) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }
      console.log("Busboy finished parsing.");
    });

    bb.on("error", (error) => {
      console.error("Busboy error:", error);
      return res.status(500).json({
        success: false,
        message: "Error parsing form data",
        error: error.message,
      });
    });

    req.pipe(bb);

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  } finally {
    // Don't close the connection immediately to allow for multiple requests
    // The connection will be managed by connection pooling
  }
};

module.exports = { uploadFile };