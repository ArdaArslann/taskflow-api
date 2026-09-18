const express = require('express');
const controller = require('../controllers/report.controller');

const router = express.Router();

router.get('/summary', controller.getSummary);
router.get('/completed', controller.getCompleted);
router.get('/pending', controller.getPending);

module.exports = router;
