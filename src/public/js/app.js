const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const call = document.getElementById("call");
call.hidden = true;
// stream = video + audio
let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices(); // 연결된 모든 장치 정보들을 출력
    const cameras = devices.filter((device) => device.kind === "videoinput"); // 카메라 정보 필터링
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.devicesId; // 카메라 디바이스 ID
      option.innerText = camera.label; // 카메라 이름
      if (currentCamera.label === camera.label) {
        // 현재 사용하고 있는 카메라가 select에 표시됨
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}

async function getMedia(deviceId) {
  const initialConstraints = {
    audio: true,
    video: { facingMode: "user" },
  };
  const cameraConstraints = {
    audio: true,
    video: { deviceId: { exact: deviceId } }, // 특정 비디오 ID를 선택하면서 카메라 종류 변경
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstraints
    );
    myFace.srcObject = myStream;
    if (!deviceId) {
      await getCameras();
    }
  } catch (e) {
    console.log(e);
  }
}

function handleMuteClick() {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled)); // 오디오 활성화/비활성화
  if (!muted) {
    muteBtn.innerText = "UnMute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
}

function handleCameraClick() {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled)); // 비디오 활성화/비활성화
  if (cameraOff) {
    cameraBtn.innerText = "Turn Camera Off";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Turn Camera On";
    cameraOff = true;
  }
}

async function handleCameraChange() {
  // 카메라 종류 변경
  // 카메라를 바꿀 때마다 다른 id로 새로운 stream을 만듦
  await getMedia(camerasSelect.value);
  // ISSUE : peer-to-peer connection 연결한 상태에서
  // stream이 변경되면 로컬에서 변경된 stream이 상대쪽에서 반영되지 않는다.
  if (myPeerConnection) {
    // 선택한 새 장치로 업데이트 된 video track을 받음
    const videoTrack = myStream.getVideoTracks()[0];
    // Sender는 peer로 보내진 media stream track을 control하게 해준다.
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    // 그러한 Sender를 교체해준다.
    videoSender.replaceTrack(videoTrack);
  }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

// Welcome Form (join a room)

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  await initCall(); // 방에 참가하고 나서 호출하는 대신 방에 참가하기 전에 함수 호출
  // why? Web Socket들의 속도가 media를 가져오는 속도나 연결을 만드는 속도보다 빠르기 때문
  socket.emit("join_room", input.value);
  roomName = input.value;
  input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code

socket.on("welcome", async () => {
  // Bonus :: DataChannel
  // DataChannel은 한쪽에서만 채널을 뚫어주면 된다.
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", (event) => console.log(event.data));
  console.log("made data channel");

  // [ Peer A ] [ Step 1 ]
  // 1. getUserMedia()
  //   Web Socket들의 속도가 media를 가져오는 속도나 연결을 만드는 속도보다 빠르기 때문에
  //   room에 join 하자마자 비동기적으로 바로 실행

  // 2. addStream()
  //   방에 들어오자마자 addStream() 대신 makeConnection() 함수를 실행

  // 3. createOffer()
  //   세션에서 일어날 일에 대한 설명을 담은 offer 생성 (우리가 누구이며, 어디 있고 등)
  const offer = await myPeerConnection.createOffer();

  // 4. setLocalDescription()
  //   생성한 offer를 현재 브라우저에 Local 설정
  myPeerConnection.setLocalDescription(offer);

  // [ Peer A ] -> [ Peer B ] : offer 보내기
  // socket.io한테 어떤 방이 offer를 emit 할지, 누구한테 offer를 보낼건지 알려주기
  socket.emit("offer", offer, roomName);
  console.log("Sent the offer!");
});

socket.on("offer", async (offer) => {
  // Bonus :: DataChannel
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) => {
      console.log(event.data);
    });
  });

  console.log("Received the offer!");
  // [ Peer B ] [ Step 2 ]
  // 1. setRemoteDescription()
  //    Peer A 에게서 받은 offer를 Remote Description에 설정
  myPeerConnection.setRemoteDescription(offer);

  // 2. getUserMedia()
  // 3. addStream()
  //   위와 같은 방식으로 room join 시 즉시 실행

  // 4. createAnswer()
  const answer = await myPeerConnection.createAnswer();

  // 5. setLocalDescription()
  myPeerConnection.setLocalDescription(answer);

  // [ Peer B ] -> [ Peer A ] : answer 보내기
  socket.emit("answer", answer, roomName);
  console.log("Sent the answer!");
});

socket.on("answer", (answer) => {
  console.log("Received the answer");
  // [ Peer A ] [ Step 3 ]
  // 1. setRemoteDescription()
  myPeerConnection.setRemoteDescription(answer);

  // offer와 answer를 주고받는 과정이 끝나면,
  // peer-to-peer 연결의 양쪽에서 icecandidate라는 이벤트를 실행하기 시작
  // ice(Internet Connectivity Establishment(인터넷 연결 생성))
  // IceCandidate = webRTC에 필요한 프로토콜로 멀리 떨어진 장치와 소통할 수 있기 위함
});

socket.on("ice", (ice) => {
  console.log("Received candidate");
  // [ Peer both ] [ Step 4 ]
  myPeerConnection.addIceCandidate(ice);
});

// RTC Code

function makeConnection() {
  // Peer A의 addStream 대신 생성한 함수
  // Peer 연결을 만드는 동시에 연결에 track을 추가
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  // 서로 다른 wifi가 아닌 다른 네트워크에서는 디바이스끼리 서로를 찾을 수 없다.
  // 이때 디바이스에 공용 주소를 알려주는 STUN 서버를 사용해야 한다.
  // 정식으로 서비스를 사용하기 위해서는 STUN 서버를 자신 소유로 만들어야 한다.
  // 예제에서는 구글에서 샘플로 주어지는 STUN 서버를 사용할 예정이다.
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
  console.log("Sent candidate");
  socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
  console.log("Got an stream from my peer");
  console.log("Peer's Stream", data.stream);
  console.log("My stream", myStream);
  const peersFace = document.getElementById("peersFace");
  peersFace.srcObject = data.stream;
}
