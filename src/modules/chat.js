// Chat

module.exports = (function () {
  var config = {
    maxMessageLength: 300
  }
  //private
  var chatBody, chatInput, chatEnterButton
  var onSubmitSuccess
  var nickname

  function emojify ( msg ) {
    // replace common ascii emoticons with shortnames
    msg = msg.replace(/:\)/g, ':smile:')
    msg = msg.replace(/:D/g, ':grin:')
    msg = msg.replace(/<3/g, ':heart:')

    // convert emoji shortnames to image tags
    msg = emojione.shortnameToImage(msg)

    return msg
  }

  function filter ( msg ) {
    // truncate
    if (msg.length > config.maxMessageLength) {
      msg = msg.substring(0, PT.config.maxChatLength)
    }
    // strip html
    msg = $('<p>').html(msg).text()

    return msg
  }

  function isScrolledToBottom () {
    return (chatBody.scrollHeight - chatBody.offsetHeight - chatBody.scrollTop < 1)
  }

  function scrollToBottom() {
    var height = chatBody.scrollHeight
    chatBody.scrollTop(height)
  }

  function clearInput () {
    chatInput.val('')
  }

  function submitMessage () {
    var text = chatInput.val()

    text = filter(text)

    if (text.trim().length > 0) {
      if (onSubmitSuccess) onSubmitSuccess(text)
      //TODO: username not accessible
      appendMsg(nickname, text)
      clearInput()
      scrollToBottom()
    }
  }

  function appendMsg(id, msg) {
    // order important
    msg = filter(msg)
    console.log('chat: [' + id + ' : ' + msg + ']')
    var emojiMsg = emojify(msg)

    // TODO: use template
    chatBody.append(
      '<div class="message">'
      + '<div class="message-user"><h6>' + id + ':</h6></div>'
      + '<div class="message-text">' + emojiMsg + '</div>'
      + '</div>'
    )

    //return filtered message for convenience
    return msg
  }

  //public
  return {
      //setters
      setInput: function ( selector ) {
        chatInput = $(selector)
      },
      setBody: function ( selector ) {
        chatBody = $(selector)
      },
      setEnterButton: function ( selector ) {
        chatEnterButton = $(selector)
      },
      setNickname: function ( name ) {
        nickname = name
      },

      //getters
      getInputText: function () {
        return chatInput.val()
      },
      init: function () {
        console.log('Initializing chat')
        //click handlers
        chatEnterButton.click(function (e) {
          //TODO: broadcast message too
          submitMessage()
        })

        //key listeners
        var ENTER_KEY = 13

        chatInput.keydown(function (e) {
          if (e.keyCode == ENTER_KEY) {
            submitMessage()
          }
        })
      },
      //simple events
      onSubmitSuccess: function ( callback ) {
        onSubmitSuccess = callback
      },
      appendMsg: function (id, msg) {
        // order important
        msg = filter(msg)
        console.log('chat: [' + id + ' : ' + msg + ']')
        var emojiMsg = emojify(msg)

        // TODO: use template
        chatBody.append(
          '<div class="message">'
          + '<div class="message-user"><h6>' + id + ':</h6></div>'
          + '<div class="message-text">' + emojiMsg + '</div>'
          + '</div>'
        )

        //return filtered message for convenience
        return msg
      },
      submitMessage: submitMessage,
      clear: function () {
        chatBody.html('')
      },
      clearInput: clearInput,
      scrollToBottom: scrollToBottom,
      filter: filter,
      isScrolledToBottom: isScrolledToBottom
    }
}())