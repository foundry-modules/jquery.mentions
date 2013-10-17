all: modularize-script minify-script

include ../../build/modules.mk

MODULE = mentions
SOURCE_SCRIPT_FILE_PREFIX = 