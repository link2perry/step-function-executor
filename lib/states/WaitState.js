const moment = require('moment');
const State = require('./State');

class WaitState extends State {
  constructor(state, stepFunction) {
    super(state, stepFunction);
  }

  getDelay(event) {
    let seconds, timestamp;
    let n = 0;
    if(this.state.hasOwnProperty('Seconds')) {
      seconds = this.state.Seconds;
    } else if(this.state.hasOwnProperty('SecondsPath')) {
      seconds = this.stepFunction.eval(event, this.state.SecondsPath);
    } else if(this.state.hasOwnProperty('Timestamp')) {
      timestamp = this.state.Timestamp;
    } else if(this.state.hasOwnProperty('TimestampPath')) {
      timestamp = this.stepFunction.eval(event, this.state.TimestampPath);
    }

    if(seconds) {
      n = parseInt(seconds, 10) * 1000;
    } else if (timestamp) {
      let now = moment();
      let then = moment(timestamp, 'YYYY-MM-DDTHH:mm:ssZ');
      if(then.isAfter(now)) {
        n = then.diff(now);
      }
    }
    console.log(`  - waiting ${n/1000} seconds...`);
    return n;
  }

  execute(event) {
    return new Promise(succeed => {
      setTimeout(() => {
        succeed({next: this.getNext()});
      }, this.getDelay(event));
    });
  }
}

module.exports = WaitState;