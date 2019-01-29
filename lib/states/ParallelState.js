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

  execute(event, context, StepFunction) {
    return new Promise((succeed, fail) => {
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

      Promise.all(promises)
      .then(events => {
        succeed({next: this.getNext(), output: events});
      }, err => {
        fail(err);
      }).catch(err => {
        fail(err);
      });
    });
  }
}

module.exports = ParallelState;