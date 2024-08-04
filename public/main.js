const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const socket = io();

let localStream;
let pc;

const configuration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302'
    }
  ]
};

async function start() {
  localStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  localVideo.srcObject = localStream;

  pc = new RTCPeerConnection(configuration);

  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('candidate', event.candidate);
    }
  };

  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('offer', offer);
}

socket.on('offer', async (offer) => {
  if (!pc) {
    pc = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('candidate', event.candidate);
      }
    };

    pc.ontrack = (event) => {
      remoteVideo.srcObject = event.streams[0];
    };
  }

  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('answer', answer);
});

socket.on('answer', async (answer) => {
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', async (candidate) => {
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
    console.error('Error adding received ice candidate', e);
  }
});

start();
