const State = require('./State');

class PassState extends State {
  constructor(state, stepFunction) {
    super(state, stepFunction);
  }

  /**
   * Treated as the output of a virtual task to be passed on to the next state, and filtered as prescribed by the ResultPath field (if present).
   */
  getResult() {
    return this.state.Result;
  }

  execute() {
    return Promise.resolve({next: this.getNext(), output: this.getResult()});
  }
}

module.exports = PassState;