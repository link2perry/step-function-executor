let moment = require('moment');
let $ = require('cheerio');

exports.customHandler = (event, context, callback) => {
	console.log('ran at:', moment());
	callback(null, 'some nice params');
};
