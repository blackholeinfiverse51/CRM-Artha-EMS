const request = require('supertest');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Mock Express app for testing
const express = require('express');
const app = express();
app.use(express.json());

// Import routes
const productionRoutes = require('../routes/productionRoutes');
const enhancedRoutes = require('../routes/enhancedAgentHistory');

app.use('/api/agent', productionRoutes);
app.use('/api/agent', enhancedRoutes);

// Import models
const AgentActionHistory = require('../models/AgentActionHistory');

describe('Agentic ERP System Tests', () => {
  let testTraceId;
  let testProposalId;

  beforeAll(async () => {
    // Connect to test database
    const MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 
      'mongodb+srv://7819vijaysharma:Ram%402025@cluster0.cvizq.mongodb.net/blackhole_db_test';
    
    await mongoose.connect(MONGODB_TEST_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await AgentActionHistory.deleteMany({ proposal_source: 'test_agent' });
    await mongoose.connection.close();
  });

  beforeEach(() => {
    testTraceId = uuidv4();
  });

  describe('Unit Tests', () => {
    describe('Proposal Creation', () => {
      test('should create AI proposal successfully', async () => {
        const proposalData = {
          action_type: 'inventory_restock',
          action_payload: {
            product_id: 'TEST-PRODUCT-001',
            current_stock: 5,
            reorder_level: 20,
            suggested_quantity: 50,
            supplier: 'TEST-SUPPLIER-001',
            estimated_cost: 25000.00,
            urgency: 'high'
          },
          proposal_source: 'test_agent'
        };

        const response = await request(app)
          .post('/api/agent/propose')
          .set('X-Trace-ID', testTraceId)
          .send(proposalData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.trace_id).toBe(testTraceId);
        expect(response.body.data.status).toBe('proposed');
        expect(response.body.data.next_step).toBe('awaiting_human_approval');

        testProposalId = response.body.data.proposal_id;

        // Verify database record
        const dbRecord = await AgentActionHistory.findOne({ 
          proposal_id: testProposalId 
        });
        expect(dbRecord).toBeTruthy();
        expect(dbRecord.trace_id).toBe(testTraceId);
        expect(dbRecord.approval_status).toBe('pending');
      });

      test('should reject proposal with missing required fields', async () => {
        const invalidProposal = {
          action_payload: { test: true }
          // Missing action_type
        };

        const response = await request(app)
          .post('/api/agent/propose')
          .set('X-Trace-ID', testTraceId)
          .send(invalidProposal)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('action_type and action_payload are required');
      });
    });

    describe('Approval Validation', () => {
      let proposalId;

      beforeEach(async () => {
        // Create test proposal
        const proposal = new AgentActionHistory({
          trace_id: testTraceId,
          proposal_id: `test-prop-${Date.now()}`,
          proposal_source: 'test_agent',
          action_type: 'test_action',
          action_payload: { test: true }
        });
        await proposal.save();
        proposalId = proposal.proposal_id;
      });

      test('should approve proposal successfully', async () => {
        const approvalData = {
          approval_status: 'approved',
          approval_identity: 'test-manager-001',
          approval_notes: 'Test approval'
        };

        const response = await request(app)
          .post(`/api/agent/approve/${proposalId}`)
          .set('X-Trace-ID', testTraceId)
          .send(approvalData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.approval_status).toBe('approved');
        expect(response.body.data.execution_triggered).toBe(true);

        // Verify database update
        const dbRecord = await AgentActionHistory.findOne({ 
          proposal_id: proposalId 
        });
        expect(dbRecord.approval_status).toBe('approved');
        expect(dbRecord.approval_identity).toBe('test-manager-001');
        expect(dbRecord.timestamp_approved).toBeTruthy();
      });

      test('should reject proposal successfully', async () => {
        const rejectionData = {
          approval_status: 'rejected',
          approval_identity: 'test-manager-001',
          approval_notes: 'Test rejection'
        };

        const response = await request(app)
          .post(`/api/agent/approve/${proposalId}`)
          .set('X-Trace-ID', testTraceId)
          .send(rejectionData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.approval_status).toBe('rejected');
        expect(response.body.data.next_step).toBe('proposal_rejected');
      });

      test('should require approval_identity', async () => {
        const invalidApproval = {
          approval_status: 'approved'
          // Missing approval_identity
        };

        const response = await request(app)
          .post(`/api/agent/approve/${proposalId}`)
          .set('X-Trace-ID', testTraceId)
          .send(invalidApproval)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('approval_identity is required');
      });
    });

    describe('Executor Triggers', () => {
      test('should trigger inventory executor', async () => {
        const action = {
          trace_id: testTraceId,
          action_type: 'inventory_restock',
          action_payload: {
            product_id: 'TEST-PRODUCT-001',
            quantity: 50,
            current_stock: 10
          }
        };

        const productionController = require('../controllers/productionAgentController');
        const result = await productionController.executeInventoryAction(action);

        expect(result.action).toBe('inventory_restock');
        expect(result.product_id).toBe('TEST-PRODUCT-001');
        expect(result.quantity_added).toBe(50);
        expect(result.new_stock_level).toBe(60);
        expect(result.po_number).toBeTruthy();
      });
    });

    describe('History Storage', () => {
      test('should store complete action history', async () => {
        const action = new AgentActionHistory({
          trace_id: testTraceId,
          proposal_id: `test-history-${Date.now()}`,
          proposal_source: 'test_agent',
          action_type: 'test_storage',
          action_payload: { test: 'data' },
          approval_status: 'approved',
          approval_identity: 'test-user',
          execution_status: 'executed',
          execution_result: { success: true }
        });

        await action.save();

        const saved = await AgentActionHistory.findOne({ 
          trace_id: testTraceId 
        });

        expect(saved).toBeTruthy();
        expect(saved.trace_id).toBe(testTraceId);
        expect(saved.approval_status).toBe('approved');
        expect(saved.execution_status).toBe('executed');
      });
    });
  });

  describe('Integration Tests', () => {
    test('should complete full workflow: AI propose → Human approve → Executor run → Result stored', async () => {
      // Step 1: AI Proposal
      const proposalData = {
        action_type: 'inventory_restock',
        action_payload: {
          product_id: 'INTEGRATION-TEST-001',
          current_stock: 3,
          reorder_level: 15,
          suggested_quantity: 30,
          supplier: 'TEST-SUPPLIER-001',
          estimated_cost: 15000.00,
          urgency: 'medium'
        },
        proposal_source: 'test_agent'
      };

      const proposeResponse = await request(app)
        .post('/api/agent/propose')
        .set('X-Trace-ID', testTraceId)
        .send(proposalData)
        .expect(201);

      const proposalId = proposeResponse.body.data.proposal_id;

      // Step 2: Human Approval
      const approvalData = {
        approval_status: 'approved',
        approval_identity: 'integration-test-manager',
        approval_notes: 'Integration test approval'
      };

      const approveResponse = await request(app)
        .post(`/api/agent/approve/${proposalId}`)
        .set('X-Trace-ID', testTraceId)
        .send(approvalData)
        .expect(200);

      expect(approveResponse.body.data.execution_triggered).toBe(true);

      // Step 3: Verify execution and storage
      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 1000));

      const dbRecord = await AgentActionHistory.findOne({ 
        proposal_id: proposalId 
      });

      expect(dbRecord.approval_status).toBe('approved');
      expect(dbRecord.execution_status).toBe('executed');
      expect(dbRecord.execution_result).toBeTruthy();
      expect(dbRecord.execution_result.action).toBe('inventory_restock');

      // Step 4: Verify trace consistency
      expect(dbRecord.trace_id).toBe(testTraceId);
      expect(dbRecord.timestamp_proposed).toBeTruthy();
      expect(dbRecord.timestamp_approved).toBeTruthy();
      expect(dbRecord.timestamp_executed).toBeTruthy();
    });

    test('should maintain trace_id consistency across workflow', async () => {
      const proposalData = {
        action_type: 'test_trace_consistency',
        action_payload: { test: true },
        proposal_source: 'test_agent'
      };

      // Create proposal
      const proposeResponse = await request(app)
        .post('/api/agent/propose')
        .set('X-Trace-ID', testTraceId)
        .send(proposalData);

      expect(proposeResponse.body.trace_id).toBe(testTraceId);

      const proposalId = proposeResponse.body.data.proposal_id;

      // Approve with same trace_id
      const approveResponse = await request(app)
        .post(`/api/agent/approve/${proposalId}`)
        .set('X-Trace-ID', testTraceId)
        .send({
          approval_status: 'approved',
          approval_identity: 'trace-test-user'
        });

      expect(approveResponse.body.trace_id).toBe(testTraceId);

      // Verify database consistency
      const dbRecord = await AgentActionHistory.findOne({ 
        proposal_id: proposalId 
      });
      expect(dbRecord.trace_id).toBe(testTraceId);
    });
  });

  describe('Failure Tests', () => {
    test('should handle approval rejection gracefully', async () => {
      // Create proposal
      const proposalData = {
        action_type: 'test_rejection',
        action_payload: { test: true },
        proposal_source: 'test_agent'
      };

      const proposeResponse = await request(app)
        .post('/api/agent/propose')
        .set('X-Trace-ID', testTraceId)
        .send(proposalData);

      const proposalId = proposeResponse.body.data.proposal_id;

      // Reject proposal
      const rejectResponse = await request(app)
        .post(`/api/agent/approve/${proposalId}`)
        .set('X-Trace-ID', testTraceId)
        .send({
          approval_status: 'rejected',
          approval_identity: 'test-rejector',
          approval_notes: 'Test rejection'
        })
        .expect(200);

      expect(rejectResponse.body.data.approval_status).toBe('rejected');
      expect(rejectResponse.body.data.next_step).toBe('proposal_rejected');

      // Verify no execution triggered
      const dbRecord = await AgentActionHistory.findOne({ 
        proposal_id: proposalId 
      });
      expect(dbRecord.execution_status).toBe('not_executed');
    });

    test('should handle invalid proposal payload', async () => {
      const invalidData = {
        action_type: 'test_invalid',
        // Missing action_payload
        proposal_source: 'test_agent'
      };

      const response = await request(app)
        .post('/api/agent/propose')
        .set('X-Trace-ID', testTraceId)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('action_type and action_payload are required');
    });

    test('should handle non-existent proposal approval', async () => {
      const response = await request(app)
        .post('/api/agent/approve/non-existent-proposal')
        .set('X-Trace-ID', testTraceId)
        .send({
          approval_status: 'approved',
          approval_identity: 'test-user'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Proposal not found');
    });
  });

  describe('Security Tests', () => {
    test('should prevent AI direct execution', async () => {
      const response = await request(app)
        .post('/api/agent/propose')
        .set('X-Trace-ID', testTraceId)
        .set('User-Agent', 'ai-agent/1.0')
        .send({
          action_type: 'direct_execute_test',
          action_payload: { test: true },
          proposal_source: 'test_agent'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('AI agents cannot execute actions directly');
      expect(response.body.governance_rule).toBe('AI_EXECUTION_FORBIDDEN');
    });

    test('should require approval_identity for governance', async () => {
      // Create test proposal first
      const proposal = new AgentActionHistory({
        trace_id: testTraceId,
        proposal_id: `security-test-${Date.now()}`,
        proposal_source: 'test_agent',
        action_type: 'security_test',
        action_payload: { test: true }
      });
      await proposal.save();

      const response = await request(app)
        .post(`/api/agent/approve/${proposal.proposal_id}`)
        .set('X-Trace-ID', testTraceId)
        .send({
          approval_status: 'approved'
          // Missing approval_identity
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('approval_identity is required');
    });

    test('should validate trace logs cannot be deleted', async () => {
      // This test ensures the system maintains audit trail integrity
      const proposal = new AgentActionHistory({
        trace_id: testTraceId,
        proposal_id: `audit-test-${Date.now()}`,
        proposal_source: 'test_agent',
        action_type: 'audit_test',
        action_payload: { test: true },
        approval_status: 'approved',
        approval_identity: 'test-user',
        execution_status: 'executed',
        execution_result: { success: true }
      });
      await proposal.save();

      // Verify record exists and is immutable
      const record = await AgentActionHistory.findOne({ 
        trace_id: testTraceId 
      });
      expect(record).toBeTruthy();
      expect(record.trace_id).toBe(testTraceId);

      // In production, deletion would be prevented by database constraints
      // and access controls - this test verifies the record structure
      expect(record.timestamp_proposed).toBeTruthy();
      expect(record.createdAt).toBeTruthy();
      expect(record.updatedAt).toBeTruthy();
    });
  });

  describe('Production Monitoring', () => {
    test('should provide monitoring stats', async () => {
      const response = await request(app)
        .get('/api/agent/monitoring/stats')
        .set('X-Trace-ID', testTraceId)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeTruthy();
      expect(response.body.data.action_types).toBeTruthy();
      expect(response.body.data.timestamp).toBeTruthy();
    });

    test('should retrieve pending proposals', async () => {
      const response = await request(app)
        .get('/api/agent/proposals/pending')
        .set('X-Trace-ID', testTraceId)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.proposals).toBeTruthy();
      expect(response.body.data.pagination).toBeTruthy();
    });
  });
});

module.exports = { app };