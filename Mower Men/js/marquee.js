document.addEventListener('DOMContentLoaded', function () {
  var track = document.querySelector('.marquee-track');
  if (!track) return;
  // Duplicate contents so CSS infinite loop is seamless
  track.innerHTML += track.innerHTML;
});
