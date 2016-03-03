define(function () {

    'use strict';

    if (typeof window === 'undefined') {
        return {
            load: function (n, r, load) {
                load()
            }
        };
    }

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
        load: function (name, req, load) {
            var head = document.getElementsByTagName('head')[0],
                dataSelector = name.replace(/\/|:|\./g, '-'),
                link;

            if (!document.querySelector('[data-css-loaded=' + dataSelector + ']')) {
                link = document.createElement('link');

                link.setAttribute('href', req.toUrl(name) + '.css');
                link.setAttribute('rel', 'stylesheet');
                link.setAttribute('type', 'text/css');

                checkIfLoaded(link, function () {
                    link.setAttribute('data-css-loaded', dataSelector);
                    load();
                });

                head.appendChild(link);
            }
        },
        normalize: function (name, normalize) {
            if (name.substr(name.length - 4, 4) === '.css') {
                name = name.substr(0, name.length - 4);
            }
            return normalize(name);
        }
    }
});
