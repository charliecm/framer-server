/**
 * inject
 * Based on https://github.com/btotr/node-inject
 * Modified for this boilerplate to workaround cache manifest not sending
 * accept header for index.
 */
module.exports = function inject(options) {

    var opt = options || {},
        ignore = opt.ignore || opt.excludeList || [ '.js', '.css', '.svg', '.ico', '.woff', '.png', '.jpg', '.jpeg' ],
        html = opt.html || _html,
        directoryMarker = opt.directoryMarker || '.framer',
        rules = opt.rules || [
            {
                match: /<\/body>/,
                fn: prepend
            }, {
                match: /<\/html>/,
                fn: prepend
            }, {
                match: /<\!DOCTYPE.+>/,
                fn: append
            }
        ],
        manifest = (opt.manifest === false) ? false : true,
        manifestRule = {
            match: /<html(.*)>/,
            attribute: 'manifest="cache.manifest"'
        },
        manifestSnippet = '<script>(function(c) { c.addEventListener(\'updateready\', function() { if (c.status === c.UPDATEREADY) { c.swapCache(); window.location.reload(); } }, true); })(window.applicationCache);</script>',
        livereloadSnippet = '<script>document.write(\'<script src="http://\' + (location.host || \'localhost\').split(\':\')[0] + \':35729/livereload.js?snipver=1"></\' + \'script>\')</script>',
        snippet = ((manifest) ? manifestSnippet : '') + livereloadSnippet,
        regex = (function() {
            var matches = rules.map(function(item) {
                return item.match.source;
            }).join('|');
            return new RegExp(matches);
        })();

    function prepend(w, s) {
        return s + w;
    }

    function append(w, s) {
        return w + s;
    }

    function _html(str) {
        if (!str) return false;
        return /<[:_-\w\s\!\/\=\"\']+>/i.test(str);
    }

    function exists(body) {
        if (!body) return false;
        return regex.test(body);
    }

    function snip(body) {
        if (!body) return false;
        return (~body.lastIndexOf('/livereload.js'));
    }

    function snap(body) {
        var _body = body;
        // Insert snippet
        rules.some(function(rule) {
            if (rule.match.test(body)) {
                _body = body.replace(rule.match, function(w) {
                    return rule.fn(w, snippet);
                });
                return true;
            }
            return false;
        });
        // Insert manifest attribute
        if (manifest === true && manifestRule.match.test(body)) {
            _body = _body.replace(manifestRule.match, function(w) {
                if (w.indexOf(manifestRule.attribute) >= 0) {
                    return w;
                }
                return w.replace(manifestRule.match, '<html ' + manifestRule.attribute + '$1>');
            });
        }
        return _body;
    }

    /* function accept(req) {
        var ha = req.headers['accept'];
        if (!ha) return false;
        return (~ha.indexOf('html'));
    } */

    function isIgnored(req) {
        var url = req.url;
        var ignored = false;
        if (!url) return true;
        ignore.forEach(function(item) {
            if (~url.indexOf(item)) {
                ignored = true;
            }
        });
        return ignored;
    }

    // Middleware
    return function inject(req, res, next) {

        if (res.inject) return next();
        res.inject = true;

        var writeHead = res.writeHead,
            write = res.write,
            end = res.end,
            isHTML = req.url.indexOf('.html') > 0,
            isFramerDir = req.url.indexOf(directoryMarker) > 0 && req.url.substr(-1) === '/';

        if (!(isHTML || isFramerDir) || isIgnored(req)) {
            return next();
        }

        function restore() {
            res.writeHead = writeHead;
            res.write = write;
            res.end = end;
        }

        res.push = function(chunk) {
            res.data = (res.data || '') + chunk;
        };

        res.inject = res.write = function(string, encoding) {
            if (string !== undefined) {
                var body = string instanceof Buffer ? string.toString(encoding) : string;
                if (exists(body) && !snip(res.data)) {
                    res.push(snap(body));
                    return true;
                } else if (html(body) || html(res.data)) {
                    res.push(body);
                    return true;
                } else {
                    restore();
                    return write.call(res, string, encoding);
                }
            }
            return true;
        };

        res.writeHead = function() {};

        res.end = function(string, encoding) {
            restore();
            var result = res.inject(string, encoding);
            if (!result) return end.call(res, string, encoding);
            if (res.data !== undefined && !res._header) res.setHeader('content-length', Buffer.byteLength(res.data, encoding));
            res.end(res.data, encoding);
        };
        next();

    };

};
