
const JasmineConsoleReporter = require('jasmine-console-reporter');
const consoleReporter = new JasmineConsoleReporter({
    colors: 1,           // (0|false)|(1|true)|2
    cleanStack: 1,       // (0|false)|(1|true)|2|3
    verbosity: 2,        // (0|false)|1|2|(3|true)|4
    listStyle: 'indent', // "flat"|"indent"
    activity: false
});
jasmine.getEnv().defaultTimeoutInterval = 20000;

jasmine.getEnv().addReporter(consoleReporter);

global.expect = require("expect.js");

global.console.debug = function () {
    // Array.prototype.unshift.call(arguments, 'jDEBUG');
    // console.log.apply(console, arguments);
};


global.Promise = require("bluebird");

require('./lib/globals');