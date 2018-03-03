define(['text'], function (text) {
    
    'use strict';

    var uglify;
    var cssOutDir;
    var dirBaseUrl;
    var buildMap = {};
    var bundlesMap = {};
    var cssConfig;
    var cssLocation = {};
    var generatedFiles = {};


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

    function findBundle(req, config, source) {
        // If there's a css config for bundling
        if (config && config.bundles) {
            // Iterate over each bundle name
            for (var bundleName in config.bundles) {
                // Get the bundle files
                var bundle = config.bundles[bundleName];

                // Iterate over each file in the bundle
                for (var i = 0; i < bundle.length; i++) {
                    // Generate the target url 
                    var target = req.toUrl(bundle[i]);
                    target = target.replace(config.dirBaseUrl, '') + '.css';

                    // If the target file matches the source file return the bundle name
                    if (source == target) {
                        return bundleName;
                    }
                }
            }
        }

        return "default";
    }

    function getBundleFileName(bundleName, cssConfig, cssOutDir) {
        return path.resolve(cssOutDir, bundleName + ".css");
    }

    function isExcluded(moduleName, cssConfig) {
        if (cssConfig && cssConfig.exclude) {
            for (var i = 0; i < cssConfig.exclude.length; i++) {
                if (cssConfig.exclude[i] == moduleName) {
                    return true;
                }
            }
        }

        return false;
    }

    return {
        load: function (name, req, onLoad, config) {
            if (config.isBuild && ((req.toUrl(name).indexOf('empty:') === 0) || (req.toUrl(name).indexOf('http:') === 0) || (req.toUrl(name).indexOf('https:') === 0))) {
                // Avoid inlining cache busted JSON or if inlineJSON:false
                // and don't inline files marked as empty!
                onLoad(null);
            } else {
                if (config.isBuild) {
                    cssConfig = config.css;

                    if (!isExcluded(name, cssConfig)) {
                        if (config.css) {
                            uglify = config.uglify;
                        }

                        // Get the cssOutDir
                        if (config.cssOutDir) {
                            cssOutDir = config.cssOutDir;
                        } else {
                            throw new Error('Must specify \'cssOutDir\' config parameter');
                        }

                        // Get the dir base url
                        dirBaseUrl = config.dirBaseUrl;

                        // Get the file source
                        var source = req.toUrl(name) + ".css";

                        // Get the corresponding bundle if any
                        var bundle = findBundle(req, cssConfig, source);

                        buildMap[name] = {
                            file: source,
                            bundle: bundle
                        }

                        bundlesMap[name] = bundle;
                    }

                    onLoad();
                } else {
                    var parsed;
                    var url;
                    var nonStripName;

                    if (config.cssOutDir) {
                        cssOutDir = config.cssOutDir;
                    }

                    // If theres a cssConfig entry on require (added by compiler)
                    if (config.css) {
                        // And theres a bundle config for the current module
                        if (config.css[name]) {
                            var bundle = config.css[name];
                            var parsed = text.parseName(bundle);
                            nonStripName = parsed.moduleName + (parsed.ext ? '.' + parsed.ext : '');
                            
                            if (cssOutDir) {
                                url = req.toUrl(cssOutDir + "/" + nonStripName) + ".css";
                            } else {
                                url = req.toUrl(nonStripName) + ".css";
                            }                            
                        }
                    }

                    // If url is not found on bundles get it from the module itself
                    if (!url) {
                        var parsed = text.parseName(name);                        
                        nonStripName = parsed.moduleName + (parsed.ext ? '.' + parsed.ext : '');
                        url = req.toUrl(nonStripName) + ".css";
                    }

                    var head = document.getElementsByTagName('head')[0],
                        dataSelector = nonStripName.replace(/\/|:|\./g, '-'),
                        link;

                    dataSelector = dataSelector.replace(/(\-+)/g, '-');

                    if (!document.querySelector('[data-css-set=' + dataSelector + ']')) {
                        link = document.createElement('link');

                        link.setAttribute('href', url);
                        link.setAttribute('rel', 'stylesheet');
                        link.setAttribute('type', 'text/css');
                        link.setAttribute('data-css-set', dataSelector);

                        head.appendChild(link);                        
                        
                        if (config.cssConfig && config.cssConfig.waitFileLoad) {
                            checkIfLoaded(link, function () {
                                link.setAttribute('data-css-loaded', dataSelector);
                                onLoad();
                            });                            
                        } else {
                            link.setAttribute('data-css-loaded', dataSelector);
                            onLoad();
                        }
                    } else {
                        onLoad();
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
        onLayerEnd: function (write, data) {
            var util = require.nodeRequire('util');            

            write("require.config({ css: " +  util.inspect(bundlesMap) + " })");
            write("require.config({ cssOutDir: '" + path.relative("./dist", cssOutDir) + "' })");

            var fs = require.nodeRequire('fs-extra');

            for (var file in generatedFiles) {
                var content = generatedFiles[file];

                if (uglify) {
                    var options = {};

                    if (cssConfig && cssConfig.cleanCss) {
                        options = cssConfig.cleanCss;
                    }
                    var CleanCSS = require.nodeRequire('clean-css');
                    var output = new CleanCSS(options).minify(content);

                    fs.writeFileSync(file, output.styles);

                    if (output.sourceMap) {
                        fs.writeFileSync(file + ".map", output.sourceMap);
                    }
                } else {
                    fs.writeFileSync(file, content);
                }
            }
        },
        write: function(pluginName, moduleName, write) {
            // If the module name is in the buildmap
            if (moduleName in buildMap) {
                var source = buildMap[moduleName].file;

                if (buildMap[moduleName].bundle) {
                    target = getBundleFileName(buildMap[moduleName].bundle, cssConfig, cssOutDir);
                }

                var fs = require.nodeRequire('fs-extra');
                var css = require.nodeRequire('css');

                text.get(source, function(data) {                    
                    var dirSource = path.dirname(source);
                    var dirTarget = path.dirname(target);

                    var fontDirTarget = path.resolve(dirTarget, "./font");
                    
                    try {
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

                                            url = url.replace("\'", "");
                                            url = url.replace("\"", "");

                                            var from = url.indexOf("(");
                                            var to = url.lastIndexOf(")");

                                            url = url.substring(from + 1, to);

                                            var options = url.indexOf("?");

                                            if (options != -1) {
                                                url = url.substring(0, options);
                                            }

                                            var hash = url.indexOf("#");

                                            if (hash != -1) {
                                                url = url.substring(0, hash);
                                            }

                                            var fileInfo = path.parse(url);
                                            
                                            var fontSource = path.resolve(dirSource, url);
                                            var fontTarget = path.resolve(fontDirTarget, fileInfo.base);
                                            
                                            var urlTarget = path.relative(dirTarget, fontTarget);
                                            urlTarget = urlTarget.split("\\").join("/");                                            

                                            declaration.value = declaration.value.split(url).join(urlTarget);

                                            fs.copySync(fontSource, fontTarget);
                                        }
                                    }
                                }
                            }
                        }
                    } catch (ex) {
                        console.log(ex);
                    }

                    var modified = css.stringify(ast);
                    
                    if (target in generatedFiles) {
                        generatedFiles[target] += modified;
                    } else {
                        generatedFiles[target] = modified;
                    }                    
                });
            }
        }
    }
});
