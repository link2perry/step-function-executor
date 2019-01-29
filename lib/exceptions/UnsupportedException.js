function UnsupportedException(message) {
  this.name = "UnsupportedException";
  this.message = `UnsupportedException: ${message}` ;
}
UnsupportedException.prototype = new Error();

module.exports = UnsupportedException;