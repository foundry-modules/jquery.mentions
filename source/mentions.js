// To increase comparession
var awaitingKeyup_ = "awaitingKeyup",
    insertBefore_ = "insertBefore",
    userInCandidateWindow = "userInCandidateWindow",
    waitForKeyup = "waitForKeyup",
    skipInput = "skipInput";

var nbsp    = "\u00a0",
    newline = "\n";

// TODO: Put this elsewhere
$.fn.caret = function(start, end) {

    if (this.length == 0) return;
    if (typeof start == 'number')
    {
        end = (typeof end == 'number') ? end : start;
        return this.each(function ()
        {
            if (this.setSelectionRange)
            {
                this.setSelectionRange(start, end);
            } else if (this.createTextRange)
            {
                var range = this.createTextRange();
                range.collapse(true);
                range.moveEnd('character', end);
                range.moveStart('character', start);
                try { range.select(); } catch (ex) { }
            }
        });
    } else
    {
        if (this[0].setSelectionRange)
        {
            start = this[0].selectionStart;
            end = this[0].selectionEnd;
        } else if (document.selection && document.selection.createRange)
        {
            var range = document.selection.createRange();
            start = 0 - range.duplicate().moveStart('character', -100000);
            end = start + range.text.length;
        }
        return { start: start, end: end };
    }
}

// Constants
var KEYCODE = {
    BACKSPACE: 8, 
    TAB: 9, 
    ENTER: 13, 
    ESC: 27, 
    LEFT: 37, 
    UP: 38, 
    RIGHT: 39, 
    DOWN: 40, 
    SPACE: 32, 
    HOME: 36, 
    END: 35
};

// Templates
$.template("mentions/item", '<b>[%= value %]</b>');
$.template("mentions/inspector", '<div class="mentions-inspector" data-mentions-inspector><fieldset><b>Selection</b><hr/><label>Start</label><input type="text" data-mentions-selection-start/><hr/><label>End</label><input type="text" data-mentions-selection-end/><hr/><label>Length</label><input type="text" data-mentions-selection-length/><hr/></fieldset><fieldset><b>Trigger</b><hr/><label>Key</label><input type="text" data-mentions-trigger-key/><hr/><label>Type</label><input type="text" data-mentions-trigger-type/><hr/><label>Buffer</label><input type="text" data-mentions-trigger-buffer/><hr/></fieldset><hr/> <fieldset><b>Marker</b><hr/><label>Index</label><input type="text" data-mentions-marker-index/><hr/><label>Start</label><input type="text" data-mentions-marker-start/><hr/><label>End</label><input type="text" data-mentions-marker-end/><hr/><label>Length</label><input type="text" data-mentions-marker-length/><hr/><label>Text</label><input type="text" data-mentions-marker-text/><hr/></fieldset><fieldset><b>Block</b><hr/><label>Html</label><input type="text" data-mentions-block-html/><hr/><label>Text</label><input type="text" data-mentions-block-text/><hr/><label>Type</label><input type="text" data-mentions-block-type/><hr/><label>Value</label><input type="text" data-mentions-block-value/><hr/></fieldset></div>');

/*
<div class="mentions-inspector" data-mentions-inspector>
    <fieldset>
        <b>Selection</b>
        <hr/>
        <label>Start</label>
        <input type="text" data-mentions-selection-start/>
        <hr/>
        <label>End</label>
        <input type="text" data-mentions-selection-end/>
        <hr/>
        <label>Length</label>
        <input type="text" data-mentions-selection-length/>
        <hr/>
    </fieldset>
    <fieldset>
        <b>Trigger</b>
        <hr/>
        <label>Key</label>
        <input type="text" data-mentions-trigger-key/>
        <hr/>
        <label>Type</label>
        <input type="text" data-mentions-trigger-type/>
        <hr/>
        <label>Buffer</label>
        <input type="text" data-mentions-trigger-buffer/>
        <hr/>
    </fieldset>
    <hr/> 
    <fieldset>
        <b>Marker</b>
        <hr/>
        <label>Index</label>
        <input type="text" data-mentions-marker-index/>
        <hr/>
        <label>Start</label>
        <input type="text" data-mentions-marker-start/>
        <hr/>
        <label>End</label>
        <input type="text" data-mentions-marker-end/>
        <hr/>
        <label>Length</label>
        <input type="text" data-mentions-marker-length/>
        <hr/>
        <label>Text</label>
        <input type="text" data-mentions-marker-text/>
        <hr/>
    </fieldset>
    <fieldset>
        <b>Block</b>
        <hr/>
        <label>Html</label>
        <input type="text" data-mentions-block-html/>
        <hr/>
        <label>Text</label>
        <input type="text" data-mentions-block-text/>
        <hr/>
        <label>Type</label>
        <input type="text" data-mentions-block-type/>
        <hr/>
        <label>Value</label>
        <input type="text" data-mentions-block-value/>
        <hr/>
    </fieldset>
</div>
*/

var Marker = function(options) {

    $.extend(this, options);
}

$.extend(Marker.prototype, {

    insert: function(str, start, end) {

        // Marker
        var marker = this,

            // Text
            text    = marker.text,
            val     = text.nodeValue,
            prefix  = val.substring(0, start),
            suffix  = val.slice(end),
            mutable = marker.mutable,
            newline = (str==newline),

            // Nodes
            parent  = marker.parent,
            block   = marker.block,
            next    = block ? block.nextSibling : text.nextSibling,

            // Chunks
            // Replace double space with one space + one nbsp
            chunks = str.replace(/  /g, " " + nbsp).split(newline),
            nodes  = [],
            i      = chunks.length;

        // If marker is mutable, we add the prefix/suffix to the first/last chunk.
        if (mutable) {
            chunks[0] = prefix + chunks[0];
            chunks[i-1] += suffix;
        }

        while (--i) {

            var node = document.createTextNode(chunks[i]),
                br = document.createElement("BR");

            parent.insertBefore(node, next);
            parent.insertBefore(br, node);
            nodes.push(node);
            nodes.push(br);

            next = br;
        }

        text.nodeValue = chunks[i];
        mutable && marker.toTextMarker(false);
        newline && parent.insertBefore(marker.block = document.createElement("BR"), next);

        // Trigger marker for post processing
        $(parent).trigger("markerInsert", [marker, nodes]);
    },

    remove: function() {

        var marker = this,
            parent = marker.parent;

        parent.removeChild(marker.block || marker.text);

        marker.removed = true;

        $(parent).trigger("markerRemove", [marker]);
    },

    toTextMarker: function(normalize) {

        var marker = this,
            block  = marker.block,
            parent = marker.parent;

        if (!block) return marker;

        // Move the text node out and 
        // place it before the next marker.
        parent.insertBefore(marker.text, block.nextSibling);

        // Remove the block node
        parent.removeChild(block);
        delete marker.block;

        // Normalizing will join 2 separated
        // text nodes together forming a single marker.
        normalize && parent.normalize();

        $(marker.parent).trigger("markerConvert", [this, "text", normalize]);

        return marker;
    },

    toBlockMarker: function() {

        $(marker.parent).trigger("markerConvert", [this, "block", normalize]);
    }
});


$.Controller("Mentions",
{
    pluginName: "mentions",
    hostname: "mentions",

    defaultOptions: {

        view: {
            item: "mentions/item",
            inspector: "mentions/inspector"
        },

        cssCloneProps: [
            'lineHeight', 'textDecoration', 'letterSpacing',
            'fontSize', 'fontFamily', 'fontStyle', 
            'fontWeight', 'textTransform', 'textAlign', 
            'direction', 'wordSpacing', 'fontSizeAdjust'
        ],

        triggers: {
            "@": {
                type: 'entity',
                allowSpace: true
            },
            "#": {
                type: 'hashtag',
                allowSpace: false
            }
        },

        inspector: false,

        "{inspector}": "[data-mentions-inspector]",

        "{selectionStart}" : "[data-mentions-selection-start]",
        "{selectionEnd}"   : "[data-mentions-selection-end]",
        "{selectionLength}": "[data-mentions-selection-length]",

        "{markerIndex}" : "[data-mentions-marker-index]",
        "{markerStart}" : "[data-mentions-marker-start]",
        "{markerEnd}"   : "[data-mentions-marker-end]",
        "{markerLength}": "[data-mentions-marker-length]",
        "{markerText}"  : "[data-mentions-marker-text]",

        "{blockText}" : "[data-mentions-block-text]",
        "{blockHtml}" : "[data-mentions-block-html]",
        "{blockType}" : "[data-mentions-block-type]",
        "{blockValue}": "[data-mentions-block-value]",

        "{triggerKey}" : "[data-mentions-trigger-key]",
        "{triggerType}" : "[data-mentions-trigger-type]",
        "{triggerBuffer}" : "[data-mentions-trigger-buffer]",

        "{textarea}": "[data-mentions-textarea]",
        "{overlay}" : "[data-mentions-overlay]",
        "{block}"   : "[data-mentions-overlay] > span"
    }
},
function(self){ return {

    init: function() {

        self.cloneLayout();

        // Temporarily set to true
        self.options.inspector = true;
        self.showInspector();

        // Speed up access to overlay
        self._overlay  = self.overlay()[0];
        self._textarea = self.textarea()[0];
    },

    setLayout: function() {

    },

    cloneLayout: function() {

        var textarea = self.textarea(),
            overlay  = self.overlay();

        $.each(self.options.cssCloneProps, function() {
            overlay.css(this, textarea.css(this));
        });

        overlay.css('opacity', 1);
    },

    //--- Triggers ----//

    triggered: null,

    getTrigger: function(triggerKey) {

        return self.options.triggers[triggerKey || self.triggered];
    },    

    //--- Marker traversal ----//

    forEachMarker: function(callback) {

        var overlay = self._overlay,
            nodes = overlay.childNodes,
            node,
            i = 0,
            start = 0,
            before = null,
            result = [],
            skip = false,
            iterator = function(marker) {

                // Execute callback while passing in marker object
                if (callback) ret = callback.apply(marker, [marker]);

                // If callback returned:
                // false     - stop the loop
                // null      - don't add anything to the result list
                // undefined - add the same marker object to the result list
                // value     - add the value to the result list
                if (ret!==null && ret!==false) result.push(ret===undefined ? ret : marker);

                return ret; // if ret is false, the parent loop will stop
            };

        while (node = nodes[i++]) {

            var text,
                block = null,
                end,
                length,
                mutable = true,
                nodeType = node.nodeType,
                nodeName = node.nodeName;

            // If this is a text node, assign this node as marker text
            if (nodeType==3) {
                text = node;
            // else assign this node as marker block,
            // then test if node is <br/>, create a detached text node contaning a line break,
            } else if ((block = node) && nodeName=="BR") {
                text = document.createTextNode("\n");
                mutable = false;
            // if this is an invalid node, e.g. node not element, node not span, span has no text child node,
            // remove code from overlay and skip this loop.
            } else if (nodeType!==1 || nodeName!=="SPAN" || !(text = node.childNodes[0]) || text.nodeType!==3) {
                overlay.removeChild(node);
                continue;
            }

            // Create marker object
            var marker = new Marker({
                index : i - 1,
                start : start,
                end   : (end = start + (length = text.length)),
                length: length,
                text  : text,
                block : block,
                parent: overlay,
                before: before,
                mutable: mutable
            });

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

        return result;
    },

    getMarkerAt: function(pos) {

        if (pos===undefined) return;

        var marker;

        self.forEachMarker(function(){

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

        return self.forEachMarker(function(){

            return (this.start > end) ? false : (this.end < start) ? null : this;
        });
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
            return marker.insert(str, start - offset, end - offset);
        }

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
            return marker.insert(str, start - offset, end - offset);
        }

        // If we're modifying multiple markers
        // e.g. he*llo [john] [do*e] --> he*xxx*e

        // Deal with markers in reverse
        var i = length - 1,
            marker = markers[i];

        // Convert block marker into text marker
        // [doe] --> doe
        // hello [john] [doe] --> hello [john] doe
        if (marker.block) marker.toTextMarker();

        // If this marker is mutable (all text markers are mutable)
        if (marker.mutable) {

            // Remove characters from text marker
            // doe --> e
            // hello [john] doe --> hello [john] e
            marker.insert("", 0, end - marker.start);

        // If this marker is not mutable
        } else {

            // Remove remaining string from textarea
            // doe --> (removed)
            // hello [john] doe --> hello [john]
            self.textareaInsert("", end, marker.length);

            // Remove marker
            marker.remove(); 
        }

        // Remove all markers in between
        // [john] --> (removed)
        // hello [john] --> hello
        while ((marker = markers[--i]) && i > 0) {
            marker.remove();
        }

        // Insert characters in the first marker
        // hello -> hexxxe
        marker.insert(str, start - marker.start, marker.length);

        // Normalize all text markers
        self._overlay.normalize();

        return marker;
    },

    textareaInsert: function(str, start, end) {

        var textarea = self._textarea,
            val = textarea.value;

        return textarea.value = val.substring(0, start) + str + val.slice(end);
    },

    //--- Key events & caret handling ---//

    /*
    List of input patterns to test:

    1. Holding arrow key + pressing another character.

    2. Select a range of characters (covering single/multiple marker)
       - and press any key
       - and press enter
       - and press backspace

    3. Typing accented character.
       Hold a key until candidate window shows up, then:
       - Press a number
       - Release key, then press a number
       - Navigate using arrow keys
       - Press enter to select a character
       - Click on a candidate to select a character
       - Press backspace until candidate window dissappears

    4. Typing romanized-to-unicode (Chinese/Japanese/Arabian/etc) characters.
       Type multiple characters in the candidate window, then proceed with
       the next course of action at test no. 3.

    5. Pressing enter continously to create multiple newlines:
       - at the beginning of the textarea
       - at the middle of marker/text
       - at the end of textarea
       then:
       - enter a key at the newline
       - press backspace to remove those newlines
       - select a range of newlines, then proceed with
         the next course of action at test no. 2.
    */

    lengthBefore: null,

    caretInitial: null,

    caretBefore: null,

    caretAfter: null,

    skipKeydown: false,

    "{textarea} beforecut": function() {

        console.log("BEFORECUT", arguments);
    },

    "{textarea} beforepaste": function() {

        console.log("BEFOREPASTE", arguments);
    },

    "{textarea} cut": function(el, event) {

        console.log("CUT", arguments);
    },

    "{textarea} paste": function() {

        console.log("PASTE", arguments);
    },    

    "{textarea} keydown": function(textarea, event) {

        // If keydown event has been fired multiple times
        // this might mean the user has entered candidate
        // window and we should not do anything.
        if (self.skipKeydown) return;

        self.lengthBefore = textarea.val().length;

        var caret = 
            self.caretInitial = 
            self.caretBefore = textarea.caret();

        if (event.keyCode===8 && $.IE < 10) {
            self.overlay().css('opacity', 0);
        }

        console.log("keydown", event.which, caret);        

        self.skipKeydown = true;
    },

    // Keypress event will not trigger when meta keys are pressed,
    // it will trigger on well-formed characters.
    "{textarea} keypress": function(textarea, event) {

        // This will help on situations where user
        // holds an arrow key + presses another character.
        self.caretBefore = textarea.caret();

        // FF fires keypress on backspace, while Chrome & IE doesn't.
        // We normalize this behaviour by not doing anything on backspace.
        if (event.keyCode===8) return;
    },

    "{textarea} input": function(textarea) {

        // if (self[skipInput]) return self[skipInput] = false;
        // if (self.delayInput) return;

        self.reflect();
    },

    "{textarea} keyup": function(textarea, event) {

        self.skipKeydown = false;

        // Listen to backspace during keydown because
        // it is not fired on input/keypress on IE9.
        if (event.keyCode===8 && $.IE < 10) {

            var caretBefore = self.caretBefore,
                caretAfter  = self.caretAfter = self.textarea().caret();

            self.insert("", caretAfter.end, caretBefore.end);

            self.overlay().css('opacity', 1);

            if (self.delayInput) {
                self.reflect();
            }
        }

        console.log("keyup", event.which || event.keyCode, textarea.caret());

        self.inspect();
        return;
    },

    reflect: function() {

        // When a person presses keydown and releases, keyup will be triggered, e.g.
        //
        // keydown -> input -> keyup
        // 
        // However, when a person presses keydown and goes into candidate window,
        // keyup event will not be triggered until the user decides on the final word, e.g.
        // 
        // Scenario 1: Typing romanized characters of other language
        //
        // keydown -> input (user might be typing inside a candidate window)
        //         -> input (user is now confirmed typing inside candidate window)
        //         -> input (user is still inside the candidate window)
        //         -> input (...)
        //         -> input (...)
        //         -> keyup (user has selected from the candidate window)
        //
        // Scenario 2: Typing accented characters of other language
        // 
        // keydown -> keypress (A key was pressed)
        //         -> input    (input event triggers after keypress)
        //         -> keydown  (user is holding A key, candidate window shows up)
        //         -> keydown  (certain users might hold the A key, which will repeat the keydown event)
        //         -> keydown  (this will also happen when navigating using arrow keys)
        //         -> keydown  (...)
        //         -> keyup    (user has selected from the candidate window)
        //         -> keydown  (this triggers when user presses a number to select from candidate window)
        //         -> keyup    (this is the keyup event from the number that was pressed)
        //         -> keypress (FF Only. Keypress is triggered with character code of the selected candidate)
        //         -> input    (Input event follows. Triggers in all browsers.)
 
        // Determine if user is typing inside a candidate window
        // by detecting if the input event was triggered more than
        // once without the occurence of keyup event between them.

        var wholeText = self._textarea.value,

            // Caret position retrieved on keydown event
            // is the position before user enters candidate mode.
            caretInitial = self.caretInitial,

            // Caret position retrieved on previous input event
            // is the position before the character is inserted
            caretBefore = self.caretBefore,

            // Caret position retrieved on current input event
            // is the position after the character is inserted.
            caretAfter  = self.caretAfter = self.textarea().caret();

            console.log("caretInitial", caretInitial);
            console.log("caretBefore" , caretBefore);
            console.log("caretAfter"  , caretAfter);

        // If input event was triggered with a change in the text content,
        // but the length of the text content is the same length as before,
        // it is impossible to tell what has changed, so we replace the entire
        // text in the marker where the caret is at. This may happen when user
        // holds a chracter + presses a number to select a character from
        // the candidate window OR when user navigates between characters
        // using arrow keys within the candidate window.
        if (self.lengthBefore == wholeText.length) {

            var marker = self.getMarkerAt(caretBefore.start),
                text = wholeText.substring(marker.start, marker.end);

            marker.val(text);

        } else {

            // If user is finalizing the selection from the candidate window
            if (caretAfter.end < caretBefore.start) {

                if (caretInitial.start >= caretBefore.start) {

                    var rangeStart = caretAfter.end,
                        rangeEnd   = caretBefore.start,
                        textStart = textEnd = null;

                } else {

                    var rangeStart = caretInitial.start,
                        rangeEnd   = caretBefore.end,
                        textStart  = caretInitial.start,
                        textEnd    = caretAfter.end;
                }

            // If user is inserting text as usual
            } else {
                var rangeStart = caretBefore.start,
                    rangeEnd   = caretBefore.end,
                    textStart  = caretBefore.start,
                    textEnd    = caretAfter.end;
            }

            var text = 
                // If user removed text, textStart & textEnd will be identical.
                textEnd===textStart ? "" :
                // If user inserted text, extract text.
                wholeText.substring(textStart, textEnd);

            // Insert text
            self.insert(text, rangeStart, rangeEnd);
     
            console.log("range", rangeStart, rangeEnd);
            console.log("text" , textStart, textEnd, text);
        }

        // Remember the length of the current text content
        self.lengthBefore = self._textarea.value.length;

        // Set caretBefore as current caret
        // This is used to track text range when exiting candidate window
        self.caretBefore = self.caretAfter;

        console.log('----');
    },

    //--- Marker Events ----//

    "{overlay} markerInsert": function(overlay, event, marker, nodes) {

    },

    "{overlay} markerRemove": function(overlay, event, marker) {

    },

    "{overlay} markerConvert": function(overlay, event, marker, type) {

    },

    //--- Inspector ----//

    showInspector: function() {

        // If inspector hasn't been created yet
        if (self.inspector().length < 1) {

            // Create inspector and append to textfield
            self.view.inspector()
                .appendTo(self.element);
        }

        self.inspector().show();
    },

    hideInspector: function() {

        self.inspector().hide();
    },

    "{inspector} dblclick": function() {

        self.textarea().toggle();
    },

    inspect: $.debounce(function() {

        // Selection
        var caret = self.textarea().caret();

        self.selectionStart().val(caret.start);
        self.selectionEnd().val(caret.end);
        self.selectionLength().val(caret.end - caret.start);

        // Trigger
        var triggerKey = self.triggered;

        if (triggerKey) {
            var trigger = self.options.triggers[triggerKey];
            self.triggerKey().val(triggerKey);
            self.triggerType().val(trigger.type);
            self.triggerBuffer().val(self.buffer);
        } else {
            self.triggerKey().val('');
            self.triggerType().val('');
            self.triggerBuffer().val('');
        }

        // Marker
        var marker = self.getMarkerAt(caret.start);

        if (marker) {
            self.markerIndex().val(marker.index).data('marker', marker);
            self.markerStart().val(marker.start);
            self.markerEnd().val(marker.end);
            self.markerLength().val(marker.length);
            self.markerText().val(marker.text.nodeValue);
        } else {
            self.markerIndex().val('').data('marker', null);
            self.markerStart().val('');
            self.markerEnd().val('');
            self.markerLength().val('');
            self.markerText().val('');
        }

        // Block
        var block = (marker || {}).block;

        if (block) {
            self.blockText().val(marker.text.nodeValue);
            self.blockHtml().val($(block).clone().toHTML());
            // TODO: Retrieve block type & value 
        } else {
            self.blockText().val('');
            self.blockHtml().val('');
        }

    }, 25),

    "{markerIndex} click": function(el) {
        console.dir(el.data("marker"));
    }

}});