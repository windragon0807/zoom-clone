const socket = io();

const myFace = document.getElementById("myFace");
// stream = video + audio
let myStream;

async function getMedia() {
  try {
    myStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      vidio: true,
    });
    myFace.srcObject = myStream;
    console.log(myStream);
  } catch (e) {
    console.log(e);
  }
}

getMedia();
