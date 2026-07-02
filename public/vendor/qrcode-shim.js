/**
 * QRCode.toCanvas() shim
 * Wraps qrcode-generator to expose same API as node-qrcode
 */
(function(){
  if (typeof qrcode !== 'function') {
    console.error('[QRCode shim] qrcode-generator not loaded');
    return;
  }

  function levelToCode(lvl){
    return (lvl || 'M').toString().toUpperCase();
  }

  function toCanvas(canvas, text, opts, cb){
    if (typeof opts === 'function'){ cb = opts; opts = {}; }
    opts = opts || {};

    var typeNumber = 0;
    var errorLevel  = levelToCode(opts.errorCorrectionLevel || 'H');
    var qr = qrcode(typeNumber, errorLevel);
    qr.addData(text);
    qr.make();

    var moduleCount = qr.getModuleCount();
    var size   = opts.width  || 200;
    var margin = (opts.margin !== undefined) ? opts.margin : 4;
    var dark   = (opts.color && opts.color.dark)  || '#000000';
    var light  = (opts.color && opts.color.light) || '#ffffff';

    canvas.width  = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    var cellSize = (size - margin * 2) / moduleCount;

    ctx.fillStyle = light;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = dark;
    for (var r = 0; r < moduleCount; r++) {
      for (var c = 0; c < moduleCount; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(
            margin + c * cellSize,
            margin + r * cellSize,
            cellSize, cellSize
          );
        }
      }
    }
    if (typeof cb === 'function') cb(null);
  }

  window.QRCode = window.QRCode || {};
  window.QRCode.toCanvas = toCanvas;
})();
