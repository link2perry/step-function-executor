# step-function-executor
Use this utility to execute serverless Step Functions locally!

## Installation
This module is installed via npm:
```
npm install --save-dev step-function-executor
```

## Example Usage:
```javascript
let { Serverless } = require('step-function-executor');

let serverless = new Serverless({ verbose: true });
serverless.load('../serverless.yml', {
  stage: 'test'
}).then(() => {
  let event = {
    context: {
      myParam: 'myValue'
    }
  };
  let context = {};
  serverless
    .getStepFunction()
    .execute(event, context)
  .then(event => {
    console.log('Ending event state:', JSON.stringify(event, null, 2));
  });
});
```

## Documentation
*Create a new instance of a Serverless object:*
```javascript
new Serverless(options);
```
Name | Type | Required | Default | Description
------------ | ------------- | ------------- | ------------- | -------------
options | object | false | | optional parameters
options.verbose | boolean | false | false | set to true to log extra information during execution
---
*Load the serverless.yml configuration file:*

```javascript
[Promise] load(configPath, opt, replace)
```
Return value:  a Promise of a serverless instance loaded from the serverless.yml config file

**Parameters:**
Name | Type | Required | Default | Description
------------ | ------------- | ------------- | ------------- | -------------
configPath  | string | true | | Relative path to the serverless.yml file to load
opt | object | false | | Serverless variable options ${opt:var}
replace  | object | false | | Optionally replace other items within the serverless.yml before loading

---
*Gets a step function by name, or first available, as defined by the serverless.yml config file.*
```javascript
[StepFunction] getStepFunction(name)
```
Return value:  The step function
Throws: 
* ItemNotFoundException:  thrown if no step function was found 
* IllegalStateException: thrown if getStepFunction() is called before load()

**Parameters:**
 Name | Type | Require | Default | Description
------------ | ------------- | ------------- | ------------- | -------------
name  | string | false | | If provided, retrieves the step function with the provided name.  If not provided, retrieves the first step function that is defined.

## Changelog
* [Date] description

## Licensing
step-function-executor is licensed under the MIT License.

All files located in the node_modules and external directories are externally maintained libraries used by this software which have their own licenses; we recommend you read them, as their terms may differ from the terms in the MIT License.