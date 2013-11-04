// To increase comparession
var awaitingKeyup_ = "awaitingKeyup",
    insertBefore_ = "insertBefore",
    userInCandidateWindow = "userInCandidateWindow",
    waitForKeyup = "waitForKeyup",
    skipInput = "skipInput";

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

    val: function(str) {
        this.text.nodeValue = str;
    },

    prepend: function(charCode, options) {
        this.insert(charCode, 0, options);
    },

    append: function(charCode, options) {
        this.insert(charCode, this.end - this.start, options);
    },

    insert: function(str, pos, options) {

        // Marker
        var marker = this,

            // Character
            // char      = String(charCode),
            backspace = str===false,
            newline   = str==="\n",
            space     = str===" ",

            // Text
            text   = marker.text,
            start  = 0,
            end    = marker.end - marker.start,
            val    = text.nodeValue,

            // Nodes
            parent = marker.parent,
            block  = marker.block,
            before = marker.before,
            after  = marker.after,
            next   = block ? block.nextSibling : text.nextSibling,
            br     = (newline) ? document.createElement("BR") : null,
            nbsp   = document.createTextNode("\u00a0"); // String.fromCharCode(160)

        // console.log(start, marker.start);
        // console.log(newline, start===marker.start, overlay, br, block || text); 
        // We use different text manipulation techniques for
        // different text change cases to achieve better speed.            

        // If cursor is at the start of a marker
        if (pos===start) {

            space && block ? 

                // Add space to the beginning of the previous marker
                before ? before.append(str, options) : 

                // Add space text node before the marker
                parent.insertBefore(nbsp, block)

            // Prepend br tag
            :newline ? parent.insertBefore(br, block || text)

            // Remove last character from previous marker
            :backspace ? before && before.append(str)

            // Prepend character
            :text.nodeValue = str + val;

        // If cursor is at the end of a marker
        } else if (pos===end) {

            space && block ?

                // Add space to the beginning of the next marker
                after ? after.prepend(str, options)

                // Add space text node after the marker
                : parent.insertBefore(nbsp, next)

            // Append br tag
            : newline ? parent.insertBefore(br, next) 

            // Remove last character
            : backspace ? text.nodeValue = val.substr(start, end - 1) 

            // Append character
            : text.nodeValue = val + str; 
            
        // If cursor is in the middle of the marker
        } else {

            var rep;

            newline ? 

                // If this is a block marker
                block ?

                    // Original: <span>hey</span>
                    // Result  : <span>h</span><br>ey
                    options.mutable ? 
                        parent.insertBefore(rep = text.splitText(pos), block) &&
                        parent.insertBefore(br, rep)

                    // Original: <span>hey</span>
                    // Result : hey
                    : marker.toTextMarker()

                // Add br in between
                // Original: h<br/>ey
                : parent.insertBefore(br, text.splitText(pos))

            // Remove character in between
            // Original: hey
            // Result  : h<br/>ey
            : backspace ? text.nodeValue = val.substr(0, pos-1) + val.substr(pos, end)

            // Append character in between
            // Original: hey
            // Result  : hley
            : text.nodeValue = val.substr(0, pos) + str + val.substr(pos, end);

            space && block && !options.allowSpace ? 
                options.mutable ? parent.insertBefore(text.splitText(pos), next)
                : marker.toTextMarker() : null;
        }
    },

    toTextMarker: function() {

        var marker = this,
            block  = marker.block,
            parent = marker.parent;

        if (!block) return;

        var nodes = block.childNodes,
            i = nodes.length;

        while(i--) parent.insertBefore(nodes[i], block.nextSibling);

        parent.removeChild(block);

        parent.normalize();

        delete marker.block;

        // TODO: Trigger markerDestroy event.
    },

    toBlockMarker: function() {



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
    },

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
                if (ret!==null) result.push(ret===undefined ? ret : marker);

                return ret; // if ret is false, the parent loop will stop
            };

        while (node = nodes[i++]) {

            var text, block, end, length,
                nodeType = node.nodeType,
                nodeName = node.nodeName;

            // If this is a text node, assign this node as marker text
            if (nodeType==3) {
                text = node;
            // else assign this node as marker block,
            // then test if node is <br/>, create a detached text node contaning a line break,
            } else if ((block = node) && nodeName=="BR") {
                text = document.createTextNode("\n");
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
                before: before
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
            if (pos >= this.start && pos < this.end) {
                marker = this;
                return false;
            }
        });

        return marker;
    },

    getMarkersBetween: function(start, end) {

        if (start===undefined) return;

        return self.forEachMarker(function(){
            return (start >= this.start) ? (this.end < end) ? this : false : null;
        });
    },


    triggered: null,

    getTrigger: function(triggerKey) {

        return self.options.triggers[triggerKey || self.triggered];
    },

    insert: function(string, start, end) {

        // TODO: Ability to listen to strings

        // Get overlay
        var overlay = self._overlay;

        // If we are inserting character
        if (start===end) {

            // Get marker
            var marker  = self.getMarkerAt(start),
                pos     = start - marker.start,
                options = self.getTrigger(marker.block) || {};

            // Insert character
            marker.insert(string, pos, options);

            // If marker is a text, and the marker after is a block
            // ensure the character is added to the end of the text.
            
            // If marker 

        // If we are replacing a range of characters
        } else {

            var markers = self.getMarkersBetween(start, end);

            // Identify affected markers

            if (markers.length==1) {

                var marker = markers[0];

                var val = marker.text.nodeValue;

                var newval = val.substring(0,start) + string + val.slice(end);

                marker.val(newval);

                console.log(val, newval);



            } else {

            }
        }
    },

    remove: function(start, end) {

        self.insert(8, start, end);
    },

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

    userInCandidateWindow: false,

    "{textarea} keydown": function(textarea, event) {

        // If keyup event did not fire after a keydown event,
        // this means user has entered candidate window mode,
        // and we should not do anything.
        if (self.waitForKeyup) {
            // Scenario 2: Multiple keydown event was triggered without keyup.
            // See "{textarea} input" for details.
            self.userInCandidateWindow = true;
            return;
        }

        self.lengthBefore = textarea.val().length;
        console.log('lengthBefore', self.lengthBefore);

        var caret = textarea.caret();

        self.caretInitial = self.caretBefore = caret;

        // Update start & end
        // self.start = caret.start;
        // self.end   = caret.end;

        console.log("keydown", event.which || event.keyCode, textarea.caret());

        // Listen to backspace during keydown because
        // it is not fired on keypress in Chrome.
        if (event.keyCode===8) {
            self.remove(caret.start, caret.end);
        }

        self.waitForKeyup = true;
    },

    // The role of inserting characters is given to keypress
    // because keypress event will not trigger when non-a
    "{textarea} keypress": function(textarea, event) {

        // FF fires keypress on backspace, while Chrome & IE doesn't.
        // We normalize this behaviour by not doing anything on backspace.
        if (event.keyCode===8) return;
        
        // Keypress do not get triggered when a user selects an
        // accented character from the candidate window in Chrome + OSX.

        return;

        var charCode = $.getChar(event);

        if (charCode===false) return;

        // If keypress was called, input event should be ignored to speed up character insertion.
        self.skipInput = true;

        var caret = self.caretBefore;

        self.insert(charCode, caret.start, caret.end);

        console.log("keypress", charCode, caret);
    },

    substring: function(start, end) {
        return self._textarea.value.substring(start, end);
    },

    lengthBefore: null,

    caretInitial: null,

    caretBefore: null,

    caretAfter: null,

    lastCaret: {
        before: null,
        after: null,
        waitForKeyup: false
    },

    "{textarea} input": function(textarea) {

        if (self[skipInput]) return self[skipInput] = false;

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

        // Caret position retrieved on keydown event
        // is the position before user enters candidate mode.
        var caretInitial = self.caretInitial,

            // Caret position retrieved on previous input event
            // is the position before the character is inserted
            caretBefore = self.caretBefore,

            // Caret position retrieved on current input event
            // is the position after the character is inserted.
            caretAfter  = self.caretAfter = textarea.caret();

            // We need the caretBefore & caretAfter from the last
            // input event to determine the range of text replaced.
            lastCaret = self.lastCaret,

            marker = self.getMarkerAt(caretBefore.start);

        
        var length = textarea.val().length;

        if (self.lengthBefore == length) {

            marker.val(self.substring(marker.start, marker.end));

        } else {
            // To retrieve the range of text to be replaced
            var rangeStart = caretBefore.start,
                rangeEnd   = caretBefore.end,

                // To retrieve the text inserted,
                // take the caret start position on the first keydown event as the text start index,
                // take the caret end position on the last input event as the text end index.
                textStart  = caretBefore.start,
                textEnd    = caretAfter.end,
                text = 
                    // If textStart===textEnd, a character was removed.
                    textEnd===textStart ? false :
                    // Else we extract the text that was inserted.
                    self.substring(textStart, textEnd);

            // If we are current inside candidate window
            if (self[userInCandidateWindow] || (self[userInCandidateWindow] = self[waitForKeyup] && lastCaret[waitForKeyup])) {

                console.log("here");
                rangeStart = caretInitial.start;
                rangeEnd = lastCaret.after.end;

                // secondLastInput.caretEnd - firstInput.caretEnd + 1 = number of characters types (range to be used)
                // rangeStart
                // if (caretAfter.end - lastCaret.end) {
                // }

// caretInitial Object { start=1, end=1}
// caretBefore Object { start=1, end=1}
// caretAfter Object { start=4, end=4}
// range 1 1
// text 1 4 a h



            }

            self.insert(text, rangeStart, rangeEnd);
        }

        // hold character + press number needs this
        self.lengthBefore = length;

        console.log("caretInitial", caretInitial);
        console.log("caretBefore" , caretBefore);
        console.log("caretAfter"  , caretAfter);        
        console.log("range"       , rangeStart, rangeEnd);
        console.log("text"        , textStart, textEnd, text);

        // first & last input = number of characters inserted

        // Store current create as last caret
        self.lastCaret = {
            before      : caretBefore,
            after       : caretAfter,
            waitForKeyup: self[waitForKeyup]
        };
    },    

    "{textarea} keyup": function(textarea, event) {

        // Every keydown event without keyup
        self[waitForKeyup] = false;
        self.lastCaret[waitForKeyup] = false;


        console.log("keyup", event.which || event.keyCode, textarea.caret());

        self.inspect();


        return;
    }

}});

$.getChar = function(e) {

    // If CMD was pressed on mac
    if (e.metaKey) return false;

    /*** Convert to Char Code ***/
    var code = e.which;
    
    //Ignore Shift Key events & arrows
    var ignoredCodes = {
        0: true,
        16: true,
        37: true,
        38: true,
        39: true,
        40: true,
        20: true,
        17: true,
        18: true,
        91: true
    };
    
    if(ignoredCodes[code] === true) {
        return false;
    }

    // Return null for backspace
    // if (code===8) return null;
    
    //These are special cases that don't fit the ASCII mapping
    var exceptions = {
        186: 59, // ;
        187: 61, // =
        188: 44, // ,
        189: 45, // -
        190: 46, // .
        191: 47, // /
        192: 96, // `
        219: 91, // [
        220: 92, // \
        221: 93, // ]
        222: 39 // '
    };

    if(exceptions[code] !== undefined) {
        code = exceptions[code];
    }
    
    var ch = String.fromCharCode(code);
    
    /*** Handle Shift ***/
    if(e.shiftKey) {
        var special = {
            1: '!',
            2: '@',
            3: '#',
            4: '$',
            5: '%',
            6: '^',
            7: '&',
            8: '*',
            9: '(',
            0: ')',
            ',': '<',
            '.': '>',
            '/': '?',
            ';': ':',
            "'": '"',
            '[': '{',
            ']': '}',
            '\\': '|',
            '`': '~',
            '-': '_',
            '=': '+'
        };

        if(special[ch] !== undefined) {
            ch = special[ch];
        }
    }
    else {
        ch = ch.toLowerCase();
    }

    // return ch;
    return ch.charCodeAt(0);
}
