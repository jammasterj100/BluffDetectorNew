async function startFaceAPI() {
    const loadingBar = document.getElementById("loading-bar");

    // Load the tinyFaceDetector model (50% progress)
    await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
    loadingBar.style.width = "50%";

    // Load the faceExpression model (100% progress)
    await faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
    loadingBar.style.width = "100%";

    // Hide the loading bar once models are loaded
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
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        },
        audio: false
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            video.srcObject = stream;
            video.play();
        })
        .catch(err => console.error("Camera error:", err));
}

window.addEventListener("resize", () => {
    const video = document.getElementById('video');
    video.style.width = window.innerWidth + "px";
    video.style.height = window.innerHeight + "px";
});

startFaceAPI();
