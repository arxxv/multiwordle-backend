const express = require("express");
const http = require("http");
const socket = require("socket.io");
const { newGuess, newGame, updateGame } = require("./utils/game");
const { makeid } = require("./utils/utils");
const { getCache, setCache, delCache } = require("./db/redis");
require("dotenv").config();
console.log(process.env.REDIS_URI);
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const io = socket(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.emit("uid", socket.id);

  socket.on("createRoom", async (data) => {
    const userid = data.userid;
    let roomId = makeid(5);
    const key = "mw-s2r-" + userid;
    await setCache(key, roomId);

    const gamekey = "mw-g-" + roomId;
    let gameState = {};
    gameState[userid] = {};
    await setCache(gamekey, gameState);

    socket.emit("roomId", roomId);
    socket.join(roomId);
    socket.num = 1;
    if (data.singlePlayer === true) {
      const state = newGame();
      io.sockets.in(roomId).emit("startGame", state);
    }
  });

  socket.on("disconnect", async () => {
    const key = "mw-s2r-" + socket.id;
    const roomid = await getCache(key);
    io.sockets.in(roomid).emit("playerLeft");
  });

  socket.on("joinRoom", async (roomId, userid) => {
    if (!io.sockets.adapter.rooms.has(roomId)) {
      socket.emit("error", "join_404_invalid-room-id");
      return;
    }

    const searchgame = "mw-g-" + roomId;
    let gamestateexists = await getCache(searchgame);
    if (gamestateexists) {
      if (
        Object.keys(gamestateexists).length === 1 &&
        userid in gamestateexists
      ) {
        return;
      } else if (userid in gamestateexists) {
        socket.emit("startGame", gamestateexists[userid]);
        let otherPlayerState;
        for (let uid of Object.keys(gamestateexists)) {
          if (uid != userid) {
            otherPlayerState = gamestateexists[uid];
          }
        }
        if (otherPlayerState) {
          socket.emit("otherPlayerMove", {
            evaluations: otherPlayerState.evaluations,
            addPoints: otherPlayerState.points,
          });
        }
        return;
      }
    }

    const room = io.sockets.adapter.rooms.get(roomId);
    let numPlayers;
    if (room) numPlayers = room.size;
    if (numPlayers > 1) {
      socket.emit("roomFull");
      return;
    }

    const roomkey = "mw-s2r-" + userid;
    await setCache(roomkey, roomId);

    socket.join(roomId);
    const state = newGame();

    const gamekey = "mw-g-" + roomId;
    let stateIfGameExists = await getCache(gamekey);
    if (!stateIfGameExists) {
      stateIfGameExists = {};
    }
    stateIfGameExists[userid] = state;
    setCache(gamekey, stateIfGameExists);

    io.sockets.in(roomId).emit("startGame", state);
  });

  socket.on("newGame", (roomId) => {
    const state = newGame();
    io.sockets.in(roomId).emit("gameState", state);
  });

  socket.on("newGuess", async (data) => {
    const userid = data.userid;
    const roomId = data.roomId;
    const state = data.gameState;
    const guess = data.guess.toLowerCase();
    const validateGuess = newGuess(state, guess);
    if (validateGuess !== true) {
      socket.emit("error", { msg: validateGuess });
      return;
    }
    const newState = updateGame(state, guess);

    // cache
    const gamekey = "mw-g-" + roomId;

    let stateIfGameExists = await getCache(gamekey);
    stateIfGameExists[userid] = newState;
    setCache(gamekey, stateIfGameExists);

    socket.emit("gameState", newState);
    socket.broadcast.to(roomId).emit("otherPlayerMove", {
      evaluations: newState.evaluations,
      addPoints: newState.addPoints,
    });
  });
});

server.listen(PORT, () => console.log(`server listening on ${PORT}`));
