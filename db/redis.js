const Redis = require("redis");
require("dotenv").config();
const url = process.env.REDIS_URI;
const redisClient = Redis.createClient({ url });
const EXP_TIME = 3600;

let connected = false;
let tries = 10;
let retryconnection;

function tryConnect() {
  if (connected) {
    clearInterval(retryconnection);
    return;
  }
  redisClient
    .connect()
    .then(() => {
      connected = true;
      console.log("connected to redis:", connected);
    })
    .catch((err) => console.log(err));

  tries -= 1;
  if (tries === 0) {
    clearInterval(retryconnection);
    return;
  }
}

(async () => {
  try {
    tryConnect();
    retryconnection = setInterval(tryConnect, 5000);
  } catch (error) {
    connected = false;
    console.log(error);
  }
})();

const getCache = async (key) => {
  try {
    const data = await redisClient.get(key);
    if (data) return JSON.parse(data);
  } catch (error) {
    console.log(error);
  }
};

const setCache = async (key, data) => {
  try {
    redisClient
      .setEx(key, EXP_TIME, JSON.stringify(data))
      .catch((err) => console.log(err));
  } catch (error) {
    console.log(error);
  }
};

const delCache = async (key) => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.log(error);
  }
};

module.exports = { getCache, setCache, delCache };
