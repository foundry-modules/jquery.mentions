all: join-script-files modularize-script minify-script create-style-folder copy-style copy-extra

include ../../build/modules.mk

MODULE = mentions

SOURCE_SCRIPT_FILE_PREFIX =
SOURCE_SCRIPT_FILES = ${SOURCE_SCRIPT_FOLDER}/header.js \
${SOURCE_SCRIPT_FOLDER}/constants.js \
${SOURCE_SCRIPT_FOLDER}/marker.js \
${SOURCE_SCRIPT_FOLDER}/mentions.js \
${SOURCE_SCRIPT_FOLDER}/autocomplete.js \
${SOURCE_SCRIPT_FOLDER}/inspector.js

SOURCE_STYLE_FILE_PREFIX =
SOURCE_STYLE_FILE_SUFFIX = .less
CSS_FILE_SUFFIX_UNCOMPRESSED = .less

copy-extra:
	cp source/variables.less ${TARGET_STYLE_FOLDER}/.