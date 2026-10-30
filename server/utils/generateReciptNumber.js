import Counter from "../models/counter.js";

const generateReceiptNumber = async (userId) => {
  const counterName = `stockReceipt:${userId}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { name: counterName },
        {
          $inc: { sequence: 1 },
          $setOnInsert: { userId },
        },
        { new: true, upsert: true }
      );

      return `RCPT-${String(counter.sequence).padStart(6, "0")}`;
    } catch (error) {
      // Two first-time requests for the same user can race to create a counter.
      // The counter name itself is unique per user, including on databases that
      // still have the legacy unique `name_1` index.
      if (error.code !== 11000 || attempt === 2) throw error;
    }
  }
};

export default generateReceiptNumber;
