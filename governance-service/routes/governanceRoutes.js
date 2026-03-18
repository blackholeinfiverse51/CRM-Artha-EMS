const express = require('express');
const router = express.Router();
const governanceController = require('../controllers/governanceController');

router.post('/proposals/create', governanceController.createProposal);
router.post('/proposals/review', governanceController.reviewProposal);
router.post('/proposals/approve', governanceController.approveProposal);
router.post('/proposals/reject', governanceController.rejectProposal);
router.post('/workflow/execute', governanceController.executeWorkflow);
router.get('/proposals/:id/trace', governanceController.getTrace);

module.exports = router;
