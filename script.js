let smoothedConfidence = 50;
let lastBox = null;

function lerp(start, end, t) {
  return start + (end - start) * t;
}

async function startFaceAPI() {
  const loadingBar = document.getElementById("loading-bar");

  // Load models: tinyFaceDetector, landmarks, and expressions
  await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
  loadingBar.style.width = "33%";
  await faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
  loadingBar.style.width = "66%";
  await faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
  loadingBar.style.width = "100%";

  setTimeout(() => {
    document.getElementById("loading-container").style.display = "none";
  }, 500);

  startVideo();
}

function startVideo() {
  const video = document.getElementById('video');
  const constraints = {
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        updateCanvas(); // Set canvas to match video display size/position
        detectBluffing();
      };
    })
    .catch(err => {
      console.error("Camera error:", err);
      alert("Camera access is blocked. Please enable it in your settings.");
    });
}

// Update the canvas to always overlay the video correctly
function updateCanvas() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('faceCanvas');
  const rect = video.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  canvas.style.top = rect.top + "px";
  canvas.style.left = rect.left + "px";
}

async function detectBluffing() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('faceCanvas');
  const context = canvas.getContext('2d');

  async function detectionLoop() {
    // Calculate scale factors from original video resolution to displayed size
    const rect = video.getBoundingClientRect();
    const scaleX = rect.width / video.videoWidth;
    const scaleY = rect.height / video.videoHeight;

    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (detection) {
      let box;
      // Use landmarks to compute a tighter bounding box
      if (detection.landmarks) {
        const points = detection.landmarks.positions;
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        // Add a small margin
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

      // Map box coordinates to canvas coordinates
      let x = box.x * scaleX;
      let y = box.y * scaleY;
      let width = box.width * scaleX;
      let height = box.height * scaleY;

      // Smooth the bounding box movement
      if (lastBox) {
        x = lerp(lastBox.x, x, 0.3);
        y = lerp(lastBox.y, y, 0.3);
        width = lerp(lastBox.width, width, 0.3);
        height = lerp(lastBox.height, height, 0.3);
      }
      lastBox = { x, y, width, height };

      // Calculate bluffing score based on expressions
      const exp = detection.expressions;
      const bluffingScore =
        (exp.angry || 0) * 1.2 +
        (exp.surprised || 0) * 1.2 +
        (exp.fearful || 0) * 1.5 +
        (exp.disgusted || 0) * 1.1;

      const targetConfidence = Math.min(Math.round(bluffingScore * 100), 100);
      smoothedConfidence = lerp(smoothedConfidence, targetConfidence, 0.2);
      const displayConfidence = Math.round(smoothedConfidence);

      let label, color;
      if (bluffingScore > 0.1) {
        label = `Bluffing ${displayConfidence}%`;
        color = "red";
      } else {
        label = `Not Bluffing ${100 - displayConfidence}%`;
        color = "green";
      }

      // Draw the bounding box and label
      context.strokeStyle = color;
      context.lineWidth = 3;
      context.strokeRect(x, y, width, height);
      context.fillStyle = color;
      context.fillRect(x, y - 30, width, 30);
      context.fillStyle = "white";
      context.font = "18px Arial";
      context.fillText(label, x + 5, y - 10);
    }
    setTimeout(detectionLoop, 200);
  }
  detectionLoop();
}

window.addEventListener("resize", updateCanvas);
window.addEventListener("orientationchange", () => setTimeout(updateCanvas, 500));

startFaceAPI();
