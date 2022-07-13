import http from "http";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import express from "express";

const app = express();

app.set("view engine", "pug"); // pug로 view engine 설정
app.set("views", __dirname + "/views"); // template이 어디 있는지 지정
app.use("/public", express.static(__dirname + "/public")); // public(frontend) 폴더를 유저에게 공개
app.get("/", (_, res) => res.render("home")); // home.pug를 render 해주는 route handler 생성
app.get("/*", (_, res) => res.redirect("/")); // 다른 경로 참조 시, home으로 리다이렉팅

// express는 ws를 지원하지 않기 때문에 새로운 function을 추가해야 한다.
const httpServer = http.createServer(app);
// socket.io admin ui 사용하기 위한 설정
const wsServer = new Server(httpServer, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});
instrument(wsServer, {
  auth: false,
});

wsServer.on("connection", (socket) => {
  socket.on("join_room", (roomName) => {
    socket.join(roomName);
    socket.to(roomName).emit("welcome");
  });
  socket.on("offer", (offer, roomName) => {
    socket.to(roomName).emit("offer", offer);
  });
  socket.on("answer", (answer, roomName) => {
    socket.to(roomName).emit("answer", answer);
  });
  socket.on("ice", (ice, roomName) => {
    socket.to(roomName).emit("ice", ice);
  });
});

const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);
