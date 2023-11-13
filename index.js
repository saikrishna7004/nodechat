const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 8000;

http.listen(PORT, function() {
    console.log("Server started on PORT: 8000");
});

const users = {};
const engagedInCall = {};

io.on('connection', socket =>{

    // If any new user joins, let other users connected to the server know!
    socket.on('new-user-joined', ({name, userId, roomId, peerId, ...data}) =>{ 
        users[socket.id] = name;
        socket.join(roomId);
        socket.broadcast.to(roomId).emit('user-joined', {name, userId, peerId});
    });

    // If someone sends a message, broadcast it to other people
    socket.on('send', ({message, roomId, peerId, ...data}) =>{
        socket.broadcast.to(roomId).emit('receive', {message: message, name: users[socket.id], userId: socket.id, peerId: peerId})
        console.log(socket.id, "sent msg")
    });

    // If someone leaves the chat, let others know 
    socket.on('disconnect', () =>{
        socket.broadcast.emit('left', users[socket.id]);
        delete users[socket.id];
    });

    socket.on('new_notification', function( data ) {
        console.log(data.title, data.message);
        io.sockets.emit('show_notification', { 
            title: data.title, 
            message: data.message, 
            icon: data.icon, 
        });
    });

    socket.on('cancel-call', userId=>{
        io.to(userId).emit('cancel-call');
    })

    socket.on('reject-call', userId=>{
        console.log('reject-call', userId)
        io.to(userId).emit('reject-call');
    })

    socket.on('make-call-check', (d)=>{
        console.log("MAke call check ", d)
        const {myUserId, toUserId, to, username} = d
        console.log('make-call-check', username, " to ", to);
        console.log(engagedInCall)

        if (engagedInCall[toUserId]) {
            console.log("Other call")
            io.to(myUserId).emit('caller-other-call');
        } else {
            console.log("Making call to ", to)
            io.to(myUserId).emit('make-call');
            engagedInCall[myUserId] = toUserId;
            engagedInCall[toUserId] = myUserId;
        }
    })

    socket.on('call-ended', ({ userId, otherUserId }) => {
        delete engagedInCall[userId];
        delete engagedInCall[otherUserId];
        io.to(otherUserId).emit('call-ended');
        // Add any necessary logic to inform users about the call ending.
    });

    socket.on('join-room', ({roomId, userId, ...data}) => {
        socket.join(roomId)
        socket.to(roomId).emit('user-connected', userId)
        console.log(roomId, userId)

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId)
        })
    })

    // Get the list of connected users in a room
    socket.on('get-users', () => {
        socket.emit('users-in-room', users);
    });

});