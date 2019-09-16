let fs = require('fs');
let moment = require('moment');
let path = require('path');

let escape = (s) => {
  if(s === undefined || s === null) {
      return s;
  } else {
      return s.replace(/'/g, '\\\'');
  }
}

let mkdir = (destinationDir) => {
  return new Promise((succeed, fail) => {
    let parentDir = path.dirname(destinationDir);
    let foldersToCreate = [];
    while (!fs.existsSync(parentDir)) {
      foldersToCreate.push(parentDir);
      let dirs = parentDir.split(path.sep);
      dirs.pop();
      parentDir = dirs.join(path.sep);
    }
    foldersToCreate = foldersToCreate.reverse();
    for (let i = 0; i < foldersToCreate.length; i++) {
      fs.mkdirSync(foldersToCreate[i], {recursive: true}, err => {
        fail(err);
      });
    }
    succeed();
  });
}

let writeTest = (input, stream, prefix = '', key = '', stack = []) => {
  let value = key.length > 0 ? input[key] : input;
  let path = stack.reduce((a, item) => {
      switch(typeof item) {
          case 'string':
              return `${a}['${item}']`;    
          case 'number':
              return `${a}[${item}]`;
          default:
              throw new Error('Handle the case where item is not a string or a number!');
      }
  }, 'result');    

  switch(typeof value) {
      case 'string':
        stream.write(`${prefix}expect(${path}).to.eq('${escape(value)}');\r\n`);
        break;
      case 'number':
        stream.write(`${prefix}expect(${path}).to.eq(${value});\r\n`);
        break;
      case 'object':
        if(value === undefined) {
          stream.write(`${prefix}expect(${path}).to.eq(undefined);\r\n`);
        } else if (value === null) {
          stream.write(`${prefix}expect(${path}).to.eq(null);\r\n`);
        } else if(Array.isArray(value)) {
          stream.write(`${prefix}expect(${path}.length).to.eq(${value.length});\r\n`);
          value.forEach((item, i) => {
              stack.push(i);    
              writeTest(item, stream, i, stack);
          });
        } else {
          Object.keys(value).forEach(key2 => {
              stack.push(key2);
              writeTest(value, stream, key2, stack);
          });
        }
        break;
  }
  stack.pop();   
}

class TestWriter {
  write(event, context, output, filePath, handler) {
    let idx1 = filePath.indexOf('lambdas') + 8;
    let testName = filePath.substring(idx1, filePath.indexOf('\\', idx1));
    let main = filePath.substring(filePath.lastIndexOf('\\') + 1);
    let dir = `${path.dirname(filePath)}${path.sep}test${path.sep}active${path.sep}generated`;
    mkdir(dir)
    .then(() => {
      let dt = moment().format('YYYY-MM-DD HH-mm-ss');
      let stream = fs.createWriteStream(`${dir}/snapshot-test-${dt}.js`, {flags: 'w'});  
      stream.write(`let { expect } = require('chai');
let instance = require('../../../${main}');

describe('Generated Test for ${testName}', function() {    
  it('executes', (done) => {
    instance.${handler}(${JSON.stringify(event)}, 
      ${JSON.stringify(context)}, 
      (err, result) => {
        if(err) {
          console.log('ERROR: ', err);
        }
        `);
        writeTest(output, stream);
        stream.write(`
        done();  
    });
  });
});`, () => {
        stream.end();
      });
    }, err => {
      console.log('ERROR: ', err);
    });
  }
}

module.exports = TestWriter;