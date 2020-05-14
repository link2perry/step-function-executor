
exports.customHandler = (event, context, callback) => {
	console.log('ran step one');
	callback(null, 'some nice params');
};
