require("dotenv").config();

module.exports = {
  MONGODB_URI: process.env.MONGODB_URI,
  PORT: process.env.PORT || 5003,
  JWT_SECRET: process.env.JWT_SECRET,
  MONITOR_INTERVAL_MS: parseInt(process.env.MONITOR_INTERVAL_MS) || 60000,
  IDLE_THRESHOLD_HOURS: parseInt(process.env.IDLE_THRESHOLD_HOURS) || 2,
  API_BASE_URL: process.env.API_BASE_URL || "http://localhost:5003",
  AGENT_RULES_ENABLED: process.env.AGENT_RULES_ENABLED === "true",
  AUTO_APPROVE_THRESHOLD: parseFloat(process.env.AUTO_APPROVE_THRESHOLD) || 0.95,
  WORKFLOW_API_URL: process.env.WORKFLOW_API_URL || "http://localhost:5001/api",
  CRM_API_URL: process.env.CRM_API_URL || "http://localhost:8000",
  FINANCE_API_URL: process.env.FINANCE_API_URL || "http://localhost:5002/api",
};
