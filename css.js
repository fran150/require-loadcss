define(function () {

    'use strict';

    var checkIfLoaded;

    if (typeof window === 'undefined') {
        return {
            load: function (n, r, load) {
                load()
            }
        };
    }

    checkIfLoaded = function (link, fn) {
        var sheet, cssRules, intervalId, timeoutId;

        if ('sheet' in link) {
            sheet = 'sheet';
            cssRules = 'cssRules';
        } else {
            sheet = 'styleSheet';
            cssRules = 'rules';
        }

        intervalId = window.setInterval(function () {
            try {
                if (link[sheet] && link[sheet][cssRules].length) {
                    window.clearInterval(intervalId);
                    window.clearTimeout(timeoutId);
                    fn(true);
                }
            } catch (e) {}
        }, 10);

        timeoutId = window.setTimeout(function () {
            window.clearInterval(intervalId);
            window.clearTimeout(timeoutId);
            fn(false);
        }, 15000);

    };

    return {
        load: function (name, req, load) {
            var head = document.getElementsByTagName('head')[0],
                link;

            if (!document.querySelector('[data-css-loaded=' + name + ']')) {
                link = document.createElement('link');

                link.setAttribute('href', requirejs.toUrl(name) + '.css');
                link.setAttribute('rel', 'stylesheet');
                link.setAttribute('type', 'text/css');
                link.setAttribute('data-css-loaded', name);

                checkIfLoaded(link, load);

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
