$.Controller("Mentions",
{
    pluginName: "mentions",
    hostname: "mentions",

    defaultOptions: {

        cssCloneProps: [
            'lineHeight', 'textDecoration', 'letterSpacing',
            'fontSize', 'fontFamily', 'fontStyle',
            'fontWeight', 'textTransform', 'textAlign',
            'direction', 'wordSpacing', 'fontSizeAdjust'
        ],

        triggers: {},

        inspector: false,

        "{textarea}": "[data-mentions-textarea]",
        "{overlay}" : "[data-mentions-overlay]",
        "{block}"   : "[data-mentions-overlay] > span"
    }
},
function(self){ return {

    init: function() {

        // Speed up access to overlay
        self._overlay  = self.overlay()[0];
        self._textarea = self.textarea()[0];

        // Put this in a non-blocking thread
        setTimeout(function(){
            self.cloneLayout();
        }, 15);

        if (self.options.inspector) {
            self.inspect();
        }

        self.addPlugin("autocomplete");

        self.initialCaret = self.textarea().data("initial") || 0;
    },

    inspect: function() {
        self.inspector = self.addPlugin("inspector");
        self.inspector.showInspector();
    },

    setLayout: function() {

        self.normalize();
    },

    cloneLayout: function() {

        var $overlay = self.overlay(),
            overlay = $overlay.detach()[0],
            textarea = self.textarea(),
            props = self.options.cssCloneProps,
            i = 0;

        while (prop = props[i++]) {
            overlay.style[prop] = textarea.css(prop);
        }

        overlay.style.opacity = 1;

        $overlay.insertBefore(textarea);

        self.setLayout();
    },

    reset: function() {

        // Overlay
        var overlay = self.overlay(),
            overlayDefault = overlay.data("default");

        if (overlayDefault !== undefined) {
            // TODO: Use $.toHTML() in the future
            // after all is on 3.1.11.
            overlay.html($('<div>').html(overlayDefault).html());
        } else {
            overlay.empty();
        }

        // Textarea
        var textarea = self.textarea(),
            textareaDefault = textarea.data("default");

        if (textareaDefault !== undefined) {
            textarea.val($('<div>').html(textareaDefault).text());
        } else {
            textarea.val("");
        }

        self.caretBefore = self.caretAfter = {start: 0, end: 0};
        self.previousMarker = null;

        self.normalize();

        self.initialFocus = true;

        self.trigger("triggerClear");
    },

    //--- Triggers ----//

    getTrigger: function(key) {

        var triggers = self.options.triggers;
        if (triggers.hasOwnProperty(key)) {
            var trigger = triggers[key];
            trigger.key = key;
            return trigger;
        }
    },

    getTriggerFromType: function(type) {

        var triggers = self.options.triggers,
            found;

        $.each(triggers, function(key, trigger) {
            if (trigger.type===type) {
                found = trigger;
                return false;
            }
        });

        return found;
    },

    getStopIndex: function(str, stop) {

        var i = stop.length,
            idx = str.length;

        // Find the first earliest stop character, that's where the string ends
        while (i--) {
            var chr = stop.substr(i, 1),
                pos = str.indexOf(chr);
            idx = (pos < 0) ? idx : Math.min(idx, pos);
        }

        return idx;
    },

    //--- Marker traversal ----//

    getMarkers: function(callback) {

        var textarea = self._textarea,
            overlay = self._overlay,
            nodes = $.makeArray(overlay.childNodes),
            node,
            i = 0,
            start = 0,
            before = null,
            skip = false,
            results = [],
            iterator = function(marker) {

                var ret;

                // Execute callback while passing in marker object
                if (callback) ret = callback.apply(marker, [marker]);

                // If callback returned:
                // false     - stop the loop
                // null      - don't add anything to the result list
                // undefined - add the same marker object to the result list
                // value     - add the value to the result list
                if (ret!==null && ret!==false) results.push(ret!==undefined ? ret : marker);

                return ret; // if ret is false, the parent loop will stop
            };

        // Filter out nodes to ignore
        $.remove(nodes, function(node){
            return node.nodeType===1 && node.hasAttribute('data-ignore');
        });

        while (node = nodes[i++]) {

            // Nodes
            var nodeType = node.nodeType,
                nodeName = node.nodeName,
                text, block = null,

                // Marker positions
                end, length,

                // Marker behaviour
                br = false, allowSpace = false;

            // If this is a text node, assign this node as marker text
            if (nodeType==3) {
                text = node;
                allowSpace = true;
            // else assign this node as marker block,
            // then test if node is <br/>, create a detached text node contaning a line break,
            } else if ((block = node) && nodeName=="BR") {
                text = document.createTextNode(_newline);
                br = true;
            // if this is an invalid node, e.g. node not element, node not span, span has no text child node,
            // remove code from overlay and skip this loop.
            } else if (nodeType!==1 || nodeName!=="SPAN" || !(text = node.childNodes[0]) || text.nodeType!==3) {
                overlay.removeChild(node);
                continue;
            }

            // Create marker props
            var props = {
                index     : i - 1,
                start     : start,
                end       : (end = start + (length = text.length)),
                length    : length,
                text      : text,
                block     : block,
                parent    : overlay,
                textarea  : textarea,
                before    : before,
                br        : br,
                allowSpace: allowSpace,
                finalized : false
            };

            // Create marker data
            if (block) {
                var $node = $(node), data = $node.data("marker");
                if (!data) (data = {}) && $node.data("marker", data);

                // Restore trigger from data attribute
                if (node.hasAttribute(_typeAttr)) {

                    var type = $node.attr(_typeAttr),
                        trigger = self.getTriggerFromType(type);

                    if (trigger) data.trigger = trigger;
                    $node.removeAttr(_typeAttr);
                }

                // Restore value from data attribute
                if (node.hasAttribute(_valueAttr)) {

                    data.value = $node.attr(_valueAttr);
                    data.finalized = true;
                    $node.removeAttr(_valueAttr);
                }

                $.extend(props, data);
            }

            // Create marker
            var marker = new Marker(props);

            // If this is the second iteration, decorate the marker the after property
            // of the marker before this with the current marker.
            if (i > 1) {
                before.after = marker;
                // Execute iterator for the marker before this
                // If iterator returned false, stop the loop.
                if (skip = (iterator(before)===false)) break;
            }

            // Else reset start position and
            // continue with next child node.
            start = end;
            before = marker;
        }

        // Execute iterator one more time for the last marker
        if (!skip) iterator(before);

        return results;
    },

    getMarkerAt: function(pos) {

        if (pos===undefined) return;

        var marker;

        self.getMarkers(function(){

            // If position is inside current node,
            // stop and return marker.
            if (pos >= this.start && pos <= this.end) {
                marker = this;
                return false;
            }
        });

        return marker;
    },

    getMarkersBetween: function(start, end) {

        if (start===undefined) return;

        return self.getMarkers(function(){

            return (this.start > end) ? false : (this.end < start) ? null : this;
        });
    },

    toArray: function(stringify, asc) {

        var results = self.getMarkers(function(){

            var marker = this;

            if (!marker.block || marker.br) return null;

            // If there's no trigger, try to find it.
            if (!marker.trigger) {

                // Identify the trigger being used
                var wholeText = marker.text.nodeValue,
                    key = wholeText.slice(0, 1),
                    trigger = self.getTrigger(key);

                if (!trigger) return null;

                marker.trigger = trigger;
                marker.value = wholeText.slice(1);
            }

            var data = {
                start  : marker.start,
                length : marker.length,
                type   : marker.trigger.type,
                value  : marker.value
            };

            return (stringify) ? JSON.stringify(data) : data;
        });

        return (asc) ? results : results.reverse();
    },

    //--- Marker/overlay/text manipulation ---//

    insert: function(str, start, end) {

        var marker, offset;

        // If we are inserting character(s)
        if (start===end || end===undefined) {

            // Get marker & offset
            marker = self.getMarkerAt(start);
            offset = marker.start;

            // Insert character
            marker.insert(str, start - offset, end - offset);

        } else {

            // If we are replacing character(s)

            // Identify affected markers
            var markers = self.getMarkersBetween(start, end),
                length = markers.length;

            // If there are no marker, stop.
            if (length < 1) return;

            // If we're modifying a single marker
            // e.g. he*llo* --> he*y*
            if (length==1) {

                // Get marker & offset
                marker = markers[0];
                offset = marker.start;

                // Insert character
                marker.insert(str, start - offset, end - offset);
            } else {

                // If we're modifying multiple markers
                // e.g. he*llo [john] [do*e] --> he*xxx*e

                // Deal with markers in reverse
                var i = length - 1,
                    marker = markers[i];

                // Convert block marker into text marker
                // [doe] --> doe
                // hello [john] [doe] --> hello [john] doe
                if (marker.block && end > marker.start) marker.toTextMarker();

                // Remove characters from text marker
                // doe --> e
                // hello [john] doe --> hello [john] e

                // Do not perform this operation if it does
                // not changes the value of the marker.
                if ((end - marker.start) > 0) {
                    marker.insert("", 0, end - marker.start);
                }

                // Remove all markers in between
                // [john] --> (removed)
                // hello [john] --> hello
                while ((marker = markers[--i]) && i > 0) {
                    marker.remove();
                }

                // If we're in the beginning of the textarea,
                // convert block into text marker.
                if (marker.block && marker.index===0 && start===0) marker.toTextMarker();

                // Insert characters in the first marker
                // hello -> hexxxe
                marker.insert(str, start - marker.start, marker.length);

                // Special case for handling br tag in the beginning of the textarea
                if (start===0 && marker.br) {
                    marker.remove();
                }
            }
        }

        // Normalize all text markers
        self.normalize();

        return marker;
    },

    textareaInsert: function(str, start, end) {

        var textarea = self._textarea,
            val = textarea.value;

        return textarea.value = val.substring(0, start) + str + val.slice(end);
    },

    normalize: function() {

        var overlay = self._overlay,
            textarea = self._textarea;

        // This clean up empty text nodes in the beginning and
        // the end of the overlay and join disjointed text nodes
        // that are supposed to be a single text node.
        overlay.normalize();

        // This is a double-edged workaround.
        // - When there is no child element (empty textarea),
        //   an empty text node ensure overlay has a minimum
        //   single line-height.
        // - If there is a newline at the end of the overlay,
        //   an empty text node ensure overlay accomodates
        //   the height of the newline.
        var first = overlay.firstChild,
            last = overlay.lastChild,
            textNode = document.createTextNode("");

        if (!last || last.nodeName==="BR") {
            overlay.appendChild(textNode);
        }

        if (last && last==first && last.nodeType===1 && last.hasAttribute("data-ignore")) {
            overlay.insertBefore(textNode, last);
        }

        // Chrome, Opera & IE doesn't accomodate height of
        // newline after an empty text node, so reset the
        // overlay height to auto, and retrieve the textarea
        // scrollHeight again.
        overlay.style.height = "auto";
        overlay.style.height = textarea.scrollHeight + "px";

        // IE & Opera textarea's scrollTop may jump position
        // from time to time so we need to reset it back.
        textarea.scrollTop = 0;

        // Remember the current textarea length.
        // We do it here instead of keydown event
        // because Opera returns the length of the
        // textarea after it has been changed.
        self.lengthBefore = textarea.value.length;

        // console.log("after", overlay.childNodes);
    },

    //--- Key events & caret handling ---//

    /*
    List of input patterns to test:

    0. Meta-characters via alt + shift + (any key).

    1. Holding arrow key + pressing another character.

    2. Select a range of characters (covering single/multiple marker)
       - and press any key
       - and press enter
       - and press backspace

    3. Repeat step 2 with range starting at a block marker where caret is at:
       - the beginning
       - the middle
       - the end
       of the block marker and also when block marker is at:
       - the beginning
       - the middle
       - the end
       of the textarea.

    4. Typing accented character.
       Hold a key until candidate window shows up, then:
       - Press a number
       - Release key, then press a number
       - Navigate using arrow keys
       - Press enter to select a character
       - Click on a candidate to select a character
       - Press backspace until candidate window dissappears

    5. Typing romanized-to-unicode (Chinese/Japanese/Arabian/etc) characters.
       Type multiple characters in the candidate window, then proceed with
       the next course of action at test no. 4.

    6. Pressing enter continously to create multiple newlines:
       - at the beginning of the textarea
       - at the middle of marker/text
       - at the end of textarea
       then:
       - enter a key at the newline
       - press backspace to remove those newlines
       - select a range of newlines, then proceed with
         the next course of action at test no. 2.
    */

    lengthBefore: 0,
    caretBefore: {start: 0, end: 0},
    caretAfter: {start: 0, end: 0},
    skipKeydown: false,
    previousMarker: null,

    initialFocus: true,

    "{textarea} focus": function() {

        if (self.initialFocus) {
            self.textarea().caret(self.initialCaret || 0);
        }
    },

    "{textarea} keydown": function(textarea, event) {

        self.initialFocus = false;

        // If keydown event has been fired multiple times
        // this might mean the user has entered candidate
        // window and we should not do anything.
        if (self.skipKeydown) return;

        var caret = self.caretBefore = textarea.caret();

        if (event.keyCode===8 && $.IE < 10) {
            self.overlay().css('opacity', 0);
        }

        // console.log("keydown", event.which, caret);

        self.skipKeydown = true;
    },

    // Keypress event will not trigger when meta keys are pressed,
    // it will trigger on well-formed characters.
    "{textarea} keypress": function(textarea, event) {

        // console.log("keypress");

        // This will help on situations where user
        // holds an arrow key + presses another character.
        self.caretBefore = textarea.caret();

        // FF fires keypress on backspace, while Chrome & IE doesn't.
        // We normalize this behaviour by not doing anything on backspace.
        if (event.keyCode===8) return;
    },

    "{textarea} input": function(textarea) {

        self.reflect();

        // Extra precaution in case overlay goes wrong,
        // user can start all over again by reseting mentions.
        if (textarea.val().length < 1) {
            self.reset();
        }
    },

    "{textarea} keyup": function(textarea, event) {

        self.skipKeydown = false;

        // Listen to backspace during keydown because
        // it is not fired on input/keypress on IE9.
        if (event.keyCode===8 && $.IE < 10) {

            var caretBefore = self.caretBefore,
                caretAfter  = self.caretAfter = self.textarea().caret();

            self.insert("", caretAfter.end, caretBefore.end);

            self.caretBefore = caretAfter;

            self.overlay().css('opacity', 1);
        }

        // console.log("keyup", caretBefore, caretAfter);
    },

    reflect: function() {

        var textarea = self._textarea,

            wholeText = textarea.value,

            // Caret position retrieved on previous input event
            // is the position before the character is inserted
            caretBefore = self.caretBefore,

            // Caret position retrieved on current input event
            // is the position after the character is inserted.
            caretAfter = self.caretAfter = $(textarea).caret(),

            // Determine if user is on Opera + candidate window.
            operaCandidateWindow = ($.browser.opera && caretAfter.end > caretAfter.start),

            marker = self.getMarkerAt(caretBefore.start),

            diff = self.lengthBefore - wholeText.length,

            replace = false;

        // Ensure Opera follows the caretBefore behaviour of other
        // browsers when typing inside the candidate window.
        if (operaCandidateWindow) {
            if (caretBefore.start!==caretBefore.end) {
                caretBefore.end += diff;
            }
        }

        // In case there was an issue retrieving marker.
        // TODO: Figure out the pattern, usually when typed too early.
        if (!marker) return;

        var previousMarker = self.previousMarker,
            block = marker.block;

        // If the previous marker hasn't been finalized, convert back to text block.
        if (previousMarker) {

            var previousBlock = previousMarker.block,
                finalize = (previousMarker.trigger || {}).finalize;

            if (previousBlock && finalize && !previousMarker.finalized && previousBlock!==block) {
                try {
                    previousMarker.toTextMarker();
                } catch(e) {
                    self.previousMarker = null;
                }
            }
        }

        // console.log("caretBefore", caretBefore.start, caretBefore.end);
        // console.log("caretAfter" , caretAfter.start , caretAfter.end);

        // If there is a change in the text content but the length of the
        // text content is the same length as before, it is impossible to
        // tell what has changed, so we replace the entire text in the marker
        // where the caret is at. This happens when:
        // - User holds a character + presses a number to select a
        //   character from the candidate window.
        // - User navigates between characters using arrow keys
        //   within the candidate window.
        //
        // The caretAfter could be earlier than the caretBefore when:
        // - User enters backspace to remove a character.
        // - User finalizes a selection from the candidate window where characters
        //   are shorter than being typed, e.g. "ni hao" --> "你好".
        if (!marker.br && (diff===0 || caretAfter.end < caretBefore.start)) {

            var textStart  = marker.start,
                textEnd    = marker.end - diff,
                rangeStart = caretAfter.end,
                rangeEnd   = caretBefore.start,
                replace    = textStart!==textEnd;

         // If user is inserting text as usual.
        } else {

            // In Chrome, the caretAfter has a range if the user is typing within the
            // candidate window. The characters may change due to fuzzy logic suggestions.
            // You can test this by using Chinese pinyin input and typing "a" then
            // "asdasdasd" one at a time slowly until you see the difference.

            // So, we give prefential treatment to start positions which are earlier
            // whether it is coming from caretBefore or caretAfter.
            var rangeStart = textStart = Math.min(caretBefore.start, caretAfter.start),
                rangeEnd   = caretBefore.end,
                textEnd    = caretAfter.end;
        }

        // Extract text from the given start and end position
        var text = wholeText.substring(textStart, textEnd);

        // If the strategy is to replace a single marker
        if (replace) {

            // If text being replaced is not identical on
            // a finalized marker, then convert to text marker.
            if (marker.val()!==text && marker.finalized) {
                marker.toTextMarker();
            }

            marker.val(text);

            // Emulate markerInsert event
            self.overlay().trigger("markerInsert", marker, [], text, textStart, textEnd);

            self.normalize();

        // If the strategy is to insert chracters onto single/multiple markers
        } else {
            self.insert(text, rangeStart, rangeEnd);
        }

        // console.log("range", rangeStart, rangeEnd);
        // console.log("text" , textStart, textEnd, text);

        // Ensure Opera follows the caretAfter behaviour of other
        // browsers when typing inside the candidate window.
        if (operaCandidateWindow) {
            caretAfter.start = caretAfter.end;
        }

        // Set caretBefore as current caret
        // This is used to track text range when exiting candidate window.
        self.caretBefore = self.caretAfter;
    },

    //--- Marker Events ----//

    "{overlay} markerInsert": function(overlay, event, marker, nodes, str, start, end) {

        var text = marker.text,
            wholeText = text.nodeValue,
            trigger;

        self.previousMarker = null;

        // If a trigger key was entered
        if (trigger = self.getTrigger(str)) {

            // Ensure the character before is a space, e.g.
            // we don't want to listen to @ in an email address.
            // or a # that is not intended to be a hashtag.
            var charBefore = wholeText.charCodeAt(start - 1),
                brBefore = marker.before && marker.before.br;

            if (marker.index===0 || (charBefore===32 || brBefore)) {

                // Extract the remaining string after the trigger key
                // coding #js --> #js
                var remainingText = wholeText.slice(start),
                    content = remainingText.slice(1);

                // If this trigger allows wrapping and
                // there are remaining characters to wrap.
                // *#js and*    --> *#js* and
                // *#js#foobar* --> *#js*#foobar
                if (trigger.wrap && remainingText.length > 1) {

                    // Get stop position, add start offset and trigger key offset.
                    end = self.getStopIndex(content, trigger.stop) + start + 1;

                // If trigger does not allow wrapping
                // *@foobar* --> *@*foobar
                } else {
                    end = start + 1;
                }

                // Spawn a new marker from this string
                // and convert this marker into a block marker
                // *#*          --> [#]
                // *#js* and    --> [#js] and
                // *#js*#foobar --> [#js]#foobar
                // *@*foobar    --> [@]foobar
                var spawn = marker.spawn(start, end).toBlockMarker(),
                    content = spawn.val().slice(1);

                // Update data
                var data = $(spawn.block).data("marker");
                    data.value = content;
                    data.trigger = trigger;

                self.previousMarker = spawn;

                // Trigger triggerCreate event
                self.trigger("triggerCreate", [spawn, trigger, content]);
            }
        }

        // If we're inside an existing block marker,
        // determine if we need to mutate the block.
        if (marker.block && !marker.br) {

            // If this marker is finalized, any changes to the
            // text content will convert it to a text marker.
            // [Jensen *#*Tonne] --> Jensen #Tonne
            // [Jensen Tonn`e`]  --> Jensen Tonn
            if (marker.finalized) {

                var length = marker.length;

                if (end < length - 1) marker.toTextMarker();

            } else {

                // Identify the trigger being used
                var key = wholeText.slice(0, 1),
                    trigger = self.getTrigger(key);

                // If we could not identify the trigger, skip.
                if (!trigger) return;

                // Check for occurence of stop character
                var content = wholeText.slice(1),
                    start = self.getStopIndex(content, trigger.stop) + 1,
                    end = wholeText.length,
                    spawn = false;

                // If the end position is shorter than content length
                if (start < end) {

                    // Spawn out a new marker containing
                    // the remaining text after the block marker.
                    // [#foo* *bar] --> [#foo] bar
                    spawn = marker.spawn(start, end);
                }

                // Trigger triggerChange event
                content = marker.val().slice(1);

                // Update data
                var data = $(marker.block).data("marker");
                    data.value = content;
                    data.trigger = trigger;

                self.previousMarker = marker;

                self.trigger("triggerChange", [marker, spawn, trigger, content]);
            }
        }
    },

    "{overlay} markerExit": function(overlay, event, marker, nodes, spawn, str, start, end) {

        var trigger = marker.trigger;

        if (!trigger) return;

        var allowSpace = trigger.allowSpace || marker.allowSpace,
            content = marker.val();

        if (!allowSpace && marker.val()===trigger.key) {
            marker.toTextMarker();
        }

        self.trigger("triggerExit", [marker, spawn, trigger, content]);
    }

    // Events available for use
    // "{overlay} markerRemove": function(overlay, event, marker) {},
    // "{overlay} markerConvert": function(overlay, event, marker, type) {},
    // "{overlay} markerExit": function(overlay, event, marker, nodes, str, start, end) {},
    // "{self} triggerCreate": function(el, event, marker, trigger, content) {},
    // "{self} triggerDestroy": function(el, event, marker) {},
    // "{self} triggerChange": function(el, event, marker, spawn, trigger) {},

    // TODO: Better support for cut & paste
    // "{textarea} beforecut": function() { console.log("BEFORECUT", arguments); },
    // "{textarea} beforepaste": function() { console.log("BEFOREPASTE", arguments); },
    // "{textarea} cut": function(el, event) { console.log("CUT", arguments); },
    // "{textarea} paste": function() { console.log("PASTE", arguments); }
}});
