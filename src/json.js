var Json = 
{
  activeRequestCount: 0,
  currentRequest: false
};

Json.Responders = 
{
  responders: [],
  
  _each: function(iterator) 
  {
    this.responders._each(iterator);
  },

  register: function(responder)
  {
    if (!this.include(responder))
      this.responders.push(responder);
  },
  
  unregister: function(responder) 
  {
    this.responders = this.responders.without(responder);
  },
  
  dispatch: function(callback, request, json) 
  {
    this.each(function(responder) {
      if (Object.isFunction(responder[callback])) 
      {
        try
        {
          responder[callback].apply(responder, [request, json]);
        } catch (e) { }
      }
    });
  }
};

Object.extend(Json.Responders, Enumerable);

Json.Responders.register({
  onCreate:   function() 
  {
    Json.activeRequestCount++;
  }, 
  onComplete: function(request,json) 
  {
    Json.activeRequestCount--;
    request.response = json;
  }
});

Object.extend(Json, {
  callback: function(json) {
    try 
    {
      Json.Responders.dispatch('onComplete', Json.currentRequest, json);
      (Json.currentRequest.options.get('onComplete') || Prototype.emptyFunction)(Json.currentRequest, json);
    } 
    catch (e) 
    {
      Json.currentRequest.dispatchException(e);
    }
  }
});

Json.Request = Class.create({
  initialize: function(url, options) {
    this.options = $H({
    }).update($H(options));
    Json.currentRequest = this;
    this.request(url);
  },

  request: function(url) 
  {
    try 
    {
      (this.options.get('onCreate') || Prototype.emptyFunction)(this);
      Json.Responders.dispatch('onCreate', this);
      var head = $$('head')[0];                 
      var script = document.createElement('script');
      script.id = 'json_request';
      script.type = 'text/javascript';
      script.src = url+'&callback=Json.callback'+ '&cachebuster=' + (new Date() * 1)
      head.appendChild(script);
    }
    catch (e)
    {
      this.dispatchException(e);
    }
  },

  dispatchException: function(exception)
    {
    (this.options.get('onException') || Prototype.emptyFunction)(this, exception);
    Json.Responders.dispatch('onException', this, exception);
  }
});
