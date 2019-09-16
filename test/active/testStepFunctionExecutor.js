let Serverless = require('../../lib/Serverless');

describe('Testing StepFunction Execution', function() {
	this.timeout(300000);
	it('runs', function(done) {
		
		let serverless = new Serverless({ verbose: true, generateTests: false });
		serverless.load('../samples/serverless.yml', {
			stage: 'test'
		}, {
			'#{AWS::Region}': 'us-east-1',
			'#{AWS::AccountId}': '526385476100'
		}).then(() =>{
			let event = {
				context: {
					formulaId: "a0b5B000001vmVK", //"a0b1F000000R1gT",
					bbn: "RB-0040.01-B01" //"RB-0040.01-B012"
				}
			};

			let context = {
				invokedFunctionArn: 'arn:aws:lambda:us-east-1:526385476100:function:FormulaNutritionService-test-calculateNutrition',
				functionName: 'PicassoFormulateService-test-someFunction'
			};
			serverless
				//.getStepFunction('TestService')
				.getStepFunction()
				.execute(event, context)
			.then(event => {
				console.log('Ending event state:', JSON.stringify(event, null, 2));
				done();
			}).catch(err => {
				done();
				console.log('ERROR:', err);
			});
		}).catch(err => {
			done();
			console.log('ERROR: ', err);
		});
	});
});