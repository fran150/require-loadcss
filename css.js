define(function () {
    if (typeof window === 'undefined') {
        return {
            load: function (n, r, load) {
                load()
            }
        };
    }

    return {
        load: function (name, req, load) {
            var doc = window.document,
                docBody = doc.body,
                createLink = function (src) {
                    var link = doc.createElement('link');
                    link.type = 'text/css';
                    link.rel = 'stylesheet';
                    link.href = src;
                    return link;
                },
                resolveClassName = function (moduleName) {
                    var parts = moduleName.split('/');
                    return parts[parts.length - 1].replace('.', '-') + '-loaded';
                };

            var head = doc.getElementsByTagName('head')[0],
                test,
                interval,
                link;

            test = doc.createElement('div');
            test.className = resolveClassName(name);
            test.style.cssText = 'position: absolute;left:-9999px;top:-9999px;';
            docBody.appendChild(test);

            if (test.offsetHeight > 0) {
                docBody.removeChild(test);
                load();
            } else {
                link = createLink(name),
                    head.appendChild(link);

                interval = window.setInterval(function () {
                    if (test.offsetHeight > 0) {
                        window.clearInterval(interval);
                        docBody.removeChild(test);
                        load(link);
                    }
                }, 50);
            }
        },
        normalize: function (name, normalize) {
            if (name.substr(name.length - 4, 4) == '.css')
                name = name.substr(0, name.length - 4);

            return normalize(name);
        }
    }
});
