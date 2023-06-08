const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origin: '*'
  }
});


// WebSocket连接事件
io.on('connection', socket => {
  console.log('New user connected');

  socket.on('sdp-ice', data => {
    socket.broadcast.emit('sdp-ice', data);
  });

  // 处理用户离开
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// 启动服务器
const port = 3000;
http.listen(port, () => {
  console.log(`Server started on port ${port}`);
});