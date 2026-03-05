exports.withTry = (fn) => async (req, res, next) => {
  try {
    return await fn(req, res, next);
  } catch (err) {
    const trace_id = req.headers['x-trace-id'] || req.body?.trace_id || null;
    const status = err?.statusCode || 500;
    const code = err?.code || 'INTERNAL_ERROR';
    return res.status(status).json({ error: code, trace_id });
  }
};
