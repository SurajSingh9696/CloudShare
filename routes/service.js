const router = require('express').Router();

router.post('/upload', require('../controllers/upload').uploadFile);
router.get('/download/:id', require('../controllers/download').downloadFile);

module.exports = router;