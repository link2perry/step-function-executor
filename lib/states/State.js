let { IllegalStateException } = require('../exceptions');

class State {
  constructor(state, stepFunction) {
    this.state = state;
    this.stepFunction = stepFunction;
  }

  async execute() {
    throw new IllegalStateException('All classes extending State must implement method: execute!');
  }

  getType() {
    return this.state.Type;
  }

  /**
   * Holds a human-readable description of the state.
   */
  getComment() {
    return this.state.Comment;
  }

  /**
   * A path that selects a portion of the state's input to be passed to the state's task for processing. 
   * If omitted, it has the value $ which designates the entire input. For more information, see Input and Output Processing).
   */
  getInputPath() {
    return this.state.InputPath || '$';
  }

  /**
   * A path that selects a portion of the state's input to be passed to the state's output. 
   * If omitted, it has the value $ which designates the entire input. For more information, see Input and Output Processing.
   */
  getOutputPath() {
    return this.state.OutputPath || '$';
  }

  /**
   * Designates this state as a terminal state (it ends the execution) if set to true. 
   * There can be any number of terminal states per state machine. Only one of Next or End can be used in a state. 
   * Some state types, such as Choice, do not support or use the End field.
   */
  getEnd() {
    return this.state.End;
  }

  /**
   * The name of the next state that will be run when the current state finishes. 
   * Some state types, such as Choice, allow multiple transition states.
   */
  getNext() {
    return this.state.Next;
  }

  /**
   * Specifies where (in the input) to place the results of executing the task specified in Resource. 
   * The input (output?) is then filtered as prescribed by the OutputPath field (if present) before being used as the state's output. 
   * For more information, see path.
   */
  getResultPath() {
    return this.state.ResultPath || '$';
  }
}

module.exports = State;