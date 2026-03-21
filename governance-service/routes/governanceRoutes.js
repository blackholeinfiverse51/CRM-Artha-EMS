const express = require('express');
const router = express.Router();
const governanceController = require('../controllers/governanceController');
const actionHistoryController = require('../controllers/actionHistoryController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.post('/proposals/create', governanceController.createProposal);
router.post('/proposals/review', governanceController.reviewProposal);
router.post('/proposals/approve', auth, roleCheck(['approver', 'admin']), governanceController.approveProposal);
router.post('/proposals/reject', auth, roleCheck(['approver', 'admin']), governanceController.rejectProposal);
router.post('/workflow/execute', governanceController.executeWorkflow);
router.get('/proposals/:id/trace', governanceController.getTrace);

router.put('/action-history/:trace_id/approval', auth, roleCheck(['approver', 'admin']), actionHistoryController.updateApproval);
router.put('/action-history/:trace_id/execution', actionHistoryController.updateExecution);
router.get('/action-history/:trace_id/trace', actionHistoryController.getTrace);

module.exports = router;
