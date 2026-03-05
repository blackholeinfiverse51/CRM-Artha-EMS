const express = require('express');
const Joi = require('joi');
const { withTry } = require('./utils/withTry');
const { EventLog } = require('./storage/eventLog');
const { verifySignatureIfProvided } = require('./utils/signature');
const { arthaClient } = require('./third_party/arthaClient');
const { mapEmployeeToArtha } = require('./transform/emsToArtha');
const { mapInvoiceToArthaLedger } = require('./transform/crmToArtha');

const router = express.Router();

const eventLog = new EventLog();

function getTraceId(req) {
  return req.headers['x-trace-id'] || req.body?.trace_id || null;
}

// Schemas
const emsEmployeeSchema = Joi.object({
  id: Joi.string().required(),
  employee_id: Joi.string().required(),
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  email: Joi.string().email().required(),
  department: Joi.string().allow('', null),
  role: Joi.string().allow('', null),
  cost_center: Joi.string().allow('', null),
  trace_id: Joi.string().max(200).optional(),
}).unknown(true);

const crmInvoiceSchema = Joi.object({
  id: Joi.string().required(),
  invoice_number: Joi.string().required(),
  customer_id: Joi.string().required(),
  currency: Joi.string().length(3).required(),
  total_amount: Joi.number().precision(2).required(),
  items: Joi.array().items(Joi.object({
    sku: Joi.string().required(),
    description: Joi.string().allow('').required(),
    quantity: Joi.number().integer().positive().required(),
    unit_price: Joi.number().precision(2).required(),
    gl_code: Joi.string().allow('', null),
    cost_center: Joi.string().allow('', null),
  })).min(1).required(),
  issued_at: Joi.date().iso().required(),
  due_at: Joi.date().iso().optional(),
  trace_id: Joi.string().max(200).optional(),
}).unknown(true);

// POST /webhooks/ems/employee-created
router.post('/webhooks/ems/employee-created', withTry(async (req, res) => {
  verifySignatureIfProvided(req, process.env.EMS_WEBHOOK_SECRET);

  const { value, error } = emsEmployeeSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: 'INVALID_PAYLOAD', details: error.details.map(d => d.message) });

  const trace_id = getTraceId(req);
  const received = { type: 'ems.employee.created', payload: value, trace_id, received_at: new Date().toISOString() };

  await eventLog.append(received);

  const arthaPayload = mapEmployeeToArtha(value);
  const response = await arthaClient.upsertEmployee(arthaPayload, trace_id);

  await eventLog.append({ type: 'ems.employee.created.processed', payload: { source_id: value.id, artha: response }, trace_id, processed_at: new Date().toISOString() });

  return res.status(200).json({ status: 'ok', artha_result: response, trace_id });
}));

// POST /webhooks/crm/invoice-created
router.post('/webhooks/crm/invoice-created', withTry(async (req, res) => {
  verifySignatureIfProvided(req, process.env.CRM_WEBHOOK_SECRET);

  const { value, error } = crmInvoiceSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: 'INVALID_PAYLOAD', details: error.details.map(d => d.message) });

  const trace_id = getTraceId(req);
  const received = { type: 'crm.invoice.created', payload: value, trace_id, received_at: new Date().toISOString() };

  await eventLog.append(received);

  const arthaPayload = mapInvoiceToArthaLedger(value);
  const response = await arthaClient.postLedgerEntry(arthaPayload, trace_id, value.invoice_number);

  await eventLog.append({ type: 'crm.invoice.created.processed', payload: { source_id: value.id, artha: response }, trace_id, processed_at: new Date().toISOString() });

  return res.status(200).json({ status: 'ok', artha_result: response, trace_id });
}));

module.exports = router;
