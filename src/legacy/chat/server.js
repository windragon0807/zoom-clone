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

const handleListen = () => console.log(`Listening on http://localhost:3000`);

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

function publicRooms() {
  // 클라이언트가 socket에 연결하면 sid가 생기며,
  // 자신의 sid와 동일한 이름의 private room이 생성되며,
  // 해당 room으로 자동으로 join된다.
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = wsServer;
  const publicRooms = [];
  // rooms에 sid가 없는 나머지가 join 가능한 public room
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      publicRooms.push(key);
    }
  });
  return publicRooms;
}

function countRoom(roomName) {
  return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", (socket) => {
  socket["nickname"] = "Anon"; // default nickname

  socket.onAny((event) => {
    // EventListener와 비슷한 기능
    console.log(`Socket Event: ${event}`);
  });

  socket.on("enter_room", (roomName, done) => {
    socket.join(roomName); // public room 입장
    done(); // 프론트엔드 코드 실행
    socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
    wsServer.sockets.emit("room_change", publicRooms()); // socket에 연결된 모든 클라이언트에게 전달
  });

  socket.on("disconnecting", () => {
    // 완전히 종료한 것은 아니지만 종료 예정
    socket.rooms.forEach(
      (room) =>
        socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1) // 아직 방을 떠나지 않았기 때문에 포함됨
    );
  });

  socket.on("disconnect", () => {
    wsServer.sockets.emit("room_change", publicRooms());
  });

  socket.on("new_message", (msg, room, done) => {
    socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
    done();
  });

  socket.on("nickname", (nickname) => (socket["nickname"] = nickname));
});

httpServer.listen(3000, handleListen);
