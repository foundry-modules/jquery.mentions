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

$.Controller("Mentions.Inspector",
{
    defaultOptions: {

        view: {
            item: "mentions/item",
            inspector: "mentions/inspector"
        }

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
        "{triggerBuffer}" : "[data-mentions-trigger-buffer]"        
    }
},
function(self){ return {

    init: function() {

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
