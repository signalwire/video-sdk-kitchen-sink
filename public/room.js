let _currentRoom = null
let _currentShare = null
const memberList = new Map()
let myMemberId = null;

/**
 * Connect with Relay creating a client and attaching all the event handler.
 */
window.connect = () => {
  const sfuWrapper = document.getElementById('sfuWrapper')
  const canvasMap = new Map()
  let _allowCanvasDraw = true

  const _deleteCanvas = (member_id) => {
    // destroy canvas and context2d
    let { canvasEl, canvasCtx } = canvasMap.get(member_id)
    canvasCtx = undefined
    canvasEl.parentNode.removeChild(canvasEl)
    canvasMap.delete(member_id)
  }
  const _stopDrawingCanvas = function () {
    _allowCanvasDraw = false
    for (const member_id of canvasMap.keys()) {
      _deleteCanvas(member_id)
    }
  }
  const _startDrawingCanvas = function () {
    const _mcu = document.querySelector('#videoRoot video')
    function updateCanvas() {
      canvasMap.forEach((mapValue) => {
        const { canvasEl, canvasCtx, x, y, width, height } = mapValue
        // calculate size of slice
        // _mcu.videoWidth _mcu.videoHeight
        var computedWidth = _mcu.videoWidth * width / 100;
        var computedHeight = _mcu.videoHeight * height / 100;
        var computedX = _mcu.videoWidth * x / 100;
        var computedY = _mcu.videoHeight * y / 100;
        canvasEl.width = computedWidth
        canvasEl.height = computedHeight
        canvasCtx.drawImage(_mcu, computedX, computedY, computedWidth, computedHeight, 0, 0, computedWidth, computedHeight)
        canvasCtx.restore()
      })
      if (_allowCanvasDraw) {
        setTimeout(function () {
          requestAnimationFrame(updateCanvas)
        }, 1000 / 15)
      }
    }
    updateCanvas()
  }

  SignalWire.Video.createRoomObject({
    token: _swToken,
    rootElementId: 'videoRoot',
    audio: true,
    video: true,
  }).then((roomObject) => {
    _currentRoom = roomObject
    
    console.log('Video SDK _currentRoom', _currentRoom)

    _currentRoom.on('room.started', (params) =>
      console.log('>> DEMO room.started', params)
    )

    _currentRoom.on('room.joined', async (params) => {
      console.log('>> DEMO room.joined', params)
      myMemberId = params.member_id;
      params.room.members.forEach((member) => {
        memberList.set(member.id, member);
      });
      renderMemberList();
      _startDrawingCanvas()
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

    _currentRoom.on('member.updated.audio_muted', (params) =>
      console.log('>> DEMO member.updated.audio_muted', params)
    )
    _currentRoom.on('member.updated.video_muted', (params) =>
      console.log('>> DEMO member.updated.video_muted', params)
    )

    _currentRoom.on('member.left', (params) => {
      console.log('>> DEMO member.left', params);
      memberList.delete(params.member.id);
      renderMemberList();
    })
    _currentRoom.on('layout.changed', (params) => {
      console.log('>> DEMO layout.changed', params)

      const { layout } = params

      const validmember_ids = []
      layout.layers.forEach(({ member_id, x, y, width, height }) => {
        if (member_id) {
          validmember_ids.push(member_id)
          if (!canvasMap.has(member_id)) {
            // build canvas and context2d
            const canvasEl = document.createElement('canvas')
            canvasEl.id = 'canvas_' + member_id
            sfuWrapper.appendChild(canvasEl)
            const canvasCtx = canvasEl.getContext('2d', { alpha: false })
            canvasMap.set(member_id, {
              member_id,
              canvasEl,
              canvasCtx,
              x,
              y,
              width,
              height,
            })
          } else {
            canvasMap.set(member_id, {
              ...canvasMap.get(member_id),
              x,
              y,
              width,
              height,
            })
          }
        }
      })

      Array.from(canvasMap.keys()).forEach((member_id) => {
        if (!validmember_ids.includes(member_id)) {
          _deleteCanvas(member_id)
        }
      })
      
    })
    _currentRoom.on('track', (event) => console.log('>> DEMO track', event))
    _currentRoom.on('destroy', () => {
      _stopDrawingCanvas()
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

async function startSharing() {
  console.log('video', video);
  _currentShare = await _currentRoom.createScreenShareObject()
  document.getElementById('startSharing').style.display = 'none';
  document.getElementById('startSharingAudio').style.display = 'none';
  document.getElementById('stopSharing').style.display = 'block';
}

window.stopSharing = () => {
  _currentShare.hangup();
  _currentShare = null;
  document.getElementById('startSharing').style.display = 'block';
  document.getElementById('startSharingAudio').style.display = 'block';
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
  renderMember(parent, template, memberList.get(myMemberId), ' (me)');
  memberList.forEach((member) => {
    if (member.id != myMemberId) {
      renderMember(parent, template, member)
    }
  }); 
}

window.renderMember = (parent, template, member, extra_name = '') => {
  var clone = template.content.cloneNode(true);
    var item = clone.querySelector('li');
    item.innerText = member.name + extra_name;
    parent.appendChild(clone);
}

window.ready(function () {
  connect();
})