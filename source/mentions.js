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
$.template("mentions/inspector", '<div class="mentions-inspector" data-mentions-inspector><fieldset><b>Selection</b><hr/><label>Start</label><input type="text" data-mentions-start/><hr/><label>End</label><input type="text" data-mentions-end/><hr/><label>Length</label><input type="text" data-mentions-length/></fieldset><fieldset><b>Block</b><hr/><label>Start</label><input type="text" data-mentions-block-start/><hr/><label>End</label><input type="text" data-mentions-block-end/><hr/><label>Length</label><input type="text" data-mentions-block-length/><hr/><label>Text</label><input type="text" data-mentions-block-text/><hr/><label>Html</label><input type="text" data-mentions-block-html/><hr/><label>Type</label><input type="text" data-mentions-block-type/><hr/><label>Value</label><input type="text" data-mentions-block-value/></fieldset></div>');

/*
<div class="mentions-inspector" data-mentions-inspector>
    <fieldset>
        <b>Selection</b>
        <hr/>
        <label>Start</label>
        <input type="text" data-mentions-start/>
        <hr/>
        <label>End</label>
        <input type="text" data-mentions-end/>
        <hr/>
        <label>Length</label>
        <input type="text" data-mentions-length/>
    </fieldset>
    <fieldset>
        <b>Block</b>
        <hr/>
        <label>Start</label>
        <input type="text" data-mentions-block-start/>
        <hr/>
        <label>End</label>
        <input type="text" data-mentions-block-end/>
        <hr/>
        <label>Length</label>
        <input type="text" data-mentions-block-length/>
        <hr/>
        <label>Text</label>
        <input type="text" data-mentions-block-text/>
        <hr/>
        <label>Html</label>
        <input type="text" data-mentions-block-html/>
        <hr/>
        <label>Type</label>
        <input type="text" data-mentions-block-type/>
        <hr/>
        <label>Value</label>
        <input type="text" data-mentions-block-value/>
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
                name: 'entity'
            },
            "#": {
                name: 'hashtag'
            }
        },

        inspector: false,

        "{inspector}": "[data-mentions-inspector]",

        "{textarea}": "[data-mentions-textarea]",
        "{overlay}" : "[data-mentions-overlay]"
    }
},
function(self){ return {

    init: function() {

        self.cloneLayout();

        // Temporarily set to true
        self.options.inspector = true;
        self.showInspector();
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

    buffer: [],

    resetBuffer: function() {

        self.buffer = [];
    },

    "{textarea} keydown": function(textarea, event) {

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

        var _char = String.fromCharCode(event.which || event.keyCode);        
        self.buffer.push(_char);
    }

}});
