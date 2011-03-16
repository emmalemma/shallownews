window.Views ?= {}
window.Models ?= {}
window.Collections ?= {}

Models.Subscription = Backbone.Model.extend
	couch:
		db: 'subscriptions'
		ddoc: 'subscriptions'
		
	defaults:
		throttle: {}
		
	validateEmail: (email)=>
		re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/ 
		email.match re
		
	loadCookie:->
		throttle = $.cookie 'throttle'
		if throttle
			@set throttle: JSON.parse throttle
			@trigger 'change:throttle', @
		
Views.Subscription = Backbone.View.extend
	initialize:(options)->
		if options.feeds
			@feeds = options.feeds
			
		@feeds.collection.bind 'refresh', (collection)=>
			throttles = {}
			collection.each (feed)=>
				throttles[feed.get 'title'] = @model.attributes.throttle[feed.get 'title'] or 'normal'
				
				feed.view.bind 'throttle', (throttle)=>
					@model.attributes.throttle[feed.get 'title'] = throttle
					@model.trigger 'change:throttle', @model
				
				@model.bind 'change:throttle', (model)=>
					throttle = model.attributes.throttle[feed.get 'title']
					inputs = feed.view.$('input:radio').val(["throttle-#{throttle}"])
					
				feed.bind 'change', (feed)=>
					throttle = @model.attributes.throttle[feed.get 'title']
					inputs = feed.view.$('input:radio').val(["throttle-#{throttle}"])
					
					
			@model.set throttle: throttles
			@model.trigger 'change:throttle', @model
		
		@el.append $('<button>Generate RSS feed</button>').click(()=>@trigger 'subscribe:rss')
		@el.append $("<div id='subscribe-email'/>")
			.append($("<button>Subscribe via email:</button>").click(()=>@trigger 'subscribe:email'))
			.append($("<input id='email' type='text' />").change((e)=>@model.id = e.target.value))
		
		@el.append($("<div class='error' />"))
			
		@bind 'subscribe:email', ()=>
			@$('.error').hide()
			@model.save {_id: @model.id},
				success:(m,r)=>
					@$('#subscribe-email').text "Subscribed! [Share]"
				error:(m,r)=>
					if r.forbidden
						@$('.error').show().text r.forbidden.email
					if r.conflict
						@$('.error').show().text "This email is already subscribed. Check your email for instructions on how to edit your feed settings."
						
						
		@bind 'subscribe:rss', ()=>
			params = ("#{feed}=#{@model.attributes.throttle[feed]}" for feed of @model.get 'throttle').join('&')
			window.location = "/rss?#{params}"
			
		@model.bind 'change:throttle', (model)=>
												$.cookie 'throttle', JSON.stringify(model.get('throttle'))

Models.Item = Backbone.Model.extend()
Collections.Items = Backbone.Collection.extend
	couch:
		db: 'shallownews'
		ddoc: 'shallownews'
		view: 'current-items'
		
	initialize:(options)->
		if options.feed
			@couch.key = options.feed
			
Views.Item = Backbone.View.extend
	initialize:->
		@model.bind 'change', _(@render).bind(@)
		
	template: _.template "
<p><%= attributes.content %></p>
<span class='contributor'>Contributor: <%= attributes.contributor ? attributes.contributor.display : 'Anonymous' %></span>
	 <div class='morelink'><a href='<%= attributes.moreurl %>'>Read more</a></div>
"
	render:->
		@el.html @template(@model)
		@

Models.Feed = Backbone.Model.extend
	items: null
	initialize:->
		@items = new Collections.Items feed: @get 'title' 
		@items.fetch()
		@items.bind 'refresh', =>@change()
		
	item:->
		@items.first() if @items

Collections.Feeds = Backbone.Collection.extend
	model: Models.Feed
	couch:
		db: 'shallownews'
		ddoc: 'shallownews'
		view: 'feeds'

Views.Feed = Backbone.View.extend
	initialize:->
		@el = $("<div class='feed' />")
		@el.addClass @model.get 'title'
		@model.bind 'change', _(@render).bind(@)
		
		@model.items.bind 'refresh', (items)=>
			items.each (item)=>
				console.log item
				itemview = new Views.Item el: $("<div class='item' />"), model: item
				
				@$('.items').append itemview.render().el
				
				throttle=(throttle)=>
					itemview.el.show()
					switch throttle
						when 'normal'
							itemview.el.hide() unless itemview.model.get('speed') in ['none', 'less', 'normal']	
						when 'less'                                       
							itemview.el.hide() unless itemview.model.get('speed') in ['less', 'none']
						when 'none'                                       
							itemview.el.hide() unless itemview.model.get('speed') == 'none'
				
				@bind 'throttle', throttle
				throttle(Sub.model.attributes.throttle[@model.get 'title'])
		
	template: _.template "
<div class='feed-name'><%= attributes.title %></div>
<div class='throttle' />
<div class='items'>
</div>"
	render:->
		@el.html @template(@model)
		
		_.each ['none','less','normal','full'], (throttle) =>
			@$('.throttle').append $("<input type='radio' class='throttle-#{throttle}' value='throttle-#{throttle}' name='throttle-#{@model.get 'title'}' />")
										.click ()=> @trigger 'throttle', throttle
		this
		

Views.Feeds = Backbone.View.extend
		
	initialize:->
		@collection.bind 'refresh', _(@render).bind(@)
		@collection.fetch()
		
	render:->
		@el.empty()
		@collection.each (feed)=>
			feed.view = new Views.Feed model: feed
			@el.append feed.view.render().el


window.FeedsList = new Views.Feeds collection: new Collections.Feeds, el: $('#feeds')
window.Sub = new Views.Subscription el: $('#subscribe'), model: new Models.Subscription, feeds: FeedsList
Sub.model.loadCookie()
