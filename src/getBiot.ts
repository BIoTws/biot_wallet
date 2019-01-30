// @ts-ignore
function getBiot (cb) {
  // @ts-ignore
  if (window.biot) return cb(window.biot);
  setTimeout(function () {
    getBiot(cb);
  }, 50);
}

export default getBiot;