function sendNotFound(res, message) {
  return res.status(404).json({ error: message });
}

function sendBadRequest(res, message) {
  return res.status(400).json({ error: message });
}

module.exports = {
  sendNotFound,
  sendBadRequest
};
