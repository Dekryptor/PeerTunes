
module.exports = Player

function Player (config) {
	var self = this

	this.$audio = $(config.audio)
	this.$video = $(config.video)

	//init videojs
	this.audioPlayer = videojs(config.audio)
	this.videoPlayer = videojs(config.video)

	this.players = [this.audioPlayer, this.videoPlayer]

	this.player = this.videoPlayer //active player, starting on video is arbitrary

	this.volume = 1 //0-1 scale

	this.startTime = null // start time when song started playing, sent to guests instead of current time in song

	this.$volumeButton = $('#volume-button')
	this.$songProgressBar = $('#song-progress-bar')
	this.$songCurrentTime = $('#song-time-current')

	/*
		currentlyPlaying
		{
			id: {string},
			title: {string},
			source: {string},
			duration: {number} - seconds
		}
	*/
	this.currentlyPlaying = null

	var $videoFrame = $('#video-frame')
	players.forEach(function (player) {
    player.ready(function () {
      // automatically hide/show player when song ends/starts
      player.on('ended', function () {
        $videoFrame.hide()
        player.off('timeupdate')
        //self.updateProgress(0) //doesn't work
      })
      player.on('play', function () {
        $videoFrame.show()
        player.on('timeupdate', function () {
          var ms = this.currentTime()*1000
          //only show hours if current time is >= 1 hour
          var formatString = (this.currentTime() >= 3600) ? 'HH:mm:ss' : 'mm:ss'
          self.$songCurrentTime.text(moment.utc(ms).format(formatString))
          self.updateProgress(this.currentTime()/self.currentlyPlaying.duration)
        })
      })
    })
  })
}

Player.prototype.play = function (data, time) {
	//time in milliseconds, callback on metadata available
	callback = callback.bind(self)

  //call song timeout if it wasn't called already
  //TODO: doesn't work if mp3 joined part way because timeout not set
  self.doSongTimeout()

  this.currentlyPlaying = data
  self.song.meta = meta
  var id = data.id
  var source = data.source
  var duration = data.duration
  console.log('play id: ' + id + ' time: ' + time + ' from source: ' + source)
  console.log('play data: ', data)


  //TODO: make sure all play calls have title, then remove this test
  if (data.title) {
    self.setPlayerTitle(data.title)
  }

  switch (source) {
    case 'YOUTUBE':
      this.playYouTube(data, time)
      break
    case 'MP3':
    	this.playMp3(data, time)
    	break
    default:
      console.log("Can't play unknown media type ", source)
  }

  //TODO: move this to peertunes
  self.rating = 0
  self.vote = 0
}

Player.prototype.end = function () {
	console.log('ending song')
  if (this.player != null) {
    this.player.trigger('ended')
    this.player.pause()
  }
  self.setPlayerTitle('')

  //TODO: move this to event listener?
  self.stopAllHeadBobbing()

}

/**
 * play an mp3 file
 * @param {bool} local - if the mp3 is in localstorage
 */
Player.prototype.playMp3 = function (meta, local) {
	var self = this

  this.player = self.player.audio

  //prevents last cover from showing while new cover loads
  self.setPlayerCover(null)

  this.setVisiblePlayer('audio')

  if (!local) { // is not this user's mp3 => download from peers
    console.log('Song has infoHash, leeching')
    self.removeLastTorrent()
    self.currentTorrentID = data.infoHash

    //TODO: use PeerTunes torrent client
    var tr = self.torrentClient.add(meta.infoHash, function (torrent) {
      var file = torrent.files[0]
      console.log('started downloading file: ', file)
      file.renderTo('#vid2_html5_api') //audio element generated by videojs

      //TODO: setting current time doesn't work- wait until metadata loaded?
      //this.player.currentTime(time / 1000)

      self.player.play()

      //restore volume if player changed
      self.setPlayerVolume(self.volume)

      //if (callback) callback()

      //TODO: fix this hack
      //TODO: this hack doesn't work properly
      var hackDelay = 120
      setTimeout(function(){ self.song.player.currentTime((time+hackDelay) / 1000)}, hackDelay)
    })
    /*
    tr.on('download', function (bytes) {
		  console.log('just downloaded: ' + bytes)
		  console.log('total downloaded: ' + tr.downloaded);
		  console.log('download speed: ' + tr.downloadSpeed)
		  console.log('progress: ' + tr.progress)
		})
    */
    //add cover to player as soon as download is done
    tr.on('warning', function (err) {
      console.log('torrent warning: ', err)
    })
    tr.on('metadata', function () {
      console.log('torrent metadata loaded')
    }.bind(this))
    tr.on('noPeers', function (announceType) {
      console.log('torrent has no peers from source ',announceType)
    })
    tr.on('wire', function (wire) {
      console.log('torrent: connected to new peer')
    })
    tr.on('done', function(){
      console.log('torrent finished downloading');
      var file = tr.files[0].getBlob(function (error, blob) {
        if (error) {
          console.log(error)
          return
        }
        console.log(blob)
        self.tagReader.tagsFromFile(blob, function (tags) {
          self.setPlayerCover(tags.cover)
        })
      })
    })
  } else { // mp3 should be in localStorage
    console.log('Song does not have infoHash, getting from localstorage')
    localforage.getItem(id).then(function (value) {
      // This code runs once the value has been loaded
      // from the offline store.
      var file = new File([value], id, {type: 'audio/mp3', lastModified: Date.now()})

      //TODO: revoke object url
      var url = window.URL.createObjectURL(file)

      //console.log('file: ', file)
      //console.log('file url: ', url)
      self.song.player.src({ type: 'audio/mp3', src: url })
      self.song.player.currentTime(time / 1000) // milliseconds -> seconds
      self.song.player.play()

      //restore volume if player changed
      self.setPlayerVolume(self.volume)

      self.tagReader.tagsFromFile(file, function (tags) {
        self.setPlayerTitle(tags.combinedTitle)
        self.setPlayerCover(tags.cover)
      })


      //TODO: get duration from queue-item instead
      self.song.player.one('loadedmetadata', function () {
        console.log('player mp3 metadata loaded')
        self.song.meta = {
          duration: self.song.player.duration()
        }
        if (callback) callback()
      })
    }).catch(function (err) {
      console.log('Error retrieving mp3: ', err)
    })
  }
}

Player.prototype.playYouTube = function (meta) {
	var id = meta.id
	var time = meta.time

  this.player = this.videoPlayer
  this.player.src({ type: 'video/youtube', src: 'https://www.youtube.com/watch?v=' + id })
  this.player.currentTime(time / 1000) // milliseconds -> seconds
  this.player.play()

  //restore volume if player changed
  self.setPlayerVolume(this.volume)

  this.setVisiblePlayer('video')


  /*
  //TODO: use data.duration/title instead
  YT.getVideoMeta(id, function (meta) {
    console.log('Got YouTube video metadata: ', meta)
    self.song.meta = meta
    self.setPlayerTitle(meta.title)
    if (callback) callback()
  })
	*/
}


Player.prototype.setVisiblePlayer = function (playerId) {
	switch (playerId) {
		case 'video':
				$video.removeClass('hide')
  			$audio.addClass('hide')
			break
		case 'audio':
				$audio.removeClass('hide')
  			$video.addClass('hide')
			break
		default:
			console.log('Error: Cannot set visible player with id ', playerId)
	}
}

//setting uninitialized player volume doesn't work
Player.prototype.setVolume = function (volume) {
	this.volume = volume
	this.players.forEach( function (player) {
    player.volume(volume)
  })

  if (this.volume === 0) {
  	//mute icon
    this.$volumeButton.removeClass('glyphicon-volume-up').addClass('glyphicon-volume-off')
  } else {
  	//sound icon
    this.$volumeButton.removeClass('glyphicon-volume-off').addClass('glyphicon-volume-up')
  }
}

Player.prototype.volume = function () {
	return this.volume
}

//TODO: max length in CSS?
Player.prototype.setPlayerTitle = function (title) {
  var maxLength = 65 
  if (title.length > maxLength) {
    title = title.substring(0, maxLength) + '...'
  }
  $('#song-title').text(title)
}

//cover must be URL, can be blob url
//used for audio player only
Player.prototype.setPlayerCover = function (cover) {
  if (this.player == null) {
    this.player.posterImage.hide()
    return
  }
  this.$audio.find('.vjs-poster').css('background-image','url('+cover+')')
  this.player.posterImage.show()
}


//decimal 0-1 because that's what videojs uses
Player.prototype.updateProgress = function (decimal) {
  var percent = decimal*100 + '%'
  this.$songProgressBar.css('width',percent)
}



this.song = {
    meta: {},
    timeout: null,
    player: null, //videojs player object of current player (video or audio)
    currentlyPlaying: null, // {id, source, infoHash}
    startTime: null, // start time when song started playing, sent to guests instead of current time in song


  }