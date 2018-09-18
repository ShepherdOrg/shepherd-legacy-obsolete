function serverModule(injected) {

    const ENV = injected('env');
    const PORT = injected('port');

    const config = require('./config.js')[ENV];

    const Express = require('express');
    const Session = require('express-session');
    const BodyParser = require('body-parser');
    const Path = require('path');
    const SocketIo = require('socket.io');

    const ShepherdServerContext = function(injected){};

    return {
        startServer: function(CALLBACK){

            const CookieParser = require('cookie-parser');
            const app = Express();

            const sessionOpts = {
                secret: config.sessionSecret,
                resave: true,
                saveUninitialized: true
            };

            // Define where our static files will be fetched from:
            app.use(Express.static(Path.join(__dirname, '..', 'static')));

            app.use(BodyParser.json());
            app.use(BodyParser.urlencoded({ extended: true }));

            const cookieParser = CookieParser(config.sessionSecret);
            app.use(cookieParser);

            app.use(Session(sessionOpts));

            require('./http-routes/api')(
                inject({app})
            );

            app.get('/*', function (req, res) {
                // Render index.html in all cases and pass route handling to react
                res.sendFile(Path.join(__dirname,'static','index.html'));
            });

            const server = app.listen(PORT, CALLBACK);
            const io = SocketIo(server);

            //  SocketSessionManager(inject({io}));
            ShepherdServerContext(inject({io }));

        }
    }
}

module.exports=serverModule;