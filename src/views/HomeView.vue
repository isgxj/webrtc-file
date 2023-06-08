<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { io } from "socket.io-client";

const vdata: any = reactive({
  linkIngs: [],
  waitList: [],
})
const thisData: any = {
  sender: {},
}

function initScoket(url, callback) {
  const socket = io(url)
  socket.on('connect', () => {
    console.log('socket 连接成功');
  })

  // 处理连接错误事件
  socket.on('connect_error', error => {
    console.log('Connection error:', error);
  })

  // 处理连接断开事件
  socket.on('disconnect', () => {
    console.log('Disconnected from signaling server');
  })

  socket.on('sdp-ice', callback)
  
  return socket
}

const socket = initScoket('http://webrtc-file.isgxj.com/', onReceive)

function submitEmit(sdp, ice, isClose = false) {
  const { password, name } = vdata
  socket.emit('sdp-ice', { sdp, ice, isClose, password, name })
}

const serverConfig = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:global.stun.twilio.com:3478'
      ]
    }
  ],
  sdpSemantics: 'unified-plan'
}

function pushWait(data) {
  const { waitList } = vdata
  vdata.waitList = [...waitList.filter(item => item.password !== data.password), data]
}

function pushLinking(item) {
  vdata.linkIngs.push(item)
  vdata.password = ''
}

function onReceive(data) {
  if (data.password !== vdata.password) {
    pushWait(data)
    return
  }
  const item = thisData.sender
  const { peer } = item || {}
  if (!peer) return
  item.name = data.name
  peer.setRemoteDescription(data.sdp)
  peer.addIceCandidate(data.ice)
  pushLinking(item)
  thisData.sender = {}
}

function initSender() {
  const peer = new RTCPeerConnection(serverConfig)
  peer.onicecandidate = event => {
    if (event.candidate) {
      console.log('创建 ice');
      submitEmit(thisData.offer, event.candidate)
    }
  };

  const channel = peer.createDataChannel("chat")
  channel.onopen = () => {
    console.log('连接成功！');
  };
  channel.onmessage = (event) => {
    console.log(event.data)
    vdata.text = event.data
  };

  peer.createOffer().then(offer => {
    console.log('创建offer');
    peer.setLocalDescription(offer)
    thisData.offer = offer
  })
  thisData.sender = { peer, channel }
}

function initReciver({ sdp, ice, name }) {
  const peer2 = new RTCPeerConnection(serverConfig);

  peer2.onicecandidate = event => {
    if (event.candidate) {
      submitEmit(thisData.answer, event.candidate, true)
    }
  };
  peer2.ondatachannel = (event) => {
    const channel = event.channel;
    channel.onopen = () => {
      console.log('连接成功！');
      pushLinking({ peer: peer2, channel, name })
    };
    channel.onmessage = (event) => {
      console.log(event.data);
      vdata.text = event.data
    };
  };
  peer2.setRemoteDescription(sdp)
  peer2.addIceCandidate(ice)
  peer2.createAnswer().then(answer => {
    console.log('创建 answer')
    peer2.setLocalDescription(answer)
    thisData.answer = answer
  })
}

function sendMsg({ channel }) {
  if (!channel) {
    console.log('没有连接');
    return
  }
  channel.send(vdata.text)
}

function startConnection() {
  if (!vdata.password) {
    console.log('请输入密码')
    return
  }
  initSender()
}

function joinConnection() {
  if (!vdata.password) {
    console.log('请输入密码')
    return
  }
  const { waitList } = vdata
  const [item] = waitList.filter(d => d.password === vdata.password)
  if (!item) {
    console.log('未发起连接');
    return
  }
  if (item.isClose) {
    console.log('已失效');
    return
  }
  initReciver(item)
  vdata.waitList = waitList.filter(d => d.password !== vdata.password)
}
</script>

<template>
  <main class="container">
    <div class="form__item">
      <label for="" class="label">密码</label>
      <input class="input" type="text" v-model="vdata.password">
    </div>
    <div class="form__item">
      <label for="" class="label">昵称（可选）</label>
      <input class="input" type="text" v-model="vdata.name">
    </div>
    <button class="button" @click="startConnection">发起</button>
    <button class="button" @click="joinConnection">加入</button>

    <div>
      <div class="form__text">
        <textarea name="" id="" cols="30" rows="10" class="input" v-model="vdata.text"></textarea>
      </div>
      <button v-for="(item, index) in vdata.linkIngs" :key="index" @click="sendMsg(item)" class="button">发送给{{ item.name || `用户${index}` }}</button>
    </div>
  </main>
</template>

<style lang="less" scoped>
.input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  outline: none;

  &:hover {
    border-color: #36ad6a;
  }

  &:focus {
    border-color: #36ad6a;
    box-shadow: 0 0 5px #36ad6a;
  }
}

.form__item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;

  .label {
    width: 6em;
    text-align: right;
    margin-right: 1em;
  }

  .input {
    flex: 1;
    height: 40px;
  }
}

.button {
  display: inline-block;
  padding: 10px 20px;
  font-weight: bold;
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  border-radius: 4px;
  background-color: #2080f0;
  color: #fff;
  border: none;
  outline: none;
  margin-top: 10px;

  &:hover {
    background-color: #4098fc;;
  }

  &:focus {
    box-shadow: 0 0 5px rgba(52, 144, 220, 0.5);
    background: #4098fc;;
  }

  &:active {
    transform: translateY(1px);
    background: #1060c9;;
  }

  & + & {
    margin-left: 20px;
  }
}


.form__text {
  margin-top: 30px;

  .input {
    height: 30vh;
  }
}
</style>
