const State = require('./State');

class ChoiceState extends State {
  constructor(state, stepFunction) {
    super(state, stepFunction);
  }

evaluate(event, choice) {
		let result = false;
		let v;
		if(choice.hasOwnProperty('Variable')) {
			v = this.stepFunction.eval(event, choice.Variable);
			let indent = ' '.repeat(this.stepFunction.options.indent);
			console.log(`${indent}  - choice value: `, v);
		}
		if(choice.hasOwnProperty('And')) {
			result = choice.And.every(x => this.evaluate(event, x));
		} else if(choice.hasOwnProperty('Or')) {
			result = choice.Or.some(x => this.evaluate(event, x));
		} else if(choice.hasOwnProperty('Not')) {
			result = !this.evaluate(event, choice.Not);
		} else if(choice.hasOwnProperty('BooleanEquals')) {
			result = (('' + choice.BooleanEquals).toLowerCase() === ('' + v).toLowerCase());
		} else if (choice.hasOwnProperty('NumericEquals')) {
			result = (new Number(v) === new Number(choice.NumericEquals));
		} else if (choice.hasOwnProperty('NumericGreaterThan')) {
			result = (new Number(v) > new Number(choice.NumericGreaterThan));
		} else if (choice.hasOwnProperty('NumericGreaterThanEquals')) {
			result = (new Number(v) >= new Number(choice.NumericGreaterThanEquals));
		} else if (choice.hasOwnProperty('NumericLessThan')) {
			result = (new Number(v) < new Number(choice.NumericLessThan));
		} else if (choice.hasOwnProperty('NumericLessThanEquals')) {
			result = (new Number(v) <= new Number(choice.NumericLessThanEquals));
		} else if (choice.hasOwnProperty('StringEquals')) {
			result = (('' + v) === ('' + choice.StringEquals));
		} else if (choice.hasOwnProperty('StringGreaterThan')) {
			result = (('' + v) > ('' + choice.StringGreaterThan));
		} else if (choice.hasOwnProperty('StringGreaterThanEquals')) {
			result = (('' + v) >= ('' + choice.StringGreaterThanEquals));
		} else if (choice.hasOwnProperty('StringLessThan')) {
			result = (('' + v) < ('' + choice.StringLessThan));
		} else if (choice.hasOwnProperty('StringLessThanEquals')) {
			result = (('' + v) < ('' + choice.StringLessThanEquals));
		} else if (choice.hasOwnProperty('TimestampEquals')) {
			result = (v === choice.TimestampEquals);
		} else if (choice.hasOwnProperty('TimestampGreaterThan')) {
			result = (v > choice.TimestampGreaterThan);
		} else if (choice.hasOwnProperty('TimestampGreaterThanEquals')) {
			result = (v >= choice.TimestampGreaterThanEquals);
		} else if (choice.hasOwnProperty('TimestampLessThan')) {
			result = (v < choice.TimestampLessThan);
		} else if (choice.hasOwnProperty('TimestampLessThanEquals')) {
			result = (v <= choice.TimestampLessThanEquals);
		}
		return result;
  }
  
  async execute(event, context) {
		let nextState;
		let choices = this.state.Choices;
		let result = choices.some(choice => {
			let result = this.evaluate(event, choice);
			if(typeof result !== undefined && result !== null) {
				nextState = choice.Next;
			}
			return result;
		});
		if(!result && this.state.Default) {
			nextState = this.state.Default.trim();
		}
		return {next: nextState};
  }
}

module.exports = ChoiceState;