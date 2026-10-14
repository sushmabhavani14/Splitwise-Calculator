/**
 * net[memberId] > 0  -> the group owes this person
 * net[memberId] < 0  -> this person owes the group
 * All values are in paise (integers).
 *
 * @param {number[]} memberIds
 * @param {{member_id:number, paise:number}[]} paid     what each person paid out
 * @param {{member_id:number, paise:number}[]} owed     each person's share of expenses
 * @param {{from_member:number, to_member:number, paise:number}[]} settlements
 */
function computeNet(memberIds, paid, owed, settlements) {
  const net = {};
  memberIds.forEach((id) => (net[id] = 0));

  paid.forEach((r) => (net[r.member_id] = (net[r.member_id] || 0) + r.paise));
  owed.forEach((r) => (net[r.member_id] = (net[r.member_id] || 0) - r.paise));

  // from_member paid to_member: from owes less, to is owed less
  settlements.forEach((s) => {
    net[s.from_member] = (net[s.from_member] || 0) + s.paise;
    net[s.to_member] = (net[s.to_member] || 0) - s.paise;
  });

  return net;
}

/**
 * Fewest-payments settlement: repeatedly match the biggest debtor with the
 * biggest creditor.
 * @returns {{from:number, to:number, paise:number}[]}
 */
function simplifyDebts(net) {
  const creditors = [];
  const debtors = [];
  Object.entries(net).forEach(([id, v]) => {
    if (v > 0) creditors.push({ id: Number(id), v });
    if (v < 0) debtors.push({ id: Number(id), v: -v });
  });

  const transfers = [];
  while (creditors.length && debtors.length) {
    creditors.sort((a, b) => b.v - a.v);
    debtors.sort((a, b) => b.v - a.v);
    const c = creditors[0];
    const d = debtors[0];
    const pay = Math.min(c.v, d.v);
    transfers.push({ from: d.id, to: c.id, paise: pay });
    c.v -= pay;
    d.v -= pay;
    if (c.v === 0) creditors.shift();
    if (d.v === 0) debtors.shift();
  }
  return transfers;
}

module.exports = { computeNet, simplifyDebts };
