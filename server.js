const express = require("express");
const http = require("http");
const socket = require("socket.io");
const { newGuess, newGame, updateGame } = require("./utils/game");
const { makeid } = require("./utils/utils");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const io = socket(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let userRooms = {};

io.on("connection", (socket) => {
  socket.on("createRoom", (data) => {
    let roomId = makeid(5);
    userRooms[socket.id] = roomId;
    socket.emit("roomId", roomId);
    socket.join(roomId);
    socket.num = 1;
    if (data.singlePlayer === true) {
      const state = newGame();
      io.sockets.in(roomId).emit("startGame", state);
    }
  });

  socket.on("disconnect", () => {
    io.sockets.in(userRooms[socket.id]).emit("playerLeft");
  });

  socket.on("joinRoom", (roomId, username) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    let numPlayers;
    if (room) numPlayers = room.size;
    if (numPlayers == 0) {
      socket.emit("unknownGame");
      return;
    } else if (numPlayers > 1) {
      socket.emit("roomFull");
      return;
    }
    userRooms[socket.id] = roomId;
    socket.join(roomId);
    const state = newGame();
    io.sockets.in(roomId).emit("startGame", state);
  });

  socket.on("newGame", (roomId) => {
    const state = newGame();
    io.sockets.in(roomId).emit("gameState", state);
  });

  socket.on("newGuess", (data) => {
    const roomId = data.roomId;
    const state = data.gameState;
    const guess = data.guess.toLowerCase();
    const validateGuess = newGuess(state, guess);
    if (validateGuess !== true) {
      socket.emit("error", { msg: validateGuess });
      return;
    }
    const newState = updateGame(state, guess);
    socket.emit("gameState", newState);
    socket.broadcast.to(roomId).emit("otherPlayerMove", {
      evaluations: newState.evaluations,
      addPoints: newState.addPoints,
    });
  });
});

server.listen(PORT, () => console.log(`server listening on ${PORT}`));
