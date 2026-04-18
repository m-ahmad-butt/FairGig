function isObjectId(value) {
  return /^[a-f\d]{24}$/i.test(value);
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

module.exports = {
  isObjectId,
  normalizeText
};
