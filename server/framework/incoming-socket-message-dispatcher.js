module.exports=function(injected){
    const socketIoVerb = injected('socketIoVerb');
    const messageRouter = injected('messageRouter');

    return {
        startDispatching: function(_socket, _session){
            var socket = _socket;
            var session = _session;

            var listener;
            listener = (message)=>{
                message._session = session;
//                 console.debug("Incoming message from socket.io: " + socketIoVerb + " message: ", message );
                messageRouter.routeMessage(message);
            };

            socket.on(socketIoVerb, listener);
            return {
                stopDispatching:function(){
                    socket.removeListener(socketIoVerb, listener);
                }
            }
        }
    };
};