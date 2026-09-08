export function htmlHead(title: string, extra = '') {
  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${title} · CoEldery 85</title>
<!-- PWA -->
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#228B22">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="CoEldery 85">
<link rel="apple-touch-icon" href="/icon-192.png">
<!-- /PWA -->
<link rel="stylesheet" href="/shared.css">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&family=Noto+Serif+TC:wght@400;500;700;900&family=Space+Grotesk:wght@400;500;700&family=Montserrat:wght@700;900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
<script>
/* QRCode.toCanvas shim */
window.QRCode = window.QRCode || {};
window.QRCode.toCanvas = function(canvas, text, opts, cb) {
  try {
    var ec = (opts && opts.errorCorrectionLevel) ? opts.errorCorrectionLevel.charAt(0).toUpperCase() : 'H';
    var qr = qrcode(0, ec);
    qr.addData(text);
    qr.make();
    var mcount = qr.getModuleCount();
    var margin = (opts && opts.margin !== undefined) ? opts.margin : 4;
    var size = (opts && opts.width) ? opts.width : 128;
    var cellSize = Math.max(1, Math.floor(size / (mcount + margin * 2)));
    var actualSize = cellSize * (mcount + margin * 2);
    canvas.width = actualSize; canvas.height = actualSize;
    var ctx = canvas.getContext('2d');
    var dark = (opts && opts.color && opts.color.dark) ? opts.color.dark : '#000000';
    var light = (opts && opts.color && opts.color.light) ? opts.color.light : '#ffffff';
    ctx.fillStyle = light; ctx.fillRect(0, 0, actualSize, actualSize);
    ctx.fillStyle = dark;
    for (var r = 0; r < mcount; r++) {
      for (var c2 = 0; c2 < mcount; c2++) {
        if (qr.isDark(r, c2)) ctx.fillRect((c2+margin)*cellSize, (r+margin)*cellSize, cellSize, cellSize);
      }
    }
    if (typeof cb === 'function') cb(null);
  } catch(e) { console.warn('QR shim error:', e); if (typeof cb === 'function') cb(e); }
};
</script>
${extra}
</head>`
}
