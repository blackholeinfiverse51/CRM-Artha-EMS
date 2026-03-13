const { v4: uuidv4 } = require('uuid');

class TraceMiddleware {
  // Main middleware function for Express
  static traceHandler() {
    return (req, res, next) => {
      // Extract or generate trace_id
      const trace_id = req.headers['x-trace-id'] || 
                      req.body?.trace_id || 
                      req.query?.trace_id || 
                      uuidv4();

      // Attach trace_id to request context
      req.trace_id = trace_id;
      req.trace_context = {
        trace_id,
        timestamp: new Date().toISOString(),
        request_path: req.path,
        request_method: req.method,
        user_agent: req.headers['user-agent'],
        ip_address: req.ip
      };

      // Add trace_id to response headers
      res.setHeader('X-Trace-ID', trace_id);

      // Log request with trace_id
      console.log(`[${req.trace_context.timestamp}] TRACE_REQUEST - trace_id: ${trace_id}, method: ${req.method}, path: ${req.path}`);

      // Override res.json to include trace_id in all responses
      const originalJson = res.json;
      res.json = function(data) {
        if (typeof data === 'object' && data !== null) {
          data.trace_id = trace_id;
        }
        return originalJson.call(this, data);
      };

      next();
    };
  }

  // Governance enforcement middleware
  static governanceEnforcer() {
    return (req, res, next) => {
      const { path, method } = req;

      // Rule 1: AI cannot execute actions directly
      if (path.includes('/execute') && req.headers['user-agent']?.includes('ai-agent')) {
        return res.status(403).json({
          success: false,
          error: 'AI agents cannot execute actions directly',
          governance_rule: 'AI_EXECUTION_FORBIDDEN',
          trace_id: req.trace_id
        });
      }

      // Rule 2: Execution requires approval
      if (path.includes('/execute') && method === 'POST') {
        const { approval_status } = req.body;
        if (approval_status !== 'approved') {
          return res.status(403).json({
            success: false,
            error: 'Execution requires approved status',
            governance_rule: 'APPROVAL_REQUIRED',
            trace_id: req.trace_id
          });
        }
      }

      next();
    };
  }

  // Propagate trace_id to external service calls
  static propagateTrace(trace_id, serviceCall) {
    return {
      ...serviceCall,
      headers: {
        ...serviceCall.headers,
        'X-Trace-ID': trace_id,
        'X-Request-Source': 'agent-system'
      }
    };
  }

  // Log with trace context
  static logWithTrace(trace_id, level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      trace_id,
      level: level.toUpperCase(),
      message,
      ...data
    };

    console.log(`[${timestamp}] ${level.toUpperCase()} - trace_id: ${trace_id} - ${message}`, 
                data && Object.keys(data).length > 0 ? JSON.stringify(data) : '');
    
    return logEntry;
  }

  // Validate trace requirements
  static validateTraceFields(data) {
    const required = ['trace_id', 'proposal_source', 'timestamp'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required trace fields: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

module.exports = TraceMiddleware;