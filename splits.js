const { HttpError } = require("./errors");

// All money math is done in integer paise so nothing is lost to float errors.
const toPaise = (n) => Math.round(Number(n) * 100);
const fromPaise = (p) => p / 100;

/**
 * Work out how much each participant owes, in paise.
 *
 * @param {number}   amount        total in rupees (e.g. 100)
 * @param {string}   splitType     "equal" | "percentage" | "custom"
 * @param {number[]} participants  member ids
 * @param {object}   input         { [memberId]: percent | rupees } (not used for equal)
 * @returns {object} { [memberId]: paise }, always summing to the total exactly
 */
function computeShares(amount, splitType, participants, input = {}) {
  const total = toPaise(amount);
  const n = participants.length;
  const result = {};

  if (splitType === "equal") {
    const base = Math.floor(total / n);
    let remainder = total - base * n;
    participants.forEach((id) => {
      result[id] = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
    });
    return result;
  }

  if (splitType === "percentage") {
    const pcts = participants.map((id) => Number(input[id]));
    if (pcts.some((p) => !Number.isFinite(p) || p < 0)) {
      throw new HttpError(400, "Every participant needs a valid percentage.");
    }
    const sum = pcts.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.01) {
      throw new HttpError(400, `Percentages add up to ${sum}, not 100.`);
    }
    let assigned = 0;
    participants.forEach((id, i) => {
      result[id] = Math.floor((total * pcts[i]) / 100);
      assigned += result[id];
    });
    // hand out leftover paise one at a time so the total matches exactly
    let leftover = total - assigned;
    for (let i = 0; leftover > 0; i = (i + 1) % n, leftover--) {
      result[participants[i]] += 1;
    }
    return result;
  }

  if (splitType === "custom") {
    const amounts = participants.map((id) => Number(input[id]));
    if (amounts.some((a) => !Number.isFinite(a) || a < 0)) {
      throw new HttpError(400, "Every participant needs a valid amount.");
    }
    participants.forEach((id, i) => {
      result[id] = toPaise(amounts[i]);
    });
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    if (sum !== total) {
      throw new HttpError(
        400,
        `Custom amounts add up to ${fromPaise(sum)} but the expense is ${fromPaise(total)}.`
      );
    }
    return result;
  }

  throw new HttpError(400, "split_type must be equal, percentage or custom.");
}

module.exports = { toPaise, fromPaise, computeShares };
