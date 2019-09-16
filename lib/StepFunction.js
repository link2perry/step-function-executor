let chalk = require('chalk');
let ObjectUtil = require('./ObjectUtil');
let TestWriter = require('./TestWriter');
let fs = require('fs');
let { ChoiceState, FailState, ParallelState, PassState, SucceedState, TaskState, WaitState } = require('./states');
let { MissingArgumentException, StateTransitionException } = require('./exceptions');

class StepFunction {
	
	/**
	 * 
	 * @param {*} options 
	 *  - {Number} indent controls the indentation level when logging, parallel steps are run at a higher indent
	 *  - {boolean} verbose set to true to logging extra information during execution 
	 */
  constructor(definition, serverless, options) {
    this.definition = definition;
    this.serverless = serverless;
    this.options = Object.assign({
			indent: 0,
			verbose: false,
			generateTests: false
		}, options);
  }

  /**
   * Get the step functions's StartAt state
   */
  getStartAt() {
    return this.definition.StartAt;
  }

  /**
   * Get the step functions's state by name
   */
  getState(name) {
    return this.definition.States[name];
  }

  /**
   * Evaluate a step function variable.  Step function variables use
   * the pattern: $.my.variable.name
   * 
   * @param {*} event the execution event context
   * @param {string} variable the step function variable 
   */
  eval(event, variable) {
    let result = null;
    if(variable) {
      variable = variable.trim();
      if(variable ===  '$') {
        result = event;
      } else {
        if(variable.startsWith('$.')) {
          variable = variable.substring(2);
          result = ObjectUtil.getValue(event, variable);
        }
      }
    }
    return result;
  }

  /**
   * Merge an object into the execution event context
   * 
   * @param {*} state 
   * @param {*} event 
   * @param {*} output 
   */
  setResultInContext(state, event, output) {
		let resultPath = state.getResultPath();
		
		if(resultPath === '$') {
			return output;
		}

		if(resultPath.startsWith('$')) {
			resultPath = resultPath.substring(1);
		}
		if(resultPath.startsWith('.')) {
			resultPath = resultPath.substring(1);
		}
		let hierarchy = resultPath.split('.');

		let setValue = (parentObj, hierarchy, value, childObj) => {
			if(!childObj) {
				childObj = parentObj;
			}
			let prop = hierarchy.shift();
			if(hierarchy.length > 0) {
				if(!childObj[prop]) {
					childObj[prop] = {};
				}
				return setValue(parentObj, hierarchy, value, childObj[prop]);
			} else {
				//delete childObj[prop];
				childObj[prop] = value;
				return parentObj;
			}
		}
		
		return setValue(event, hierarchy, output);
	}

  /**
   * Execute the step function by transitioning to its StartAt state.
   * 
   * @param {*} event the execution context event
   * @param {*} context the execution context context
   */
  execute(event, context) {
    return this.transitionTo(this.getStartAt(), event, context);
  }

  /**
   * Transition to a state in the step function and execute it.
   * 
   * @param {*} nextStateName the name of the next state to execute
   * @param {*} event the execution context event
   * @param {*} context the execution context context
   */
  transitionTo(nextStateName, event, context) {
		return new Promise((succeed, fail) => {	
			let state = this.getState(nextStateName);
			if(state) {
				let indent = ' '.repeat(this.options.indent);
				if(this.options.verbose) {
					let title = nextStateName;
					let len = 80 - title.length;
					let buff = '                                                                                ';
					console.log(chalk.white.bold.bgGreen(buff));
					title = chalk.white.bold.bgGreen(' '.repeat(Math.floor(len/2)) + title + ' '.repeat(Math.ceil(len/2)));		
					console.log(title);
					console.log(chalk.white.bold.bgGreen(buff));
				} else {
					let title = `${indent}- ${nextStateName}`;
					console.log(title);
				}
				
				this.executeState(state, event, context)
				.then(event => {
					succeed(event);
				}, fail).catch(fail);
			} else {
				throw new StateTransitionException(`The state "${nextStateName}" was not found.`);
			}
		});
  }
  
  /**
   * Execute a step in the step function, and then transition to the next step or end execution.
   * 
   * @param {State} state the state to execute
   * @param {*} event the execution context event
   * @param {*} context the execution context context
   */
  executeState(state, event = {}, context = {}) {
		return new Promise((succeed, fail) => {	
			if(!state) {
				throw new MissingArgumentException('state');
			}
		
			switch(state.Type){
				case 'Pass':
					state = new PassState(state, this);
					break;
				case 'Wait':
					state = new WaitState(state, this);
					break;
				case 'Task':
					state = new TaskState(state, this);	
					break;
				case 'Choice':
					state = new ChoiceState(state, this);
					break;
				case 'Succeed':
					state = new SucceedState(state, this);
					break;
				case 'Fail':
					state = new FailState(state, this);
					break;					
				case 'Parallel':
					state = new ParallelState(state, this);
					break;
				default: 
					Promise.reject(new Error(`Unsupported state type: ${state.Type}`));
					break;
			}
			
			if(state.getInputPath()) {
				event = this.eval(event, state.getInputPath()); 
			}

			if(this.options.verbose) {
				console.log(chalk.yellow('   *** INPUT ***'), chalk.yellow(JSON.stringify(event,  null, 2)));
			}
			state.execute(event, context, StepFunction)
			.then((executionResult = {}) => {
				let { next, output } = executionResult;
				if(this.options.generateTests && state instanceof TaskState) {
					
					let r = state.getResource();
					let functionName = r.substring(r.lastIndexOf('-') + 1);
					try {
						let functionPath = this.serverless.getFunctionPath(functionName);
						console.log(chalk.white.bold.bgBlue('   *** Generating Test ***'));
						let handler = this.serverless.getFunctionHandler(functionName);
						let testWriter = new TestWriter();
						testWriter.write(event, context, output, functionPath, handler);
					} catch (err) {
						//do nothing, remote function
					};
				}

				if(typeof output !== 'undefined') {
					event = this.setResultInContext(state, event, output);
				}
				event = this.eval(event, state.getOutputPath());
				if(this.options.verbose) {
					console.log(chalk.cyan('   *** OUTPUT ***'), chalk.cyan(JSON.stringify(event, null, 2)));
				}
				if(state.getEnd()) {
					succeed(event);
				} else {
					return this.transitionTo(next, event, context);
				}
			}).then(event => {
				succeed(event);
			}, err => {
				console.log('ERROR 3: ', err);
				fail(err);
			}).catch(fail);
		});
	}
}

module.exports = StepFunction;