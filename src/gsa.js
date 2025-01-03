Gsa = Class.create({
  initialize: function(domain, options) {
    if (domain == null)
      throw("'domain' argument required");
    
    this.options = $H({
      output: 'xml_no_dtd',
      proxystylesheet: 'json',
      client: 'json',
      site: 'default_collection',
      start: 0,
      protocol: 'http://',
      port: 80,
      scroll_to: $$('body')[0],
      observe_form: true
    }).update(options);

    this.domain = domain;
    this.protocol = this.options.unset('protocol');
    this.port = this.options.unset('port');
    this.current_page = false;
    this.indicator = this.options.unset('indicator');
    this.scroll_to = this.options.unset('scroll_to');
    this.form_element = $(this.options.unset('form'));
    this.results_element = $(this.options.unset('results'));
    this.observe_form = this.options.unset('observe_form');
    this.summary_template = this.options.unset('summary_template') || "<div class='gsa-prototype-summary'>Results <strong>#{start} - #{end}</strong> of about <strong>#{total}</strong> for <strong>#{query}</strong>. (<strong>#{time}</strong> seconds)</div>";
    this.result_template = this.options.unset('result_template') || "<div class='gsa-prototype-result'><h3><a href='#{url}'>#{title}</a></h3><p>#{snippet}...</p></div>";
    this.pagination_template = this.options.unset('pagination_template') || "<div class='gsa-prototype-pagination'>#{previous_link}#{page_links}#{next_link}</div>";
    this.previous_link_template = this.options.unset('previous_link_template') || "<#{tag} #{link} class='#{klass}' id='page_previous'>&laquo; Previous</#{tag}>";
    this.next_link_template = this.options.unset('next_link_template') || "<#{tag} #{link} class='#{klass}' id='page_next'>Next &raquo;</#{tag}>";
    this.page_link_template = this.options.unset('page_link_template') || "<#{tag} #{link} class='#{klass}' id='page_#{page}'>#{page}</#{tag}>";

    if (this.observe_form && !Object.isUndefined(this.form_element) && !Object.isUndefined(this.results_element)) 
    {
      this.form_element.observe('submit', this.observeFormFunction.bind(this));
    }
  },
  
  _request: function(url)
  {
    this.request = new Json.Request(url, { onComplete: this._response.bind(this) });
    (this.options.get('onSearch') || Prototype.emptyFunction)(this);
    (this.searchOptions.get('onSearch') || Prototype.emptyFunction)(this);
    if(this.indicator) Element.show(this.indicator);
    return this.request;
  },

  _response: function () 
  {
    this.results = new Gsa.Results(this.request.response);
    (this.options.get('onComplete') || Prototype.emptyFunction)(this);
    (this.searchOptions.get('onComplete') || Prototype.emptyFunction)(this);
    if(this.indicator) Element.hide(this.indicator);
    return this.results;
  },
  
  search: function (q, options) 
  {
    if (q == null || q.blank())
      return false;
    this.searchOptions = $H();
    this.searchOptions.update(this.options);
    this.searchOptions.set('q', q);
    this.searchOptions.update(options);
    (this.options.get('beforeSearch') || Prototype.emptyFunction)(this);
    if (!this.options.get('beforeSearch'))
      (this.searchOptions.get('beforeSearch') || Prototype.emptyFunction)(this);
    this.current_page = 1;
    this._request(this.buildUri());
    return true;
  },
  
  page: function(page) 
  {
    if (!Object.isUndefined(this.searchOptions)) 
    {
      var num = 10;
      if (!Object.isUndefined(this.searchOptions.get('num')))
        num = this.searchOptions.get('num');
      this.searchOptions.set('start', ((page-1)*num));
      this.searchOptions.update({start: this.searchOptions.get('start')});
      this.current_page = page;
      this._request(this.buildUri());
      return true;
    }
    else 
    {
      return false;
    }
  },
  
  next: function () 
  {
    if (Object.isNumber(this.current_page)) 
    {
      return this.page(this.current_page+1);
    } 
    else 
    {
      return false;
    }
  },
 
  previous: function () 
  {
    if (Object.isNumber(this.current_page) && this.current_page > 1) 
    {
      return this.page(this.current_page-1);
    } 
    else 
    {
      return false;
    }
  },
  
  parseOptions: function (options)
  {
    var options = $H(options);
    if (!Object.isUndefined(options.get('sort')))
    {
      var sort = options.get('sort');
      if (Object.isString(sort)) 
      {
        options.set('sort',('date:' + sort.replace('date:','')));
      } 
      else if (Object.isHash($H(sort))) 
      {
        try 
        {
          sort = $H(sort);
          var mode = (sort.get('mode') == 'date') ? 'S' : 'L';
          var direction = (sort.get('direction') == 'ascending') ? 'A' : 'D';
          options.set('sort','date:'+direction+':'+mode+':d1');
        } 
        catch (e) 
        {
          options.set('sort','date:D:L:d1');
        }
      }
    }
    
    if (!Object.isUndefined(options.get('getfields')))
    {
      var getfields = options.get('getfields');
      if (!Object.isString(getfields) && Object.isArray(getfields))
      {
        options.set('getfields', getfields.join('.'));
      }
    }

    if (!Object.isUndefined(options.get('requiredfields')))
    {
      var requiredfields = $H(options.get('requiredfields'));
      if (Object.isHash(requiredfields)) 
      {
        options.set('requiredfields', this.toFieldValues(requiredfields.get('fields'), requiredfields.get('mode')));
      }
    }

    if (!Object.isUndefined(options.get('partialfields')))
    {
      var partialfields = $H(options.get('partialfields'));
      if (Object.isHash(partialfields)) 
      {
        options.set('partialfields', this.toFieldValues(partialfields.get('fields'), partialfields.get('mode')));
      }
    }
    return options;
  },
  
  buildUri: function ()
  {
    var uriOptions = this.searchOptions.clone();
    uriOptions.unset('beforeSearch');
    uriOptions.unset('onSearch');
    uriOptions.unset('onComplete');
    if (uriOptions.get('start') == 0)
      uriOptions.unset('start');
    var uriString = this.protocol + this.domain + '/search?' + this.parseOptions(uriOptions).toQueryString();
    return uriString;
  },
  
  buildPaginationHTML: function () {
    var html = {
      previous_link: '',
      page_links: '',
      next_link: ''
    }
    if (this.results.get('has_previous')) 
    {
      html.previous_link = new String(this.previous_link_template).interpolate({tag: 'a', link: "href='#previous'"});
    }
    else 
    {
      html.previous_link = new String(this.previous_link_template).interpolate({tag: 'span', link: '', klass: "disabled"});
    }
    if (this.results.get('has_next')) 
    {
      html.next_link = new String(this.next_link_template).interpolate({tag: 'a', link: "href='#next'"});
    } 
    else 
    {
      html.next_link = new String(this.next_link_template).interpolate({tag: 'span', link: '', klass: "disabled"});
    }

    return Builder.build(new String(this.pagination_template).interpolate(html));
  },
  
  toFieldValues: function (hash, mode) 
  {
    hash = $H(hash);
    var joinstring;
    if (mode == 'OR') 
    {
      joinstring = '|';
    } 
    else 
    {
      joinstring = '.';
    }
    return hash.map(function (pair){
      var key = pair.key, value = pair.value;
      if (Object.isArray(value)) {
        return value.map(function (a) {
          return key + ':' + a;
        }).join(joinstring);
      } 
      else 
      {
        return key + ':' + value; 
      }
    }).join(joinstring);
  },

  observeFormFunction: function(event)
  {
    var form = Event.element(event);
    var hash = $H(form.serialize(true));
    this.search(hash.unset('q'), hash.update({ onComplete: this.observeFormOnComplete }));
    Event.stop(event);
  },

  observeFormOnComplete: function(gsa) 
  {
    Element.update(gsa.results_element);
    Element.insert(gsa.results_element, Builder.build(new String(gsa.summary_template).interpolate(gsa.results)));
    gsa.results.each(function (result, index) {
      Element.insert(gsa.results_element, Builder.build(new String(gsa.result_template).interpolate(result)));
    });
    Element.insert(gsa.results_element, gsa.buildPaginationHTML());
    $$('a.page_link').each(function(link) {
      link.observe('click', function(event) {
        gsa.scroll_to.scrollTo();
        var page_link = Event.element(event);
        gsa.page(page_link.innerHTML);
        Event.stop(event);
      })
    });
    $$('a#page_next').each(function(link) {
       link.observe('click', function(event) {
         gsa.scroll_to.scrollTo();
         gsa.next();
         Event.stop(event);
       })
     });
     $$('a#page_previous').each(function(link) {
        link.observe('click', function(event) {
          gsa.scroll_to.scrollTo();
          gsa.previous();
          Event.stop(event);
        })
      });
      gsa.scroll_to.scrollTo();
  }
});
