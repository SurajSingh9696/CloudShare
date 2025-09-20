const Busboy = require('busboy');
const cloudinary = require('../config/cloudinary');
const express = require('express');
const models = require('../models/model');

const downloadFile = async(req, res) => {
    try {
        const { id } = req.params;
        const file = await models.findOne({   id  });

        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found or expired' });
        }
        rawUrl = file.url;
        let parts = rawUrl.split('/upload/');
        let transformedUrl = parts[0] + '/upload/fl_attachment/' + parts[1];
        res.status(200).json({ success: true, url: transformedUrl });
    } catch (error) {
        console.error("Download Error: ", error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
}

module.exports = { downloadFile };