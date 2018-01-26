var elementToShare = document.getElementById('elementToShare');
var canvas2d = document.createElement('canvas');
var context = canvas2d.getContext('2d');

canvas2d.width = elementToShare.clientWidth;
canvas2d.height = elementToShare.clientHeight;

canvas2d.style.top = 0;
canvas2d.style.left = 0;
canvas2d.style.zIndex = -1;
(document.body || document.documentElement).appendChild(canvas2d);

var isRecordingStarted = false;
var isStoppedRecording = false;

(function looper() {
  if (!isRecordingStarted) {
    return setTimeout(looper, 500);
  }

  html2canvas(elementToShare, {
    grabMouse: true,
    onrendered: function(canvas) {
      context.clearRect(0, 0, canvas2d.width, canvas2d.height);
      context.drawImage(canvas, 0, 0, canvas2d.width, canvas2d.height);

      if (isStoppedRecording) {
        return;
      }

      setTimeout(looper, 1);
    }
  });
})();

var canvasRecorder = RecordRTC(canvas2d, {
  type: 'canvas'
});

var workerPath = 'https://archive.org/download/ffmpeg_asm/ffmpeg_asm.js';

if (window.location.protocol == 'file:') {
  workerPath = "./" + 'ffmpeg_asm.js';
}


function processInWebWorker() {
  var blob = URL.createObjectURL(new Blob(['importScripts("' + workerPath +
    '");var now = Date.now;function print(text) {postMessage({"type" : "stdout","data" : text});};onmessage = function(event) {var message = event.data;if (message.type === "command") {var Module = {print: print,printErr: print,files: message.files || [],arguments: message.arguments || [],TOTAL_MEMORY: 268435456};postMessage({"type" : "start","data" : Module.arguments.join(" ")});postMessage({"type" : "stdout","data" : "Received command: " +Module.arguments.join(" ") +((Module.TOTAL_MEMORY) ? ".  Processing with " + Module.TOTAL_MEMORY + " bits." : "")});var time = now();var result = ffmpeg_run(Module);var totalTime = now() - time;postMessage({"type" : "stdout","data" : "Finished processing (took " + totalTime + "ms)"});postMessage({"type" : "done","data" : result,"time" : totalTime});}};postMessage({"type" : "ready"});'
  ], {
    type: 'application/javascript'
  }));

  var worker = new Worker(blob);
  URL.revokeObjectURL(blob);
  return worker;
}

var worker;

function convertStreams(videoBlob, audioBlob) {
  var vab;
  var aab;
  var buffersReady;
  var workerReady;
  var posted = false;

  var fileReader1 = new FileReader();
  fileReader1.onload = function() {
    vab = this.result;

    if (aab) buffersReady = true;

    if (buffersReady && workerReady && !posted) postMessage();
  };
  var fileReader2 = new FileReader();
  fileReader2.onload = function() {
    aab = this.result;

    if (vab) buffersReady = true;

    if (buffersReady && workerReady && !posted) postMessage();
  };

  fileReader1.readAsArrayBuffer(videoBlob);
  fileReader2.readAsArrayBuffer(audioBlob);

  if (!worker) {
    worker = processInWebWorker();
  }

  worker.onmessage = function(event) {
    var message = event.data;
    if (message.type == "ready") {
      log('<a href="' + workerPath + '" download="ffmpeg-asm.js">ffmpeg-asm.js</a> file has been loaded.');
      workerReady = true;
      if (buffersReady)
        postMessage();
    } else if (message.type == "stdout") {
      log(message.data);
    } else if (message.type == "start") {
      log('<a href="' + workerPath + '" download="ffmpeg-asm.js">ffmpeg-asm.js</a> file received ffmpeg command.');
    } else if (message.type == "done") {
      log(JSON.stringify(message));

      var result = message.data[0];
      log(JSON.stringify(result));

      var blob = new Blob([result.data], {
        type: 'video/mp4'
      });

      log(JSON.stringify(blob));

      PostBlob(blob);
    }
  };
  var postMessage = function() {
    posted = true;

    /*
			[
                '-i', 'video.webm',
                '-i', 'audio.wav',
				'-s', '1280x720',
                '-c:v', 'mpeg4',
                '-c:a', 'aac',
                '-b:v', '1450k',
                '-b:a', '96k',
				'-bf', '2',
				'-g', '90',
				'-sc_threshold', '0',
				'-ar', '32000',
                '-strict', 'experimental', 'output.mp4'
            ]
		*/

    worker.postMessage({
      type: 'command',
      arguments: [
        '-i', 'video.webm',
        '-i', 'audio.wav',
        '-c:v', 'mpeg4',
        '-c:a', 'vorbis', // or aac
        '-b:v', '6400k', // or 1450k
        '-b:a', '4800k', // or 96k
        '-strict', 'experimental', 'output.mp4'
      ],
      files: [{
          data: new Uint8Array(vab),
          name: 'video.webm'
        },
        {
          data: new Uint8Array(aab),
          name: "audio.wav"
        }
      ]
    });
  };
}

var h2 = document.querySelector('h2');

function PostBlob(blob) {
  h2.innerHTML = '<a href="' + URL.createObjectURL(blob) + '" target="_blank" download="Recorded Audio+Canvas File.mp4">Download Recorded Audio+Canvas file in MP4 container and play in VLC player!</a>';
  h2.setAttribute('contenteditable', 'false');
}

function log(message) {
  h2.innerHTML = message;
  console.log(message);
}
