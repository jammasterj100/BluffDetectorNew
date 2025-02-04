(async function() {
  // Load the required models
  await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
  await faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');

  const video = document.getElementById('video');
  const canvas = document.getElementById('overlay');
  const ctx = canvas.getContext('2d');

  const constraints = {
    video: {
      facingMode: 'user',
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
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        detectFace();
      };
    })
    .catch(err => {
      console.error("Camera error:", err);
      alert("Error accessing the webcam. Please use HTTPS/localhost and allow camera access.");
    });

  // Sigmoid function to map weighted score into a 0-1 range.
  function sigmoid(x, threshold = 1, scale = 0.3) {
    return 1 / (1 + Math.exp(-(x - threshold) / scale));
  }

  // In the detection loop, compute a weighted score based on selected expressions.
  // Then map that score using a sigmoid so that:
  //   - When the score is low (not bluffing), bluffConfidence will be near 30%,
  //     and Not Bluffing confidence (100 - bluffConfidence) near 70%.
  //   - When the score is high (bluffing), bluffConfidence nears 90%, and Not Bluffing confidence nears 10%.
  async function detectFace() {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
    const detection = await faceapi.detectSingleFace(video, options).withFaceExpressions();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detection) {
      const box = detection.detection.box;
      // Weighted score using selected expressions
      const score = (detection.expressions.angry * 1.2) +
                    (detection.expressions.surprised * 1.2) +
                    (detection.expressions.fearful * 1.5) +
                    (detection.expressions.disgusted * 1.1);
      
      // Map weighted score with sigmoid; p ranges roughly 0 to 1.
      const p = sigmoid(score, 1, 0.3);
      // Map to a bluff confidence that ranges from 30% (when calm) to 90% (when bluffing)
      const bluffConfidence = 30 + 60 * p;
      const notBluffConfidence = 100 - bluffConfidence;
      
      // Use 50% as the decision threshold.
      const isBluffing = bluffConfidence > 50;
      const color = isBluffing ? 'red' : 'green';
      const label = isBluffing 
        ? `Bluffing ${Math.round(bluffConfidence)}%` 
        : `Not Bluffing ${Math.round(notBluffConfidence)}%`;

      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      ctx.fillStyle = color;
      ctx.font = "20px Arial";
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(box.x, box.y - 30, textWidth + 10, 30);

      ctx.fillStyle = "white";
      ctx.fillText(label, box.x + 5, box.y - 5);
    }
    requestAnimationFrame(detectFace);
  }

  window.addEventListener('resize', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  });
  window.addEventListener('orientationchange', () => setTimeout(() => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }, 500));
})();
