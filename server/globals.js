// Modules you want available in the global namespace. Be EXTREMELY conservative on what you put
// here. Only low-level libraries which do NOT handle IO should be available in global namespace,
// the purpose being to decrease verbosity of code where those libraries are used.

global._ = require('lodash');

// Require from common library.
global._require = function(moduleName){
    return require('./framework/' + moduleName)
};

global.inject = _require('inject');


if(process.env.NODE_ENV!=='production'){
    if(process.env.DEBUG_LOG){
        console.debug = console.log;
    } else{
        console.debug = function () {};
    }
}



Path = require('path');

