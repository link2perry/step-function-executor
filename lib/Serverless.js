const fs = require('fs');
const YAML = require('yamljs');
const path = require('path');
const ObjectUtil = require('./ObjectUtil');
const StepFunction = require('./StepFunction');
const { ItemNotFoundException, IllegalStateException, UnsupportedException } = require('./exceptions');

class Serverless {

	/**
	 * 
	 * @param {*} options 
	 *  - {boolean} verbose set to true to logging extra information during execution 
	 */
	constructor(options) {
		this.options = Object.assign({
			verbose: false
		}, options);
	}

	/**
	 * 
	 * @param {*} configPath Relative path to the serverless.yml file to load
	 * @param {*} opt Serverless variable options ${opt:var}
	 * @param {*} replace Optionally replace other items within the serverless.yml before loading
	 */
  load(configPath, opt, replace) {
		this.opt = Object.assign({}, opt);
		this.configPath = path.resolve(path.dirname(module.parent.filename), configPath);
		return new Promise((succeed, fail) => {
			fs.readFile(this.configPath, (err, fileContents) => {
				if(fileContents === undefined) {
					return fail(`Failed to load the configuration file as the file was not found: "${configPath}"`);
				}
				fileContents = fileContents.toString();
				if(replace) {
					let escapeRegExp = (str) => {
						return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
					}
					Object.keys(replace).forEach(key => {
						fileContents = fileContents.replace(new RegExp(escapeRegExp(key), 'g'), replace[key]);
					});
				}
				this.config = YAML.parse(fileContents);
				this.loadEnv(this.config.provider.environment);
				succeed(this.config);
			});
		});
	}

	/**
	 * Retrieve a step function from the serverless.yml by name.  If name is omitted, return the
	 * first step function available.
	 * 
	 * @param {string} name the name of the step function to be retrieved
	 */
	getStepFunction(name) {
		if(this.config) {
			let stateMachines = this.config.stepFunctions ? this.config.stepFunctions.stateMachines : null;
			let stepFunction;
			if(stateMachines) {
				let stateMachine = name ? stateMachines[name] : stateMachines[Object.keys(stateMachines)[0]];
				if(stateMachine) {
					stepFunction = new StepFunction(this.eval(stateMachine.definition), this, this.options);
				} else {
					throw new ItemNotFoundException(name);
				}
			}
			return stepFunction;
		} else {
			throw new IllegalStateException('Serverless.yml has not been loaded. Call Serverless.load() first.');
		}
	}

	/**
	 * Merge the values of "env" into the global environment variable (process.env)
	 * 
	 * @param {*} env The object to be merged into the environment
	 */
	loadEnv(env = {}) {
		process.env = Object.assign({}, process.env, this.eval(env));
	}
	
	/**
	 * Contextualizes a file path, which is needed in order to dynamically load local lambdas
	 * 
	 * @param {*} p The path of the file or directory
	 * @param {*} convertToRelativePath set to true to convert the resulting path into a path 
	 * relative to the serverless.yml file's location
	 */
	contextualizePath(p, convertToRelativePath = false) {
		let ctxDir = path.dirname(this.configPath);
		let ctxPath = path.resolve(__dirname, ctxDir, p);
		if(convertToRelativePath) {
			ctxPath = path.relative(__dirname, ctxPath);
		}
		return ctxPath;
	}

	getFunctionPath(functionName, convertToRelativePath = false) {
		let f = this.config.functions[functionName];
		if(f) {
			let dot = f.handler.lastIndexOf('.');
			let funcPath = f.handler.substring(0, dot);
			let ctxPath = this.contextualizePath(funcPath, convertToRelativePath);
			if(convertToRelativePath) {
				ctxPath = './' + ctxPath;
			}
			return ctxPath;
		} else {
			throw new ItemNotFoundException(functionName);
		}
	}

	/**
	 * Dynamically load a local lambda function
	 * 
	 * @param {string} functionName The name of the function to load.  This should match one of 
	 * the functions in the serverless.yml under the "functions" section.
	 */
	requireLocalLambda(functionName) {
		return new Promise((succeed, fail) => {
			try {
				let funcPath = this.getFunctionPath(functionName, true);
				let func = require(funcPath);
				this.loadEnv(this.config.functions[functionName].environment);
				succeed(func);
			} catch(err) {
				fail(err);
			}
		})
	}

	/**
	 * Recursively evaluate a serverless variable, optionally scoped to an obj.
	 * 
	 * @param {*} obj Only evaluate this item (including its children)
	 * @param {*} opt An object of key/values pairs. Each key in opt will map to an ${opt:key_matches_this} and 
	 * will replace it with the corresponding value.
	 */
  eval(obj, opt) {
		if(obj === null) {
			return null;
		}
		opt = Object.assign({}, this.opt, opt);
		let type = typeof obj;
		let evalVariable = (variable, opt) => {
			if(variable) {
				variable = variable.trim();
				if(variable.startsWith('file(')) {
					let end = variable.indexOf(')', 5);
					let filePath = variable.substring(5, end);
					let p = this.contextualizePath(filePath);

					let evaluated = YAML.load(p);
					let colon = variable.indexOf(':', end);
					if(colon > -1) {
						let hierarchy = variable.substring(colon + 1);
						evaluated = ObjectUtil.getValue(evaluated, hierarchy);
					}
					return evaluated;
				} else {
					if(variable.includes(':')) {
						let parts = variable.split(':');
						let prefix = parts[0];
						variable = parts[1];
						let target;
						switch(prefix) {
							case 'opt':
								target = opt;
								break;
							case 'self':
								target = this.config;
								break;
							case 'env':
								target = process.env;
								break;
							default:
								throw new UnsupportedException(`Serverless variable with prefix: "${prefix}" is unsupported.`);
						}
						return ObjectUtil.getValue(target, variable);
					} else {
						if(variable.match(/^['"].*?['"]$/)) {
							return variable.substring(1, variable.length - 1);
						}
					}
				}
			}
		}

		switch(type) {
			case 'object':
				obj = ObjectUtil.clone(obj);
				if(Array.isArray(obj)) {
					obj = obj.map(item => {
						return this.eval(item, opt);
					});
				} else {
					Object.keys(obj).forEach(key => {
						obj[key] = this.eval(obj[key], opt);
					});		
				}	
				break;
			case 'string':
				obj = obj.replace(/\${[^\${]*?}/g, contents => {
					let evaluated = contents;
					let content = contents.substring(2, contents.length - 1);
					content = this.eval(content, opt);
					
					if(content.startsWith('file(')) {
						return '${' + content + '}';
					}

					let contentParts = content.split(',');
					let variable = contentParts[0].trim();
					let defaultValue = contentParts[1] ? contentParts[1].trim() : undefined;
					evaluated = evalVariable(variable, opt) || evalVariable(defaultValue, opt);

					return evaluated;
				});
				if(obj.startsWith('${file(')) {
					let content = obj.substring(2, obj.length - 1);
					obj = evalVariable(content, opt);
				} else if (obj.match(/\${[^\${]*?}/)) {
					obj = this.eval(obj, opt);
				}
				break;
			
			case 'boolean':
			case 'function':
			case 'number':
			case 'symbol':
			case 'undefined':
				//do nothing, values of these types will remain unchanged
				break;
			default:
				throw new UnsupportedException(`Serverless cannot evaluate items of type: "${type}"`);
		}
		return obj;
  }
}

module.exports = Serverless;