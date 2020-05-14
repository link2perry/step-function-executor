const State = require('./State');

class FailState extends State {
  constructor(state, stepFunction) {
    super(state, stepFunction);
    this.state.End = true;
    this.state.Next = undefined;
  }

  getNext() {
    return undefined;
  }

  async execute() {
    return {};
  }
}

module.exports = FailState;