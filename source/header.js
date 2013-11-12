/**
 * jquery.mentions.
 * Textarea with ability to highlight text blocks
 * Includes built-in autogrow and autocomplete
 * and a inspector utility for debugging purposes.
 *
 * Customizable trigger keys allows you to create
 * mentions, hashtags and nything else that fit your needs.
 *
 * Copyright (c) 2013 Jensen Tonne
 * http://www.jstonne.com
 *
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 * 
 * Trigger configuration:
 * 
 * type
 *   Name for the trigger type.
 * 
 * wrap
 *   Whether or not hitting a trigger key before existing 
 *   characters will wrap these characters into the block
 *   marker until a stop character is found. Space will
 *   always be a stop character whether or not it is
 *   specified in allowSpace or stop option. (default: false)
 *
 * stop
 *   A string of characters that will end the block. (default: "")
 *
 * allowSpace
 *   If true, hitting on a space in a block marker
 *   will not end the block marker until a consecutive
 *   space is pressed. (default: false)
 * 
 * query
 *   Accepts a url string, an array of objects or
 *   a function that returns a deferred object that
 *   resolves with an array of objects. Also accept a
 *   query configuration object (advanced users only!).
 *
 * finalize
 *    If true, after selecting an item from the
 *    autocomplete menu, the block marker is finalized
 *    and any further changes to within the block marker
 *    will simply destroy the entire marker. (default: false)
 *
 * triggers: {
 *     "@": {
 *         type: "entity",
 *         wrap: false,
 *         stop: "",
 *         allowSpace: true,
 *         query: http://json/rest/api?q=
 *     },
 *     "#": {
 *         type: "hashtag",
 *         wrap: true,
 *         stop: " #",
 *         allowSpace: false
 *     }
 * }
 *
 */