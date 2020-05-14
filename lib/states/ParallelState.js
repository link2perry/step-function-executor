const State = require('./State');
let { IllegalStateException } = require('../exceptions');

class ParallelState extends State {
  constructor(state, stepFunction) {
    super(state, stepFunction);
  }
  
  /**
   * An array of objects that specify state machines to execute in parallel. 
   * Each such state machine object must have fields named States and StartAt whose meanings are 
   * exactly like those in the top level of a state machine.
   */
  getBranches() {
    if(!this.state.Branches) {
      throw new IllegalStateException(`Property "Branches" is required on object of type "ParallelState".`);
    }    
    return this.state.Branches;
  }

  async execute(event, context, StepFunction) {
    try {
      let branches = this.getBranches();
      let promises = branches.map(branch => {
        let cloneEvent = JSON.parse(JSON.stringify(event));
        let cloneContext = {
          invokedFunctionArn: context.invokedFunctionArn,
          functionName: context.functionName
        }
        let branchOptions = Object.assign(this.stepFunction.options, {
          indent: this.stepFunction.options.indent + 2
        })
        let branchStepFunction = new StepFunction(branch, this.stepFunction.serverless, branchOptions);
        return branchStepFunction.transitionTo(branchStepFunction.getStartAt(), cloneEvent, cloneContext);
      });
      let events = await Promise.all(promises);
      return {next: this.getNext(), output: events};
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}

module.exports = ParallelState;