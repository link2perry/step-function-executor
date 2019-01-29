const fs = require('fs');
const path = require('path');
let rimraf = require("rimraf");
let exec = require('child_process').exec;

class Npm {

  clean(dirname) {
    let node_modules = `${dirname}${path.sep}node_modules`;
    console.log('cleaning ', node_modules);
    return new Promise((succeed, fail) => {
      if(fs.existsSync(node_modules)) {
        rimraf(node_modules, function (err, data) {
         if(err) { 
           fail(err);
         } 
          succeed();
        });
      } else {
        succeed();
      }
    })
  }

  install(dirname, options) {
    options = Object.assign({
      clean: false
    }, options);
    return new Promise((succeed, fail) => {
      if(dirname) {
        console.log('dirname', dirname);
        let optionallyClean = () => {
          return new Promise(succeed => {
            if(options.clean) {
              this.clean(dirname)
              .then(()=>{
                succeed()
              }, err => {
                fail(err);
              });
            } else {
              succeed();
            }
          })
        };
        
        optionallyClean()
        .then(() => {
          var previous = process.cwd();
          process.chdir(dirname);
          console.log('running npm install in ', dirname);
          exec('npm install', (error, stdout, stderr) => {
            process.chdir(previous);
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
              console.log('exec error: ' + error);
              fail(error);
            } else {
              succeed();
            }
          });
        });
      } 
    })
  }
}

module.exports = new Npm();