// Node server which will handle socket io connections
const express = require('express')
app = express()
http = require('http').createServer(app)
const io = require('socket.io')(http)
const PORT = process.env.PORT || 8000

http.listen(PORT, function() {
    console.log("Server started on PORT: 8000")
})

const users = {};

io.on('connection', socket =>{

    // If any new user joins, let other users connected to the server know!
    socket.on('new-user-joined', name =>{ 
        users[socket.id] = name;
        socket.broadcast.emit('user-joined', name);
    });

    // If someone sends a message, broadcast it to other people
    socket.on('send', message =>{
        socket.broadcast.emit('receive', {message: message, name: users[socket.id]})
    });

    // If someone leaves the chat, let others know 
    socket.on('disconnect', message =>{
        socket.broadcast.emit('left', users[socket.id]);
        delete users[socket.id];
    });

})
