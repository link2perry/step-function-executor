let chalk = require('chalk');
const State = require('./State');
const Npm = require('../Npm');
const path = require('path');
const AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';
const lambda = new AWS.Lambda();
let { ItemNotFoundException, IllegalStateException } = require('../exceptions');

class TaskState extends State {
  constructor(state, stepFunction) {
    super(state, stepFunction);
  }
  
  getResource(fail) {
    if(!this.state.Resource) {
      throw new IllegalStateException(`Property "Resource" is required on object of type "TaskState".`);
    }
    return this.state.Resource;
  }

  async execute(event, context) {
    try {
      let resource = this.getResource();
      let resourceName = resource.substring(resource.lastIndexOf('-') + 1);
      try {
        let f = await this.stepFunction.serverless.requireLocalLambda(resourceName);
        let handlerName = this.stepFunction.serverless.getFunctionHandler(resourceName);
        let handler = f[handlerName];
        let output = await handler(event, context);
        //console.log(chalk.white.bold.bgRed('output: ', JSON.stringify(output, null, 2)));
        context.installPerformed = false;
        return {
          output: output,
          next: this.getNext()
        };
      } catch(err) {
        if(err.message.indexOf('Cannot find module') > -1) {
          if(context.installPerformed) {
            console.log(chalk.white.bold.bgRed(err));
            throw err;
          } else {
            let funcPath = this.stepFunction.serverless.getFunctionPath(resourceName);
            let dirname = path.dirname(funcPath);
            await Npm.install(dirname, {clean: true})
            context.installPerformed = true;
            let result = await this.execute(event, context);
            return result;
          }
        } else if(err instanceof ItemNotFoundException) {
          let p = lambda.invoke({
            FunctionName: resource, 
            //ClientContext: AWS.util.base64.encode(JSON.stringify(context)),
            Payload: JSON.stringify(event)
          }).promise();
          try {
            let result = await p;
            if(result && result.StatusCode === 200) {
              context.installPerformed = false;
              return {
                output: JSON.parse(result.Payload),
                next: this.getNext()
              };        
            } else {
              throw new Error(result);
            }
          } catch(err) {
            console.log('Failed to invoke a remote lambda.');
            console.log('FunctionName: ', resource); 
            console.log('ClientContext: ', context);
            console.log('Payload: ', JSON.stringify(event));
            throw err;
          }
        } else {
          throw err;
        }
      };  
    } catch(err) {
      console.log(err);
      throw err;
    };
  }
}

module.exports = TaskState;