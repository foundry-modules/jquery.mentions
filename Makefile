all: modularize-script minify-script create-style-folder copy-style

include ../../build/modules.mk

MODULE = mentions
SOURCE_SCRIPT_FILE_PREFIX = 
SOURCE_STYLE_FILE_PREFIX =
SOURCE_STYLE_FILE_SUFFIX = .less
CSS_FILE_SUFFIX_UNCOMPRESSED = .less