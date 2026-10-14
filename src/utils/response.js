function success(res, data, status = 200) {
  return res.status(status).json({ success: true, data, error: null });
}

function failure(res, message, status = 500) {
  return res.status(status).json({ success: false, data: {}, error: message });
}

module.exports = { success, failure };
