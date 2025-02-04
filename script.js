(async function() {
  // Load the face-api models
  await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
  await faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');

  const video = document.getElementById('video');
  const canvas = document.getElementById('overlay');
  const ctx = canvas.getContext('2d');

  // Start the webcam stream
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
    .then(stream => {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        resizeCanvas();
        detectFace();
      };
    })
    .catch(err => {
      console.error("Camera error:", err);
      alert("Unable to access the camera. Please use HTTPS or localhost.");
    });

  // Adjust canvas size to match video dimensions
  function resizeCanvas() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", () => setTimeout(resizeCanvas, 500));

  // Calculate a weighted bluffing score from facial expressions
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
      // Threshold: if bluffScore > 10 then consider the subject bluffing
      const bluffing = bluffScore > 10;
      const color = bluffing ? "red" : "green";
      const label = bluffing
        ? `Bluffing ${Math.round(bluffScore)}%`
        : `Not Bluffing ${Math.round(100 - bluffScore)}%`;

      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      ctx.fillStyle = color;
      ctx.font = "20px Arial";
      const textWidth = ctx.measureText(label).width;
      const textHeight = 24;
      ctx.fillRect(box.x, box.y - textHeight, textWidth + 10, textHeight);
      ctx.fillStyle = "white";
      ctx.fillText(label, box.x + 5, box.y - 5);
    }

    requestAnimationFrame(detectFace);
  }
})();
