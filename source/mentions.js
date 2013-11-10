var _backspace = "",
    _space     = " ",
    _nbsp      = "\u00a0",
    _newline   = "\n";

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

        var marker = this;

        // console.log(marker.end);

        // Update text value
        marker.text.nodeValue = str;

        // Update end & length
        marker.end = marker.start + (marker.length = str.length);

        return this;
    },

    insert: function(str, start, end) {

        // Marker
        var marker    = this,
            block     = marker.block,
            br        = marker.br,
            newline   = str==_newline,
            space     = str==_space,
            backspace = str==_backspace,
            length    = marker.length;
        
        // If no start position was given,
        // assume want to insert at the end of the text.
        if (start===undefined) start = length;

        // If no end position was given,
        // assume we want to insert in a single position.
        if (end===undefined) end = start;

        // If we are at the end of a block marker OR this is a newline block marker,
        // space & newline should be added to beginning of the next marker.
        if (block && end==length && !backspace && (space || newline || br)) {
            return marker.spawn().insert(str, 0);
        }

        // Nodes
        var parent = marker.parent,
            text   = marker.text,
            next   = block ? block.nextSibling : text.nextSibling,

            // Text
            val    = text.nodeValue,
            prefix = val.substring(0, start),
            suffix = val.slice(end),

            // Chunks
            // Replace double space with one space and one nbsp to ensure
            // overlay is rendered proper spacing + identical word-wrap.
            chunks = str.replace(/  /g, " " + _nbsp).split(_newline),
            nodes  = [],
            node   = block || text,
            i      = chunks.length;         

        // Add the prefix/suffix to the first/last chunk.
        // If this is a single chunk, the suffix is
        // actually added to the same chunk. :)
        chunks[0] = prefix + chunks[0];
        chunks[i-1] += suffix;

        // If this is a single chunk, this loop won't execute
        // but we still benefit from having the correct index. :)
        while (--i) {

            var node = document.createTextNode(chunks[i]),
                br = document.createElement("BR");

            nodes.push(parent.insertBefore(node, next));
            nodes.push(parent.insertBefore(br, node));

            next = br;
        }

        // Update the text value in the current marker
        marker.val(chunks[i]);

        // Trigger marker for post processing
        $(parent).trigger("markerInsert", [marker, nodes, str, start, end]);

        return marker;
    },

    remove: function() {

        var marker = this,
            parent = marker.parent;

        parent.removeChild(marker.block || marker.text);

        marker.removed = true;

        $(parent).trigger("markerRemove", [marker]);

        return marker;
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

    toBlockMarker: function(normalize) {

        var marker = this;

        // If this is a block marker, skip.
        if (marker.block) return;

        var parent = marker.parent,
            block = marker.block = document.createElement("SPAN"),
            text  = marker.text;

        // Insert block before the next marker
        parent.insertBefore(block, text.nextSibling);

        // Move text inside block marker
        block.appendChild(text);

        // Normalizing will join 2 separated
        // text nodes together forming a single marker.
        normalize && parent.normalize();

        $(marker.parent).trigger("markerConvert", [this, "block", normalize]);

        return marker;
    },

    spawn: function(start, end) {

        var marker = this,
            text   = marker.text,
            parent = marker.parent,
            block  = marker.block,
            next   = block ? block.nextSibling : text.nextSibling;

        // If not start and end position was given, assume that
        // we're spawning an empty marker next to the current marker.
        // [hello] --> [hello[]
        if (start===undefined) {
            start = end = marker.length;
        }

        // If we're spawning in text in the middle,
        // split out the end marker and insert it before the next marker.
        // [he*ll*o] --> [he*ll*][o]
        if (end < marker.length) {
            next = parent.insertBefore(text.splitText(end), next);
        } 

        // Split out the text
        // [he*ll*][o] --> [he][ll][o]
        text = parent.insertBefore(text.splitText(start), next);

        // Create marker object from new text object
        var spawn = new Marker({
            index  : marker.index + 1,
            start  : (start = marker.start + start),
            end    : (end = marker.start + end),
            length : end - start,
            text   : text,
            parent : marker.parent,
            before : marker,
            after  : marker.after,
            mutable: marker.mutable
        });

        // Update current marker
        marker.end    = start,
        marker.length = marker.end - marker.start;
        marker.after  = spawn;

        return spawn;
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
                mutable: false
            },
            "#": {
                type: 'hashtag',
                mutable: true
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

        // Speed up access to overlay
        self._overlay  = self.overlay()[0];
        self._textarea = self.textarea()[0];
        
        self.cloneLayout();

        // Temporarily set to true
        self.options.inspector = true;
        self.showInspector();
    },

    setLayout: function() {

        self.normalize();
    },

    cloneLayout: function() {

        var textarea = self.textarea(),
            overlay  = self.overlay();

        $.each(self.options.cssCloneProps, function() {
            overlay.css(this, textarea.css(this));
        });

        overlay.css('opacity', 1);

        self.setLayout();
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
                br = false,
                mutable = true,
                allowSpace = false,
                nodeType = node.nodeType,
                nodeName = node.nodeName;

            // If this is a text node, assign this node as marker text
            if (nodeType==3) {
                text = node;
                allowSpace = true;
            // else assign this node as marker block,
            // then test if node is <br/>, create a detached text node contaning a line break,
            } else if ((block = node) && nodeName=="BR") {
                text = document.createTextNode("\n");
                mutable = false;
                br = true;
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
                br    : br,
                mutable: mutable,
                allowSpace: allowSpace
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

        console.log("before", self._overlay.childNodes);

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
            // TODO: Maybe this should be done by post-processors.
            // if (marker.block) marker.toTextMarker();

            // Remove characters from text marker
            // doe --> e
            // hello [john] doe --> hello [john] e
            marker.insert("", 0, end - marker.start);

            // Remove all markers in between
            // [john] --> (removed)
            // hello [john] --> hello
            while ((marker = markers[--i]) && i > 0) {
                marker.remove();
            }

            // Insert characters in the first marker
            // hello -> hexxxe
            marker.insert(str, start - marker.start, marker.length);

            // Special case for handling br tag in the beginning of the textarea
            if (start===0 && marker.br) {
                marker.remove();
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
        var last = overlay.lastChild;
        if (!last || last.nodeName==="BR") {
            overlay.appendChild(document.createTextNode(""));
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

        console.log("after", overlay.childNodes);
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

        var caret = self.caretBefore = textarea.caret();

        if (event.keyCode===8 && $.IE < 10) {
            self.overlay().css('opacity', 0);
        }

        console.log("keydown", event.which, caret);        

        self.skipKeydown = true;
    },

    // Keypress event will not trigger when meta keys are pressed,
    // it will trigger on well-formed characters.
    "{textarea} keypress": function(textarea, event) {

        console.log("keypress");

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
        // user can start all over again by clearing
        // the textarea.
        if (textarea.val().length < 1) {
            self.overlay().empty();
            self.normalize();
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

        console.log("caretBefore", caretBefore.start, caretBefore.end);
        console.log("caretAfter" , caretAfter.start , caretAfter.end);

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
            marker.val(text);
            self.normalize();

        // If the strategy is to insert chracters onto single/multiple markers
        } else {
            self.insert(text, rangeStart, rangeEnd);            
        }

        console.log("range", rangeStart, rangeEnd);
        console.log("text" , textStart, textEnd, text);

        // Ensure Opera follows the caretAfter behaviour of other
        // browsers when typing inside the candidate window.
        if (operaCandidateWindow) {
            caretAfter.start = caretAfter.end;
        }

        // Set caretBefore as current caret
        // This is used to track text range when exiting candidate window.
        self.caretBefore = self.caretAfter;

        console.log('----');
    },

    //--- Marker Events ----//

    "{overlay} markerInsert": function(overlay, event, marker, nodes, str, start, end) {

        var triggers = self.options.triggers,
            trigger;

        // If a trigger key was entered
        if (triggers.hasOwnProperty(str) && (trigger = triggers[str])) {

            if (trigger.mutable) {
                // Extract the remaining string after the trigger key
                var val = marker.text.nodeValue.slice(start),
                    // Find the first found space, that's where the string ends.
                    end = val.indexOf(_space);
                    end = start + ((end < 0) ? val.length : end);
            }

            // Spawn a new marker from this string
            // and convert this marker into a block marker
            var spawn = marker.spawn(start, end).toBlockMarker();
            // Update the mutability of the spawned marker
            spawn.mutable = trigger.mutable;
        }

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