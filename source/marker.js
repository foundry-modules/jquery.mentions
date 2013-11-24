var Marker = function(options) {
    $.extend(this, options);
}

$.extend(Marker.prototype, {

    val: function(str) {

        var marker = this;

        if (str===undefined) {
            return marker.text.nodeValue;
        }

        // Update text value
        marker.text.nodeValue = str;

        // Update end & length
        marker.end = marker.start + (marker.length = str.length);

        return marker;
    },

    insert: function(str, start, end) {

        // Marker
        var marker     = this,
            block      = marker.block,
            text       = marker.text,
            parent     = marker.parent,
            br         = marker.br,
            val        = marker.val(),
            length     = marker.length,

            // Character flags
            newline    = str==_newline,
            space      = str==_space,
            backspace  = str==_backspace,

            // Trigger
            trigger = marker.trigger || {},
            finalize = trigger.finalize,
            finalized = marker.finalized,

            // Spaces
            // We need to insert space in a spawned marker when:
            //  - space is not allowed in block marker
            //  - space is allowed in block marker
            //    but there's already a trailing space.
            trailingSpace = val.charCodeAt(start - 1)==32,
            allowSpace    = trigger.allowSpace || marker.allowSpace,
            spawnSpace    = space && (!allowSpace || (allowSpace && trailingSpace));

        // If no start position was given,
        // assume want to insert at the end of the text.
        if (start===undefined) start = length;

        // If no end position was given,
        // assume we want to insert in a single position.
        if (end===undefined) end = start;

        // If this block marker already has a trailing space
        // but the block marker hasn't been finalized yet.
        if (block && allowSpace && trailingSpace && !finalized) {

            // Reverse the insertion on textarea
            if (space) {

                var $textarea = $(marker.textarea),
                    wholeText = $textarea.val(),
                    pos       = $textarea.caret().end - 1,
                    offset    = marker.start + start;

                $textarea
                    .val(wholeText.substring(0, offset) + wholeText.slice(offset + 1))
                    .caret(pos);
            }

            // Convert to text marker
            marker.toTextMarker();

            // TODO: Refactor this
            if (space) {
                // Trigger marker for post processing
                $(parent).trigger("markerInsert", [marker, nodes, str, start, end]);
                return marker;
            // For other characters, restart text insertion process.
            } else {
                return marker.insert(str, start, end);
            }
        }

        // If we are at the end of a block marker OR this is a newline block marker,
        // space & newline should be added to beginning of the next marker.
        if (block && end==length && !backspace && (spawnSpace || newline || br || finalized)) {
            return marker.spawn().insert(str, 0);
        }

        // Quick monkey patch for typing before a block marker
        // in the beginning of the textarea.
        if (block && marker.index===0 && marker.start===0 && str.length===1) {

            var textnode = document.createTextNode(str);
            parent.insertBefore(textnode, block);

            var newMarker = new Marker({
                index: 0,
                start: 0,
                end: str.length,
                text: textnode,
                parent: parent,
                textarea: marker.textarea,
                allowSpace: true,
            });

            // Trigger marker for post processing
            $(parent).trigger("markerInsert", [newMarker, nodes, str, start, end]);

            return newMarker;
        }

        // Nodes
        var next   = block ? block.nextSibling : text.nextSibling,

            // Text
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
            parent = marker.parent,
            block = marker.block,
            text = marker.text;

        if (block) $(block).trigger("triggerDestroy", [marker]);

        parent.removeChild(block || text);

        marker.removed = true;

        $(parent).trigger("markerRemove", [marker]);

        return marker;
    },

    toTextMarker: function() {

        var marker = this,
            block  = marker.block,
            parent = marker.parent;

        if (!block) return marker;

        // Create a copy of the old marker
        var old = marker.clone();

        if (block) $(block).trigger("triggerDestroy", [marker]);

        // Move the text node out and 
        // place it before the next marker.
        parent.insertBefore(marker.text, block.nextSibling);

        // Remove the block node
        parent.removeChild(block);
        delete marker.block;
        delete marker.trigger;

        $(marker.parent).trigger("markerConvert", [marker, old, "text"]);

        return marker;
    },

    toBlockMarker: function(normalize) {

        var marker = this;

        // If this is a block marker, skip.
        if (marker.block) return;

        var old = marker.clone(),
            parent = marker.parent,
            block = marker.block = document.createElement("SPAN"),
            text  = marker.text;

        // Insert block before the next marker
        parent.insertBefore(block, text.nextSibling);

        // Move text inside block marker
        block.appendChild(text);

        // Create empty marker data
        $(block).data("marker", {});

        $(marker.parent).trigger("markerConvert", [marker, old, "block"]);

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
            index     : marker.index + 1,
            start     : (start = marker.start + start),
            end       : (end = marker.start + end),
            length    : end - start,
            text      : text,
            parent    : parent,
            textarea  : marker.textarea,
            before    : marker,
            after     : marker.after,
            br        : false,
            allowSpace: true,
            finalized : false
        });

        // Update current marker
        marker.end    = start,
        marker.length = marker.end - marker.start;
        marker.after  = spawn;

        return spawn;
    },

    clone: function() {

        return new Marker(
            $.pick(this, "index,start,end,length,text,parent,textarea,before,after,br,allowSpace,trigger,value,finalized".split(","))
        );
    },

    finalize: function(value) {

        var marker = this,  
            block = marker.block;

        // Text marker cannot be finalized
        if (!block) return;

        var data = $(block).data("marker");
            data.value = value;
            data.finalized = true;

        $.extend(marker, data);
    }
});