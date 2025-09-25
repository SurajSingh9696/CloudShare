const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const dbName = "Small_Projects";

const downloadFile = async (req, res) => {
  try {
    console.log("Download Request Params: ", req.params);
    const { id } = req.params;

    await client.connect();
    const db = client.db(dbName);
    const filesCollection = db.collection("CloudShare");

    const file = await filesCollection.findOne({ id });

    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found or expired' });
    }

    // Check if file has expired
    if (file.expiresAt && new Date() > file.expiresAt) {
      // Delete expired file
      await filesCollection.deleteOne({ _id: file._id });
      return res.status(404).json({ success: false, message: 'File has expired' });
    }

    console.log("File found:", file.filename, "Size:", file.size);

    // Set headers for file download
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Length', file.size);
    res.setHeader('Cache-Control', 'no-cache');

    // Send the file data as buffer
    res.send(file.fileData.buffer ? file.fileData.buffer : file.fileData);

  } catch (error) {
    console.error("Download Error: ", error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  } finally {
    await client.close();
  }
}

module.exports = { downloadFile };