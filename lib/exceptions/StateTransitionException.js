function StateTransitionException(message) {
  this.name = "StateTransitionException";
  this.message = `StateTransitionException: ${message}` ;
}
StateTransitionException.prototype = new Error();

module.exports = StateTransitionException;