module.exports = (function() {
    require('./globals');

    let port = process.env.PORT || 8080;
    let env = process.env.NODE_ENV || 'development';

    console.log("Runtime environment:", process.env);

    let server = require('./server.js')(inject({
        port,
        env
    }));

    server.startServer(function() {
        console.log('Server listening on port ' + port);
    });

})();