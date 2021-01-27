// declaraction of document.ready() function.
(function () {
    var ie = !!(window.attachEvent && !window.opera);
    var wk = /webkit\/(\d+)/i.test(navigator.userAgent) && (RegExp.$1 < 525);
    var fn = [];
    var run = function () {
        for (var i = 0; i < fn.length; i++) fn[i]();
    };
    var d = document;
    d.ready = function (f) {
        if (!ie && !wk && d.addEventListener)
            return d.addEventListener('DOMContentLoaded', f, false);
        if (fn.push(f) > 1) return;
        if (ie)
            (function () {
                try {
                    d.documentElement.doScroll('left');
                    run();
                } catch (err) {
                    setTimeout(arguments.callee, 0);
                }
            })();
        else if (wk)
            var t = setInterval(function () {
                if (/^(loaded|complete)$/.test(d.readyState))
                    clearInterval(t), run();
            }, 0);
    };
})();


document.ready(
    // toggleTheme function.
    // this script shouldn't be changed.
    function () {
        var _Blog = window._Blog || {};
        const currentTheme = window.localStorage && window.localStorage.getItem('theme');
        const isDark = currentTheme === 'dark';
        // if (isDark) {
        //     document.getElementById("switch_default").checked = true;
        // } else {
        //     document.getElementById("switch_default").checked = false;
        // }
        _Blog.toggleTheme = function () {
            // if (isDark) {
            //     document.getElementsByTagName('body')[0].classList.add('bg-dark');
            //     document.getElementsByTagName('body')[0].classList.add('text-light');
            // } else {
            //     document.getElementsByTagName('body')[0].classList.remove('bg-dark');
            //     document.getElementsByTagName('body')[0].classList.remove('text-light');
            // }
            // document.getElementsByClassName('toggleBtn')[0].addEventListener('click', () => {
            //     if (document.getElementsByTagName('body')[0].classList.contains('bg-dark')) {
            //     document.getElementsByTagName('body')[0].classList.remove('bg-dark');
            //     document.getElementsByTagName('body')[0].classList.remove('text-light');
            //     } else {
            //     document.getElementsByTagName('body')[0].classList.add('bg-dark');
            //     document.getElementsByTagName('body')[0].classList.add('text-light');
            //     }
            //     window.localStorage &&
            //     window.localStorage.setItem('theme', document.body.classList.contains('bg-dark') ? 'dark' : 'light',)
            // })
        };
        _Blog.toggleTheme();

        // ready function.

    }
);