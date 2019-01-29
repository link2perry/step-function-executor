let Serverless = require('../../lib/Serverless');
let { expect } = require('chai');

describe('Testing Serverless', () => {
	let s, serverless;
	const stepOneConfigTest = {"environment":{"CONFIG":"AQICAHiz6cK5HJTtT5UgqQ2+gKVF9c/sFDAAp7xOJnTGyGUFywGnAdrb0tDJg3jLZINHyrZ7AAACBTCCAgEGCSqGSIb3DQEHBqCCAfIwggHuAgEAMIIB5wYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAxsAi8YVldWnAN5mokCARCAggG4ut+WaGy8hDV+7FZnsbJxpnCg2diswF/lVPDwPdV/WmrXPuneL8uOAHZ4D5tLJFbygodm9UoMrhKTeGvl9Y16utDZ5f1CAM0mt4+sOK7m1JxkhpZzoGLLHWzjwafrJAP+jUR3D9cefFOgfkBFKpRLno96wq/lx92+S3tBdqawK3UAmkWosaWceyKYCuh1nZwhKN4zGS38odxPEFxhHAsV1NdAR5iWeCimtEGz0Y+khLKknzvdXq8JDj4YnQJ2Je1OZ4C3P18jUmwL6wouIDtxfH2himGKQBqPC8ctaK4JiG/PrBQsjRmS+cXINzIy/hyHMapcCdSCunYiVhdfJKIECIP993QuucJaAVs4HcRrX0t2Bhq4E3j0ljW1CUpCceeTzvQ8eEZWz7xIiKQFYpoq6J7bmjiG631QO+sjcBNkWx/TsCcKZWxxb55o7U2dfq8GlzkaL692H0yduLGLsxeen+Rya08pg3Vg0LOS1MYhZMzGpFH6FvMZEbH9NyFxsNjPIWPZ/gGonLJ5l8Jzt6Je5Ejo+7dvpb/lr21pmq1ABU2tnzZwlisJ9TT01aajlPbYiqje6Api+Tk="},"region":"us-east-1","accountId":353114732066,"awsKmsKeyId":"c4deb956-bbb8-4d05-a9b3-884ff6d04407","vpc":{"securityGroupIds":["sg-635ecf13"],"subnetIds":["subnet-6ad19c66","subnet-a6e80799","subnet-fa1f55d6"]}};

	before( done => {
		s = new Serverless();
		s.load('../samples/testingServerless/serverless.yml')
		.then(result => {
			serverless = result;
			expect(serverless).is.not.null;
			expect(serverless.provider).is.not.null;
			expect(serverless.provider.environment).is.not.null;
			expect(serverless.provider.environment.STAGE).is.not.null;
			done();
		}).catch(err => {
			done();
			console.log('ERROR: ', err);
		});
	})

	it('evaluates a variable using opt', () => {
		expect(serverless.provider.environment.STAGE).to.eq('${opt:stage, \'dev\'}');
		let stage = s.eval(serverless.provider.environment.STAGE, {stage: 'test'});	
		expect(stage).to.eq('test');
	});

	it('evaluates a variable using opt but missing value', () => {
		expect(serverless.provider.environment.STAGE).to.eq('${opt:stage, \'dev\'}');
		let stage = s.eval(serverless.provider.environment.STAGE, {region: 'us-east-1'});	
		expect(stage).to.eq('dev');
	});

	it('evaluates a variable using self', () => {
		expect(serverless.provider.serviceName).to.eq('${self:service.name}');
		let serviceName = s.eval(serverless.provider.serviceName);	
		expect(serviceName).to.eq('testService');
	});

	it('evaluates a variable using file', () => {
		expect(serverless.provider.stepOneConfig).to.eq('${file(../lambdas/step-one/src/serverless.test.yml)}');
		let stepOneConfig = s.eval(serverless.provider.stepOneConfig);	
		expect(stepOneConfig.environment.CONFIG).to.eq(stepOneConfigTest.environment.CONFIG);
	});

	it('evaluates a variable using file with embedded variable', () => {
		expect(serverless.provider.stepOneConfig).to.eq('${file(../lambdas/step-one/src/serverless.test.yml)}');
		let stepOneConfig2 = s.eval(serverless.provider.stepOneConfig2, {stage: 'test'});	
		expect(stepOneConfig2.environment.CONFIG).to.eq(stepOneConfigTest.environment.CONFIG);
	});

	it('evaluates a variable using file with embedded variable and object path', () => {
		expect(serverless.provider.stepOneConfig).to.eq('${file(../lambdas/step-one/src/serverless.test.yml)}');
		let stepOneConfig3 = s.eval(serverless.provider.stepOneConfig3, {stage: 'test'});	
		expect(stepOneConfig3).to.eq(stepOneConfigTest.environment.CONFIG);
	});
	
	it('evaluates a variable with env', () => {
		process.env.stage = 'tiger';
		expect(serverless.provider.dbConfig.name).to.eq('ccna-tis-${env:stage}');
		let dbConfigName = s.eval(serverless.provider.dbConfig.name, {stage: 'test'});	
		expect(dbConfigName).to.eq('ccna-tis-tiger');
	});

	it('evaluates a whole section', () => {
		expect(serverless.provider.stepOneConfig).to.eq('${file(../lambdas/step-one/src/serverless.test.yml)}');
		let provider = s.eval(serverless.provider, {stage: 'test'});	
		expect(provider.environment.STAGE).to.eq('test');
		expect(provider.serviceName).to.eq('testService');
		expect(provider.stepOneConfig.environment.CONFIG).to.eq(stepOneConfigTest.environment.CONFIG);
		expect(provider.stepOneConfig2.environment.CONFIG).to.eq(stepOneConfigTest.environment.CONFIG);
		expect(provider.stepOneConfig3).to.eq(stepOneConfigTest.environment.CONFIG);
	});

	it('evaluates the whole config file', () => {
		expect(serverless.provider.environment.STAGE).to.eq('${opt:stage, \'dev\'}');
		let config = s.eval(s.config, {stage: 'test'});	
		expect(config.provider.environment.STAGE).to.eq('test');
	});

	it('recursively evaluates a variable', () => {
		expect(serverless.provider.environment.BUCKET).to.eq('${self:custom.${opt:stage}.bucket}');
		let provider = s.eval(serverless.provider, {stage: 'test'});	
		expect(provider.environment.BUCKET).to.eq('my-test-bucket');
	});
});