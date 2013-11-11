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
            after  : marker.after
        });

        // Update current marker
        marker.end    = start,
        marker.length = marker.end - marker.start;
        marker.after  = spawn;

        return spawn;
    }
});