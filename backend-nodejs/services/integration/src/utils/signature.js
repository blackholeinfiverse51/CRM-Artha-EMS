const crypto = require('crypto');

function timingSafeEqual(a, b) {
  const ab = Buffer.from(a || '');
  const bb = Buffer.from(b || '');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

exports.verifySignatureIfProvided = function verifySignatureIfProvided(req, secret) {
  if (!secret) return true; // no-op in dev without secret
  try {
    const sig = req.headers['x-signature'] || '';
    const payload = JSON.stringify(req.body || {});
    const mac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (!timingSafeEqual(mac, sig)) {
      const err = new Error('INVALID_SIGNATURE');
      err.statusCode = 401;
      err.code = 'INVALID_SIGNATURE';
      throw err;
    }
    return true;
  } catch (e) {
    const err = new Error('SIGNATURE_VERIFICATION_FAILED');
    err.statusCode = e.statusCode || 401;
    err.code = e.code || 'INVALID_SIGNATURE';
    throw err;
  }
};
