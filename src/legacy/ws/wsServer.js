import http from "http";
import WebSocket from "ws";
import express from "express";

const app = express();

app.set("view engine", "pug"); // pug로 view engine 설정
app.set("views", __dirname + "/views"); // template이 어디 있는지 지정
app.use("/public", express.static(__dirname + "/public")); // public(frontend) 폴더를 유저에게 공개
app.get("/", (_, res) => res.render("home")); // home.pug를 render 해주는 route handler 생성
app.get("/*", (_, res) => res.redirect("/")); // home으로 리다이렉팅

const handleListen = () => console.log(`Listening on http://localhost:3000`);

// express는 ws를 지원하지 않기 때문에 새로운 function을 추가해야 한다.
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ httpServer }); // http 서버 위에 webSocket 서버 만들 수 있음

// using websocket
const sockets = [];
// wss.on은 이벤트가 발생할 때까지 기다린다.
wss.on("connection", (socket) => {
  console.log("Connected to Browser!!");

  sockets.push(socket);
  socket["nickname"] = "Anonymous";

  socket.on("close", () => console.log("Disconnect from the Browser"));
  socket.on("message", (msg) => {
    const message = JSON.parse(msg);
    switch (message.type) {
      case "new_message":
        sockets.forEach((aSocket) =>
          aSocket.send(`${socket.nickname} : ${message.payload}`)
        );
      case "nickname":
        socket["nickname"] = message.payload;
    }
  });
});

httpServer.listen(3000, handleListen);
