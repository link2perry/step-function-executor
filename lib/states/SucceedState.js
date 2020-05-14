const State = require('./State');

class SucceedState extends State {
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

module.exports = SucceedState;