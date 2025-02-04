(async function() {
  // Load the required models
  await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
  await faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');

  const video = document.getElementById('video');
  const canvas = document.getElementById('overlay');
  const ctx = canvas.getContext('2d');

  // Set video constraints similar to your original working code
  const constraints = {
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };

  // Start webcam stream
  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        // Set canvas size to match the video’s intrinsic size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        detectFace();
      }
    })
    .catch(err => {
      console.error("Camera error:", err);
      alert("Error accessing the webcam. Please use HTTPS/localhost and allow camera access.");
    });

  // Compute a weighted bluff score based on expressions
  function computeBluffScore(expressions) {
    const score = (expressions.angry * 1.2) +
                  (expressions.surprised * 1.2) +
                  (expressions.fearful * 1.5) +
                  (expressions.disgusted * 1.1);
    return Math.min(score * 100, 100);
  }

  // Main detection loop
  async function detectFace() {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
    const detection = await faceapi.detectSingleFace(video, options).withFaceExpressions();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detection) {
      const box = detection.detection.box;
      const bluffScore = computeBluffScore(detection.expressions);
      const bluffing = bluffScore > 10;
      const color = bluffing ? 'red' : 'green';
      const label = bluffing 
        ? `Bluffing ${Math.round(bluffScore)}%` 
        : `Not Bluffing ${Math.round(100 - bluffScore)}%`;

      // Draw bounding box
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Draw label background
      ctx.fillStyle = color;
      ctx.font = "20px Arial";
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(box.x, box.y - 30, textWidth + 10, 30);

      // Draw label text
      ctx.fillStyle = "white";
      ctx.fillText(label, box.x + 5, box.y - 5);
    }

    requestAnimationFrame(detectFace);
  }

  // Adjust canvas on window resize or orientation change
  window.addEventListener('resize', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  });
  window.addEventListener('orientationchange', () => setTimeout(() => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }, 500));
})();
