var recordAudio;

document.getElementById('start').onclick = function() {
  this.disabled = true;
  navigator.getUserMedia({
    audio: true
  }, function(stream) {
    var audio = document.createElement('audio');
    audio.muted = true;
    audio.volume = 0;
    audio.src = URL.createObjectURL(stream);

    recordAudio = RecordRTC(stream, {
      type: 'audio',
      recorderType: StereoAudioRecorder
    });

    isStoppedRecording = false;
    isRecordingStarted = true;

    canvasRecorder.startRecording();
    recordAudio.startRecording();

    document.getElementById('stop').disabled = false;
  }, function(error) {
    log(JSON.stringify(error));
  });
};

document.getElementById('stop').onclick = function() {
  this.disabled = true;
  recordAudio.stopRecording(function() {
    isStoppedRecording = true;
    canvasRecorder.stopRecording(function() {
      convertStreams(canvasRecorder.getBlob(), recordAudio.getBlob());
      log('<a href="' + workerPath + '" download="ffmpeg-asm.js">ffmpeg-asm.js</a> file download started. It is about 18MB in size; please be patient!');
    });
  });

  document.getElementById('start').disabled = false;
};
