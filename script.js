let smoothedConfidence = 50;
let lastBox = null;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

async function loadModels() {
  const loadingBar = document.getElementById("loading-bar");
  // Load models sequentially and update loading text
  await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
  loadingBar.textContent = "33%";
  await faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
  loadingBar.textContent = "66%";
  await faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
  loadingBar.textContent = "100%";
  document.getElementById("loading-container").style.display = "none";
}

function updateCanvasSize() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('faceCanvas');
  // Set canvas to match the video's intrinsic dimensions
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

function startVideo() {
  const video = document.getElementById('video');
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
    .then((stream) => {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        updateCanvasSize();
        detectFace();
      };
    })
    .catch(err => {
      console.error("Camera error:", err);
      alert("Error accessing the webcam. Make sure to use HTTPS or localhost.");
    });
}

async function detectFace() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('faceCanvas');
  const context = canvas.getContext('2d');

  async function detectionLoop() {
    if (video.paused || video.ended) {
      return requestAnimationFrame(detectionLoop);
    }
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();
    
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (detection) {
      let box;
      if (detection.landmarks) {
        const pts = detection.landmarks.positions;
        const xs = pts.map(p => p.x);
        const ys = pts.map(p => p.y);
        const minX = Math.min(...xs), minY = Math.min(...ys);
        const maxX = Math.max(...xs), maxY = Math.max(...ys);
        const marginX = (maxX - minX) * 0.1;
        const marginY = (maxY - minY) * 0.1;
        box = {
          x: minX - marginX,
          y: minY - marginY,
          width: (maxX - minX) + 2 * marginX,
          height: (maxY - minY) + 2 * marginY
        };
      } else {
        box = detection.detection.box;
      }
      
      let { x, y, width, height } = box;
      // Smooth transitions between frames
      if (lastBox) {
        x = lerp(lastBox.x, x, 0.3);
        y = lerp(lastBox.y, y, 0.3);
        width = lerp(lastBox.width, width, 0.3);
        height = lerp(lastBox.height, height, 0.3);
      }
      lastBox = { x, y, width, height };

      // Calculate bluffing confidence based on selected expressions
      const exp = detection.expressions;
      const bluffScore = (exp.angry || 0) * 1.2 +
                         (exp.surprised || 0) * 1.2 +
                         (exp.fearful || 0) * 1.5 +
                         (exp.disgusted || 0) * 1.1;
      const targetConf = Math.min(Math.round(bluffScore * 100), 100);
      smoothedConfidence = lerp(smoothedConfidence, targetConf, 0.2);
      const displayConf = Math.round(smoothedConfidence);
      
      let label, color;
      if (bluffScore > 0.1) {
        label = `Bluffing ${displayConf}%`;
        color = "red";
      } else {
        label = `Not Bluffing ${100 - displayConf}%`;
        color = "green";
      }
      
      context.strokeStyle = color;
      context.lineWidth = 3;
      context.strokeRect(x, y, width, height);
      context.fillStyle = color;
      context.fillRect(x, y - 30, width, 30);
      context.fillStyle = "white";
      context.font = "18px Arial";
      context.fillText(label, x + 5, y - 10);
    }
    requestAnimationFrame(detectionLoop);
  }
  detectionLoop();
}

window.addEventListener('resize', updateCanvasSize);
window.addEventListener('orientationchange', () => setTimeout(updateCanvasSize, 500));

(async function init() {
  await loadModels();
  startVideo();
})();
