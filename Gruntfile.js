/**
 * Framer Server Gruntfile
 */

// User preferences
var preferences = {
    enableOffline: true,
    projectsPath: 'projects/'
};

// Includes
var path = require('path'),
    url = require('url'),
    inject = require('./inject');

module.exports = function (grunt) {

    'use strict';

    grunt.initConfig({
    	paths: {
            projects: preferences.projectsPath + '/**/*.framer'
        },
        generateManifest: {
            files: [ '<%= paths.projects %>/index.html' ],
            options: {
                includes: [ '**/*.{html,js,png,jpg,gif,json}' ],
                enable: preferences.enableOffline
            }
        },
        connect: {
            server: {
	            options: {
	                port: 4000,
	                hostname: '*',
	                base: preferences.projectsPath,
                    debug: true,
	            	middleware: function(connect, options, middlewares) {

                        // Inject reload snippets
                        middlewares.unshift(inject({
                            manifest: preferences.enableOffline,
                            directoryMarker: '.framer'
                        }));

                        // Serve cache manifest
                        middlewares.unshift(function manifest(req, res, next) {
                            var requestUrl = url.parse(req.url);
                            if (/.manifest$/i.test(requestUrl.pathname)) {
                                res.setHeader('Content-Type', 'text/cache-manifest');
                            }
                            next();
                        });

                        // Rewrite
                        middlewares.unshift(function rewrite(req, res, next) {
                            var from = new RegExp('^/(.*?)/(.*)$'),
                                to = '/$1/$1.framer/$2',
                                url = req.url;
                            if (from.test(url)) {
                                url = url.replace(from, to);
                                req.url = url;
                            }
                            next();
                        });

		                return middlewares;

		            }
	            }
            }
        },
        watch: {
            options: {
                livereload: true
            },
            html: {
                files: [
                    '<%= paths.projects %>/index.html',
                    '<%= paths.projects %>/app.js',
                    '<%= paths.projects %>/images/**',
                    '<%= paths.projects %>/framer/**',
                    '<%= paths.projects %>/imported/**'
                ],
                tasks: [ 'generateManifest' ]
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-watch');

    /**
     * Generates an HTML5 offline app cache manifest for offline access.
     * https://developer.apple.com/library/safari/documentation/iphone/conceptual/safarijsdatabaseguide/OfflineApplicationCache/OfflineApplicationCache.html#//apple_ref/doc/uid/TP40007256-CH7-SW1
     */
    grunt.registerMultiTask('generateManifest', null, function generateManifest() {

        var options = this.options({
                includes: [ '**/*' ],
                enable: true
            }),
            path = require('path');

        if (this.target !== 'files') {
            return;
        }

        function getManifestContent(dir) {
            var content = 'CACHE MANIFEST\n',
                guuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    // http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
                    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                    return v.toString(16);
                }),
                files = grunt.file.expand({
                    cwd: dir
                }, options.includes);
            content += files.join('\n') + '# ' + guuid;
            return content;
        }

        // Find targeted index files and generate the cache manifest
        this.files.forEach(function(file) {
            if (file.src.length) {
                file.src.forEach(function(source) {
                    var sourceDir = path.dirname(source),
                        manifestFile = sourceDir + '/cache.manifest';
                    if (grunt.file.exists(manifestFile)) {
                        grunt.file.delete(manifestFile);
                    }
                    if (!options.enable) {
                        grunt.log.writeln('Removed cache manifest: ' + manifestFile);
                        return;
                    }
                    grunt.file.write(manifestFile, getManifestContent(sourceDir));
                    grunt.log.writeln('Updated cache manifest: ' + manifestFile);
                });
            }
        });

    });

    grunt.registerTask('default', [
        'generateManifest',
        'connect:server',
        'watch'
    ]);

};