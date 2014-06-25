$.template("mentions/menu", '<div class="mentions-autocomplete" data-mentions-autocomplete><b><b></b></b><div class="mentions-autocomplete-inner" data-mentions-autocomplete-viewport><div class="mentions-autocomplete-loading" data-mentions-autocomplete-loading data-mentions-autocomplete-close></div><div class="mentions-autocomplete-empty" data-mentions-autocomplete-empty></div><div class="mentions-autocomplete-search" data-mentions-autocomplete-search></div><ul class="mentions-menu" data-mentions-menu></ul></div></div>');
$.template("mentions/menuItem", '<li class="mentions-menuItem" data-mentions-menuItem>[%== html %]</li>');
$.template("mentions/loadingHint", '<i class="mentions-autocomplete-loading-indicator"></i>');
$.template("mentions/searchHint", '<span class="mentions-autocomplete-search-hint">Type a keyword to begin.</span>');
$.template("mentions/emptyHint", '<span class="mentions-autocomplete-empty-text">No items found.</span>');
/*
<div class="mentions-autocomplete" data-mentions-autocomplete>
	<b><b></b></b>
	<div class="mentions-autocomplete-inner" data-mentions-autocomplete-viewport>
		<div class="mentions-autocomplete-loading" data-mentions-autocomplete-loading></div>
		<div class="mentions-autocomplete-empty" data-mentions-autocomplete-empty></div>
		<div class="mentions-autocomplete-search" data-mentions-autocomplete-search></div>
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
			searchHint: "mentions/searchHint",
			loadingHint: "mentions/loadingHint",
			emptyHint: "mentions/emptyHint"
		},

		id: "",
		component: "",
		modifier: "",
		shadow: false,
		sticky: false,
		animation: false,

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
			searchHint: false,
			loadingHint: false,
			emptyHint: false
		},

		position: {
			my: 'left top',
			at: 'left bottom',
			collision: 'none'
		},

        size: {
            width: "auto",
            height: "auto"
        },

		"{menu}": "[data-mentions-menu]",
		"{menuItem}": "[data-mentions-menuItem]",
		"{viewport}": "[data-mentions-autocomplete-viewport]",
		"{loadingHint}": "[data-mentions-autocomplete-loading]",
		"{emptyHint}": "[data-mentions-autocomplete-empty]",
		"{searchHint}": "[data-mentions-autocomplete-search]",
		"{closeButton}": "[data-mentions-autocomplete-close]"
    }
},
function(self, opts, base){ return {

    init: function() {

        // This doesn't need to be immediately initialized.
        // Shaves off about 20ms.
        setTimeout(function(){

		// Destroy controller
		if (!self.element.data(self.Class.fullName)) {

			self.destroy();

			// And reimplement on the context menu we created ourselves
			var menu =
			self.view.menu()
				.attr("id", opts.id)
				.addClass(opts.component)
				.addClass(opts.modifier)
				.addClass(opts.shadow ? 'has-shadow' : '')
				.addClass(opts.animation ? 'has-animation' : '')
				.addClass(opts.sticky ? 'is-sticky' : '')
				.appendTo("body")
				.data(self.Class.fullName, true)
				.addController(self.Class, opts);

			return;
		}

		var mentions = self.mentions;

		self.uid = $.uid();

		mentions.autocomplete = self;
		mentions.pluginInstances["autocomplete"] = self;

		// Set the position to be relative to the mentions
		if (!opts.position.of) {
			opts.position.of = self.mentions.element;
		}

		// Prepare this in advance to speed things up
		self.defaultSearchHint  = self.view.searchHint().toHTML();
		self.defaultEmptyHint   = self.view.emptyHint().toHTML();
		self.defaultLoadingHint = self.view.loadingHint().toHTML();

		// Only reattach element when autocomplete is needed.
		self.element.detach();

		}, 50);
    },

	setLayout: function() {

		if (!self.hidden) {

            var options = self.options,
                size = options.size,
                width = self.mentions.element.outerWidth(),
                height = "auto";

            if ($.isFunction(size.width)) {
                width = size.width(width);
            }

            if ($.isFunction(size.height)) {
                height = size.height(height);
            }

			self.element
				.css({
					opacity: 1,
					width: width
				})
				.position(self.options.position);

			setTimeout(function(){
				self.viewport()
					.addClass("active");
			}, 1);
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

	currentMarker: null,

	"{mentions} triggerCreate": function(el, event, marker, trigger, content) {

		self.populate(marker, trigger, content);

		self.currentMarker = marker;
	},

	"{mentions} triggerChange": function(el, event, marker, spawn, trigger, content) {

		self.populate(marker, trigger, content);

		self.currentMarker = marker;
	},

	"{mentions} triggerExit": function(el, event, marker, spawn, trigger, content) {

		// Abort any running query
		var query = self.activeQuery;
		if (query) {
			query.aborted = true;
		}

		self.hide();
	},

	"{mentions.block} triggerDestroy": function(el, event, marker) {

		self.hide();
	},

	"{mentions} triggerClear": function() {

		self.hide();
	},

	hidden: true,

	show: function(duration) {

		clearTimeout(self.sleep);

		self.element
			.appendTo("body")
			.show();

		self.hidden = false;

		self.viewport().removeClass("active");

		self.setLayout();

		// Hide autocomplete on click.
		var doc = $(document),
			hideOnClick = "click.mentions." + self.uid;

		doc
			.off(hideOnClick)
			.on(hideOnClick, function(event){

				// Collect list of bubbled elements
				var targets = $(event.target).parents().andSelf();

				// Don't hide autocomplete if user is clicking on itself
				if (targets.filter(base).length > 0) return;

				// Unbind hiding
				doc.off(hideOnClick);

				self.hide();
			});

		if (duration) {

			self.sleep = setTimeout(function(){

				self.hide();

			}, duration);
		}
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

		self.viewport().removeClass("active");

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

		if (!options) return;

		// If options passed in is not an object
		var query = $.extend(
				{},
				self.options.query,
				($.isPlainObject(options) ? options : {data: options})
			),
			data = query.data;

		if (!data) return;

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

	activeQuery: null,

	populate: function(marker, trigger, keyword) {

		// Abort any running query
		var query = self.activeQuery;
		if (query) {
			query.aborted = true;
		}

		// Create query object
		var query = self.query(trigger.query);

		if (!query) return;

		// Set current query as active query
		self.activeQuery = query;

		// Store data in query
		query.keyword = keyword;
		query.trigger = trigger;
		query.marker  = marker;

		// Trigger queryPrepare event
		// for event handlers to modify the query object.
		self.trigger("queryPrepare", [query]);

		// If no keyword given or keyword doesn't meet minimum query length, stop.
		var keyword = query.keyword;

		if (keyword==="" || (keyword.length < query.minLength)) {

			var searchHint = query.searchHint;

			if (searchHint) {

				self.searchHint()
					.html(
						// If searchHint is a html string
						$.isString(searchHint) ?
							// use query-specific searchHint
							searchHint :
							// else use default searchHint
							self.defaultSearchHint
					);

				self.element.addClass("search");

				self.show();
			} else {
				self.hide();
			}
			return;
		}

		// Create a query id for this task based on the keyword
		// and retrieve existing query task for this keyword.
		var id    = query.id = trigger.key + "|" + (query.caseSensitive) ? keyword : keyword.toLowerCase(),
			tasks = self.tasks,
			task  = query.task = tasks[id],

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
		el.removeClass("loading empty search");

		if (query.loadingHint) {
			self.hide();
		}
	},

	"{self} queryBeforeStart": function(el, event, query) {

		var loadingHint = query.loadingHint;

		// Show loading hint
		if (loadingHint) {

			self.loadingHint()
				.html(
					// If searchHint is a html string
					$.isString(loadingHint) ?
						// use query-specific loadingHint
						loadingHint :
						// else use default loadingHint
						self.defaultLoadingHint
				);

			el.addClass("loading");
			self.show();
		}
	},

	"{self} queryStart": function(el, event, query) {

		query.task
			.fail(function(){
				self.hide();
			})
			.always(function(){
				el.removeClass("loading");
			});
	},

	render: $.Enqueue(function(items, query){

		// If query has been aborted, hide menu and stop.
		if (query.aborted) {
			self.hide();
			return;
		}

		// If items passed in isn't an array,
		// fake an empty array.
		if (!$.isArray(items)) { items = [] };

		// Get mentions
		var mentions = self.mentions,
			autocomplete = self,
			element = self.element,
			menu = self.menu(),
			keyword = query.keyword;

		// If there are no items, hide menu.
		if (items.length < 1) {

			var emptyHint = query.emptyHint;

			// If we are supposed to show an empty hint
			if (emptyHint) {

				self.emptyHint()
					.html(
						// If searchHint is a html string
						$.isString(emptyHint) ?
							// use query-specific emptyHint
							emptyHint :
							// else use default emptyHint
							self.defaultEmptyHint
					);

				// Clear out menu
				menu.empty();

				// Add empty class
				element.addClass("empty");

				// Show menu for only 2 seconds
				self.show(2000);

			// Just hide straight away
			} else {

				self.hide();
			}

			// Trigger menuRender event
			mentions.trigger("menuRender", [menu, query, autocomplete, mentions]);

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

				// Prevent up/down keys from changing textfield cursor position.
				if (!self.hidden) {
					event.preventDefault();
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

				// Prevent up/down keys from changing textfield cursor position.
				if (!self.hidden) {
					event.preventDefault();
				}
				break;

			// If escape is pressed,
			case KEYCODE.ESCAPE:

				// hide menu.
				self.hide();
				break;

			// If enter is pressed, use item
			case KEYCODE.ENTER:

				if (!self.hidden && activeMenuItem) {
					var item = activeMenuItem.data("item");
					self.use(item);
					event.preventDefault();
				}
				break;
		}

		// Get newly activated item
		var activeMenuItem = self.menuItem(".active:not(.hidden)");

		if (!self.hidden) {
			// Scroll menu viewport if it is out of visible area.
			self.viewport().scrollIntoView(activeMenuItem);
		}
	},

	"{menuItem} mouseup": function(menuItem) {

		// Hide context menu
		self.hide();

		// Add item
		var item = menuItem.data("item");

		self.use(item);

		// Refocus textarea
		setTimeout(function(){

			// Due to event delegation, this needs to be slightly delayed.
			self.mentions.textarea().focus();
		}, 150);
	},

	use: function(item) {

		// Get active query
		var query = self.activeQuery;

		// If there are no active query, stop.
		if (!query) return;

		var marker = query.marker,
			title = item.title;

		// Replace marker text
		marker.text.nodeValue = title;

		delete item["menuHtml"];

		var value = item;

		if (query.use) {
			value = query.use(item);
		}

		// Finalize marker
		marker.finalize(value);

		// Replace textarea text
		self.mentions.textareaInsert(title, marker.start, marker.end);

		// Set caret position
		self.mentions.textarea().caret(marker.start + title.length);

		// Normalize is required so self.lengthBefore is correct.
		// Marker may run off when a user creates a block marker from
		// autocomplete, changes the cursor before/at the beginning of the
		// block marker, and presses backspace.
		self.mentions.normalize();

		// Quick hack to prevent repopulation
		self.hidden = true;

		self.hide();
	},

	"{menuItem} mouseover": function(menuItem) {

		self.menuItem().removeClass("active");

		menuItem.addClass("active");
	},

	"{menuItem} mouseout": function(menuItem) {

		self.menuItem().removeClass("active");
	},

	"{closeButton} click": function() {

		self.hide();
	},

	"{mentions} destroyed": function() {

		self.element.remove();
	}
}});
