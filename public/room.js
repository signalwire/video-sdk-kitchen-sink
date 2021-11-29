let _currentRoom = null
let _currentShare = null
const memberList = new Map()
let myMemberId = null;

let audioActive = true;
let videoActive = true;

/**
 * Connect with Relay creating a client and attaching all the event handler.
 */
window.connect = () => {
  SignalWire.Video.createRoomObject({
    token: _swToken,
    rootElementId: 'videoRoot',
    audio: true,
    video: true,
  }).then((roomObject) => {
    _currentRoom = roomObject

    _currentRoom.on('room.started', (params) =>
      console.log('>> DEMO room.started', params)
    )

    _currentRoom.on('room.joined', async (params) => {
      console.log('>> DEMO room.joined', params)
      myMemberId = params.member_id;
      populateLayout();
      params.room.members.forEach((member) => {
        memberList.set(member.id, member);
      });
      renderMemberList();
    })

    _currentRoom.on('room.updated', (params) =>
      console.log('>> DEMO room.updated', params)
    )
    _currentRoom.on('room.ended', (params) => {
      console.log('>> DEMO room.ended', params)
      hangup()
    })
    _currentRoom.on('member.joined', (params) => {
      console.log('>> DEMO member.joined', params);
      memberList.set(params.member.id, params.member);
      renderMemberList();
    })
    _currentRoom.on('member.updated', (params) =>
      console.log('>> DEMO global member.updated', params)
    )

    _currentRoom.on('member.updated.audio_muted', (params) => {
      console.log('>> DEMO member.updated.audio_muted', params);
    })
    _currentRoom.on('member.updated.video_muted', (params) =>
      console.log('>> DEMO member.updated.video_muted', params)
    )

    _currentRoom.on('member.left', (params) => {
      console.log('>> DEMO member.left', params);
      memberList.delete(params.member.id);
      renderMemberList();
    })
    _currentRoom.on('layout.changed', (params) => {
      console.log('>> DEMO layout.changed', params);
      setSelected('layoutPicker', params.layout.name);
    })

    _currentRoom.on('track', (event) => console.log('>> DEMO track', event))
    _currentRoom.on('destroy', () => {
    })

    _currentRoom
      .join()
      .then((result) => {
        console.log('>> Room Joined', result)
      })
      .catch((error) => {
        console.error('Join error?', error)
      })
  })
}

/**
 * Hangup the _currentRoom if present
 */
window.hangup = () => {
  if (_currentRoom) {
    _currentRoom.hangup()
  }
}


// jQuery document.ready equivalent
window.ready = (callback) => {
  if (document.readyState != 'loading') {
    callback()
  } else if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', callback)
  } else {
    document.attachEvent('onreadystatechange', function () {
      if (document.readyState != 'loading') {
        callback()
      }
    })
  }
}

window.muteSelf = () => {
  _currentRoom.audioMute(_currentRoom.member_id)
}

window.unmuteSelf = () => {
  _currentRoom.audioUnmute(_currentRoom.member_id)
}

window.muteVideoSelf = () => {
  _currentRoom.videoMute(_currentRoom.member_id)
}

window.unmuteVideoSelf = () => {
  _currentRoom.videoUnmute(_currentRoom.member_id)
}

async function listDevices() {
  var devices = await SignalWire.WebRTC.getDevicesWithPermissions();
  devices.forEach((device) => {
    var opt = document.createElement('option');
    opt.value = device.deviceId;
    opt.innerHTML = device.label;
    document.getElementById(device.kind).appendChild(opt);
  });
}

function setInput() {
  var audioInput = document.getElementById('audioinput').value;
  _currentRoom.updateMicrophone({ deviceId: audioInput });
  var videoInput = document.getElementById('videoinput').value;
  _currentRoom.updateCamera({ deviceId: videoInput });
}

function setOutput() {
  var audioOutput = document.getElementById('audiooutput').value;
  _currentRoom.updateSpeaker({ deviceId: audioOutput });
}

async function startSharing() {
  _currentShare = await _currentRoom.createScreenShareObject()
  document.getElementById('startSharing').style.display = 'none';
  document.getElementById('stopSharing').style.display = 'inline-block';
}

async function hangupCall() {
  await _currentRoom.leave();
  window.location.href = "/";
}

async function populateLayout() {
  const layoutList = await _currentRoom.getLayouts();

  layoutList.layouts.forEach((layout) => {
    var opt = document.createElement('option');
    opt.value = layout;
    opt.innerHTML = layout;
    document.getElementById('layoutPicker').appendChild(opt);
  });

  setSelected('layoutPicker', "2x1")
}

function setSelected(select_id, value) {
  // document.querySelector('#' + select_id + ' [value="' + value + '"]').selected = true;
}

function toggleMute() {
  if (audioActive) {
    document.getElementById('toggleMute').innerText = 'Unmute';
    muteSelf();
    audioActive = false;
  } else {
    document.getElementById('toggleMute').innerText = 'Mute';
    unmuteSelf();
    audioActive = true;
  }
}

function toggleVideoMute() {
  if (videoActive) {
    document.getElementById('toggleVideoMute').innerText = 'Start Video';
    muteVideoSelf();
    videoActive = false;
  } else {
    document.getElementById('toggleVideoMute').innerText = 'Stop Video';
    unmuteVideoSelf();
    videoActive = true;
  }
}

async function setLayout() {
  const name = document.getElementById('layoutPicker').value
  await _currentRoom.setLayout({ name });
}

async function setMicrophoneVolume() {
  var val = document.getElementById('inputVolume').value;
  document.getElementById('inputVolumeDisplay').innerText = val;
  await _currentRoom.setMicrophoneVolume({ volume: val });
}

async function setSpeakerVolume() {
  var val = document.getElementById('outputVolume').value;
  document.getElementById('outputVolumeDisplay').innerText = val;
  await _currentRoom.setSpeakerVolume({ volume: val });
}

async function setInputSensitivity() {
  var val = document.getElementById('inputSensitivity').value;
  await _currentRoom.setInputSensitivity({ value: val });
}

window.stopSharing = () => {
  _currentShare.hangup();
  _currentShare = null;
  document.getElementById('startSharing').style.display = 'inline-block';
  document.getElementById('stopSharing').style.display = 'none';
}

window.renderMemberList = () => {
  console.log('MEMBER LIST', memberList);
  var parent = document.querySelector('#participantList');

  // remove all members properly
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }

  var template = document.querySelector('#participantTpl');
  renderMember(parent, template, memberList.get(myMemberId), true);
  memberList.forEach((member) => {
    if (member.id != myMemberId) {
      renderMember(parent, template, member)
    }
  }); 
}

window.renderMember = (parent, template, member, its_me) => {
  if (member) {
    var clone = template.content.cloneNode(true);
    var item = clone.querySelector('li');
    item.dataset.id = member.id
    if (its_me) {
      item.querySelector('.participantName').innerText = member.name + '(me)';
      var elem = item.querySelector('.participantControls');
      elem.parentNode.removeChild(elem);
    } else {
      item.querySelector('.participantName').innerText = member.name
    }
    parent.appendChild(clone);
  }
}

async function kickParticipant(e) {
  var id = e.closest("li").dataset.id;
  await _currentRoom.removeMember({ memberId: id });
}

window.ready(function () {
  connect();
  listDevices();
})