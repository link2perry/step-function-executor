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

  execute(event, context) {
    return new Promise((succeed, fail) => {
      let resource = this.getResource();
      let resourceName = resource.substring(resource.lastIndexOf('-') + 1);
      this.stepFunction.serverless.requireLocalLambda(resourceName)
      .then(f => {
        let handler = this.stepFunction.serverless.getFunctionHandler(resourceName);
        f[handler](event, context, (err, output) => {
          if(err) {
            fail(err);
          } else {
            //console.log(chalk.white.bold.bgRed('output: ', JSON.stringify(output, null, 2)));
            
            succeed({
              output: output,
              next: this.getNext()
            });
          }
        });
      }, err => {
        if(err) {
          if(err.message.indexOf('Cannot find module') > -1) {
            let funcPath = this.stepFunction.serverless.getFunctionPath(resourceName);
            let dirname = path.dirname(funcPath);
            Npm.install(dirname, {clean: true})
            .then(() => {
              this.execute(event, context)
              .then(result => {
                succeed(result)
              }, fail).catch(fail);
            }, fail).catch(fail);
          } else if(err instanceof ItemNotFoundException) {
            // console.log(`Attempting to invoke remote lambda: ${resource}`);
            lambda
            .invoke({
              FunctionName: resource, 
              //ClientContext: AWS.util.base64.encode(JSON.stringify(context)),
              Payload: JSON.stringify(event)
            })
            .promise()
            .then(result => {
              
              if(result && result.StatusCode === 200) {
                // console.log('got a successful result from the remote lambda: ', result);
                succeed({
                  output: JSON.parse(result.Payload),
                  next: this.getNext()
                });        
              } else {
                // console.log('got a errant result from the remote lambda: ', result);
                fail(result);
              }
            }, err => {
              console.log('Failed to invoke a remote lambda.');
              console.log('FunctionName: ', resource); 
              console.log('ClientContext: ', context);
              console.log('Payload: ', JSON.stringify(event));
              fail(err);
            }).catch(fail);
          
          } else {
            console.log(`Error 1 : ${resource}`);
            fail(err);
          }
        } else {
          console.log(`Error 2 : ${resource}`);
          fail();
        }
      });  
    });
  }
}

module.exports = TaskState;