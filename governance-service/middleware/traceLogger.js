const traceLogger = (req, res, next) => {
  const trace_id = req.headers['x-trace-id'] || req.body.trace_id || req.query.trace_id;
  
  if (trace_id) {
    req.trace_id = trace_id;
    res.setHeader('X-Trace-ID', trace_id);
  }

  const originalJson = res.json;
  res.json = function(data) {
    if (trace_id) {
      console.log(JSON.stringify({
        trace_id,
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        service: 'governance_service'
      }));
    }
    return originalJson.call(this, data);
  };

  next();
};

module.exports = traceLogger;
