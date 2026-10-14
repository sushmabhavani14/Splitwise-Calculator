// Quick self-test for the money logic (no database needed): npm test
const assert = require("assert");
const { computeShares } = require("./utils/splits");
const { computeNet, simplifyDebts } = require("./utils/balances");

const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

// equal split of 100 between 3 -> 3334 + 3333 + 3333 paise
let s = computeShares(100, "equal", [1, 2, 3]);
assert.deepStrictEqual(s, { 1: 3334, 2: 3333, 3: 3333 });
assert.strictEqual(sum(s), 10000);

// percentage split always sums exactly
s = computeShares(100, "percentage", [1, 2, 3], { 1: 33.33, 2: 33.33, 3: 33.34 });
assert.strictEqual(sum(s), 10000);

// custom split must match the total
s = computeShares(100, "custom", [1, 2], { 1: 60, 2: 40 });
assert.deepStrictEqual(s, { 1: 6000, 2: 4000 });
assert.throws(() => computeShares(100, "custom", [1, 2], { 1: 60, 2: 30 }));
assert.throws(() => computeShares(100, "percentage", [1, 2], { 1: 60, 2: 30 }));

// balances: 1 paid 300, split equally across 1,2,3
let net = computeNet([1, 2, 3], [{ member_id: 1, paise: 30000 }],
  [{ member_id: 1, paise: 10000 }, { member_id: 2, paise: 10000 }, { member_id: 3, paise: 10000 }], []);
assert.deepStrictEqual(net, { 1: 20000, 2: -10000, 3: -10000 });
assert.deepStrictEqual(simplifyDebts(net), [
  { from: 2, to: 1, paise: 10000 },
  { from: 3, to: 1, paise: 10000 },
]);

// settlement: 2 pays 1 back 100 -> 2 is square
net = computeNet([1, 2, 3], [{ member_id: 1, paise: 30000 }],
  [{ member_id: 1, paise: 10000 }, { member_id: 2, paise: 10000 }, { member_id: 3, paise: 10000 }],
  [{ from_member: 2, to_member: 1, paise: 10000 }]);
assert.strictEqual(net[2], 0);
assert.strictEqual(net[1], 10000);

console.log("All tests passed ✅");
