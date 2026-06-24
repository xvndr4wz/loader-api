import { createClient } from "redis";

const API_KEY = "NdraawzOnTop";

const redis = createClient({ url: process.env.REDIS_URL });

async function getRedis() {
  if (!redis.isOpen) await redis.connect();
  return redis;
}

function formatNumber(num) {
  if (num >= 1000000000000) return (num / 1000000000000).toFixed(3).replace(/\.?0+$/, "") + "T";
  if (num >= 1000000000) return (num / 1000000000).toFixed(3).replace(/\.?0+$/, "") + "B";
  if (num >= 1000000) return (num / 1000000).toFixed(3).replace(/\.?0+$/, "") + "M";
  if (num >= 1000) return (num / 1000).toFixed(3).replace(/\.?0+$/, "") + "K";
  return num.toString();
}

function formatWIB(date) {
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const hours = String(wib.getUTCHours()).padStart(2, "0");
  const minutes = String(wib.getUTCMinutes()).padStart(2, "0");
  const seconds = String(wib.getUTCSeconds()).padStart(2, "0");
  const day = wib.getUTCDate();
  const month = wib.getUTCMonth();
  const year = wib.getUTCFullYear();

  const monthNames = [
    "januari", "februari", "maret", "april", "mei", "juni",
    "juli", "agustus", "september", "oktober", "november", "desember",
  ];

  const hour = wib.getUTCHours();
  let timeOfDay = "";
  if (hour >= 5 && hour < 11) timeOfDay = "Pagi";
  else if (hour >= 11 && hour < 15) timeOfDay = "Siang";
  else if (hour >= 15 && hour < 18) timeOfDay = "Sore";
  else timeOfDay = "Malam";

  return `${day} ${monthNames[month]} ${year} ${hours}.${minutes}.${seconds} (${timeOfDay})`;
}

export default async function handler(req, res) {
  const authHeader = req.headers["authorization"];

  try {
    const client = await getRedis();

    // GET — tanpa auth
    if (req.method === "GET") {
      const countRaw = await client.get("exec_count");
      const lastUpdate = await client.get("last_update");

      const count = countRaw ? parseInt(countRaw) : 0;
      const now = new Date();
      const lastDate = lastUpdate ? new Date(lastUpdate) : now;

      return res.status(200).json({
        totalExecute: formatNumber(count),
        totalExecuteRaw: count,
        fullDateTime: formatWIB(now),
        lastExecute: formatWIB(lastDate),
      });
    }

    // POST — perlu auth, nambah count
    if (req.method === "POST") {
      if (authHeader !== `Bearer ${API_KEY}`) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const amount = parseInt(req.query.amount) || 1;

      const countRaw = await client.get("exec_count");
      let count = countRaw ? parseInt(countRaw) : 0;
      count += amount;

      await client.set("exec_count", count);
      await client.set("last_update", new Date().toISOString());

      return res.status(200).json({
        total: formatNumber(count),
        totalRaw: count,
        action: "incremented",
        added: amount,
      });
    }

    // DELETE — perlu auth, kurangin count
    if (req.method === "DELETE") {
      if (authHeader !== `Bearer ${API_KEY}`) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const amount = parseInt(req.query.amount) || 1;

      const countRaw = await client.get("exec_count");
      let count = countRaw ? parseInt(countRaw) : 0;
      count = Math.max(0, count - amount);

      await client.set("exec_count", count);
      await client.set("last_update", new Date().toISOString());

      return res.status(200).json({
        total: formatNumber(count),
        totalRaw: count,
        action: "decremented",
        removed: amount,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
      }
          
