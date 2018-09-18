describe('Message router', function() {
    var MessageRouter = require('./message-router');

    var receivedEvents = [];

    beforeEach(function () {
        receivedEvents.length = 0;
    });

    it('Should be defined', function () {
        expect(MessageRouter).toBeTruthy();
    });

    it('should create a unique router object', function(){
        expect(MessageRouter).not.toBe(MessageRouter());
    });

    describe('with one subscription', function(){
        var receivedBody = undefined, messageRouter, callback;

        beforeEach(function(){
            messageRouter = MessageRouter();
            callback = function (eventBody) {
                receivedBody = eventBody;
            };
            messageRouter.on('myevent', callback);

            receivedBody = undefined;
        });

        it('should use type as default routing key', function () {

            messageRouter.routeMessage({type:"myevent"});
            expect(receivedBody).toBeTruthy();
        });

        it('unsubscribe using function object should remove function from event handlers.', function(){
            messageRouter.unsubscribe('myevent', callback);
            messageRouter.routeMessage( {type:"myevent"} );
            expect(receivedBody).not.toBeTruthy();
        });
    });

    describe('subscribing with wildcard *', function(){
        var receivedBody = undefined, messageRouter, callback;

        beforeEach(function(){
            messageRouter = MessageRouter();
            callback = function (eventBody) {
                receivedEvents.push(eventBody);
            };
            messageRouter.on('*', callback);
            receivedBody = undefined;
        });

        it('should use type as default routing key', function () {
            messageRouter.routeMessage({type:"sometype"});
            messageRouter.routeMessage({type:"anothertype"});
            expect(receivedEvents.length).toBe(2);
        });
    });

    describe('subscribing multiple handlers', function () {
        var messageRouter;
        var t1e, t2e;
        var unsubscribe;
        beforeEach(function () {
            messageRouter = MessageRouter();
            t1e=false; t2e=false;

            unsubscribe = messageRouter.subscribeMulti({
                'typeOne': function (t1Event) {
                    t1e = t1Event;
                },
                'typeTwo': function (t2Event) {
                    t2e = t2Event;
                }
            });
        });

        it('should route event to registered handler for typeOne', ()=>{
            messageRouter.routeMessage({
                type: 'typeOne'
            });
            expect(t1e).toBeTruthy();
        });

        it('should route event to registered handler for typeTwo', ()=>{
            messageRouter.routeMessage({
                type: 'typeTwo'
            });
            expect(t2e).toBeTruthy();
        });

        it('should unregister all listeners', ()=>{
            unsubscribe();

            messageRouter.routeMessage({
                type: 'typeTwo'
            });
            expect(t2e).not.toBeTruthy();
        });
    });

    describe('using a custom routing key', function () {
        var receivedBody = undefined, messageRouter;
        var t1e, t2e;
        var unsubscribe;
        beforeEach(function () {
            messageRouter = MessageRouter({
                routingKey:'RoutingKey'
            });

            unsubscribe = messageRouter.subscribeMulti({
                'typeOne': function (t1Event) {
                    t1e = t1Event;
                },
                'typeTwo': function (t2Event) {
                    t2e = t2Event;
                }
            });
        });

        it('should route event to registered handler for typeOne', ()=>{
            messageRouter.routeMessage({
                RoutingKey: 'typeOne'
            });
            expect(t1e).toBeTruthy();
        });

        it('should route event to registered handler for typeTwo', ()=>{
            messageRouter.routeMessage({
                RoutingKey: 'typeTwo'
            });
            expect(t2e).toBeTruthy();
        });

        it('should unregister all listeners', ()=>{
            unsubscribe();

            messageRouter.routeMessage({
                RoutingKey: 'typeTwo'
            });
            expect(t2e).toBeTruthy();
        });
    })
});