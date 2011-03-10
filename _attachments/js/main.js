(function() {
  var __bind = function(func, context) {
    return function(){ return func.apply(context, arguments); };
  }, __hasProp = Object.prototype.hasOwnProperty;
  window.Views = (typeof window.Views !== "undefined" && window.Views !== null) ? window.Views : {};
  window.Models = (typeof window.Models !== "undefined" && window.Models !== null) ? window.Models : {};
  window.Collections = (typeof window.Collections !== "undefined" && window.Collections !== null) ? window.Collections : {};
  Models.Subscription = Backbone.Model.extend({
    couch: {
      db: 'subscriptions',
      ddoc: 'subscriptions'
    },
    defaults: {
      throttle: {}
    },
    validateEmail: __bind(function(email) {
      var re;
      re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return email.match(re);
    }, this),
    loadCookie: function() {
      var throttle;
      throttle = $.cookie('throttle');
      if (throttle) {
        this.set({
          throttle: JSON.parse(throttle)
        });
        return this.trigger('change:throttle', this);
      }
    }
  });
  Views.Subscription = Backbone.View.extend({
    initialize: function(options) {
      if (options.feeds) {
        this.feeds = options.feeds;
      }
      this.feeds.collection.bind('refresh', __bind(function(collection) {
        var throttles;
        throttles = {};
        collection.each(__bind(function(feed) {
          throttles[feed.get('title')] = this.model.attributes.throttle[feed.get('title')] || 'normal';
          feed.view.bind('throttle', __bind(function(throttle) {
            this.model.attributes.throttle[feed.get('title')] = throttle;
            return this.model.trigger('change:throttle', this.model);
          }, this));
          this.model.bind('change:throttle', __bind(function(model) {
            var inputs, throttle;
            throttle = model.attributes.throttle[feed.get('title')];
            return (inputs = feed.view.$('input:radio').val([("throttle-" + (throttle))]));
          }, this));
          return feed.bind('change', __bind(function(feed) {
            var inputs, throttle;
            throttle = this.model.attributes.throttle[feed.get('title')];
            return (inputs = feed.view.$('input:radio').val([("throttle-" + (throttle))]));
          }, this));
        }, this));
        this.model.set({
          throttle: throttles
        });
        return this.model.trigger('change:throttle', this.model);
      }, this));
      this.el.append($('<button>Generate RSS feed</button>').click(__bind(function() {
        return this.trigger('subscribe:rss');
      }, this)));
      this.el.append($("<div id='subscribe-email'/>").append($("<button>Subscribe via email:</button>").click(__bind(function() {
        return this.trigger('subscribe:email');
      }, this))).append($("<input id='email' type='text' />").change(__bind(function(e) {
        return (this.model.id = e.target.value);
      }, this))));
      this.el.append($("<div class='error' />"));
      this.bind('subscribe:email', __bind(function() {
        this.$('.error').hide();
        return this.model.save({
          _id: this.model.id
        }, {
          success: __bind(function(m, r) {
            return this.$('#subscribe-email').text("Subscribed! [Share]");
          }, this),
          error: __bind(function(m, r) {
            if (r.forbidden) {
              this.$('.error').show().text(r.forbidden.email);
            }
            return r.conflict ? this.$('.error').show().text("This email is already subscribed. Check your email for instructions on how to edit your feed settings.") : null;
          }, this)
        });
      }, this));
      this.bind('subscribe:rss', __bind(function() {
        var _i, _ref, _result, feed, params;
        params = (function() {
          _result = []; _ref = this.model.get('throttle');
          for (feed in _ref) {
            if (!__hasProp.call(_ref, feed)) continue;
            _i = _ref[feed];
            _result.push("" + (feed) + "=" + (this.model.attributes.throttle[feed]));
          }
          return _result;
        }).call(this).join('&');
        return (window.location = ("/rss?" + (params)));
      }, this));
      return this.model.bind('change:throttle', __bind(function(model) {
        return $.cookie('throttle', JSON.stringify(model.get('throttle')));
      }, this));
    }
  });
  Models.Item = Backbone.Model.extend();
  Collections.Items = Backbone.Collection.extend({
    couch: {
      db: 'shallownews',
      ddoc: 'shallownews',
      view: 'current-items'
    },
    initialize: function(options) {
      return options.feed ? (this.couch.key = options.feed) : null;
    }
  });
  Views.Item = Backbone.View.extend({
    initialize: function() {
      return this.model.bind('change', _(this.render).bind(this));
    },
    template: _.template("\
<p><%= attributes.content %></p>\
<span class='contributor'>Contributor: <%= attributes.contributor ? attributes.contributor.display : 'Anonymous' %></span>\
	 <div class='morelink'><a href='<%= attributes.moreurl %>'>Read more</a></div>\
"),
    render: function() {
      this.el.html(this.template(this.model));
      return this;
    }
  });
  Models.Feed = Backbone.Model.extend({
    items: null,
    initialize: function() {
      this.items = new Collections.Items({
        feed: this.get('title')
      });
      this.items.fetch();
      return this.items.bind('refresh', __bind(function() {
        return this.change();
      }, this));
    },
    item: function() {
      if (this.items) {
        return this.items.first();
      }
    }
  });
  Collections.Feeds = Backbone.Collection.extend({
    model: Models.Feed,
    couch: {
      db: 'shallownews',
      ddoc: 'shallownews',
      view: 'feeds'
    }
  });
  Views.Feed = Backbone.View.extend({
    initialize: function() {
      this.el = $("<div class='feed' />");
      this.model.bind('change', _(this.render).bind(this));
      return this.model.items.bind('refresh', __bind(function(items) {
        return items.each(__bind(function(item) {
          var itemview, throttle;
          console.log(item);
          itemview = new Views.Item({
            el: $("<div class='item' />"),
            model: item
          });
          this.$('.items').append(itemview.render().el);
          throttle = __bind(function(throttle) {
            var _ref;
            itemview.el.show();
            switch (throttle) {
              case 'normal':
                if (!(('none' === (_ref = itemview.model.get('speed')) || 'less' === _ref || 'normal' === _ref))) {
                  return itemview.el.hide();
                }
                break;
              case 'less':
                if (!(('less' === (_ref = itemview.model.get('speed')) || 'none' === _ref))) {
                  return itemview.el.hide();
                }
                break;
              case 'none':
                if (itemview.model.get('speed') !== 'none') {
                  return itemview.el.hide();
                }
                break;
            }
          }, this);
          this.bind('throttle', throttle);
          return throttle(Sub.model.attributes.throttle[this.model.get('title')]);
        }, this));
      }, this));
    },
    template: _.template("\
<div class='feed-name'><%= attributes.title %></div>\
<div class='throttle' />\
<div class='items'>\
</div>"),
    render: function() {
      this.el.html(this.template(this.model));
      _.each(['none', 'less', 'normal', 'full'], __bind(function(throttle) {
        return this.$('.throttle').append($("<input type='radio' class='throttle-" + (throttle) + "' value='throttle-" + (throttle) + "' name='throttle-" + (this.model.get('title')) + "' />").click(__bind(function() {
          return this.trigger('throttle', throttle);
        }, this)));
      }, this));
      return this;
    }
  });
  Views.Feeds = Backbone.View.extend({
    initialize: function() {
      this.collection.bind('refresh', _(this.render).bind(this));
      return this.collection.fetch();
    },
    render: function() {
      this.el.empty();
      return this.collection.each(__bind(function(feed) {
        feed.view = new Views.Feed({
          model: feed
        });
        return this.el.append(feed.view.render().el);
      }, this));
    }
  });
  window.FeedsList = new Views.Feeds({
    collection: new Collections.Feeds(),
    el: $('#feeds')
  });
  window.Sub = new Views.Subscription({
    el: $('#subscribe'),
    model: new Models.Subscription(),
    feeds: FeedsList
  });
  Sub.model.loadCookie();
}).call(this);
