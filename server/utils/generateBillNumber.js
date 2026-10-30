import Counter from "../models/counter.js";

const generateBillNumber = async (userId) => {
  const counterName = `salesBill:${userId}`;

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

      return `BILL-${String(counter.sequence).padStart(6, "0")}`;
    } catch (error) {
      if (error.code !== 11000 || attempt === 2) throw error;
    }
  }
};


export default generateBillNumber;
