function IllegalStateException(message) {
  this.name = "IllegalStateException";
  this.message = `IllegalStateException: ${message}` ;
}
IllegalStateException.prototype = new Error();

module.exports = IllegalStateException;