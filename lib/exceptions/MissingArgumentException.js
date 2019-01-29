function MissingArgumentException(message) {
  this.name = "MissingArgumentException";
  this.message = `MissingArgumentException: ${message}` ;
}
MissingArgumentException.prototype = new Error();

module.exports = MissingArgumentException;