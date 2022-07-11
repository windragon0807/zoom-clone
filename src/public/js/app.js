const socket = io();

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");

function handleRoomSubmit(event) {
  event.preventDefault();
  const input = form.querySelector("input");
  // merit 1 : 커스텀 이벤트를 지정하여 전송할 수 있다.
  // merit 2 : string 뿐만 아니라, JavaScript Object를 전송할 수 있다.
  // merit 3 : 서버에서 호출하는 프론트엔드의 function을 프론트엔드에서 보낼 수 있다.
  //           뿐만 아니라, 파라미터에 원하는 모든 것들을 다 서버로 보낼 수 있다.
  //           끝났다는 함수를 넣고 싶으면 가장 마지막 파라미터에 넣어야 한다.
  socket.emit("enter_room", { payload: input.value }, (msg) => {
    console.log(`The backend says : ${msg}`);
  });
  input.value = "";
}

form.addEventListener("submit", handleRoomSubmit);

/*
// using ws
const messageList = document.querySelector("ul");
const nickForm = document.querySelector("#nick");
const messageForm = document.querySelector("#message");
const socket = new WebSocket(`ws://${window.location.host}`);

function makeMessage(type, payload) {
  const msg = { type, payload };
  return JSON.stringify(msg);
}

socket.addEventListener("open", () => {
  console.log("Connected to Server!!");
});

socket.addEventListener("message", (message) => {
  const li = document.createElement("li");
  li.innerText = message.data;
  messageList.append(li);
});

socket.addEventListener("close", () => {
  console.log("Disconnected to Server!!");
});

function handleSubmit(event) {
  event.preventDefault();
  const input = messageForm.querySelector("input");
  socket.send(makeMessage("new_message", input.value));
  input.value = "";
}

function handleNickSubmit(event) {
  event.preventDefault();
  const input = nickForm.querySelector("input");
  socket.send(makeMessage("nickname", input.value));
  input.value = "";
}

messageForm.addEventListener("submit", handleSubmit);
nickForm.addEventListener("submit", handleNickSubmit);
*/
