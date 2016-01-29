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
            var head = document.getElementsByTagName('head')[0];

            if (!document.querySelector('[data-css-loaded=' + name + ']')) {
                var link = document.createElement('link');
                link.type = 'text/css';
                link.rel = 'stylesheet';
                link.setAttribute('data-css-loaded', name);
                link.href = requirejs.toUrl(name) + '.css';

                head.appendChild(link);
            } 
			
			load(true);
        },
        normalize: function (name, normalize) {
            if (name.substr(name.length - 4, 4) == '.css')
                name = name.substr(0, name.length - 4);

            return normalize(name);
        }
    }
});
