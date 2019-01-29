let moment = require('moment');
let $ = require('cheerio');

exports.handler = (event, context, callback) => {
	console.log('ran at:', moment());
	console.log('$', $);
	callback(null, 'some nice params');
};
