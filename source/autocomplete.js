$.template("mentions/menu", '<div class="mentions-autocomplete" data-mentions-autocomplete><div class="mentions-autocomplete-inner" data-mentions-autocomplete-viewport><div class="mentions-autocomplete-loading" data-mentions-autocomplete-loading></div><div class="mentions-autocomplete-empty" data-mentions-autocomplete-empty></div><ul class="mentions-menu" data-mentions-menu></ul></div></div>');
$.template("mentions/menuItem", '<li class="mentions-menuItem" data-mentions-menuItem>[%== html %]</li>');
$.template("mentions/loadingHint", '<i class="mentions-autocomplete-loading-indicator"></i>');
$.template("mentions/emptyHint", '<span class="mentions-autocomplete-empty-text">No items found.</span>');
/*
<div class="mentions-autocomplete" data-mentions-autocomplete>
	<div class="mentions-autocomplete-inner" data-mentions-autocomplete-viewport>
		<div class="mentions-autocomplete-loading" data-mentions-autocomplete-loading></div>
		<div class="mentions-autocomplete-empty" data-mentions-autocomplete-empty></div>
		<ul class="mentions-menu" data-mentions-menu></ul>
	</div>
</div>
*/

$.Controller("Mentions.Autocomplete",
{
    defaultOptions: {

		view: {
			menu: "mentions/menu",
			menuItem: "mentions/menuItem",
			loadingHint: "mentions/loadingHint",
			emptyHint: "mentions/emptyHint"
		},

		// This is the default query options
		// applied to all triggers unless
		// trigger override them.
		query: {
			data: null,
			cache: true,
			minLength: 1,
			limit: 10,
			highlight: true,
			caseSensitive: false,
			exclusive: false,
			loadingHint: false,
			emptyHint: false
		},

		position: {
			my: 'left top',
			at: 'left bottom',
			collision: 'none'
		}
    }
},
function(self){ return {

    init: function() {

		// Destroy controller
		if (!self.element.data(self.Class.fullName)) {

			self.destroy();

			// And reimplement on the context menu we created ourselves
			self.view.menu()
				.appendTo("body")
				.data(self.Class.fullName, true)
				.addController(self.Class, self.options);

			return;
		}

		var mentions = self.mentions;

		mentions.autocomplete = self;
		mentions.pluginInstances["autocomplete"] = self;

		// Set the position to be relative to the mentions
		self.options.position.of = self.mentions.element;

		// Loading hint
		self.view.loadingHint()
			.appendTo(self.loadingHint());

		// Empty hint
		self.view.emptyHint()
			.appendTo(self.emptyHint());

		// Only reattach element when autocomplete is needed.
		self.element.detach();
    },

	setLayout: function() {

		if (!self.hidden) {

			self.element
				.css({
					opacity: 1,
					width: self.mentions.element.outerWidth()
				})
				.position(self.options.position);
		}
	},

	"{window} resize": $.debounce(function() {
		self.element.css("opacity", 0);
		self.setLayout();
	}, 250),

	"{window} scroll": $.debounce(function() {
		self.element.css("opacity", 0);
		self.setLayout();
	}, 250),

	"{window} dialogTransitionStart": function() {
		self.hidden = true;
		self.element.css("opacity", 0);
	},

	"{window} dialogTransitionEnd": function() {
		self.hidden = false;
		self.setLayout();
	},

    "{self} triggerCreate": function(el, event, marker, trigger, content) {

    	self.populate(marker, trigger, content);
    },

    "{self} triggerChange": function(el, event, marker, spawn, trigger) {

    	self.populate(marker, trigger, marker.text.nodeValue);
    },

    "{self} triggerDestroy": function(el, event, marker) {

    },

	show: function() {

		clearTimeout(self.sleep);

		self.element
			.appendTo("body")
			.show();

		self.hidden = false;

		self.setLayout();
	},

	hide: function() {

		self.element.hide();

		var menuItem = self.menuItem(),
			activeMenuItem = menuItem.filter(".active");

		if (activeMenuItem.length > 0) {
			self.lastItem = {
				// keyword: $.trim(self.textboxlist.textField().val()),
				keyword: "", // TODO: Port this
				item   : activeMenuItem.data("item")
			};
		}

		menuItem.removeClass("active");

		self.render.reset();

		self.hidden = true;

		// Clear any previous sleep timer first
		clearTimeout(self.sleep);

		// If no activity within 3000 seconds, detach myself.
		self.sleep = setTimeout(function(){
			self.element.detach();
		}, 3000);
	},

	query: function(options) {

		if (!query) return;

		// If options passed in is not an object
		var query = $.extend(
				{},
				self.options.query,
				$.isPlainObject(options) ? 
					{data: options} : 
					options
			),
			data = query.data;

		// Query URL
		if ($.isUrl(data)) {
			var url = data;
			query.lookup = function() {
				return $.ajax(url + query.keyword);
			}
		}

		// Query function
		if ($.isFunction(data)) {
			var func = data;
			query.lookup = function() {
				return func.call(self, query.keyword);
			}
		}

		// Query dataset	
		if ($.isArray(data)) {

			var dataset = data;
			query.lookup = function() {

				var task = $.Deferred(),
					keyword = query.keyword.toLowerCase();

				// Fork this process
				// so it won't choke on large dataset.
				setTimeout(function(){
					var result = $.grep(dataset, function(item){
						return item.title.toLowerCase().indexOf(keyword) > -1;
					});
					task.resolve(result);
				}, 0);

				return task;
			}
		}

		return query;
	},

	tasks: {},

	delayTask: null,

	populated: false,

	populate: function(marker, trigger, keyword) {

		// Create query object
		var query = self.query(trigger.query),
			lastQuery = self.lastQuery;

		if (!query) return;

		self.populated = false;

		// Store data in query
		query.keyword = keyword;
		query.trigger = trigger;
		query.marker  = marker;

		// Trigger queryPrepare event
		// for event handlers to modify the query object.
		self.trigger("queryPrepare", [query]);

		// Create a query id for this task based on the keyword
		// and retrieve existing query task for this keyword.
		var id    = query.id = trigger.key + "|" + (query.caseSensitive) ? keyword : keyword.toLowerCase(),
			tasks = self.tasks,
			task  = tasks[id];

			// Determine if this is a new or existing query task
			// If query caching is disabled, it will always be a new task.
			newTask = !$.isDeferred(task) || !query.cache,

			// This function runs the query task
			// We wrap it in a function because we may
			// want to debounce running of this task.
			runTask = function(){

				// Trigger keywordBeforeQuery event
				// If the event was prevented, don't query the keyword.
				var event = self.trigger("queryBeforeStart", [query]);
				if (event.isDefaultPrevented()) return;

				// Query the keyword if:
				// - The query hasn't been made.
				// - The query has been rejected.
				if (newTask || (!newTask && task.state()=="rejected")) {
					task = tasks[id] = query.task = query.lookup();
				}

				// When query lookup is done, render items;
				task.done(
					self.render(function(items){
						return [items, query];
					})
				);

				// Trigger query event
				self.trigger("queryStart", [query]);
			};

		// If this is a new query task
		// Don't run until we are sure that user has finished typing
		if (newTask) {

			clearTimeout(self.delayTask);
			self.delayTask = setTimeout(runTask, 250);

		// Else run it immediately
		} else {
			runTask();
		}
	},

	"{self} queryPrepare": function(el, event, query) {

		// Remove both loading & empty class
		el.removeClass("loading empty");

		if (query.loadingHint) {
			self.hide();
		}
	},

	"{self} queryBeforeStart": function(el, event, query) {

		// Show loading hint
		if (query.loadingHint) {
			el.addClass("loading");
			self.show();
		}
	},

	"{self} queryStart": function(el, event, query) {

		task.fail(function(){
				self.hide();
			})
			.always(function(){
				el.removeClass("loading");
			});
	},

	render: $.Enqueue(function(items, query){

		// If items passed in isn't an array,
		// fake an empty array.
		if (!$.isArray(items)) { items = [] };

		// Get mentions
		var mentions = self.mentions,
			autocomplete = self,
			element = self.element,
			menu = self.menu();		

		// If there are no items, hide menu.
		if (items.length < 1) {

			// If we are supposed to show an empty hint
			if (query.emptyHint) {

				// Clear out menu
				menu.empty();

				// Add empty class
				element.addClass("empty");

				// Trigger menuRender event
				mentions.trigger("menuRender", [menu, query, autocomplete, mentions]);

				// Show menu
				self.show();

			// Just hide straight away
			} else {

				self.hide();
			}

			return;
		}

		// Remove empty class
		element.removeClass("empty");

		// Generate menu items
		if (!query.cache || menu.data("keyword")!==keyword) {

			// Clear out menu items
			menu.empty();

			$.each(items, function(i, item){

				// Trigger menuCreateItem
				mentions.trigger("menuCreateItem", [item, query, autocomplete, mentions]);

				// If the item is not an object,
				// or item should be discarded, stop.
				if (!$.isPlainObject(item) || item.discard) return;

				var html = item.menuHtml || item.title;

				self.view.menuItem({html: html})
					.data("item", item)
					.appendTo(menu);
			});

			menu.data("keyword", keyword);
		}

		// Get menu Items
		var menuItems = self.menuItem();

		// Trigger menuCreate event
		mentions.trigger("menuCreate", [menu, menuItems, query, autocomplete, mentions]);

		// If menu is empty, toggle empty classname
		if (menuItems.filter(":not(.hidden)").length < 1) {

			element.addClass("empty");

			// If we shouldn't show an empty hint
			if (!query.emptyHint) {

				// Hide menu straightaway
				return self.hide();
			}
		}

		// If we only allow adding item from suggestions
		if (query.exclusive) {

			// Automatically select the first item
			self.menuItem(":not(.hidden):first").addClass("active");
		}

		// Trigger renderMenu event
		mentions.trigger("renderMenu", [menu, query, autocomplete, mentions]);

		self.show();
	}),

	"{mentions.textarea} keydown": function(textarea, event) {

		// Prevent autocomplete from falling asleep.
		clearTimeout(self.sleep);

		// If autocomplete is hidden, don't do anything.
		if (self.hidden) return;

		// Prevent up/down keys from changing textfield cursor position.
		event.preventDefault();		

		// Get active menu item
		var activeMenuItem = self.menuItem(".active:not(.hidden)");

		if (activeMenuItem.length < 1) {
			activeMenuItem = false;
		}

		switch (event.keyCode) {

			// If up key is pressed
			case KEYCODE.UP:

				// Deactivate all menu item
				self.menuItem().removeClass("active");

				// If no menu items are activated,
				if (!activeMenuItem) {

					// activate the last one.
					self.menuItem(":not(.hidden):last").addClass("active");

				// Else find the menu item before it,
				} else {

					// and activate it.
					activeMenuItem.prev(self.menuItem.selector + ':not(.hidden)')
						.addClass("active");
				}
				break;

			// If down key is pressed
			case KEYCODE.DOWN:

				// Deactivate all menu item
				self.menuItem().removeClass("active");

				// If no menu items are activated,
				if (!activeMenuItem) {

					// activate the first one.
					self.menuItem(":not(.hidden):first").addClass("active");

				// Else find the menu item after it,
				} else {

					// and activate it.
					activeMenuItem.next(self.menuItem.selector + ':not(.hidden)')
						.addClass("active");
				}		
				break;

			// If escape is pressed,
			case KEYCODE.ESCAPE:

				// hide menu.
				self.hide();
				break;

			// If enter is pressed, use item
			case KEYCODE.ENTER:

				// TODO: Use item
				break;
		}

		// Get newly activated item
		var activeMenuItem = self.menuItem(".active:not(.hidden)");

		// Scroll menu viewport if it is out of visible area.
		self.viewport().scrollIntoView(activeMenuItem);
	},

	"{menuItem} mouseup": function(menuItem) {

		// Hide context menu
		self.hide();

		// Add item
		var item = menuItem.data("item");

		// TODO: Update marker with item

		// Refocus textarea
		setTimeout(function(){

			// Due to event delegation, this needs to be slightly delayed.
			self.mentions.textField.focus();
		}, 150);
	},

	"{menuItem} mouseover": function(menuItem) {

		self.menuItem().removeClass("active");

		menuItem.addClass("active");
	},

	"{menuItem} mouseout": function(menuItem) {

		self.menuItem().removeClass("active");
	},    

	"{mentions} destroyed": function() {

		self.element.remove();
	}
}});
