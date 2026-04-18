function serializeEarning(earning) {
  if (!earning) return earning;

  return {
    ...earning,
    gross_earned: earning.gross_earned?.toString?.() ?? earning.gross_earned,
    platform_deductions: earning.platform_deductions?.toString?.() ?? earning.platform_deductions,
    net_received: earning.net_received?.toString?.() ?? earning.net_received
  };
}

function serializeEarningList(earnings) {
  return earnings.map(serializeEarning);
}

module.exports = {
  serializeEarning,
  serializeEarningList
};
