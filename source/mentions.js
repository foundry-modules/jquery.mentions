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
                type: 'entity'
            },
            "#": {
                type: 'hashtag'
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
        self._overlay = self.overlay()[0];
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

    inspect: function() {

        var caret = self.textarea().caret(),
            marker = self.getMarkerAt(caret.start),
            block = marker.block;

        self.selectionStart()
            .val(caret.start);

        self.selectionEnd()
            .val(caret.end);

        self.selectionLength()
            .val(caret.end - caret.start);

        self.markerIndex()
            .val(marker.index)
            .data('marker', marker);

        self.markerStart()
            .val(marker.start);

        self.markerEnd()
            .val(marker.end);

        self.markerLength()
            .val(marker.length);

        self.markerText()
            .val(marker.text.nodeValue);

        // If this marker has a block
        if (block) {

            self.blockText()
                .val(marker.text.nodeValue);

            self.blockHtml()
                .val($(block).clone().toHTML());

            // TODO: Retrieve block type & value 
        } else {

        }
    },

    "{markerIndex} click": function(el) {
        console.dir(el.data("marker"));
    },

    getMarkerAt: function(pos) {

        if (pos===undefined) return;

        var nodes = self._overlay.childNodes,
            i = 0,
            start = 0,
            marker;

        for (; i < nodes.length; i++) {

            var node = nodes[i],
                nodeType = node.nodeType,
                text,
                block;

            switch (nodeType) {

                // Text node
                case 3:
                    text = node;
                    break;

                // Block node
                case 1:

                    // Get immediate text node
                    text = node.childNodes[0];

                    // Skip if invalid block format detected
                    if (!text || text.nodeType!==3) continue;

                    // Store a reference to this node
                    block = node;
                    break;

                default:
                    continue;
            }

            // Calculate end position
            var length = text.length,
                end = start + text.length;

            // If position is inside current node,
            // stop and return marker.
            if (pos >= start && pos <= end) {

                marker = {
                    index: i,
                    start: start,
                    end: end,
                    length: length,
                    text: text,
                    block: block
                };
                break;
            }

            // Else reset start position and
            // continue with next child node.
            start = end;
        }

        return marker;
    },

    buffer: [],

    resetBuffer: function() {

        self.buffer = [];
    },

    "{textarea} keydown": function(textarea, event) {

        self.inspect();

        switch (event.keyCode) {

            // This also matches HOME/END on OSX which is CMD+LEFT, CMD+RIGHT
            case KEYCODE.LEFT:
            case KEYCODE.RIGHT:
            case KEYCODE.HOME:
            case KEYCODE.END:
            case KEYCODE.ENTER:

                // Defer execution to ensure carat pos has changed after HOME/END keys
                $.defer(self.resetBuffer);
                break;

            case KEYCODE.BACKSPACE:
                self.buffer = self.buffer.slice(0, -1 + self.buffer.length);
            
                $.defer(self.resetBuffer);
                break;

            case KEYCODE.SPACE:
                if (!self.hidden) return;
                $.defer(self.resetBuffer);
                break;
        }
    },

    "{textarea} keypress": function(textarea, event) {

        self.inspect();

        var _char = String.fromCharCode(event.which || event.keyCode);        
        self.buffer.push(_char);
    },

    "{textarea} keyup": function() {

        self.inspect();
    }

}});
