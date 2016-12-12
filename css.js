define(['text'], function (text) {

    'use strict';

    var cssOutDir;
    var dirBaseUrl;
    var buildMap = {};

    function checkIfLoaded(link, fn) {
        var engine = window.navigator.userAgent.match(/Trident\/([^ ;]*)|AppleWebKit\/([^ ;]*)|Opera\/([^ ;]*)|rv\:([^ ;]*)(.*?)Gecko\/([^ ;]*)|MSIE\s([^ ;]*)|AndroidWebKit\/([^ ;]*)/) || 0,
            loadInterval,
            useOnload,
            key;

        if (engine[2] || engine[8]) {
            useOnload = false;
        }

        if (useOnload) {
            link.onload = function () {
                link.onload = function () {
                };
                setTimeout(fn, 7);
            }
        } else {
            loadInterval = setInterval(function () {
                for (key in document.styleSheets) {
                    if (document.styleSheets.hasOwnProperty(key)) {
                        if (document.styleSheets[key].href === link.href) {
                            clearInterval(loadInterval);
                            fn();
                        }
                    }
                }
            }, 10);
        }
    }

    return {
        load: function (name, req, onLoad, config) {
            if (config.isBuild && ((req.toUrl(name).indexOf('empty:') === 0) || (req.toUrl(name).indexOf('http:') === 0) || (req.toUrl(name).indexOf('https:') === 0))) {
                //avoid inlining cache busted JSON or if inlineJSON:false
                //and don't inline files marked as empty!
                onLoad(null);
            } else {
                if (config.isBuild) {
                    if (config.cssOutDir) {
                        cssOutDir = config.cssOutDir;
                    } else {
                        throw new Error('Must specify \'cssOutDir\' config parameter');
                    }

                    dirBaseUrl = config.dirBaseUrl;

                    var file = req.toUrl(name);
                    file = file.replace(config.dirBaseUrl, '') + '.css';

                    buildMap[name] = file;

                    onLoad();
                } else {

                    var head = document.getElementsByTagName('head')[0],
                        dataSelector = name.replace(/\/|:|\./g, '-'),
                        link;

                    dataSelector = dataSelector.replace(/(\-+)/g, '-');

                    if (!document.querySelector('[data-css-loaded=' + dataSelector + ']')) {
                        link = document.createElement('link');

                        link.setAttribute('href', req.toUrl(name) + '.css');
                        link.setAttribute('rel', 'stylesheet');
                        link.setAttribute('type', 'text/css');

                        checkIfLoaded(link, function () {
                            link.setAttribute('data-css-loaded', dataSelector);
                            onLoad();
                        });

                        head.appendChild(link);
                    }
                }
            }
        },
        normalize: function (name, normalize) {
            if (name.substr(name.length - 4, 4) === '.css') {
                name = name.substr(0, name.length - 4);
            }
            return normalize(name);
        },
        write: function(pluginName, moduleName, write) {
            if (moduleName in buildMap) {
                var source = path.resolve(dirBaseUrl, buildMap[moduleName]);
                var target = path.resolve(cssOutDir, buildMap[moduleName]);

                var fs = require.nodeRequire('fs-extra');
                var css = require.nodeRequire('css');

                text.get(source, function(data) {
                    var dirSource = path.dirname(source);
                    var dirTarget = path.dirname(target);

                    var ast = css.parse(data);

                    for (var i = 0; i < ast.stylesheet.rules.length; i++) {
                        var rule = ast.stylesheet.rules[i];

                        if (rule.type == 'font-face') {
                            for (var j = 0; j < rule.declarations.length; j++) {
                                var declaration = rule.declarations[j];

                                if (declaration.property == 'src') {
                                    var matches = declaration.value.match(/url\((.*?)\)/g);

                                    for (var k = 0; k < matches.length; k++) {
                                        var url = matches[k];

                                        var from = url.indexOf("'");
                                        var to = url.lastIndexOf("'");

                                        url = url.substring(from + 1, to);

                                        var options = url.indexOf("?");

                                        if (options != -1) {
                                            url = url.substring(0, options);
                                        }

                                        var fontSource = path.resolve(dirSource, url);
                                        var fontTarget = path.resolve(dirTarget, url);

                                        console.log(fontSource, '->', fontTarget);

                                        fs.copySync(fontSource, fontTarget);
                                    }
                                }
                            }
                        }
                    }

                    fs.copySync(source, target);
                });
            }
        }
    }
});
