const busboy = require("busboy"); // v1+ syntax
const cloudinary = require("../config/cloudinary");
const models = require("../models/model");
const { nanoid } = require("nanoid");
const { fileTypeFromBuffer } = require("file-type");
const streamifier = require("streamifier");

const uploadFile = async (req, res) => {
  try {
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

        // Determine Cloudinary resource type
        let resourceType = "raw";
        if (type?.mime?.startsWith("image/")) resourceType = "image";
        else if (type?.mime?.startsWith("video/")) resourceType = "video";

        // Generate unique ID
        const fileUuid = nanoid(6);
        const publicId = `${fileUuid}.${extension}`;

        fileProcessed = true;

        // Upload buffer to Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
          { resource_type: resourceType, public_id: publicId },
          async (error, result) => {
            if (error) {
              console.error("Cloudinary Upload Error:", error);
              return res.status(500).json({
                success: false,
                message: "Cloudinary Upload Failed",
                error: error.message,
              });
            }

            try {
              // Transform URL for forced download
              const rawUrl = result.secure_url;
              const parts = rawUrl.split("/upload/");
              const transformedUrl =
                parts[0] + "/upload/fl_attachment/" + parts[1];

              // Save metadata to DB
              await models.create({
                filename: finalFilename,
                id: fileUuid,
                url: transformedUrl,
              });

              return res.status(200).json({
                success: true,
                id: fileUuid,
                url: transformedUrl,
              });
            } catch (dbError) {
              console.error("DB Save Error:", dbError);
              return res.status(500).json({
                success: false,
                message: "Database save failed",
                error: dbError.message,
              });
            }
          }
        );

        // Pipe buffer into Cloudinary upload stream
        streamifier.createReadStream(buffer).pipe(uploadStream);
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

    req.pipe(bb);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = { uploadFile };
