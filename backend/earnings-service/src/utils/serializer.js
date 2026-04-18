function serializeEarning(earning) {
  if (!earning) return earning;

  return {
    ...earning,
    gross_amount: earning.gross_amount?.toString?.() ?? earning.gross_amount
  };
}

function serializeEarningList(earnings) {
  return earnings.map(serializeEarning);
}

module.exports = {
  serializeEarning,
  serializeEarningList
};
